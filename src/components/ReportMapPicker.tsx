'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, AlertTriangle, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { SISAKET_CENTER, isWithinSisaket, findNearestDistrict, findNearbyReport, SISAKET_DISTRICTS } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';

interface Props {
  latitude: number;
  longitude: number;
  district: string;
  onLocationChange: (lat: number, lng: number, district: string) => void;
  onProximityAlert?: (isNearby: boolean) => void;
}

export default function ReportMapPicker({
  latitude,
  longitude,
  district,
  onLocationChange,
  onProximityAlert,
}: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearbyWarning, setNearbyWarning] = useState<string | null>(null);
  const [reports, setReports] = useState<RoadReport[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const allDistrictsLayerRef = useRef<any>(null);
  const activeDistrictLayerRef = useRef<any>(null);

  useEffect(() => {
    const loadReports = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
    };
    loadReports();
  }, []);

  // Check proximity whenever latitude/longitude or reports update
  useEffect(() => {
    if (reports.length > 0) {
      const nearby = findNearbyReport(latitude, longitude, reports, 30);
      if (nearby.isNearby && nearby.report) {
        const statusMap: Record<string, string> = {
          PENDING: 'รอเจ้าหน้าที่รับเรื่อง',
          VERIFIED: 'รับเรื่องแล้ว อยู่ระหว่างจัดคิวช่าง',
          IN_PROGRESS: 'ทีมช่างกำลังเข้าดำเนินการ',
        };
        const statusTh = statusMap[nearby.report.status] || 'กำลังดำเนินการ';
        const msg = `มีผู้รายงานจุดใกล้เคียงที่ท่านเสนอแล้ว (ระยะห่าง ~${nearby.distanceMeters} ม. / สถานะ: ${statusTh})`;
        setNearbyWarning(msg);
        onProximityAlert?.(true);
      } else {
        setNearbyWarning(null);
        onProximityAlert?.(false);
      }
    }
  }, [latitude, longitude, reports, onProximityAlert]);

  // Leaflet Map Initialization
  useEffect(() => {
    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = await import('leaflet');

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [latitude || SISAKET_CENTER.lat, longitude || SISAKET_CENTER.lng],
          zoom: 12,
          zoomControl: false,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 1. วาดเส้นแบ่งเขต 22 อำเภอศรีสะเกษของจริงทั้งหมด (Real Administrative GeoJSON Boundaries)
        const allDistricts = L.geoJSON(SISAKET_GEOJSON as any, {
          style: {
            color: '#A855F7', // เส้นสีม่วงอ่อน
            weight: 1.5,
            opacity: 0.6,
            fillColor: '#9333EA',
            fillOpacity: 0.03,
            dashArray: '3, 4',
          },
          onEachFeature: (feature: any, layer: any) => {
            if (feature.properties && feature.properties.amp_th) {
              layer.bindTooltip(`อ.${feature.properties.amp_th}`, {
                permanent: false,
                direction: 'center',
                className: 'district-map-tooltip',
              });
            }
          },
        }).addTo(map);

        allDistrictsLayerRef.current = allDistricts;

        // Custom Amber Marker
        const amberIcon = L.divIcon({
          className: 'custom-amber-marker',
          html: `
            <div style="background-color: #C27803; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(194, 120, 3, 0.7); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([latitude, longitude], {
          draggable: true,
          icon: amberIcon,
        }).addTo(map);

        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          handlePositionUpdate(pos.lat, pos.lng);
        });

        map.on('click', (e: any) => {
          const pos = e.latlng;
          marker.setLatLng(pos);
          handlePositionUpdate(pos.lat, pos.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // ดึงพิกัด GPS อัตโนมัติทันทีที่เปิดหน้าเว็บ (Auto-Lock Position)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const liveLat = pos.coords.latitude;
              const liveLng = pos.coords.longitude;
              if (isWithinSisaket(liveLat, liveLng)) {
                map.flyTo([liveLat, liveLng], 15, { duration: 1.0 });
                marker.setLatLng([liveLat, liveLng]);
                handlePositionUpdate(liveLat, liveLng);
              }
            },
            () => {
              // หากผู้ใช้บล็อกสิทธิ์ GPS ระบบจะให้ปักหมุดเองหรือเลือกอำเภอได้อย่างราบรื่น
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
          );
        }
      }
    }

    initLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Highlighted Real Purple Boundary for the Selected District
  useEffect(() => {
    async function updateActiveDistrictBoundary() {
      if (!mapInstanceRef.current) return;
      const L = await import('leaflet');

      // ลบ Layer ไฮไลต์เดิมก่อน
      if (activeDistrictLayerRef.current) {
        mapInstanceRef.current.removeLayer(activeDistrictLayerRef.current);
        activeDistrictLayerRef.current = null;
      }

      const activeGeo = getDistrictGeoJSON(district);
      if (activeGeo) {
        const activeLayer = L.geoJSON(activeGeo as any, {
          style: {
            color: '#7E22CE', // ม่วงเข้มคมชัด (Solid Real Purple)
            weight: 3.5,
            opacity: 1,
            fillColor: '#9333EA', // ม่วงสว่างโปร่งแสง
            fillOpacity: 0.22,
            dashArray: '5, 5',
          },
        }).addTo(mapInstanceRef.current);

        activeDistrictLayerRef.current = activeLayer;
      }
    }

    updateActiveDistrictBoundary();
  }, [district]);

  const handlePositionUpdate = (lat: number, lng: number) => {
    const nearest = findNearestDistrict(lat, lng);
    onLocationChange(lat, lng, nearest.name_th);

    if (!isWithinSisaket(lat, lng)) {
      setGeoError('พิกัดอยู่นอกเขตจังหวัดศรีสะเกษ กรุณาเลือกจุดภายใน 22 อำเภอ');
    } else {
      setGeoError(null);
    }
  };

  const handleDistrictJump = (targetDistrictName: string) => {
    const target = SISAKET_DISTRICTS.find((d) => d.name_th === targetDistrictName);
    if (!target) return;

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 13, { duration: 0.8 });
      markerRef.current.setLatLng([target.lat, target.lng]);
    }

    handlePositionUpdate(target.lat, target.lng);
  };

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
          markerRef.current.setLatLng([lat, lng]);
        }

        handlePositionUpdate(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        setGeoError('ไม่สามารถดึงตำแหน่งปัจจุบันได้ (สามารถเลือกอำเภอหรือเลื่อนหมุดบนแผนที่แทนได้ครับ)');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const isOutside = !isWithinSisaket(latitude, longitude);

  return (
    <div className="space-y-3">
      {/* Map Header with Tailwind Styling */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-900 min-w-0 truncate">
          <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="truncate">ระบุจุดชำรุด (22 อำเภอ)</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick District Selector Dropdown */}
          <div className="relative">
            <select
              value={district}
              onChange={(e) => handleDistrictJump(e.target.value)}
              aria-label="เลือกอำเภอ"
              className="rounded-xl border border-purple-300 bg-purple-50/80 px-2 sm:px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-purple-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              {SISAKET_DISTRICTS.map((d) => (
                <option key={d.id} value={d.name_th}>
                  🟣 อ.{d.name_th}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={isLocating}
            className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-stone-950 shadow-sm transition-all active:scale-95"
          >
            <Navigation className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isLocating ? 'animate-spin text-stone-950' : 'text-stone-950'}`} />
            <span>{isLocating ? 'ค้นหา...' : 'พิกัดฉัน'}</span>
          </button>
        </div>
      </div>

      {/* Proximity Alert Banner */}
      {nearbyWarning && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3 text-xs text-amber-950 animate-fadeIn shadow-sm">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900">แจ้งเตือนจุดใกล้เคียง: </span>
            <span>{nearbyWarning}</span>
          </div>
        </div>
      )}

      {isOutside && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-900 shadow-sm">
          <ShieldAlert className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">อยู่นอกพื้นที่: </span>
            <span>ระบบนี้ให้บริการเฉพาะภายใน 22 อำเภอ จังหวัดศรีสะเกษเท่านั้น</span>
          </div>
        </div>
      )}

      {/* Interactive Map Container */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200/80 shadow-md bg-stone-100 h-64 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Real District Purple Boundary Badge Overlay */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-xl bg-purple-950/90 text-purple-100 px-2.5 py-1 text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-md border border-purple-400/60 max-w-[85%] truncate animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping shrink-0" />
          <span className="truncate">🟣 เส้นเขตจริง: อ.{district || 'เมืองศรีสะเกษ'}</span>
        </div>

        {/* Floating Pin Helper Badge */}
        <div className="absolute bottom-2 left-2 z-10 rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-sm border border-stone-200/80 backdrop-blur-sm">
          💡 แตะบนแผนที่หรือลากหมุดสีทองเพื่อระบุจุดชำรุด
        </div>
      </div>

      {/* District & Coordinates Tailwind Capsule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xl bg-purple-50/70 px-3 py-2 text-xs text-purple-950 border border-purple-200 shadow-sm">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Layers className="h-3.5 w-3.5 text-purple-700 shrink-0" />
          <span className="text-purple-800 font-medium shrink-0">ขอบเขต:</span>
          <span className="font-black text-purple-900 truncate">
            อ.{district || 'เมืองศรีสะเกษ'}
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-purple-700 shrink-0 font-mono font-bold">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
