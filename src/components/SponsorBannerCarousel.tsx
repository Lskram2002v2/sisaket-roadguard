'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SponsorBanner } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { normalizeImageUrl } from '@/lib/image-helper';
import { ExternalLink, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SponsorBannerCarousel() {
  const [banners, setBanners] = useState<SponsorBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const loadBanners = async () => {
      const all = await roadStore.getAllBanners();
      const active = all.filter((b) => b.is_active);
      setBanners(active);
    };

    loadBanners();
    const unsub = roadStore.subscribe(() => {
      loadBanners();
    });

    return () => unsub();
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, isPaused]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex] || banners[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      // Swiped Left
      handleNext();
    } else if (diff < -40) {
      // Swiped Right
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      className="relative w-full overflow-hidden rounded-3xl bg-stone-900 border border-stone-800 shadow-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="ป้ายประชาสัมพันธ์และผู้สนับสนุนโครงการ"
    >
      {/* Top Header Label */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1.5 text-[11px] font-bold text-stone-400 border-b border-stone-800/80 bg-stone-950/40">
        <div className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="uppercase tracking-wider">ประชาสัมพันธ์ & ผู้สนับสนุน</span>
        </div>
        <div className="text-[10px] text-stone-400">
          {currentIndex + 1} / {banners.length}
        </div>
      </div>

      {/* Main Banner Slide Container */}
      <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden bg-black/60 select-none">
        {banners.map((item, idx) => {
          const isActive = idx === currentIndex;
          const imageUrl = normalizeImageUrl(item.image_url);

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Banner Image */}
              <img
                src={imageUrl}
                alt={item.title}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80';
                }}
              />

              {/* Gradient Backdrop for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent" />

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 text-white space-y-1">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-white drop-shadow-md line-clamp-1">
                      {item.title}
                    </h4>
                    {item.subtitle && (
                      <p className="text-[10px] sm:text-xs text-stone-300 drop-shadow line-clamp-1 mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>

                  {item.target_link && (
                    <a
                      href={item.target_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-2.5 py-1 text-[11px] font-bold shadow-md transition-all active:scale-95"
                    >
                      <span>รายละเอียด</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows for desktop/tablet */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm transition-all"
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 backdrop-blur-sm transition-all"
              aria-label="ถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Slide Indicator Dots */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-stone-950/80 border-t border-stone-800/80">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-stone-700 hover:bg-stone-500'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
