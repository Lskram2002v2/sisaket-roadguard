'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, MapPin, ShieldCheck, Compass, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { roadStore } from '@/lib/db-store';
import { RoadReport, HeaderThemeConfig } from '@/lib/types';
import { normalizeImageUrl } from '@/lib/image-helper';

// แกลเลอรีสถานที่ท่องเที่ยวและแลนด์มาร์กสำคัญของจังหวัดศรีสะเกษ
const SISAKET_LANDMARKS = [
  {
    title: 'ตลาดโต้รุ่งศรีนครลำดวน',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://sisakettownmunicipality.go.th/wp-content/uploads/2025/06/%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B9%82%E0%B8%95%E0%B9%89%E0%B8%A3%E0%B8%B8%E0%B9%88%E0%B8%8724-6-68-1-scaled.png',
    tag: 'สตรีทฟู้ดใจกลางเมือง',
  },
  {
    title: 'ซุ่นเฮงพลาซ่า',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcZg3ns6HSRI5YBH_8dkrvBPt3puVR_MPmEVmwR95IvQhV-y39F2KRPPrZ&s=10',
    tag: 'ห้างสรรพสินค้าท้องถิ่น',
  },
  {
    title: 'วัดพระโต (วัดมหาพุทธาราม)',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ29zYAjBuvbwu-EcRJUE6W6miTQ2W7FOvpOXUv8uCqbewtvd3N0G6pFis&s=10',
    tag: 'หลวงพ่อโต พระคู่บ้านคู่เมือง',
  },
  {
    title: 'โคปุระจำลองที่เกาะกลางน้ำศรีสะเกษ',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6KLcoNktH10NP1xIOtB71_BiF4fOLslOV6XfWQCy0Zi9TJ57Lb42DG-CG&s=10',
    tag: 'เกาะห้วยน้ำคำ',
  },
  {
    title: 'ศาลหลักเมืองศรีสะเกษ',
    district: 'อ.เมืองศรีสะเกษ',
    img: 'https://cms.dmpcdn.com/travel/2023/08/13/37106830-39b5-11ee-90ca-8f4eb28950d6_webp_original.webp',
    tag: 'สิ่งศักดิ์สิทธิ์คู่เมือง',
  },
];

interface SisaketHeaderProps {
  onStartTour?: () => void;
}

export default function SisaketHeader({ onStartTour }: SisaketHeaderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [themeConfig, setThemeConfig] = useState<HeaderThemeConfig>({
    mode: 'preset',
    custom_images: [],
    banner_speed_seconds: 5,
    overlay_darkness: 75,
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    const fetch = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
      const theme = await roadStore.getThemeConfig();
      setThemeConfig(theme);
    };
    fetch();

    const unsub = roadStore.subscribe(async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
      const theme = await roadStore.getThemeConfig();
      setThemeConfig(theme);
    });

    return () => {
      unsub();
    };
  }, []);

  // Compute active slides based on theme configuration
  const slides =
    themeConfig.mode === 'custom' && themeConfig.custom_images && themeConfig.custom_images.length > 0
      ? themeConfig.custom_images.map((url, idx) => ({
          title: `ศรีสะเกษเมืองน่าอยู่ (#${idx + 1})`,
          district: 'จังหวัดศรีสะเกษ',
          img: normalizeImageUrl(url),
          tag: 'ภาพประชาสัมพันธ์',
        }))
      : SISAKET_LANDMARKS;

  useEffect(() => {
    if (slides.length <= 1) return;
    const intervalMs = (themeConfig.banner_speed_seconds || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [slides.length, themeConfig.banner_speed_seconds]);

  const total = reports.length;
  const inProgress = reports.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'VERIFIED').length;
  const resolved = reports.filter((r) => r.status === 'RESOLVED').length;

  const activeSlideIndex = currentSlide % (slides.length || 1);
  const activeSlide = slides[activeSlideIndex] || SISAKET_LANDMARKS[0];

  return (
    <header className="relative w-full overflow-hidden rounded-b-3xl bg-stone-900 text-white shadow-xl">
      {/* Background Slideshow with subtle overlay */}
      <div className="absolute inset-0 z-0">
        {slides.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              idx === activeSlideIndex ? 'opacity-40 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{
              backgroundImage: `url(${item.img}), url(${SISAKET_LANDMARKS[0].img})`,
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-md overflow-hidden p-0.5">
              <img
                src="/icons/lamduan-road-icon-4.jpg"
                alt="Sisaket RoadGuard Logo"
                className="h-full w-full object-cover rounded-lg"
              />
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
            <span className="truncate font-semibold text-stone-100">{activeSlide.title}</span>
            <span className="text-stone-400 text-[10px] shrink-0">({activeSlide.district})</span>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeSlideIndex ? 'w-3.5 bg-amber-400' : 'w-1.5 bg-white/30'
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
