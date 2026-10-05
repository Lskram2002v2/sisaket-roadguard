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
    <header className="relative w-full overflow-hidden rounded-b-3xl bg-stone-900 text-white shadow-lg">
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
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-stone-900/60" />
      </div>

      {/* Header Content */}
      <div className="relative z-10 px-4 pt-5 pb-6">
        {/* Top bar with Lamduan Emblem and Admin shortcut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  SISAKET ROADGUARD
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-400/30">
                  22 อำเภอ
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1">
                ศรีสะเกษถนนดี <span className="text-amber-400 text-sm font-normal">🌸 สวย ไร้หลุม</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onStartTour && (
              <button
                onClick={onStartTour}
                className="flex items-center gap-1 rounded-xl bg-amber-500/20 px-2.5 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md hover:bg-amber-500/30 transition-all border border-amber-400/30"
                title="เปิดแนะนำการใช้งานระบบ"
              >
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">วิธีใช้งาน</span>
              </button>
            )}

            <Link
              href="/admin"
              className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-200 backdrop-blur-md hover:bg-white/20 transition-all border border-white/10"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>เจ้าหน้าที่</span>
            </Link>
          </div>
        </div>

        {/* Tourist Landmark Tag & Slide Indicator */}
        <div className="mt-4 flex items-center justify-between text-xs text-stone-300 bg-black/30 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
          <div className="flex items-center gap-1.5 truncate">
            <Compass className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate font-medium">{SISAKET_LANDMARKS[currentSlide].title}</span>
            <span className="text-stone-400 text-[11px]">({SISAKET_LANDMARKS[currentSlide].district})</span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            {SISAKET_LANDMARKS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Quick Clean Stats Bar */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[11px] text-stone-400">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>แจ้งทั้งหมด</span>
            </div>
            <div className="mt-0.5 text-lg font-bold text-white">{total}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[11px] text-amber-300">
              <Wrench className="h-3 w-3 text-amber-400 animate-spin-slow" />
              <span>กำลังซ่อม</span>
            </div>
            <div className="mt-0.5 text-lg font-bold text-amber-400">{inProgress}</div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>ซ่อมเสร็จแล้ว</span>
            </div>
            <div className="mt-0.5 text-lg font-bold text-emerald-400">{resolved}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
