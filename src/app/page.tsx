'use client';

import React, { useState } from 'react';
import { MapPin, Search, Map as MapIcon, PlusCircle, Sparkles } from 'lucide-react';
import SisaketHeader from '@/components/SisaketHeader';
import CitizenReportForm from '@/components/CitizenReportForm';
import CitizenTrackingPortal from '@/components/CitizenTrackingPortal';
import PublicMapFeed from '@/components/PublicMapFeed';

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
      <SisaketHeader />

      {/* Main Container */}
      <div className="px-3 pt-4 pb-6 space-y-4 flex-1">
        {/* Modern Minimal Tab Switcher */}
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-stone-200/70 p-1 text-xs font-semibold shadow-inner border border-stone-300/60">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2.5 transition-all ${
              activeTab === 'report'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PlusCircle className={`h-4 w-4 ${activeTab === 'report' ? 'text-amber-600' : ''}`} />
            <span>แจ้งถนนชำรุด</span>
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2.5 transition-all ${
              activeTab === 'track'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Search className={`h-4 w-4 ${activeTab === 'track' ? 'text-amber-600' : ''}`} />
            <span>ติดตามสถานะ</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2.5 transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-stone-950 shadow-md font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapIcon className={`h-4 w-4 ${activeTab === 'feed' ? 'text-amber-600' : ''}`} />
            <span>แผนที่สาธารณะ</span>
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
      </div>

      {/* Footer Branding */}
      <footer className="mt-auto border-t border-stone-200/80 py-4 text-center text-xs text-stone-500 bg-stone-50/50">
        <p className="font-medium text-stone-700">
          🌸 Sisaket RoadGuard • ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม
        </p>
        <p className="text-[11px] text-stone-400 mt-0.5">
          ครอบคลุมพื้นที่ 22 อำเภอ • แขวงทางหลวงศรีสะเกษ & อบจ.ศรีสะเกษ
        </p>
      </footer>
    </main>
  );
}
