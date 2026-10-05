'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SponsorBanner } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { normalizeImageUrl, getGoogleDriveThumbnailUrl, FALLBACK_BANNER_IMAGE } from '@/lib/image-helper';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

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

  // Auto-play timer (4.5s)
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

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  const handleBannerClick = (link?: string) => {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="relative w-full select-none space-y-2.5 pt-1 pb-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Simple Image Carousel"
    >
      {/* 1. Main Image Box */}
      <div
        onClick={() => handleBannerClick(currentBanner.target_link)}
        className={`group relative h-44 sm:h-56 md:h-64 w-full overflow-hidden rounded-3xl bg-stone-950 border border-stone-200/80 shadow-md transition-all ${
          currentBanner.target_link ? 'cursor-pointer active:scale-[0.99]' : ''
        }`}
      >
        {banners.map((item, idx) => {
          const isActive = idx === currentIndex;
          const imageUrl = normalizeImageUrl(item.image_url);

          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Full Main Image */}
              <img
                src={imageUrl}
                alt={item.title || `Banner ${idx + 1}`}
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const thumbUrl = getGoogleDriveThumbnailUrl(item.image_url);
                  if (target.src !== thumbUrl && thumbUrl !== target.src) {
                    target.src = thumbUrl;
                  } else {
                    target.src = FALLBACK_BANNER_IMAGE;
                  }
                }}
              />

              {/* Optional Subtle Link Indicator Icon on Top Right if link exists */}
              {item.target_link && (
                <div className="absolute top-2.5 right-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-md border border-white/20 shadow-sm">
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* 2. Navigation Arrows (Left & Right) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95"
              aria-label="รูปภาพก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md border border-white/20 shadow-md transition-all active:scale-95"
              aria-label="รูปภาพถัดไป"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </>
        )}
      </div>

      {/* 3. Pagination Dots (จุดไข่ปลาด้านล่างภาพ) */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-6 bg-amber-500 shadow-sm'
                  : 'w-2 bg-stone-300 hover:bg-stone-400'
              }`}
              aria-label={`ไปยังรูปที่ ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
