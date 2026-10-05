'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, Filter, MapPin, CheckCircle2, Clock, Wrench, Layers, Sparkles } from 'lucide-react';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { SISAKET_DISTRICTS, SISAKET_CENTER } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';

export default function PublicMapFeed() {
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [activeReport, setActiveReport] = useState<RoadReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const activeDistrictLayerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    // 1. โหลดข้อมูลแคชทันที 0ms
    setReports(roadStore.getReportsInstant());
    
    // 2. ซิงค์สดจาก Supabase
    loadData();

    const unsub = roadStore.subscribe(() => {
      setReports(roadStore.getReportsInstant());
    });
    return () => unsub();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await roadStore.getAllReports(true);
      setReports(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = selectedDistrict === 'ALL'
    ? reports
    : reports.filter((r) => r.district === selectedDistrict);

  // Initialize Leaflet Map
  useEffect(() => {
    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = await import('leaflet');

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [SISAKET_CENTER.lat, SISAKET_CENTER.lng],
          zoom: 10,
          zoomControl: false,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 18,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // วาดเส้นแบ่งเขต 22 อำเภอจริงทั้งหมด
        L.geoJSON(SISAKET_GEOJSON as any, {
          style: {
            color: '#A855F7',
            weight: 1.5,
            opacity: 0.5,
            fillColor: '#9333EA',
            fillOpacity: 0.02,
            dashArray: '3, 4',
          },
        }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Purple Boundary when District filter changes
  useEffect(() => {
    async function updateBoundary() {
      if (!mapInstanceRef.current) return;
      const L = await import('leaflet');

      if (activeDistrictLayerRef.current) {
        mapInstanceRef.current.removeLayer(activeDistrictLayerRef.current);
        activeDistrictLayerRef.current = null;
      }

      if (selectedDistrict !== 'ALL') {
        const geo = getDistrictGeoJSON(selectedDistrict);
        if (geo) {
          const layer = L.geoJSON(geo as any, {
            style: {
              color: '#7E22CE',
              weight: 3.5,
              opacity: 0.9,
              fillColor: '#9333EA',
              fillOpacity: 0.2,
              dashArray: '5, 5',
            },
          }).addTo(mapInstanceRef.current);
          activeDistrictLayerRef.current = layer;

          const dist = SISAKET_DISTRICTS.find((d) => d.name_th === selectedDistrict);
          if (dist) {
            mapInstanceRef.current.flyTo([dist.lat, dist.lng], 12, { duration: 0.7 });
          }
        }
      } else {
        mapInstanceRef.current.flyTo([SISAKET_CENTER.lat, SISAKET_CENTER.lng], 10, { duration: 0.7 });
      }
    }

    updateBoundary();
  }, [selectedDistrict]);

  // Update map markers when filtered reports change
  useEffect(() => {
    async function renderMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = await import('leaflet');

      markersGroupRef.current.clearLayers();

      filteredReports.forEach((rep) => {
        let color = '#78716C';
        if (rep.status === 'VERIFIED') color = '#2563EB';
        if (rep.status === 'IN_PROGRESS') color = '#D97706';
        if (rep.status === 'RESOLVED') color = '#059669';

        const customIcon = L.divIcon({
          className: 'custom-status-marker',
          html: `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold;">
              ${rep.upvote_count || 1}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: customIcon });
        marker.on('click', () => {
          setActiveReport(rep);
          mapInstanceRef.current.setView([rep.latitude, rep.longitude], 14);
        });

        markersGroupRef.current.addLayer(marker);
      });
    }

    renderMarkers();
  }, [filteredReports]);

  const handleUpvote = async (code: string) => {
    await roadStore.upvoteReport(code);
    await loadData();
    if (activeReport && activeReport.tracking_code === code) {
      setActiveReport((prev) => prev ? { ...prev, upvote_count: prev.upvote_count + 1 } : null);
    }
  };

  const maskPhone = (p: string) => {
    const clean = p.replace(/\D/g, '');
    if (clean.length < 10) return '08X-XXX-XXXX';
    return `${clean.substring(0, 3)}-XXX-${clean.substring(7, 10)}`;
  };

  return (
    <div className="w-full space-y-4">
      {/* Filter by District */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
            <Filter className="h-4 w-4 text-amber-600" />
            <span>กรองตาม 22 อำเภอ ({filteredReports.length} จุด)</span>
          </div>
          <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            🟣 ขอบเขตจริง
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedDistrict('ALL')}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              selectedDistrict === 'ALL'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            ทั้งหมด
          </button>
          {SISAKET_DISTRICTS.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDistrict(d.name_th)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedDistrict === d.name_th
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {d.name_th}
            </button>
          ))}
        </div>
      </div>

      {/* Public Heatmap Container */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-purple-200/80 shadow-md bg-stone-100 h-72 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Legend Overlay */}
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2 rounded-xl bg-white/95 px-3 py-1.5 text-[10px] font-bold text-stone-800 shadow-md backdrop-blur-md border border-stone-200">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-stone-500" />
            <span>รอรับเรื่อง</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-600" />
            <span>กำลังซ่อม</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span>เสร็จแล้ว</span>
          </div>
        </div>

        {/* Active District Tag */}
        {selectedDistrict !== 'ALL' && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 rounded-xl bg-purple-950/90 text-purple-100 px-3 py-1 text-[11px] font-bold shadow-lg border border-purple-400">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>🟣 กำลังดูเขต: อ.{selectedDistrict}</span>
          </div>
        )}
      </div>

      {/* Public Case Cards List */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-stone-800 block px-1">
          จุดชำรุดในพื้นที่ ({filteredReports.length})
        </span>

        <div className="space-y-2.5">
          {filteredReports.map((rep) => (
            <div
              key={rep.id}
              className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90 space-y-3 transition-all hover:border-purple-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono text-stone-900">
                      {rep.tracking_code}
                    </span>
                    <span className="rounded-full bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                      อ.{rep.district}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-800 mt-1 line-clamp-2">
                    {rep.landmark_description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpvote(rep.tracking_code)}
                  className="flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-200 active:scale-95 transition-all shrink-0"
                  title="กดสนับสนุนเคสนี้"
                >
                  <ThumbsUp className="h-3.5 w-3.5 text-amber-700" />
                  <span>+{rep.upvote_count || 1}</span>
                </button>
              </div>

              {/* Photo Preview Thumbnail */}
              <div className="flex gap-2">
                <img
                  src={rep.photo_context_url}
                  alt="ภาพบริบท"
                  className="h-16 w-24 rounded-xl object-cover border border-stone-200"
                />
                <img
                  src={rep.photo_closeup_url}
                  alt="ภาพหลุม"
                  className="h-16 w-24 rounded-xl object-cover border border-stone-200"
                />
                <div className="flex flex-col justify-between text-[11px] text-stone-600 py-0.5 font-medium">
                  <div className="text-[10px] text-stone-500 font-mono">
                    แจ้งเมื่อ: {new Date(rep.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
