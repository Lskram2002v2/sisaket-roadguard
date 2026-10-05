'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Flame,
  ArrowRight,
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
    targetId: 'tour-tab-switcher',
    title: '3 ฟังก์ชันหลักเพื่อชาวศรีสะเกษ',
    description: 'เลือกสลับระหว่าง "แจ้งถนนชำรุด", "ติดตามสถานะงานซ่อม" และ "แผนที่รวม 22 อำเภอ" ได้อย่างสะดวกรวดเร็วในคลิกเดียว',
    badge: 'ขั้นตอนที่ 1 / 5',
    tip: '💡 ระบบโหลดข้อมูลแบบ Instant SWR 0ms สลับแท็บได้ลื่นไหลไม่มีสะดุด',
    position: 'bottom',
  },
  {
    targetId: 'tour-photo-section',
    targetTab: 'report',
    title: 'ถ่ายภาพ 2 มุมมอง (ระยะใกล้ & ไกล)',
    description: 'ช่วยให้ทีมช่างวิเคราะห์ขนาดหลุมผิวทางและความเร่งด่วนได้อย่างแม่นยำ พร้อมบันทึกภาพถ่ายดาวเทียมอัตโนมัติ',
    badge: 'ขั้นตอนที่ 2 / 5',
    tip: '📸 ถ่ายให้เห็นเสาไฟฟ้า อาคาร หรือจุดสังเกตเพื่อความรวดเร็วในการลงพื้นที่',
    position: 'bottom',
  },
  {
    targetId: 'tour-location-section',
    targetTab: 'report',
    title: 'ระบบปักหมุด GIS 22 อำเภอ',
    description: 'ระบบตรวจจับพิกัด GPS อัตโนมัติและจำกัดขอบเขตเฉพาะ 22 อำเภอในจังหวัดศรีสะเกษ พร้อมส่งเรื่องตรงถึงแขวงทางหลวงและ อบจ.',
    badge: 'ขั้นตอนที่ 3 / 5',
    tip: '📍 สามารถลากหมุดบนแผนที่เพื่อระบุตำแหน่งที่แน่นอนได้',
    position: 'top',
  },
  {
    targetId: 'tour-tab-track-btn',
    targetTab: 'track',
    title: 'ติดตามสถานะงานซ่อมแบบเรียลไทม์',
    description: 'ตรวจสอบขั้นตอนการดำเนินงาน (รับเรื่อง ➡️ กำลังซ่อม ➡️ ซ่อมเสร็จสิ้น) พร้อมดูภาพถ่ายหลังซ่อมและร่วมให้คะแนนความพึงพอใจ',
    badge: 'ขั้นตอนที่ 4 / 5',
    tip: '🔍 ค้นหาด้วยรหัสติดตาม เช่น SSK-2026-XXXX หรือเบอร์โทรศัพท์',
    position: 'bottom',
  },
  {
    targetId: 'tour-tab-feed-btn',
    targetTab: 'feed',
    title: 'แผนที่สาธารณะ & จุดเสี่ยง 22 อำเภอ',
    description: 'ดูภาพรวมถนนที่กำลังซ่อมแซมทั่วทั้งจังหวัดศรีสะเกษ พร้อมเส้นแบ่งขอบเขตอำเภอแบบ GeoJSON ที่มีความแม่นยำสูง',
    badge: 'ขั้นตอนที่ 5 / 5',
    tip: '🗺️ กดดูการ์ดเคสเพื่อเปิด Google Maps นำทางไปยังจุดเกิดเหตุได้ทันที',
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
  const [checklist, setChecklist] = useState({
    exploredMap: false,
    checkedTracking: false,
    viewedReportForm: false,
  });
  const [isChecklistCompleted, setIsChecklistCompleted] = useState(false);

  const [mounted, setMounted] = useState(false);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const hasWelcomed = localStorage.getItem('sisaket_onboarding_welcomed');
    if (!hasWelcomed) {
      const timer = setTimeout(() => setShowWelcomeModal(true), 600);
      return () => clearTimeout(timer);
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

  // Update spotlight rect when step changes or window resizes
  useEffect(() => {
    if (!isTourActive) return;

    const step = TOUR_STEPS[currentStepIdx];
    if (step.targetTab && step.targetTab !== activeTab) {
      onSwitchTab(step.targetTab);
    }

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updatePosition, 300);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, currentStepIdx, activeTab]);

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
  };

  const handleNextStep = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      setIsTourActive(false);
      localStorage.setItem('sisaket_onboarding_welcomed', 'true');
      setIsChecklistOpen(true);
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
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">1. ถ่ายรูป & AI ตรวจจับพิกัด</h4>
                  <p className="text-[11px] text-stone-600">แนบภาพระยะใกล้-ไกล ระบุพิกัด GPS อัตโนมัติใน 22 อำเภอ</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-purple-50/80 p-3 border border-purple-200/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">2. ติดตามสถานะงานซ่อมสด</h4>
                  <p className="text-[11px] text-stone-600">รู้ทุกขั้นตอนการดำเนินงาน พร้อมดูภาพหลังซ่อมและให้คะแนน</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/80 p-3 border border-emerald-200/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <MapIcon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">3. แผนที่สาธารณะ 22 อำเภอ</h4>
                  <p className="text-[11px] text-stone-600">สำรวจจุดแจ้งซ่อมและเส้นทางปลอดภัยทั่วศรีสะเกษแบบเรียลไทม์</p>
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
                <span>เริ่มทัวร์แนะนำการใช้งาน (5 สเต็ป)</span>
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

      {/* 2. Interactive Guided Tour (Spotlight Overlay & Coach Mark Tooltip) */}
      {isTourActive && step && (
        <div className="fixed inset-0 z-[9998] pointer-events-auto">
          {/* Dark Backdrop */}
          <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-[2px] transition-all duration-300" />

          {/* Spotlight Cutout Glow around target element */}
          {targetRect && (
            <div
              className="absolute rounded-2xl ring-4 ring-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)] pointer-events-none transition-all duration-300 ease-out z-10"
              style={{
                top: `${targetRect.top + window.scrollY - 6}px`,
                left: `${targetRect.left + window.scrollX - 6}px`,
                width: `${targetRect.width + 12}px`,
                height: `${targetRect.height + 12}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          )}

          {/* Coach Mark / Tooltip Dialog */}
          <div
            className="fixed z-20 left-1/2 -translate-x-1/2 w-[92%] max-w-sm rounded-3xl bg-white p-5 shadow-2xl border-2 border-amber-300 text-stone-900 space-y-3.5 animate-fadeIn"
            style={{
              top: targetRect
                ? step.position === 'top'
                  ? Math.max(20, targetRect.top - 230)
                  : Math.min(window.innerHeight - 250, targetRect.bottom + 20)
                : '30%',
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
              <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>{step.title}</span>
              </h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Pro Tip */}
            {step.tip && (
              <div className="rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-900 border border-amber-200">
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
                    className={`h-2 rounded-full transition-all ${
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
                    className="flex items-center gap-1 rounded-xl bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>ก่อนหน้า</span>
                  </button>
                )}

                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-amber-700"
                >
                  <span>{currentStepIdx === TOUR_STEPS.length - 1 ? 'เสร็จสิ้น 🎉' : 'ถัดไป'}</span>
                  {currentStepIdx < TOUR_STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating Onboarding Checklist Widget (Interactive Walkthrough Quests) */}
      <div className="fixed bottom-20 left-4 z-40">
        {!isChecklistOpen ? (
          <button
            onClick={() => setIsChecklistOpen(true)}
            className="flex items-center gap-2 rounded-full bg-stone-900/90 text-white px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-md border border-amber-400/40 hover:bg-stone-900 transition-all hover:scale-105 active:scale-95"
            title="คลิกเพื่อดูภารกิจเริ่มต้นใช้งาน"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
              {completedCount === totalTasks ? '✓' : `${completedCount}/${totalTasks}`}
            </span>
            <span>ภารกิจเรียนรู้ระบบ</span>
            <span className="text-[10px] text-amber-300 font-mono">({progressPercent}%)</span>
          </button>
        ) : (
          <div className="w-80 rounded-3xl bg-white p-4 shadow-2xl border border-stone-200 text-stone-900 space-y-3 animate-scaleUp">
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
    </>
  );
}
