'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  MapPin,
  Camera,
  Search,
  Map as MapIcon,
  Compass,
  Award,
  Layers,
  ArrowRight,
  FileText,
  Phone,
  ShieldCheck,
} from 'lucide-react';

export interface TourStep {
  targetId: string;
  targetTab?: 'report' | 'track' | 'feed';
  title: string;
  description: string;
  tip?: string;
  badge?: string;
  position?: 'top' | 'bottom' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-location-section',
    targetTab: 'report',
    title: '1. แตะดึงพิกัด GPS อัตโนมัติ (หรือลากหมุด)',
    description: 'เมื่อยืนใกล้จุดชำรุด ให้แตะปุ่ม "📍 ดึงพิกัด GPS มือถือ" ระบบจะล็อกพิกัดดาวเทียมความแม่นยำสูง (5-10 เมตร) และเลือกอำเภอให้ทันที หรือหากแจ้งจากที่บ้าน สามารถใช้นิ้วลากหมุดสีทองไปวางบนจุดเกิดเหตุได้เอง',
    badge: 'ขั้นตอนที่ 1 / 5',
    tip: '💡 แตะปุ่มเดียว พิกัดและอำเภอจะถูกป้อนเข้าฟอร์มให้อัตโนมัติ ไม่ต้องพิมพ์ตัวเลขเอง',
    position: 'top',
  },
  {
    targetId: 'tour-photo-section',
    targetTab: 'report',
    title: '2. แนบภาพหลักฐาน 2 รูป (มุมกว้าง + ระยะใกล้)',
    description: '• รูปที่ 1 (ภาพมุมกว้าง): ถ่ายให้เห็นแนวถนน เสาไฟ อาคาร หรือทางแยก เพื่อให้ช่างขับรถมาถูกจุด\n• รูปที่ 2 (ภาพระยะใกล้): ถ่ายเจาะที่ตัวหลุม/รอยแตกร้าว เพื่อให้ช่างประเมินปริมาณยางมะตอยหรือหินคลุกได้ถูกต้อง',
    badge: 'ขั้นตอนที่ 2 / 5',
    tip: '📸 สามารถเลือกถ่ายสดจากกล้อง หรือกดเลือกรูปภาพที่เคยถ่ายเก็บไว้ในมือถือได้',
    position: 'top',
  },
  {
    targetId: 'tour-details-section',
    targetTab: 'report',
    title: '3. กรอกจุดสังเกต & เบอร์โทรติดต่อ (สำคัญ)',
    description: 'แบ่งออกเป็น 2 ช่องที่ต้องกรอกดังนี้:\n\n1️⃣ ช่องจุดสังเกต: พิมพ์บอกจุดอ้างอิงริมทางที่มองเห็นชัดเจน เช่น "หน้าโรงเรียนบ้านดงกล้วย ตรงข้ามเสาไฟต้นที่ 3", "ก่อนถึงสะพาน 50 เมตร" หรือ "ตรงข้ามวัด" (มีปุ่มลัดด้านล่างให้แตะพิมพ์ไว)\n\n2️⃣ ช่องเบอร์โทรติดต่อ: กรอกเบอร์มือถือ 10 หลัก (เช่น 08XXXXXXXX) สำหรับให้เจ้าหน้าที่ อบจ. หรือแขวงทางหลวง โทรสอบถามเส้นทางหน้างาน',
    badge: 'ขั้นตอนที่ 3 / 5',
    tip: '🔒 ข้อมูลปลอดภัยตาม PDPA: เบอร์โทรจะถูกซ่อนจากหน้าสาธารณะ มีเพียงเจ้าหน้าที่เท่านั้นที่เห็น',
    position: 'top',
  },
  {
    targetId: 'tour-tab-track-btn',
    targetTab: 'track',
    title: '4. ติดตามสถานะงานซ่อมแบบเรียลไทม์',
    description: 'หลังกดส่งรายงาน ระบบจะออกรหัสติดตาม (เช่น SK2603-XXXX) ให้อัตโนมัติ สามารถเข้ามาเช็คขั้นตอนการซ่อม (รับเรื่อง ➡️ กำลังซ่อม ➡️ ซ่อมเสร็จสิ้น) พร้อมดูภาพถ่ายหลังซ่อมและร่วมให้คะแนนความพึงพอใจได้ตลอด 24 ชม.',
    badge: 'ขั้นตอนที่ 4 / 5',
    tip: '🔍 ระบบจำรหัสติดตามไว้ในเครื่องให้อัตโนมัติ ไม่ต้องสมัครสมาชิกหรือจำรหัสผ่าน',
    position: 'bottom',
  },
  {
    targetId: 'tour-tab-feed-btn',
    targetTab: 'feed',
    title: '5. แผนที่ภาพรวมความปลอดภัย 22 อำเภอ',
    description: 'สำรวจจุดแจ้งซ่อมถนนทั่วทั้ง 22 อำเภอใน จ.ศรีสะเกษ ดูภาพถ่ายสภาพถนนบนแผนที่ และสามารถแตะที่การ์ดเคสเพื่อเปิด Google Maps นำทางไปยังจุดเกิดเหตุได้ทันที',
    badge: 'ขั้นตอนที่ 5 / 5',
    tip: '🗺️ แตะการ์ดเคสเพื่อดูรูปถ่ายเปรียบเทียบและเส้นทางนำทาง',
    position: 'bottom',
  },
];

