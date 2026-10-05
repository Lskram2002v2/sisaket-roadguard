'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Send, Phone, FileText, CheckCircle2, Sparkles, Copy, ArrowRight, MapPin } from 'lucide-react';
import ReportMapPicker from './ReportMapPicker';
import DualPhotoUploader from './DualPhotoUploader';
import { SISAKET_CENTER, isWithinSisaket, findNearestDistrict } from '@/lib/geofence';
import { roadStore } from '@/lib/db-store';
import { playAlertChime } from '@/lib/audio-synth';
import { uploadDataUrlToStorage } from '@/lib/image-processor';
import { SeverityLevel } from '@/lib/types';

const QUICK_LANDMARK_CHIPS = [
  'หน้าโรงเรียน',
  'ตรงข้ามวัด',
  'ใกล้เสาไฟฟ้า',
  'หน้าทางเข้าหมู่บ้าน',
  'หัวโค้ง/เชิงสะพาน',
  'หน้าร้านค้า/ตลาด',
  'ติดปั๊มน้ำมัน',
];

interface Props {
  onSuccessNavigateToTrack: (trackingCode: string) => void;
}

export default function CitizenReportForm({ onSuccessNavigateToTrack }: Props) {
  const [lat, setLat] = useState(SISAKET_CENTER.lat);
  const [lng, setLng] = useState(SISAKET_CENTER.lng);
  const [district, setDistrict] = useState('เมืองศรีสะเกษ');
  const [contextPhoto, setContextPhoto] = useState('');
  const [closeupPhoto, setCloseupPhoto] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate clean tracking code prefix
  const trackingCodePreview = `SK${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;

  const handleChipClick = (chipText: string) => {
    if (!landmark.includes(chipText)) {
      setLandmark((prev) => (prev ? `${prev} (${chipText})` : `${chipText} `));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Anti-Spam Rate Limit Check (15s cooldown per device)
    if (typeof window !== 'undefined') {
      const lastSubmit = localStorage.getItem('sisaket_last_submission_time');
      if (lastSubmit) {
        const elapsed = (Date.now() - parseInt(lastSubmit, 10)) / 1000;
        if (elapsed < 15) {
          setErrorMsg(`กรุณารอสักครู่ (${Math.ceil(15 - elapsed)} วินาที) ก่อนส่งรายงานถัดไป เพื่อป้องกันระบบสแปม`);
          return;
        }
      }
    }

    // Validation
    if (!isWithinSisaket(lat, lng)) {
      setErrorMsg('พิกัดอยู่นอกพื้นที่ 22 อำเภอ จังหวัดศรีสะเกษ');
      return;
    }

    if (!contextPhoto || !closeupPhoto) {
      setErrorMsg('กรุณาแนบรูปภาพให้ครบทั้ง 2 รูป (1. ภาพมุมกว้าง + 2. ภาพระยะใกล้)');
      return;
    }

    if (!landmark.trim() || landmark.trim().length < 5) {
      setErrorMsg('กรุณาระบุจุดสังเกตหรือสถานที่ใกล้เคียงอย่างน้อย 5 ตัวอักษร');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์ติดต่อ 10 หลักที่ถูกต้อง (เช่น 0812345678) สำหรับเจ้าหน้าที่โทรประสานงาน');
      return;
    }

    try {
      setIsSubmitting(true);

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `${trackingCodePreview}-${randomNum}`;

      // อัปโหลดรูปทั้ง 2 รูปขึ้น Cloud Storage แบบขนาน (Parallel Uploads)
      const [uploadedCtxUrl, uploadedDmgUrl] = await Promise.all([
        uploadDataUrlToStorage(contextPhoto, generatedCode, 'ctx'),
        uploadDataUrlToStorage(closeupPhoto, generatedCode, 'dmg'),
      ]);

      const newReport = await roadStore.addReport({
        tracking_code: generatedCode,
        reporter_phone: cleanPhone,
        latitude: lat,
        longitude: lng,
        district: district,
        landmark_description: landmark.trim(),
        photo_context_url: uploadedCtxUrl,
        photo_closeup_url: uploadedDmgUrl,
        severity_level: severity,
        status: 'PENDING',
      });

      setSubmittedCode(newReport.tracking_code);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sisaket_last_submission_time', String(Date.now()));
      }
      playAlertChime('success');

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C27803', '#F59E0B', '#10B981', '#3B82F6'],
      });
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!submittedCode) return;
    navigator.clipboard.writeText(submittedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-5">
      {/* Success Modal Dialogue */}
      {submittedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900">บันทึกรายงานสำเร็จ! 🌸</h3>
              <p className="text-xs text-stone-600 mt-1">
                เจ้าหน้าที่ อบจ./แขวงทางหลวง ได้รับเรื่องแล้วและจะตรวจสอบพื้นที่โดยเร็ว
              </p>
            </div>

            {/* Tracking Code Capsule */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <span className="text-[11px] font-medium text-amber-800">รหัสติดตามสถานะของคุณ:</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xl font-black tracking-wider text-amber-950 font-mono">
                  {submittedCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="rounded-lg bg-amber-200/80 p-1.5 text-amber-900 hover:bg-amber-300 transition-colors"
                  title="คัดลอกรหัส"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-600 font-medium">คัดลอกแล้ว!</span>}
            </div>

            <p className="text-[11px] text-stone-500">
              *บันทึกรหัสลงในเครื่องของคุณอัตโนมัติ เปิดดูสถานะได้ตลอดเวลาโดยไม่ต้องล็อกอิน
            </p>

            <button
              onClick={() => {
                const code = submittedCode;
                setSubmittedCode(null);
                onSuccessNavigateToTrack(code);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all"
            >
              <span>ไปที่หน้าติดตามสถานะ</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Report Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Map Picker */}
        <div id="tour-location-section" className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shadow-sm">
              1
            </span>
            <span className="text-sm font-bold text-stone-900">ระบุพิกัดใน 22 อำเภอศรีสะเกษ</span>
          </div>

          <ReportMapPicker
            latitude={lat}
            longitude={lng}
            district={district}
            onLocationChange={(newLat, newLng, newDistrict) => {
              setLat(newLat);
              setLng(newLng);
              setDistrict(newDistrict);
            }}
          />
        </div>

        {/* Step 2: 2 Photos */}
        <div id="tour-photo-section" className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shadow-sm">
              2
            </span>
            <span className="text-sm font-bold text-stone-900">ถ่ายภาพหลักฐาน 2 รูป</span>
          </div>

          <DualPhotoUploader
            contextPhotoUrl={contextPhoto}
            closeupPhotoUrl={closeupPhoto}
            trackingCode={trackingCodePreview}
            onChange={(ctx, dmg) => {
              setContextPhoto(ctx);
              setCloseupPhoto(dmg);
            }}
            onGpsDetected={(photoLat, photoLng) => {
              const nearest = findNearestDistrict(photoLat, photoLng);
              setLat(photoLat);
              setLng(photoLng);
              setDistrict(nearest.name_th);
            }}
          />
        </div>

        {/* Step 3: Mandatory Landmark & Phone */}
        <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white shadow-sm">
              3
            </span>
            <span className="text-sm font-bold text-stone-900">จุดสังเกต & เบอร์โทรติดต่อ</span>
          </div>

          {/* Mandatory Landmark Description */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-amber-600" />
                <span>จุดสังเกต / อยู่ใกล้กับอะไร <span className="text-amber-700">*</span></span>
              </span>
              <span className="text-[10px] text-stone-400">ขั้นต่ำ 5 ตัวอักษร</span>
            </label>

            <textarea
              required
              rows={2}
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="เช่น หน้า ร.ร. บ้านดงกล้วย ตรงข้ามเสาไฟต้นที่ 3 หรือหน้าวัด..."
              className="w-full rounded-2xl border border-stone-300 p-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-stone-50/50"
            />

            {/* Quick Chips Helper */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              <span className="text-[10px] text-stone-400 shrink-0">แตะพิมพ์ไว:</span>
              {QUICK_LANDMARK_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="shrink-0 rounded-full bg-stone-100 hover:bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-stone-700 border border-stone-200 hover:border-amber-300 transition-colors"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Contact Phone */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-amber-600" />
                <span>เบอร์โทรศัพท์ติดต่อ <span className="text-amber-700">* (สำคัญ)</span></span>
              </span>
              <span className="text-[10px] text-stone-400">10 หลัก</span>
            </label>

            <input
              required
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="08XXXXXXXX (สำหรับให้เจ้าหน้าที่โทรประสานงาน)"
              className="w-full rounded-2xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-stone-50/50 font-mono tracking-wider"
            />
            <p className="text-[10px] text-stone-500">
              🔒 ข้อมูลตาม PDPA: เบอร์จะถูกซ่อนบนหน้าสาธารณะ มีเพียงเจ้าหน้าที่เท่านั้นที่เห็นเพื่อโทรติดต่อ
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 py-4 text-sm font-bold text-white shadow-lg shadow-amber-600/25 hover:from-amber-700 hover:to-amber-900 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Sparkles className="h-5 w-5 animate-spin" />
              <span>กำลังส่งข้อมูล...</span>
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              <span>ส่งรายงานจุดชำรุด</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
