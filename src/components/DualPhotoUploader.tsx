'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, X, Sparkles, RotateCw, MapPin } from 'lucide-react';
import { compressImageToWebP, extractGpsFromImage } from '@/lib/image-processor';

interface Props {
  contextPhotoUrl: string;
  closeupPhotoUrl: string;
  trackingCode: string;
  onChange: (contextUrl: string, closeupUrl: string) => void;
  onGpsDetected?: (lat: number, lng: number) => void;
}

export default function DualPhotoUploader({
  contextPhotoUrl,
  closeupPhotoUrl,
  trackingCode,
  onChange,
  onGpsDetected,
}: Props) {
  const [contextHash, setContextHash] = useState<string>('');
  const [closeupHash, setCloseupHash] = useState<string>('');
  const [compressingBox, setCompressingBox] = useState<'context' | 'closeup' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoGpsInfo, setPhotoGpsInfo] = useState<{ lat: number; lng: number } | null>(null);

  const contextInputRef = useRef<HTMLInputElement>(null);
  const closeupInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!contextPhotoUrl) {
      setContextHash('');
      if (contextInputRef.current) contextInputRef.current.value = '';
    }
    if (!closeupPhotoUrl) {
      setCloseupHash('');
      if (closeupInputRef.current) closeupInputRef.current.value = '';
    }
    if (!contextPhotoUrl && !closeupPhotoUrl) {
      setPhotoGpsInfo(null);
      setErrorMsg(null);
    }
  }, [contextPhotoUrl, closeupPhotoUrl]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'context' | 'closeup'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type.toLowerCase())) {
      setErrorMsg('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, HEIC) เท่านั้น');
      return;
    }

    try {
      setCompressingBox(type);
      setErrorMsg(null);

      // ดึงพิกัด GPS จาก EXIF Metadata ของรูปถ่าย (ถ้ากล้องบันทึกไว้)
      extractGpsFromImage(file).then((gps) => {
        if (gps) {
          setPhotoGpsInfo({ lat: gps.latitude, lng: gps.longitude });
          onGpsDetected?.(gps.latitude, gps.longitude);
        }
      }).catch(() => {});

      // บีบอัดรูปภาพเป็น WebP คุณภาพสูง
      const result = await compressImageToWebP(file, 1200, 1200, 0.75);

      if (type === 'context' && closeupHash && result.hash === closeupHash) {
        setErrorMsg('กรุณาอย่าใช้รูปเดียวกันทั้ง 2 ช่อง (ต้องมีภาพมุมกว้างและภาพระยะใกล้)');
        setCompressingBox(null);
        return;
      }
      if (type === 'closeup' && contextHash && result.hash === contextHash) {
        setErrorMsg('กรุณาอย่าใช้รูปเดียวกันทั้ง 2 ช่อง (ต้องมีภาพมุมกว้างและภาพระยะใกล้)');
        setCompressingBox(null);
        return;
      }

      if (type === 'context') {
        setContextHash(result.hash);
        onChange(result.dataUrl, closeupPhotoUrl);
      } else {
        setCloseupHash(result.hash);
        onChange(contextPhotoUrl, result.dataUrl);
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setCompressingBox(null);
    }
  };

  /**
   * หมุนรูปภาพ 90 องศาตามเข็มนาฬิกา
   */
  const handleRotateImage = (type: 'context' | 'closeup') => {
    const targetUrl = type === 'context' ? contextPhotoUrl : closeupPhotoUrl;
    if (!targetUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL('image/webp', 0.8);
      if (type === 'context') {
        onChange(rotatedDataUrl, closeupPhotoUrl);
      } else {
        onChange(contextPhotoUrl, rotatedDataUrl);
      }
    };
    img.src = targetUrl;
  };

  const handleRemove = (type: 'context' | 'closeup') => {
    if (type === 'context') {
      setContextHash('');
      onChange('', closeupPhotoUrl);
      if (contextInputRef.current) contextInputRef.current.value = '';
    } else {
      setCloseupHash('');
      onChange(contextPhotoUrl, '');
      if (closeupInputRef.current) closeupInputRef.current.value = '';
    }
    setErrorMsg(null);
  };

  return (
    <div className="space-y-2.5">
      {errorMsg && (
        <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2 Photo Upload Boxes (Clean & Minimal) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Box 1: Wide Context Photo */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/60 p-3 text-center transition-all hover:border-amber-400 hover:bg-amber-50/30 overflow-hidden min-h-[155px]">
          {contextPhotoUrl ? (
            <div className="relative h-full w-full">
              <img
                src={contextPhotoUrl}
                alt="ภาพมุมกว้าง"
                className="h-32 w-full rounded-xl object-cover shadow-sm"
              />
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() => handleRotateImage('context')}
                  className="rounded-full bg-black/60 p-1.5 text-white hover:bg-amber-600 transition-colors shadow"
                  title="หมุนรูป 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('context')}
                  className="rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-600 transition-colors shadow"
                  title="ลบรูป"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>1. มุมกว้างพร้อม</span>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm mb-2">
                {compressingBox === 'context' ? (
                  <Sparkles className="h-5 w-5 animate-spin text-amber-600" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-semibold text-stone-800">1. ภาพมุมกว้าง</span>
              <span className="text-[10px] text-stone-500 mt-0.5 leading-tight px-1">
                เห็นถนน / เสาไฟ / ทางแยก
              </span>
              <input
                ref={contextInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'context')}
              />
            </label>
          )}
        </div>

        {/* Box 2: Close-up Damage Photo */}
        <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/60 p-3 text-center transition-all hover:border-amber-400 hover:bg-amber-50/30 overflow-hidden min-h-[155px]">
          {closeupPhotoUrl ? (
            <div className="relative h-full w-full">
              <img
                src={closeupPhotoUrl}
                alt="ภาพระยะใกล้"
                className="h-32 w-full rounded-xl object-cover shadow-sm"
              />
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() => handleRotateImage('closeup')}
                  className="rounded-full bg-black/60 p-1.5 text-white hover:bg-amber-600 transition-colors shadow"
                  title="หมุนรูป 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('closeup')}
                  className="rounded-full bg-black/60 p-1.5 text-white hover:bg-rose-600 transition-colors shadow"
                  title="ลบรูป"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>2. ระยะใกล้พร้อม</span>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-sm mb-2">
                {compressingBox === 'closeup' ? (
                  <Sparkles className="h-5 w-5 animate-spin text-amber-600" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-semibold text-stone-800">2. ภาพระยะใกล้</span>
              <span className="text-[10px] text-stone-500 mt-0.5 leading-tight px-1">
                เห็นตัวหลุม / ความลึกชัดเจน
              </span>
              <input
                ref={closeupInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'closeup')}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
