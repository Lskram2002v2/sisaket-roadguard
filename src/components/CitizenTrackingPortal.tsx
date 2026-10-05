'use client';

import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, Wrench, ShieldAlert, Star, Share2, Phone, MapPin, Eye, Sparkles, ThumbsUp, Globe } from 'lucide-react';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { SISAKET_DISTRICTS } from '@/lib/geofence';

interface Props {
  initialCode?: string;
}

export default function CitizenTrackingPortal({ initialCode }: Props) {
  const [searchQuery, setSearchQuery] = useState(initialCode || '');
  const [myReports, setMyReports] = useState<RoadReport[]>([]);
  const [allReports, setAllReports] = useState<RoadReport[]>([]);
  const [activeReport, setActiveReport] = useState<RoadReport | null>(null);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'my_wallet' | 'community' | 'search'>('my_wallet');
  const [communityDistrict, setCommunityDistrict] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 1. โหลดข้อมูลแคชทันที 0ms
    syncData(roadStore.getReportsInstant());
    
    // 2. ซิงค์ข้อมูลล่าสุดจาก Supabase ใน background
    loadAllData();

    const unsub = roadStore.subscribe(() => {
      syncData(roadStore.getReportsInstant());
    });
    return () => unsub();
  }, [initialCode]);

  const syncData = (all: RoadReport[]) => {
    setAllReports(all);
    const myCodes = roadStore.getMyReportedCodes();
    const matched = all.filter((r) => myCodes.includes(r.tracking_code));
    setMyReports(matched);

    if (initialCode) {
      const found = all.find(
        (r) => r.tracking_code.toUpperCase() === initialCode.toUpperCase()
      );
      if (found) {
        setActiveReport(found);
        setActiveTab('search');
      }
    } else if (matched.length > 0 && !activeReport) {
      setActiveReport(matched[0]);
    } else if (!activeReport && all.length > 0) {
      setActiveReport(all[0]);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const all = await roadStore.getAllReports(true);
      syncData(all);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const all = await roadStore.getAllReports();
    const query = searchQuery.trim().toUpperCase();

    const found = all.find(
      (r) =>
        r.tracking_code.toUpperCase() === query ||
        r.reporter_phone.replace(/\D/g, '') === query.replace(/\D/g, '')
    );

    if (found) {
      setActiveReport(found);
    } else {
      alert('ไม่พบข้อมูลรายงานสำหรับรหัสหรือเบอร์โทรนี้');
    }
  };

  const handleRatingSubmit = async () => {
    if (!activeReport) return;
    await roadStore.submitRating(activeReport.tracking_code, ratingVal, ratingFeedback);
    setRatingSubmitted(true);
    await loadAllData();
  };

  const handleUpvote = async (code: string) => {
    await roadStore.upvoteReport(code);
    await loadAllData();
    if (activeReport && activeReport.tracking_code === code) {
      setActiveReport((prev) => prev ? { ...prev, upvote_count: prev.upvote_count + 1 } : null);
    }
  };

  const handleShare = () => {
    if (!activeReport) return;
    const url = window.location.href;
    const text = `ติดตามสถานะการซ่อมถนนศรีสะเกษ รหัส: ${activeReport.tracking_code} (${activeReport.district}) สถานะ: ${activeReport.status}`;
    if (navigator.share) {
      navigator.share({ title: 'Sisaket RoadGuard', text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert('คัดลอกลิงก์รายงานแล้ว สามารถนำไปส่งใน LINE หรือแชร์ได้เลยครับ!');
    }
  };

  const filteredCommunity = communityDistrict === 'ALL'
    ? allReports
    : allReports.filter((r) => r.district === communityDistrict);

  return (
    <div className="w-full space-y-4">
      {/* Top 3-Tab Mode Switcher */}
      <div className="rounded-3xl bg-white p-3.5 shadow-sm border border-stone-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-1 w-full rounded-2xl bg-stone-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('my_wallet')}
              className={`rounded-xl py-2 transition-all text-center truncate px-1 ${
                activeTab === 'my_wallet'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ประวัติของฉัน ({myReports.length})
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`rounded-xl py-2 transition-all text-center truncate px-1 flex items-center justify-center gap-1 ${
                activeTab === 'community'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>เคสอื่นๆ ({allReports.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`rounded-xl py-2 transition-all text-center truncate px-1 ${
                activeTab === 'search'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ค้นหาด้วยรหัส
            </button>
          </div>
        </div>

        {/* Live Sync Status Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50/90 border border-amber-200/80 py-1.5 px-3 rounded-xl animate-pulse">
            <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-600" />
            <span>กำลังซิงค์ข้อมูลสดจากระบบคลาวด์...</span>
          </div>
        )}

        {/* Search Input Box */}
        {activeTab === 'search' && (
          <form onSubmit={handleSearch} className="flex gap-2 pt-1 animate-fadeIn">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="กรอกรหัส SK2610-XXXX หรือเบอร์โทร 10 หลัก"
              className="w-full rounded-2xl border border-stone-300 px-3.5 py-2 text-xs font-mono text-stone-800 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-stone-50"
            />
            <button
              type="submit"
              className="rounded-2xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 active:scale-95 transition-all shrink-0 flex items-center gap-1"
            >
              <Search className="h-3.5 w-3.5" />
              <span>ค้นหา</span>
            </button>
          </form>
        )}

        {/* My Reports Quick Carousel */}
        {activeTab === 'my_wallet' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 animate-fadeIn">
            {myReports.length === 0 ? (
              <div className="py-2 text-center text-xs text-stone-400 w-full">
                ยังไม่มีประวัติการแจ้งในเครื่องนี้ เมื่อคุณส่งรายงาน รหัสจะปรากฏที่นี่อัตโนมัติ
              </div>
            ) : (
              myReports.map((r) => {
                const isSelected = activeReport?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r)}
                    className={`shrink-0 rounded-2xl p-2.5 text-left transition-all border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-stone-900">{r.tracking_code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1 truncate max-w-[140px]">
                      {r.district}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Community Reports Carousel with District Filter */}
        {activeTab === 'community' && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setCommunityDistrict('ALL')}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
                  communityDistrict === 'ALL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                ทุกอำเภอ
              </button>
              {SISAKET_DISTRICTS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setCommunityDistrict(d.name_th)}
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-medium ${
                    communityDistrict === d.name_th
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {d.name_th}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {filteredCommunity.map((r) => {
                const isSelected = activeReport?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r)}
                    className={`shrink-0 rounded-2xl p-2.5 text-left transition-all border ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-stone-900">{r.tracking_code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-[11px] text-stone-600 mt-1 font-medium truncate max-w-[150px]">
                      อ.{r.district}
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-0.5">
                      <ThumbsUp className="h-3 w-3" />
                      <span>+{r.upvote_count || 1} โหวต</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Report Detail View */}
      {activeReport ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-stone-200/90 space-y-5">
          {/* Header of Report */}
          <div className="flex items-start justify-between border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black font-mono text-stone-900">
                  {activeReport.tracking_code}
                </span>
                <StatusBadge status={activeReport.status} />
              </div>
              <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>อ.{activeReport.district}</span>
                <span>• แจ้งเมื่อ {new Date(activeReport.created_at).toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleUpvote(activeReport.tracking_code)}
                className="flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 active:scale-95 transition-all"
                title="กดสนับสนุนเคสนี้"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>+{activeReport.upvote_count || 1}</span>
              </button>

              <button
                onClick={handleShare}
                className="rounded-xl bg-stone-100 p-2 text-stone-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                title="แชร์รายงาน"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 4-Stage Visual Progress Timeline */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              สถานะการดำเนินการ (PROGRESS TIMELINE)
            </span>

            <Timeline4Stages status={activeReport.status} />

            {/* Admin / Team Note */}
            {activeReport.admin_notes && (
              <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-950">
                  <Wrench className="h-3.5 w-3.5 text-amber-700" />
                  <span>บันทึกจากหน่วยงาน:</span>
                </div>
                <p>{activeReport.admin_notes}</p>
                {activeReport.assigned_team && (
                  <div className="text-[10px] text-amber-800 mt-1">
                    ผู้รับผิดชอบ: {activeReport.assigned_team}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Landmark & Photos View */}
          <div className="space-y-3 pt-1">
            <div className="rounded-2xl bg-stone-50 p-3 border border-stone-200/70">
              <span className="text-[11px] font-semibold text-stone-500">จุดสังเกตที่ระบุ:</span>
              <p className="text-xs font-medium text-stone-800 mt-0.5">
                {activeReport.landmark_description}
              </p>
            </div>

            {/* Photos Display */}
            <div>
              <span className="text-xs font-bold text-stone-700 mb-2 block">
                ภาพถ่ายหลักฐาน (2 รูป)
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <img
                    src={activeReport.photo_context_url}
                    alt="ภาพมุมกว้าง"
                    className="h-32 w-full rounded-2xl object-cover border border-stone-200 shadow-sm"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block text-center">1. ภาพมุมกว้าง</span>
                </div>
                <div>
                  <img
                    src={activeReport.photo_closeup_url}
                    alt="ภาพระยะใกล้"
                    className="h-32 w-full rounded-2xl object-cover border border-stone-200 shadow-sm"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block text-center">2. ภาพระยะใกล้</span>
                </div>
              </div>
            </div>

            {/* Before / After Resolution Showcase if Resolved */}
            {activeReport.status === 'RESOLVED' && activeReport.resolution_photo_url && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>ผลงานการซ่อมแซมเสร็จสิ้น (BEFORE & AFTER)</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <img
                      src={activeReport.photo_closeup_url}
                      alt="ก่อนซ่อม"
                      className="h-32 w-full rounded-xl object-cover border border-emerald-200"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                      ก่อนซ่อม
                    </span>
                  </div>
                  <div className="relative">
                    <img
                      src={activeReport.resolution_photo_url}
                      alt="หลังซ่อมเสร็จ"
                      className="h-32 w-full rounded-xl object-cover border border-emerald-300 ring-2 ring-emerald-400/50"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[9px] text-white font-bold">
                      หลังซ่อมเสร็จ ✨
                    </span>
                  </div>
                </div>

                {/* 5-Star Satisfaction Rating Form */}
                <div className="pt-2 border-t border-emerald-200/80 space-y-2">
                  <span className="text-xs font-bold text-emerald-950">
                    ให้คะแนนความพึงพอใจการปฏิบัติงาน
                  </span>

                  {activeReport.rating || ratingSubmitted ? (
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= (activeReport.rating || ratingVal)
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-emerald-800 ml-2 font-normal">
                        ขอบคุณสำหรับการประเมิน!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRatingVal(s)}
                            className="p-1 text-stone-300 hover:text-amber-400"
                          >
                            <Star
                              className={`h-6 w-6 transition-all ${
                                s <= ratingVal
                                  ? 'fill-amber-400 text-amber-500 scale-110'
                                  : 'text-stone-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={ratingFeedback}
                        onChange={(e) => setRatingFeedback(e.target.value)}
                        placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..."
                        className="w-full rounded-xl border border-emerald-200 px-3 py-1.5 text-xs text-stone-800 bg-white"
                      />

                      <button
                        type="button"
                        onClick={handleRatingSubmit}
                        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        ส่งคะแนนประเมิน
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-white p-8 text-center text-stone-400 border border-stone-200/90">
          กรุณาเลือกหรือค้นหารายงานเพื่อดูความคืบหน้า
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 border border-stone-200">
          รอรับเรื่อง
        </span>
      );
    case 'VERIFIED':
      return (
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
          รับเรื่องแล้ว
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
          กำลังซ่อมแซม
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-300">
          ซ่อมเสร็จสิ้น ✨
        </span>
      );
    case 'REJECTED':
      return (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
          ปฏิเสธ/ส่งต่อ
        </span>
      );
    default:
      return null;
  }
}

function Timeline4Stages({ status }: { status: string }) {
  const stages = [
    { key: 'PENDING', label: '1. รับแจ้ง' },
    { key: 'VERIFIED', label: '2. ตรวจสอบ' },
    { key: 'IN_PROGRESS', label: '3. กำลังซ่อม' },
    { key: 'RESOLVED', label: '4. เสร็จสิ้น' },
  ];

  const getActiveIndex = () => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'VERIFIED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLVED':
        return 3;
      default:
        return 0;
    }
  };

  const activeIdx = getActiveIndex();

  return (
    <div className="grid grid-cols-4 gap-1.5 text-center">
      {stages.map((stage, idx) => {
        const isPastOrCurrent = idx <= activeIdx;
        const isCurrent = idx === activeIdx;

        return (
          <div key={stage.key} className="space-y-1">
            <div
              className={`h-2 rounded-full transition-all ${
                isPastOrCurrent
                  ? idx === 3
                    ? 'bg-emerald-500'
                    : 'bg-amber-600'
                  : 'bg-stone-200'
              } ${isCurrent ? 'ring-2 ring-amber-400/50' : ''}`}
            />
            <span
              className={`text-[10px] font-medium block leading-tight ${
                isPastOrCurrent ? 'text-stone-900 font-bold' : 'text-stone-400'
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