interface UserOnboardingTourProps {
  activeTab: 'report' | 'track' | 'feed';
  onSwitchTab: (tab: 'report' | 'track' | 'feed') => void;
}

export default function UserOnboardingTour({ activeTab, onSwitchTab }: UserOnboardingTourProps) {
  // Modal & Tour States
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Checklist State
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isChecklistDismissed, setIsChecklistDismissed] = useState(false);
  const [checklist, setChecklist] = useState({
    exploredMap: false,
    checkedTracking: false,
    viewedReportForm: false,
  });
  const [isChecklistCompleted, setIsChecklistCompleted] = useState(false);

  const [mounted, setMounted] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const hasWelcomed = localStorage.getItem('sisaket_onboarding_welcomed');
    if (!hasWelcomed) {
      const timer = setTimeout(() => setShowWelcomeModal(true), 500);
      return () => clearTimeout(timer);
    }

    const dismissed = localStorage.getItem('sisaket_checklist_dismissed');
    if (dismissed === 'true') {
      setIsChecklistDismissed(true);
    }

    const savedChecklist = localStorage.getItem('sisaket_checklist_state');
    if (savedChecklist) {
      try {
        const parsed = JSON.parse(savedChecklist);
        setChecklist(parsed);
      } catch {
        // Ignore
      }
    }
  }, []);

  // Sync Checklist with User Actions
  useEffect(() => {
    if (activeTab === 'feed' && !checklist.exploredMap) {
      updateChecklist('exploredMap', true);
    } else if (activeTab === 'track' && !checklist.checkedTracking) {
      updateChecklist('checkedTracking', true);
    } else if (activeTab === 'report' && !checklist.viewedReportForm) {
      updateChecklist('viewedReportForm', true);
    }
  }, [activeTab]);

  const updateChecklist = (key: keyof typeof checklist, value: boolean) => {
    setChecklist((prev) => {
      const updated = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('sisaket_checklist_state', JSON.stringify(updated));
      }
      if (updated.exploredMap && updated.checkedTracking && updated.viewedReportForm) {
        setIsChecklistCompleted(true);
      }
      return updated;
    });
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalTasks = 3;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // Measure and update target spotlight position smoothly without lag
  const updateSpotlightPosition = useCallback(() => {
    if (!isTourActive) return;
    const step = TOUR_STEPS[currentStepIdx];
    if (!step) return;

    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isTourActive, currentStepIdx]);

  // Handle Step changes, tab synchronization and smooth scrolling
  useEffect(() => {
    if (!isTourActive) return;

    const step = TOUR_STEPS[currentStepIdx];
    if (!step) return;

    // Switch tab if step belongs to another tab
    if (step.targetTab && step.targetTab !== activeTab) {
      onSwitchTab(step.targetTab);
    }

    const scrollToAndMeasure = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    const timer = setTimeout(scrollToAndMeasure, 60);

    const handleScrollOrResize = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateSpotlightPosition);
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });

    return () => {
      clearTimeout(timer);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isTourActive, currentStepIdx, activeTab, onSwitchTab, updateSpotlightPosition]);

  const handleStartTour = () => {
    setShowWelcomeModal(false);
    localStorage.setItem('sisaket_onboarding_welcomed', 'true');
    setCurrentStepIdx(0);
    setIsTourActive(true);
  };

  const handleSkipTour = () => {
    setIsTourActive(false);
    setShowWelcomeModal(false);
    localStorage.setItem('sisaket_onboarding_welcomed', 'true');
    onSwitchTab('report');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextStep = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setIsTourActive(false);
      localStorage.setItem('sisaket_onboarding_welcomed', 'true');
      setIsChecklistOpen(true);
      onSwitchTab('report');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  if (!mounted) return null;

  const step = TOUR_STEPS[currentStepIdx];

  return (
    <>
      {/* 1. Welcome Onboarding Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 text-stone-900 space-y-5 animate-scaleUp">
            {/* Top Close Button */}
            <button
              onClick={handleSkipTour}
              className="absolute top-4 right-4 rounded-full bg-stone-100 p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-all"
              aria-label="ปิดหน้าต่างต้อนรับ"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Floral Sisaket Emblem Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-lg shadow-amber-500/30">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                  ยินดีต้อนรับสู่ระบบ
                </span>
                <h3 className="text-xl font-extrabold text-stone-900 mt-0.5">
                  Sisaket RoadGuard
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              แพลตฟอร์มรับแจ้งและติดตามการซ่อมแซมถนนชำรุด/หลุมบ่อ ครอบคลุมพื้นที่ <strong>22 อำเภอ จังหวัดศรีสะเกษ</strong> เชื่อมต่อตรงสู่แขวงทางหลวงศรีสะเกษและ อบจ.ศรีสะเกษ
            </p>

            {/* 3 Value Pillars */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50/80 p-3 border border-amber-200/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">1. ระบุพิกัด GPS ดาวเทียมแม่นยำสูง</h4>
                  <p className="text-[11px] text-stone-600">ดึงพิกัดจากมือถืออัตโนมัติแม่นยำ 5-10 ม. (หรือปักหมุดเองได้)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-purple-50/80 p-3 border border-purple-200/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">2. ถ่ายภาพ 2 มุม & ใส่จุดสังเกต</h4>
                  <p className="text-[11px] text-stone-600">ภาพมุมกว้าง+ระยะใกล้ พร้อมจุดสังเกตริมทางและเบอร์ติดต่อ</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/80 p-3 border border-emerald-200/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">3. ติดตามสถานะ & แผนที่ 22 อำเภอ</h4>
                  <p className="text-[11px] text-stone-600">เช็คคิวช่างสด ดูภาพหลังซ่อม และสำรวจแผนที่จุดเสี่ยงทั่วศรีสะเกษ</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleStartTour}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-amber-600/30 hover:from-amber-700 hover:to-amber-600 active:scale-[0.98] transition-all"
              >
                <Compass className="h-4 w-4" />
                <span>เริ่มดูวิธีแจ้งซ่อมถนน (5 สเต็ปง่ายๆ)</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>

              <button
                onClick={handleSkipTour}
                className="w-full py-2 text-xs font-medium text-stone-500 hover:text-stone-800 transition-all"
              >
                ข้ามคำแนะนำ • เข้าใช้งานทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Guided Tour (Silky-Smooth Snappy Spotlight & Coach Mark Tooltip) */}
      {isTourActive && step && (
        <div className="fixed inset-0 z-[9998] pointer-events-auto">
          {/* Snappy Spring Hardware-Accelerated Spotlight Cutout */}
          {targetRect ? (
            <div
              className="fixed rounded-2xl ring-4 ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.7)] pointer-events-none z-[9998]"
              style={{
                top: `${Math.max(4, targetRect.top - 6)}px`,
                left: `${Math.max(4, targetRect.left - 6)}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                boxShadow: '0 0 0 9999px rgba(12, 10, 9, 0.78)',
                backgroundColor: 'transparent',
                transition: 'top 180ms cubic-bezier(0.16, 1, 0.3, 1), left 180ms cubic-bezier(0.16, 1, 0.3, 1), width 180ms cubic-bezier(0.16, 1, 0.3, 1), height 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'top, left, width, height',
              }}
            />
          ) : (
            <div className="fixed inset-0 bg-stone-950/78 backdrop-blur-[1px] transition-opacity duration-200 z-[9998]" />
          )}

          {/* Coach Mark / Tooltip Dialog */}
          <div
            className="fixed z-[9999] left-1/2 -translate-x-1/2 w-[92%] max-w-sm rounded-3xl bg-white p-5 shadow-2xl border-2 border-amber-300 text-stone-900 space-y-3.5 animate-fadeIn"
            style={{
              top: targetRect
                ? step.position === 'top'
                  ? Math.max(16, targetRect.top - 245)
                  : Math.min(window.innerHeight - 260, targetRect.bottom + 14)
                : '25%',
              transition: 'top 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header with Step indicator */}
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                {step.badge || `ขั้นตอนที่ ${currentStepIdx + 1}/${TOUR_STEPS.length}`}
              </span>
              <button
                onClick={handleSkipTour}
                className="text-xs font-semibold text-stone-400 hover:text-stone-700"
              >
                ข้ามทัวร์
              </button>
            </div>

            {/* Title & Description */}
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{step.title}</span>
              </h4>
              <div className="text-xs text-stone-600 mt-1 leading-relaxed whitespace-pre-line">
                {step.description}
              </div>
            </div>

            {/* Pro Tip */}
            {step.tip && (
              <div className="rounded-xl bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200">
                {step.tip}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-stone-100">
              {/* Progress Dots */}
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      idx === currentStepIdx
                        ? 'w-5 bg-amber-600'
                        : idx < currentStepIdx
                        ? 'w-2 bg-emerald-500'
                        : 'w-2 bg-stone-300'
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next Controls */}
              <div className="flex items-center gap-2">
                {currentStepIdx > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className="flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-200 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>ก่อนหน้า</span>
                  </button>
                )}

                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:from-amber-700 hover:to-amber-600 active:scale-95 transition-all"
                >
                  <span>{currentStepIdx === TOUR_STEPS.length - 1 ? 'เริ่มใช้งานทันที 🎉' : 'ถัดไป'}</span>
                  {currentStepIdx < TOUR_STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Onboarding Checklist Widget (Interactive Walkthrough Quests) */}
      {!isChecklistDismissed && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:left-6 z-40">
          {!isChecklistOpen ? (
            <div className="flex items-center gap-1 bg-stone-900/90 text-white rounded-full p-1 pr-2 shadow-2xl backdrop-blur-md border border-amber-400/40 hover:bg-stone-900 transition-all hover:scale-105">
              <button
                onClick={() => setIsChecklistOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold py-1 px-2 text-left"
                title="คลิกเพื่อดูภารกิจเริ่มต้นใช้งาน"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-stone-950 text-[10px] font-black shrink-0">
                  {completedCount === totalTasks ? '✓' : `${completedCount}/${totalTasks}`}
                </span>
                <span className="text-[11px] font-bold">ภารกิจเรียนรู้</span>
                <span className="text-[10px] text-amber-300 font-mono">({progressPercent}%)</span>
              </button>
              <button
                onClick={() => {
                  setIsChecklistDismissed(true);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('sisaket_checklist_dismissed', 'true');
                  }
                }}
                className="rounded-full p-1 text-stone-400 hover:text-white hover:bg-white/20 transition-all"
                title="ซ่อนแถบภารกิจ"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-[88vw] max-w-xs rounded-3xl bg-white p-4 shadow-2xl border border-stone-200 text-stone-900 space-y-3 animate-scaleUp">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">ภารกิจเริ่มต้นใช้งาน</h4>
                    <span className="text-[10px] text-stone-500">สำเร็จ {completedCount} จาก {totalTasks} ข้อ</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsChecklistOpen(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist Tasks */}
            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  onSwitchTab('feed');
                  updateChecklist('exploredMap', true);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left ${
                  checklist.exploredMap
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-stone-50 border-stone-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {checklist.exploredMap ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-stone-400 shrink-0" />
                  )}
                  <span className={checklist.exploredMap ? 'line-through text-stone-500' : 'font-medium'}>
                    1. สำรวจแผนที่สาธารณะ 22 อำเภอ
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </button>

              <button
                onClick={() => {
                  onSwitchTab('track');
                  updateChecklist('checkedTracking', true);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left ${
                  checklist.checkedTracking
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-stone-50 border-stone-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {checklist.checkedTracking ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-stone-400 shrink-0" />
                  )}
                  <span className={checklist.checkedTracking ? 'line-through text-stone-500' : 'font-medium'}>
                    2. ลองดูระบบติดตามสถานะงานซ่อม
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </button>

              <button
                onClick={() => {
                  onSwitchTab('report');
                  updateChecklist('viewedReportForm', true);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left ${
                  checklist.viewedReportForm
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-stone-50 border-stone-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {checklist.viewedReportForm ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-stone-400 shrink-0" />
                  )}
                  <span className={checklist.viewedReportForm ? 'line-through text-stone-500' : 'font-medium'}>
                    3. เปิดดูฟอร์มแจ้งซ่อมถนน
                  </span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
              </button>
            </div>

            {/* Completed Badge & Relaunch Tour */}
            <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[11px]">
              <button
                onClick={() => {
                  setIsChecklistOpen(false);
                  handleStartTour();
                }}
                className="text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                <Compass className="h-3 w-3" />
                <span>เปิดทัวร์แนะนำใหม่อีกครั้ง</span>
              </button>

              {completedCount === totalTasks && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>เรียนรู้ครบ 100%</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
