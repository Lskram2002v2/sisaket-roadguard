'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Map as MapIcon, PlusCircle, Sparkles, ShieldCheck } from 'lucide-react';
import SisaketHeader from '@/components/SisaketHeader';
import CitizenReportForm from '@/components/CitizenReportForm';
import CitizenTrackingPortal from '@/components/CitizenTrackingPortal';
import PublicMapFeed from '@/components/PublicMapFeed';
import UserOnboardingTour from '@/components/UserOnboardingTour';
import SponsorBannerCarousel from '@/components/SponsorBannerCarousel';

type MainTab = 'report' | 'track' | 'feed';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MainTab>('report');
  const [trackInitialCode, setTrackInitialCode] = useState<string | undefined>(undefined);

  const handleReportSuccess = (trackingCode: string) => {
    setTrackInitialCode(trackingCode);
    setActiveTab('track');
  };

  return (
    <main className="flex flex-col min-h-screen pb-20">
      {/* Aesthetic Cultural Header with Sisaket Landmarks */}
      <SisaketHeader onStartTour={() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sisaket_onboarding_welcomed');
          window.location.reload();
        }
      }} />

      {/* Main Container */}
      <div className="px-3 pt-4 pb-6 space-y-4 flex-1">
        {/* Modern Minimal Tab Switcher with Tour ID */}
        <div id="tour-tab-switcher" className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-200/70 p-1 text-xs font-semibold shadow-inner border border-stone-300/60">
          <button
            id="tour-tab-report-btn"
            onClick={() => setActiveTab('report')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition-all ${
              activeTab === 'report'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PlusCircle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${activeTab === 'report' ? 'text-amber-600' : ''}`} />
            <span className="text-[11px] sm:text-xs truncate">แจ้งถนนชำรุด</span>
          </button>

          <button
            id="tour-tab-track-btn"
            onClick={() => setActiveTab('track')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition-all ${
              activeTab === 'track'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Search className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${activeTab === 'track' ? 'text-amber-600' : ''}`} />
            <span className="text-[11px] sm:text-xs truncate">ติดตามสถานะ</span>
          </button>

          <button
            id="tour-tab-feed-btn"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${activeTab === 'feed' ? 'text-amber-600' : ''}`} />
            <span className="text-[11px] sm:text-xs truncate">แผนที่สาธารณะ</span>
          </button>
        </div>

        {/* Tab Content Display - Persistent DOM for Instant 0ms Switching */}
        <div>
          <div className={activeTab === 'report' ? 'block animate-fadeIn' : 'hidden'}>
            <CitizenReportForm onSuccessNavigateToTrack={handleReportSuccess} />
          </div>

          <div className={activeTab === 'track' ? 'block animate-fadeIn' : 'hidden'}>
            <CitizenTrackingPortal initialCode={trackInitialCode} />
          </div>

          <div className={activeTab === 'feed' ? 'block animate-fadeIn' : 'hidden'}>
            <PublicMapFeed />
          </div>
        </div>

        {/* Dynamic Sponsor & Public Relations Banner Carousel */}
        <SponsorBannerCarousel />
      </div>

      {/* Interactive User Onboarding, Spotlight Guided Tour & Checklist */}
      <UserOnboardingTour
        activeTab={activeTab}
        onSwitchTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer Branding */}
      <footer className="mt-auto border-t border-stone-200/80 py-5 text-center text-xs text-stone-500 bg-stone-50/50 space-y-2">
        <p className="font-medium text-stone-700">
          🌸 Sisaket RoadGuard • ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม
        </p>
        <p className="text-[11px] text-stone-400">
          ครอบคลุมพื้นที่ 22 อำเภอ • แขวงทางหลวงศรีสะเกษ & อบจ.ศรีสะเกษ
        </p>
        <div className="pt-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-amber-700 transition-colors"
          >
            <ShieldCheck className="h-3 w-3" />
            <span>เข้าสู่ระบบสำหรับเจ้าหน้าที่</span>
          </Link>
        </div>
      </footer>
    </main>
  );
}
