'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Navigation,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Layers,
  Search,
  X,
  CheckCircle2,
  Crosshair,
  RefreshCw,
  Compass,
  Lock,
} from 'lucide-react';
import { SISAKET_CENTER, isWithinSisaket, findNearestDistrict, findNearbyReport, SISAKET_DISTRICTS } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { playAlertChime } from '@/lib/audio-synth';

import { getLeaflet } from '@/lib/leaflet-loader';

// ฐานข้อมูลสถานที่สำคัญและชุมชนใน จ.ศรีสะเกษ สำหรับการค้นหาไว 0ms (Instant Sisaket Places Index)
const SISAKET_LANDMARKS_INDEX = [
  { name: 'ศาลากลางจังหวัดศรีสะเกษ', district: 'เมืองศรีสะเกษ', lat: 15.1158, lng: 104.3298 },
  { name: 'สถานีรถไฟศรีสะเกษ', district: 'เมืองศรีสะเกษ', lat: 15.1197, lng: 104.3276 },
  { name: 'โรงพยาบาลศรีสะเกษ', district: 'เมืองศรีสะเกษ', lat: 15.1189, lng: 104.3382 },
  { name: 'มหาวิทยาลัยราชภัฏศรีสะเกษ', district: 'เมืองศรีสะเกษ', lat: 15.0934, lng: 104.3092 },
  { name: 'สวนสมเด็จพระศรีนครินทร์ (ดงลำดวน)', district: 'เมืองศรีสะเกษ', lat: 15.0967, lng: 104.3245 },
  { name: 'วัดพระธาตุสุพรรณหงส์', district: 'เมืองศรีสะเกษ', lat: 15.0345, lng: 104.4215 },
  { name: 'เกาะกลางน้ำศรีสะเกษ / หอคอยศรีลำดวน', district: 'เมืองศรีสะเกษ', lat: 15.1278, lng: 104.3168 },
  { name: 'ตลาดสดเทศบาล 1 (ตลาดโต้รุ่ง)', district: 'เมืองศรีสะเกษ', lat: 15.1205, lng: 104.3255 },
  { name: 'สี่แยกส้มป่อย / ถนนขุขันธ์', district: 'เมืองศรีสะเกษ', lat: 15.1105, lng: 104.3225 },
  { name: 'ถนนราชการรถไฟ', district: 'เมืองศรีสะเกษ', lat: 15.1210, lng: 104.3260 },
  { name: 'ผามออีแดง (อุทยานแห่งชาติเขาพระวิหาร)', district: 'กันทรลักษ์', lat: 14.3948, lng: 104.7088 },
  { name: 'ที่ว่าการอำเภอกันทรลักษ์', district: 'กันทรลักษ์', lat: 14.6412, lng: 104.6515 },
  { name: 'ศาลหลักเมืองกันทรลักษ์', district: 'กันทรลักษ์', lat: 14.6432, lng: 104.6521 },
  { name: 'ปราสาทหินสระกำแพงใหญ่', district: 'อุทุมพรพิสัย', lat: 15.1012, lng: 104.1298 },
  { name: 'ที่ว่าการอำเภออุทุมพรพิสัย', district: 'อุทุมพรพิสัย', lat: 15.1120, lng: 104.1425 },
  { name: 'วัดป่าศรีมงคลรัตนาราม (ถ้ำพญานาค)', district: 'อุทุมพรพิสัย', lat: 15.0685, lng: 104.1685 },
  { name: 'เขื่อนราษีไศล', district: 'ราษีไศล', lat: 15.3512, lng: 104.1450 },
  { name: 'ปราสาทปรางค์กู่', district: 'ปรางค์กู่', lat: 14.8562, lng: 103.9875 },
  { name: 'วัดล้านขวด (วัดป่ามหาเจดีย์แก้ว)', district: 'ขุนหาญ', lat: 14.6225, lng: 104.4172 },
  { name: 'น้ำตกสำโรงเกียรติ', district: 'ขุนหาญ', lat: 14.5025, lng: 104.4850 },
  { name: 'ศาลหลักเมืองขุขันธ์', district: 'ขุขันธ์', lat: 14.7145, lng: 104.1970 },
  { name: 'จุดชมวิวพญากูปรี', district: 'ภูสิงห์', lat: 14.3850, lng: 104.0520 },
  { name: 'ด่านช่องสะงำ (ชายแดนไทย-กัมพูชา)', district: 'ภูสิงห์', lat: 14.3612, lng: 104.0625 },
];

