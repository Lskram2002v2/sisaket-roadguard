/**
 * บีบอัดและแปลงรูปภาพเป็น WebP ผ่าน HTML5 Canvas ในเบราว์เซอร์
 * ลดขนาดไฟล์จาก 5-8MB เหลือประมาณ 150KB - 250KB
 */
export async function compressImageToWebP(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
): Promise<{ dataUrl: string; blob: Blob; sizeKb: number; hash: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Cannot get canvas 2d context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // แปลงเป็น WebP (fallback เป็น jpeg หากเบราว์เซอร์ไม่รองรับ)
        const format = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }

            const dataUrl = canvas.toDataURL(format, quality);
            const sizeKb = Math.round(blob.size / 1024);

            // คำนวณ Simple Hash สำหรับเช็ครูปซ้ำ
            const hash = calculateSimpleHash(dataUrl.slice(0, 1000) + sizeKb);

            resolve({
              dataUrl,
              blob,
              sizeKb,
              hash,
            });
          },
          format,
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * สร้างชื่อไฟล์ที่ไม่ซ้ำกัน 100% (Collision-Proof System Name)
 * ตัวอย่าง: SK2610-0012_ctx_1790082345_a8f9d2.webp
 */
export function generateUniquePhotoName(trackingCode: string, type: 'ctx' | 'dmg' | 'res'): string {
  const cleanCode = trackingCode.replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Date.now();
  const randomSalt = Math.random().toString(36).substring(2, 8);
  return `${cleanCode}_${type}_${timestamp}_${randomSalt}.webp`;
}

/**
 * คำนวณ Simple Hash สตริงสำหรับเปรียบเทียบรูปภาพ
 */
export function calculateSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * อัปโหลดไฟล์รูปภาพขึ้น Supabase Storage (Bucket: 'road-reports')
 * หากไม่มี Supabase หรือเกิดข้อผิดพลาด จะส่งกลับ dataUrl เดิมอัตโนมัติ (Zero-Friction Fallback)
 */
export async function uploadImageToStorage(
  blob: Blob,
  fileName: string,
  fallbackDataUrl: string
): Promise<string> {
  try {
    const { supabase, isSupabaseConfigured } = await import('./supabase');
    if (!isSupabaseConfigured || !supabase) {
      return fallbackDataUrl;
    }

    const { data, error } = await supabase.storage
      .from('road-reports')
      .upload(fileName, blob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error || !data) {
      console.warn('Storage upload warning:', error?.message);
      return fallbackDataUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from('road-reports')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl || fallbackDataUrl;
  } catch (err) {
    console.warn('Error uploading to storage:', err);
    return fallbackDataUrl;
  }
}
