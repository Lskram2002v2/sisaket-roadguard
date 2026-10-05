'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, MapPin, ShieldCheck, Compass, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { roadStore } from '@/lib/db-store';
import { RoadReport } from '@/lib/types';

// แกลเลอรีสถานที่ท่องเที่ยวและแลนด์มาร์กสำคัญของจังหวัดศรีสะเกษ
const SISAKET_LANDMARKS = [
  {
    title: 'ผามออีแดง & เขาพระวิหาร',
    district: 'อ.กันทรลักษ์',
    img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80',
    tag: 'แลนด์มาร์กยอดนิยม',
  },
  {
    title: 'ปราสาทหินสระกำแพงใหญ่',
    district: 'อ.อุทุมพรพิสัย',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80',
    tag: 'ขอมโบราณพันปี',
  },
  {
    title: 'วัดพระธาตุสุพรรณหงส์',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
    tag: 'เรือหงส์กลางน้ำ',
  },
  {
    title: 'สวนสมเด็จพระศรีนครินทร์ (ดงลำดวน)',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80',
    tag: 'ลำดวน 50,000 ต้น',
  },
];

interface SisaketHeaderProps {
  onStartTour?: () => void;
}

export default function SisaketHeader({ onStartTour }: SisaketHeaderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [reports, setReports] = useState<RoadReport[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
    };
    fetch();
    const unsub = roadStore.subscribe(() => fetch());

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SISAKET_LANDMARKS.length);
    }, 5000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const total = reports.length;
  const inProgress = reports.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'VERIFIED').length;
  const resolved = reports.filter((r) => r.status === 'RESOLVED').length;

  return (
    <header className="relative w-full overflow-hidden rounded-b-3xl bg-stone-900 text-white shadow-xl">
      {/* Background Slideshow with subtle overlay */}
      <div className="absolute inset-0 z-0">
        {SISAKET_LANDMARKS.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              idx === currentSlide ? 'opacity-40 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{
              backgroundImage: `url(${item.img})`,
              transitionProperty: 'opacity, transform',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/85 to-stone-900/65" />
      </div>

      {/* Header Content with 100% Mobile-Friendly Grid */}
      <div className="relative z-10 px-3.5 pt-4 pb-5 space-y-3">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-inner">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                  SISAKET ROADGUARD
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                  22 อำเภอ
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                ศรีสะเกษถนนดี <span className="text-amber-300 font-normal text-xs sm:text-sm">🌸 สวย ไร้หลุม</span>
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onStartTour && (
              <button
                onClick={onStartTour}
                className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-2 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md hover:bg-amber-500/30 transition-all border border-amber-400/30 active:scale-95 shadow-sm"
                title="เปิดแนะนำการใช้งานระบบ"
              >
                <Compass className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] sm:text-xs">วิธีใช้งาน</span>
              </button>
            )}

            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-medium text-stone-200 backdrop-blur-md hover:bg-white/20 transition-all border border-white/10 active:scale-95 shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">เจ้าหน้าที่</span>
            </Link>
          </div>
        </div>

        {/* Tourist Landmark Tag & Slide Indicator */}
        <div className="flex items-center justify-between text-[11px] text-stone-300 bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Compass className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate font-semibold text-stone-100">{SISAKET_LANDMARKS[currentSlide].title}</span>
            <span className="text-stone-400 text-[10px] shrink-0">({SISAKET_LANDMARKS[currentSlide].district})</span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            {SISAKET_LANDMARKS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? 'w-3.5 bg-amber-400' : 'w-1.5 bg-white/30'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Clean Stats Bar (3 Equal Columns) */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>แจ้งทั้งหมด</span>
            </div>
            <div className="mt-0.5 text-base sm:text-lg font-extrabold text-white">{total}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-amber-300">
              <Wrench className="h-3 w-3 text-amber-400" />
              <span>กำลังซ่อม</span>
            </div>
            <div className="mt-0.5 text-base sm:text-lg font-extrabold text-amber-400">{inProgress}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-2 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>ซ่อมเสร็จแล้ว</span>
            </div>
            <div className="mt-0.5 text-base sm:text-lg font-extrabold text-emerald-400">{resolved}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
