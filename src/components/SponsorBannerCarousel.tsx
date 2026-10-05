'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SponsorBanner } from '@/lib/types';
import { INITIAL_BANNERS, roadStore } from '@/lib/db-store';
import { normalizeImageUrl, getGoogleDriveThumbnailUrl, FALLBACK_BANNER_IMAGE } from '@/lib/image-helper';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

export default function SponsorBannerCarousel() {
  const [banners, setBanners] = useState<SponsorBanner[]>(INITIAL_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const loadBanners = async () => {
      const all = await roadStore.getAllBanners();
      const active = all.filter((b) => b.is_active);
      if (active.length > 0) {
        setBanners(active);
      } else {
        setBanners(INITIAL_BANNERS);
      }
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
    if (diff > 35) {
      handleNext();
    } else if (diff < -35) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  const handleCenterClick = (link?: string) => {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Ensure we have a smooth list of items for the deck
  // If fewer than 5 items, create virtual duplicates with stable unique IDs
  const displayItems: Array<{ item: SponsorBanner; uniqueKey: string; originalIndex: number }> = [];
  if (banners.length > 0) {
    if (banners.length >= 5) {
      banners.forEach((b, idx) => {
        displayItems.push({ item: b, uniqueKey: b.id, originalIndex: idx });
      });
    } else {
      // Repeat to have at least 5-6 cards so the 3D deck never has empty edges
      const repeatCount = Math.ceil(5 / banners.length);
      for (let r = 0; r < repeatCount; r++) {
        banners.forEach((b, idx) => {
          displayItems.push({
            item: b,
            uniqueKey: `${b.id}-rep-${r}`,
            originalIndex: idx,
          });
        });
      }
    }
  }

  const totalDisplay = displayItems.length;

  return (
    <section
      className="relative w-full overflow-hidden select-none py-3 space-y-3.5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="3D Smooth Image Carousel"
    >
      {/* 3D Layered Card Deck Container */}
      <div
        className="relative flex items-center justify-center h-48 sm:h-60 md:h-72 w-full"
        style={{ perspective: '1200px' }}
      >
        {displayItems.map(({ item, uniqueKey, originalIndex }, idx) => {
          // Calculate relative circular difference from current active index
          let diff = idx - (currentIndex % banners.length);

          if (diff > totalDisplay / 2) {
            diff -= totalDisplay;
          } else if (diff < -totalDisplay / 2) {
            diff += totalDisplay;
          }

          const isCenter = diff === 0;
          const isFlankingLeft = diff === -1;
          const isFlankingRight = diff === 1;
          const isOuterLeft = diff === -2;
          const isOuterRight = diff === 2;
          const isHidden = Math.abs(diff) > 2;

          let transformStyle = '';
          let zIndex = 0;
          let opacity = 0;

          if (isCenter) {
            transformStyle = 'translateX(0%) scale(1) translateZ(0px) rotateY(0deg)';
            zIndex = 30;
            opacity = 1;
          } else if (isFlankingLeft) {
            transformStyle = 'translateX(-52%) scale(0.85) translateZ(-70px) rotateY(6deg)';
            zIndex = 20;
            opacity = 0.85;
          } else if (isFlankingRight) {
            transformStyle = 'translateX(52%) scale(0.85) translateZ(-70px) rotateY(-6deg)';
            zIndex = 20;
            opacity = 0.85;
          } else if (isOuterLeft) {
            transformStyle = 'translateX(-94%) scale(0.70) translateZ(-140px) rotateY(12deg)';
            zIndex = 10;
            opacity = 0.45;
          } else if (isOuterRight) {
            transformStyle = 'translateX(94%) scale(0.70) translateZ(-140px) rotateY(-12deg)';
            zIndex = 10;
            opacity = 0.45;
          } else {
            transformStyle = `translateX(${diff > 0 ? '140%' : '-140%'}) scale(0.55) translateZ(-200px)`;
            zIndex = 1;
            opacity = 0;
          }

          const imageUrl = normalizeImageUrl(item.image_url);

          return (
            <div
              key={uniqueKey}
              onClick={() => {
                if (isCenter) {
                  handleCenterClick(item.target_link);
                } else {
                  setCurrentIndex(originalIndex);
                }
              }}
              className="absolute top-0 bottom-0 w-[72%] sm:w-[60%] md:w-[50%] cursor-pointer transform-gpu"
              style={{
                transform: transformStyle,
                zIndex,
                opacity,
                pointerEvents: isHidden ? 'none' : 'auto',
                transition: 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1), opacity 600ms cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'transform, opacity',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div
                className={`relative h-full w-full rounded-3xl sm:rounded-[32px] overflow-hidden bg-stone-900 shadow-xl border transition-shadow duration-500 ${
                  isCenter
                    ? 'border-amber-400/40 shadow-2xl ring-1 ring-amber-400/20'
                    : 'border-stone-800/80 shadow-md'
                }`}
              >
                {/* Full Banner Image */}
                <img
                  src={imageUrl}
                  alt={item.title || `Slide ${originalIndex + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-center pointer-events-none select-none"
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

                {/* Subtle external link icon on active card if target link exists */}
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
          className="p-1.5 rounded-full text-stone-400 hover:text-amber-600 hover:bg-stone-200/60 transition-all active:scale-90"
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
                    ? 'w-5 h-2 bg-purple-600 sm:bg-amber-500 shadow-sm'
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
          className="p-1.5 rounded-full text-stone-400 hover:text-amber-600 hover:bg-stone-200/60 transition-all active:scale-90"
          aria-label="ถัดไป"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
