'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SponsorBanner } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { normalizeImageUrl, getGoogleDriveThumbnailUrl, FALLBACK_BANNER_IMAGE } from '@/lib/image-helper';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

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

  const handleCenterClick = (link?: string) => {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Generate 5 slots for the 3D Coverflow Deck (-2, -1, 0, 1, 2)
  const deckSlots = [-2, -1, 0, 1, 2].map((offset) => {
    const rawIdx = (currentIndex + offset + banners.length * 100) % banners.length;
    return {
      offset,
      item: banners[rawIdx],
      index: rawIdx,
    };
  });

  return (
    <section
      className="relative w-full overflow-hidden select-none py-4 space-y-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="3D Simple Image Carousel"
    >
      {/* 3D Layered Card Deck Container */}
      <div className="relative flex items-center justify-center h-48 sm:h-60 md:h-72 w-full perspective-[1000px]">
        {deckSlots.map(({ offset, item, index }) => {
          const isCenter = offset === 0;
          const isFlankingLeft = offset === -1;
          const isFlankingRight = offset === 1;
          const isOuterLeft = offset === -2;
          const isOuterRight = offset === 2;

          let transformClass = '';
          let zIndexClass = '';
          let opacityClass = '';
          let scaleClass = '';

          if (isCenter) {
            transformClass = 'translate-x-0';
            scaleClass = 'scale-100';
            zIndexClass = 'z-30';
            opacityClass = 'opacity-100';
          } else if (isFlankingLeft) {
            transformClass = '-translate-x-[48%] sm:-translate-x-[54%]';
            scaleClass = 'scale-[0.84] sm:scale-[0.88]';
            zIndexClass = 'z-20';
            opacityClass = 'opacity-80 sm:opacity-90';
          } else if (isFlankingRight) {
            transformClass = 'translate-x-[48%] sm:translate-x-[54%]';
            scaleClass = 'scale-[0.84] sm:scale-[0.88]';
            zIndexClass = 'z-20';
            opacityClass = 'opacity-80 sm:opacity-90';
          } else if (isOuterLeft) {
            transformClass = '-translate-x-[90%] sm:-translate-x-[98%]';
            scaleClass = 'scale-[0.68] sm:scale-[0.74]';
            zIndexClass = 'z-10';
            opacityClass = 'opacity-40 sm:opacity-55';
          } else if (isOuterRight) {
            transformClass = 'translate-x-[90%] sm:translate-x-[98%]';
            scaleClass = 'scale-[0.68] sm:scale-[0.74]';
            zIndexClass = 'z-10';
            opacityClass = 'opacity-40 sm:opacity-55';
          }

          const imageUrl = normalizeImageUrl(item.image_url);

          return (
            <div
              key={`${item.id}-${offset}`}
              onClick={() => {
                if (isCenter) {
                  handleCenterClick(item.target_link);
                } else {
                  setCurrentIndex(index);
                }
              }}
              className={`absolute top-0 bottom-0 w-[72%] sm:w-[60%] md:w-[50%] transition-all duration-500 ease-out transform cursor-pointer ${transformClass} ${scaleClass} ${zIndexClass} ${opacityClass}`}
              style={{ willChange: 'transform, opacity' }}
            >
              <div
                className={`relative h-full w-full rounded-3xl sm:rounded-[32px] overflow-hidden bg-stone-900 shadow-xl border ${
                  isCenter
                    ? 'border-amber-400/40 shadow-2xl ring-1 ring-amber-400/20'
                    : 'border-stone-800/80'
                }`}
              >
                {/* Clean Image */}
                <img
                  src={imageUrl}
                  alt={item.title || `Slide ${index + 1}`}
                  className="h-full w-full object-cover object-center pointer-events-none"
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

                {/* Subtle external link badge on center active card */}
                {isCenter && item.target_link && (
                  <div className="absolute top-3 right-3 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-amber-300 backdrop-blur-md border border-white/20 shadow-md">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unified Inline Navigation Controller: [ ← ] [ • • • • • ] [ → ] */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {/* Left Arrow Button */}
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-full text-stone-400 hover:text-amber-500 hover:bg-stone-100 transition-all active:scale-95"
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5">
          {banners.map((_, i) => {
            const isActive = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'w-4 h-2 bg-purple-600 sm:bg-amber-500 shadow-sm'
                    : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'
                }`}
                aria-label={`ไปยังรูปที่ ${i + 1}`}
              />
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={handleNext}
          className="p-1.5 rounded-full text-stone-400 hover:text-amber-500 hover:bg-stone-100 transition-all active:scale-95"
          aria-label="ถัดไป"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