interface Props {
  latitude: number;
  longitude: number;
  district: string;
  isActive?: boolean;
  onLocationChange: (lat: number, lng: number, district: string) => void;
  onProximityAlert?: (isNearby: boolean) => void;
}

export default function ReportMapPicker({
  latitude,
  longitude,
  district,
  isActive = true,
  onLocationChange,
  onProximityAlert,
}: Props) {
  // GPS State
  const [isLocating, setIsLocating] = useState(false);
  const [hasGpsLocked, setHasGpsLocked] = useState(false);
  const [showMandatoryModal, setShowMandatoryModal] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Duplicate check
  const [nearbyWarning, setNearbyWarning] = useState<string | null>(null);
  const [reports, setReports] = useState<RoadReport[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; district: string; lat: number; lng: number }>>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Leaflet references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const allDistrictsLayerRef = useRef<any>(null);
  const activeDistrictLayerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Auto-resize Leaflet container whenever tab becomes visible
  useEffect(() => {
    if (isActive && mapInstanceRef.current) {
      const t = setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize();
        } catch {
          // ignore
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  // Trigger Mandatory GPS Modal on first visit to enforce location permission
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasGpsLocked) {
        setShowMandatoryModal(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Load existing reports for duplicate check
  useEffect(() => {
    const loadReports = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
    };
    loadReports();
  }, []);

  // Sync Leaflet marker & map view when latitude/longitude props update from outside (e.g. photo GPS extraction)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - latitude) > 0.0001 ||
        Math.abs(currentPos.lng - longitude) > 0.0001
      ) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 0.6 });
      }
    }
  }, [latitude, longitude]);

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
        const msg = `มีผู้รายงานจุดใกล้เคียงแล้ว (~${nearby.distanceMeters} ม. / ${statusTh})`;
        setNearbyWarning(msg);
        onProximityAlert?.(true);
      } else {
        setNearbyWarning(null);
        onProximityAlert?.(false);
      }
    }
  }, [latitude, longitude, reports, onProximityAlert]);

  // Initialize Interactive Inline Leaflet Map
  useEffect(() => {
    let isSubscribed = true;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      const L = await getLeaflet();
      if (!L) return;

      if (!mapInstanceRef.current && mapContainerRef.current && isSubscribed) {
        const initialLat = latitude || SISAKET_CENTER.lat;
        const initialLng = longitude || SISAKET_CENTER.lng;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 14,
          zoomControl: false,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // วาดเส้นแบ่งเขต 22 อำเภอศรีสะเกษของจริงทั้งหมด (Real GeoJSON)
        const allDistricts = L.geoJSON(SISAKET_GEOJSON as any, {
          style: {
            color: '#A855F7',
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
            <div style="background: linear-gradient(135deg, #D97706, #B45309); width: 32px; height: 32px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 3px 12px rgba(180, 83, 9, 0.6); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: amberIcon,
        }).addTo(map);

        // ท่าที่ 2: ลากหมุดเองเมื่อจำเป็น
        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          handlePositionUpdate(pos.lat, pos.lng);
        });

        // ท่าที่ 2: แตะบนแผนที่เพื่อขยับหมุด
        map.on('click', (e: any) => {
          const pos = e.latlng;
          marker.setLatLng(pos);
          handlePositionUpdate(pos.lat, pos.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }

    initLeaflet();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Highlighted Boundary for the Selected District
  useEffect(() => {
    async function updateActiveDistrictBoundary() {
      if (!mapInstanceRef.current) return;
      const L = await getLeaflet();
      if (!L) return;

      if (activeDistrictLayerRef.current) {
        mapInstanceRef.current.removeLayer(activeDistrictLayerRef.current);
        activeDistrictLayerRef.current = null;
      }

      const activeGeo = getDistrictGeoJSON(district);
      if (activeGeo) {
        const activeLayer = L.geoJSON(activeGeo as any, {
          style: {
            color: '#7E22CE',
            weight: 3,
            opacity: 1,
            fillColor: '#9333EA',
            fillOpacity: 0.2,
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
      setGeoError('พิกัดอยู่นอกเขตจังหวัดศรีสะเกษ (กรุณาเลือกจุดภายใน 22 อำเภอ)');
    } else {
      setGeoError(null);
    }
  };

  /**
   * ท่าที่ 1: สั่งดึงพิกัดจาก Hardware GPS มือถือทันที พร้อมระบบ Multi-Sample Convergence
   */
  const triggerAutoGpsLock = async (mapObj?: any, markerObj?: any, L?: any) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('อุปกรณ์ของคุณไม่รองรับ GPS');
      setShowMandatoryModal(false);
      return;
    }

    const currentMap = mapObj || mapInstanceRef.current;
    const currentMarker = markerObj || markerRef.current;
    const Leaflet = L || (await import('leaflet'));

    setIsLocating(true);
    setPermissionDenied(false);
    setGeoError(null);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    let bestAcc = Infinity;
    let bestPos: GeolocationPosition | null = null;
    let samples = 0;

    const applyLocation = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 10);
      setHasGpsLocked(true);
      setShowMandatoryModal(false);

      if (accuracyCircleRef.current && currentMap) {
        currentMap.removeLayer(accuracyCircleRef.current);
        accuracyCircleRef.current = null;
      }

      if (currentMap && currentMarker) {
        accuracyCircleRef.current = Leaflet.circle([lat, lng], {
          radius: accuracy,
          color: '#2563EB',
          weight: 2,
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
        }).addTo(currentMap);

        currentMap.flyTo([lat, lng], 16, { duration: 0.8 });
        currentMarker.setLatLng([lat, lng]);
      }

      handlePositionUpdate(lat, lng);
      playAlertChime('success');
    };

    const autoTimeout = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLocating(false);
      if (bestPos) {
        applyLocation(bestPos);
      } else {
        setShowMandatoryModal(false);
      }
    }, 6000);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          samples++;
          const acc = pos.coords.accuracy;
          if (acc < bestAcc) {
            bestAcc = acc;
            bestPos = pos;
          }

          // เมื่อความแม่นยำดีขึ้นเรื่อยๆ (< 25 เมตร หรือตัวอย่างเกิน 3 รอบ) ให้ล็อกทันที
          if (acc <= 25 || samples >= 3) {
            clearTimeout(autoTimeout);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setIsLocating(false);
            applyLocation(pos);
          }
        },
        (err) => {
          clearTimeout(autoTimeout);
          setIsLocating(false);
          if (err.code === 1) { // PERMISSION_DENIED
            setPermissionDenied(true);
            setGeoError('คุณได้ปฏิเสธการเข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ Location ในการตั้งค่าเบราว์เซอร์');
          } else {
            setGeoError('ไม่สามารถดึงสัญญาณ GPS ได้ในขณะนี้ — สามารถลากหมุดปักเองได้ครับ');
            setShowMandatoryModal(false);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } catch (e) {
      clearTimeout(autoTimeout);
      setIsLocating(false);
      setShowMandatoryModal(false);
    }
  };

  /**
   * ท่าที่ 2: ค้นหาสถานที่ / ถนน / ชุมชน ในศรีสะเกษ (Instant 0ms Index)
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = query.trim().toLowerCase();
    
    const matchedLocal = SISAKET_LANDMARKS_INDEX.filter(
      (item) => item.name.toLowerCase().includes(q) || item.district.toLowerCase().includes(q)
    );

    const matchedDistricts = SISAKET_DISTRICTS.filter(
      (d) => d.name_th.toLowerCase().includes(q) || d.name_en.toLowerCase().includes(q)
    ).map((d) => ({
      name: `อ.${d.name_th}`,
      district: d.name_th,
      lat: d.lat,
      lng: d.lng,
    }));

    const combined = [...matchedLocal, ...matchedDistricts];
    setSearchResults(combined);
    setShowDropdown(true);
  };

  const handleSelectSearchResult = (item: { name: string; district: string; lat: number; lng: number }) => {
    setSearchQuery(item.name);
    setShowDropdown(false);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 16, { duration: 0.8 });
      markerRef.current.setLatLng([item.lat, item.lng]);
    }

    handlePositionUpdate(item.lat, item.lng);
  };

  const handleDistrictJump = (targetDistrictName: string) => {
    const target = SISAKET_DISTRICTS.find((d) => d.name_th === targetDistrictName);
    if (!target) return;

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
      markerRef.current.setLatLng([target.lat, target.lng]);
    }

    handlePositionUpdate(target.lat, target.lng);
  };

  const isOutside = !isWithinSisaket(latitude, longitude);

  return (
    <div className="space-y-2">
      {/* 🌟 Mandatory GPS Activation Modal (บังคับเปิด GPS เพื่อความแม่นยำสูงสุด) */}
      {showMandatoryModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-2 border-amber-300 text-stone-900 space-y-4 animate-scaleUp">
            {/* Top Close Button (Dismiss to Fallback ท่าที่ 2) */}
            <button
              onClick={() => setShowMandatoryModal(false)}
              className="absolute top-4 right-4 rounded-full bg-stone-100 p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition-all"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing GPS Radar Icon Header */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white shadow-lg shadow-amber-600/30">
                <span className="absolute h-full w-full rounded-2xl bg-amber-400 animate-ping opacity-25" />
                <Navigation className={`h-7 w-7 ${isLocating ? 'animate-spin' : ''}`} />
              </div>
              <div className="min-w-0">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 border border-amber-300">
                  ขั้นตอนสำคัญ
                </span>
                <h3 className="text-base font-extrabold text-stone-900 mt-0.5">
                  ระบุตำแหน่งด้วย GPS มือถือ
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              ระบบจำเป็นต้องใช้พิกัดดาวเทียมจากมือถือของคุณ เพื่อให้เจ้าหน้าที่ <strong>อบจ. และแขวงทางหลวงศรีสะเกษ</strong> ทราบจุดหลุมถนนชำรุดได้อย่างแม่นยำ 5–10 เมตร
            </p>

            {/* If Permission Denied: Show Step-by-Step Unlock Guide */}
            {permissionDenied ? (
              <div className="rounded-2xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <Lock className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>วิธีปลดล็อกสิทธิ์ GPS บนมือถือ:</span>
                </div>
                <ul className="text-[11px] text-stone-700 space-y-1 list-disc pl-4">
                  <li><strong>iPhone (Safari):</strong> แตะที่ <code>aA</code> ด้านบน ➡️ การตั้งค่าเว็บไซต์ ➡️ ตำแหน่ง ➡️ อนุญาต</li>
                  <li><strong>Android (Chrome):</strong> แตะไอคอนแม่กุญแจ <code>🔒</code> ➡️ สิทธิ์ ➡️ ตำแหน่ง ➡️ อนุญาต</li>
                </ul>
              </div>
            ) : null}

            {/* Primary Action Button (Direct User Touch Gesture) */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => triggerAutoGpsLock()}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-amber-600/30 hover:from-amber-700 hover:to-amber-500 active:scale-98 transition-all"
              >
                {isLocating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>กำลังเชื่อมต่อดาวเทียม GPS...</span>
                  </>
                ) : (
                  <>
                    <Compass className="h-5 w-5" />
                    <span>🛰️ แตะเปิด GPS และระบุตำแหน่งเดี๋ยวนี้</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowMandatoryModal(false)}
                className="w-full py-2 text-xs font-medium text-stone-500 hover:text-stone-800 transition-all text-center"
              >
                ข้ามไปก่อน • ขอปักหมุดเองบนแผนที่ (ท่าที่ 2)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Bar: District & Primary GPS Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-stone-900 truncate">
            จุดชำรุด
          </span>
          <select
            value={district}
            onChange={(e) => handleDistrictJump(e.target.value)}
            aria-label="เลือกอำเภอ"
            className="rounded-xl border border-purple-300 bg-purple-50/90 px-2 py-1 text-[11px] sm:text-xs font-bold text-purple-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            {SISAKET_DISTRICTS.map((d) => (
              <option key={d.id} value={d.name_th}>
                🟣 อ.{d.name_th}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Action Button: Dedicated 1-Tap Mobile GPS */}
        <button
          type="button"
          onClick={() => triggerAutoGpsLock()}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-3 py-1.5 text-xs font-bold text-stone-950 shadow-sm transition-all active:scale-95 shrink-0"
          title="ดึงพิกัดตำแหน่งปัจจุบันจาก GPS มือถือ"
        >
          <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin text-stone-950' : 'text-stone-950'}`} />
          <span>{isLocating ? 'กำลังค้นหา GPS...' : '📍 ดึงพิกัด GPS มือถือ'}</span>
        </button>
      </div>

      {/* 2. Search Input Box */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) setShowDropdown(true);
            }}
            placeholder="🔍 หรือพิมพ์ค้นหาถนน, วัด, โรงพยาบาล, ชุมชน ในศรีสะเกษ..."
            className="w-full rounded-xl border border-stone-300 pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-stone-50/90 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowDropdown(false);
              }}
              className="absolute right-2.5 rounded-full p-0.5 text-stone-400 hover:text-stone-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white p-1 shadow-xl border border-stone-200 animate-fadeIn">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-amber-50 text-stone-800 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold truncate">{item.name}</span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded-full shrink-0 ml-1.5">
                  อ.{item.district}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Geo Error / GPS Blocked Guide (Only shown when error happens) */}
      {geoError && (
        <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-300 p-2 text-xs text-rose-800 shadow-xs animate-fadeIn">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="leading-tight">{geoError}</span>
        </div>
      )}

      {/* Proximity Warning (Duplicate check) */}
      {nearbyWarning && (
        <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 p-2 text-xs text-amber-950 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <span className="leading-tight">{nearbyWarning}</span>
        </div>
      )}

      {isOutside && (
        <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-300 px-2.5 py-1 text-[11px] text-rose-900">
          <ShieldAlert className="h-4 w-4 text-rose-700 shrink-0" />
          <span>พิกัดอยู่นอกเขต 22 อำเภอ จ.ศรีสะเกษ</span>
        </div>
      )}

      {/* 3. Interactive Leaflet Map Container (Clean and Simple) */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-purple-200/80 shadow-md bg-stone-100 h-64 sm:h-72 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Real District Purple Boundary Badge Overlay */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-lg bg-purple-950/90 text-purple-100 px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md border border-purple-400/60 max-w-[85%] truncate animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping shrink-0" />
          <span className="truncate">🟣 เส้นเขตจริง: อ.{district || 'เมืองศรีสะเกษ'}</span>
        </div>

        {/* Floating Quick GPS Crosshair FAB on Map Corner (Native Mobile Maps Feel) */}
        <button
          type="button"
          onClick={() => triggerAutoGpsLock()}
          disabled={isLocating}
          className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-stone-800 shadow-lg border border-stone-300 hover:bg-amber-50 hover:text-amber-700 active:scale-90 transition-all backdrop-blur-sm"
          title="ดึงพิกัดตำแหน่งปัจจุบันจาก GPS มือถือ"
        >
          <Crosshair className={`h-5 w-5 ${isLocating ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
        </button>

        {/* Floating Pin Helper Badge */}
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-xs border border-stone-200/80 backdrop-blur-xs">
          💡 ท่าที่ 2: แตะแผนที่หรือลากหมุดสีทองเพื่อปรับจุดชำรุด
        </div>
      </div>
    </div>
  );
}
