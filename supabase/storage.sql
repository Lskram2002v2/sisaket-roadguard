-- ==============================================================================
-- 📦 Sisaket RoadGuard Supabase Storage Configuration
-- Bucket: road-reports (สำหรับเก็บภาพมุมกว้าง ภาพระยะใกล้ และภาพหลังซ่อมเสร็จ)
-- ==============================================================================

-- 1. สร้าง Bucket สำหรับเก็บรูปภาพถนนชำรุด (จำกัดขนาด < 2MB และรับเฉพาะ JPG, PNG, WEBP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'road-reports',
    'road-reports',
    true,
    2097152, -- 2MB (2 * 1024 * 1024 bytes)
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. ตั้งค่านโยบายสิทธิ์การเข้าถึง Storage (RLS for Storage)

-- ลบนโยบายเก่าหากมีอยู่
DROP POLICY IF EXISTS "Public Upload Road Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Road Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Road Photos" ON storage.objects;

-- สิทธิ์: ให้ประชาชนและแอดมินอัปโหลดรูปภาพได้
CREATE POLICY "Public Upload Road Photos" 
ON storage.objects FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'road-reports');

-- สิทธิ์: ให้ทุกคนเปิดดูรูปภาพใน Bucket ได้ (Public CDN)
CREATE POLICY "Public Read Road Photos" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'road-reports');
