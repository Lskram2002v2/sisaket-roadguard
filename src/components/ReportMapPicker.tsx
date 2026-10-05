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
  Check,
  Maximize2,
  CheckCircle2,
  ChevronDown,
  Compass,
  CornerDownRight,
} from 'lucide-react';
import { SISAKET_CENTER, isWithinSisaket, findNearestDistrict, findNearbyReport, SISAKET_DISTRICTS } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { playAlertChime } from '@/lib/audio-synth';

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
  // Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  
  // Working Location in Modal
  const [selectedLat, setSelectedLat] = useState(latitude);
  const [selectedLng, setSelectedLng] = useState(longitude);
  const [selectedDistrict, setSelectedDistrict] = useState(district);

  // GPS & Engine States
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsStatusInfo, setGpsStatusInfo] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [hasConfirmedOnce, setHasConfirmedOnce] = useState(false);

  // Reports for Duplicate check
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

  // Sync internal states when external props change (e.g. Photo EXIF detection)
  useEffect(() => {
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    setSelectedDistrict(district);
  }, [latitude, longitude, district]);

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

  // Open Fullscreen Map Modal and trigger High-Accuracy GPS Lock
  const handleOpenMapModal = () => {
    setIsMapModalOpen(true);
    // When modal opens, Leaflet map is initialized / resized in useEffect
  };

  // Close Modal without saving unconfirmed changes
  const handleCloseMapModal = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
    setIsMapModalOpen(false);
  };

  // Confirm Location Button Click (Saves to Parent Form and Closes Modal)
  const handleConfirmLocation = () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocating(false);
    onLocationChange(selectedLat, selectedLng, selectedDistrict);
    setHasConfirmedOnce(true);
    setIsMapModalOpen(false);
    playAlertChime('success');
  };

  // Initialize and manage Leaflet map when modal is open
  useEffect(() => {
    if (!isMapModalOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    async function initLeafletMap() {
      if (typeof window === 'undefined') return;
      const L = await import('leaflet');

      // Small delay to ensure modal DOM container is fully rendered in the viewport
      setTimeout(() => {
        if (!isSubscribed || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const initialLat = selectedLat || SISAKET_CENTER.lat;
        const initialLng = selectedLng || SISAKET_CENTER.lng;

        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 14,
          zoomControl: false,
          scrollWheelZoom: true,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 1. วาดเส้นแบ่งเขต 22 อำเภอศรีสะเกษของจริงทั้งหมด (Real Administrative GeoJSON Boundaries)
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

        // Custom Amber Golden Marker with radar glow
        const amberIcon = L.divIcon({
          className: 'custom-amber-marker',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <span style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(217, 119, 6, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div style="background: linear-gradient(135deg, #D97706, #B45309); width: 36px; height: 36px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(180, 83, 9, 0.7); display: flex; align-items: center; justify-content: center; color: white; position: relative; z-index: 10;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: amberIcon,
        }).addTo(map);

        // ท่า 2: ลากหมุดเอง (Manual Marker Dragging)
        marker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          updateManualPosition(pos.lat, pos.lng);
        });

        // ท่า 2: แตะบนแผนที่เพื่อย้ายหมุด (Tap anywhere on map)
        map.on('click', (e: any) => {
          const pos = e.latlng;
          marker.setLatLng(pos);
          updateManualPosition(pos.lat, pos.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Force Leaflet to recalculate container bounds
        map.invalidateSize();

        // Highlight the current district boundary
        updateActiveDistrictLayer(selectedDistrict, map, L);

        // Execute ท่า 1: Automatic High-Precision GPS Lock on Modal Open
        triggerSatelliteGpsLock(map, marker, L);
      }, 150);
    }

    initLeafletMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isMapModalOpen]);

  // Highlight active district polygon boundary
  const updateActiveDistrictLayer = (targetDistrict: string, mapObj: any, L: any) => {
    if (!mapObj) return;

    if (activeDistrictLayerRef.current) {
      mapObj.removeLayer(activeDistrictLayerRef.current);
      activeDistrictLayerRef.current = null;
    }

    const activeGeo = getDistrictGeoJSON(targetDistrict);
    if (activeGeo) {
      const activeLayer = L.geoJSON(activeGeo as any, {
        style: {
          color: '#7E22CE',
          weight: 3.5,
          opacity: 1,
          fillColor: '#9333EA',
          fillOpacity: 0.22,
          dashArray: '5, 5',
        },
      }).addTo(mapObj);

      activeDistrictLayerRef.current = activeLayer;
    }
  };

  // Helper for manual position update
  const updateManualPosition = (lat: number, lng: number) => {
    const nearest = findNearestDistrict(lat, lng);
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedDistrict(nearest.name_th);

    if (!isWithinSisaket(lat, lng)) {
      setGeoError('พิกัดอยู่นอกเขตจังหวัดศรีสะเกษ กรุณาเลือกจุดภายใน 22 อำเภอ');
    } else {
      setGeoError(null);
    }
  };

  /**
   * ท่า 1: Automatic High-Precision Satellite GPS Lock (Multi-Sample Convergence Engine)
   */
  const triggerSatelliteGpsLock = async (mapObj?: any, markerObj?: any, L?: any) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    const currentMap = mapObj || mapInstanceRef.current;
    const currentMarker = markerObj || markerRef.current;
    const Leaflet = L || (await import('leaflet'));

    setIsLocating(true);
    setGeoError(null);
    setGpsStatusInfo({
      type: 'info',
      text: '🛰️ กำลังรับสัญญาณดาวเทียม GPS ความแม่นยำสูง (รอสักครู่ 2-3 วินาที)...',
    });

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    let bestAccuracy = Infinity;
    let bestPos: GeolocationPosition | null = null;
    let samplesReceived = 0;

    const applyGpsPosition = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 10);
      setGpsAccuracyMeters(accuracy);

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

      updateManualPosition(lat, lng);
      const nearest = findNearestDistrict(lat, lng);

      if (isWithinSisaket(lat, lng)) {
        setGpsStatusInfo({
          type: 'success',
          text: `🎯 ล็อกพิกัดดาวเทียม GPS สำเร็จ: อ.${nearest.name_th} (ความแม่นยำ ±${accuracy} ม.)`,
        });
      } else {
        setGpsStatusInfo({
          type: 'warning',
          text: `📶 พิกัด GPS อยู่นอกเขต จ.ศรีสะเกษ — เข้าสู่โหมดปักหมุดเอง ท่านสามารถพิมพ์ค้นหาหรือเลือก 22 อำเภอได้ครับ`,
        });
      }
    };

    const maxWaitTimeout = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsLocating(false);
      if (bestPos) {
        applyGpsPosition(bestPos);
      } else {
        setGpsStatusInfo({
          type: 'warning',
          text: '⚠️ เปิดโหมดปักหมุดเอง: ท่านสามารถแตะลากหมุดบนแผนที่ หรือพิมพ์ค้นหาชื่อสถานที่/ถนนได้ทันที',
        });
      }
    }, 5500);

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          samplesReceived++;
          const acc = pos.coords.accuracy;

          if (acc < bestAccuracy) {
            bestAccuracy = acc;
            bestPos = pos;
          }

          setGpsStatusInfo({
            type: 'info',
            text: `🛰️ กำลังรับสัญญาณดาวเทียม (ความแม่นยำปัจจุบัน: ±${Math.round(acc)} ม.)...`,
          });

          // เมื่อได้ความแม่นยำระดับดาวเทียม (< 25 เมตร) หรือรับสัญญาณเกิน 4 รอบ ให้ล็อกพิกัดทันที
          if (acc <= 25 || samplesReceived >= 4) {
            clearTimeout(maxWaitTimeout);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setIsLocating(false);
            applyGpsPosition(pos);
          }
        },
        (err) => {
          clearTimeout(maxWaitTimeout);
          setIsLocating(false);
          setGpsStatusInfo({
            type: 'warning',
            text: '⚠️ ไม่สามารถดึง GPS ได้ (เปิดโหมดปักหมุดเอง) — ท่านสามารถแตะลากหมุดบนแผนที่ หรือค้นหาชื่อสถานที่ด้านบนแทนได้เลยครับ',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (err) {
      clearTimeout(maxWaitTimeout);
      setIsLocating(false);
    }
  };

  /**
   * ท่า 2: ค้นหาสถานที่ / ถนน / ชุมชน ในศรีสะเกษ (Instant 0ms Index)
   */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = query.trim().toLowerCase();
    
    // 1. ค้นหาในดัชนีสถานที่สำคัญของศรีสะเกษ (Instant 0ms Search)
    const matchedLocal = SISAKET_LANDMARKS_INDEX.filter(
      (item) => item.name.toLowerCase().includes(q) || item.district.toLowerCase().includes(q)
    );

    // 2. ค้นหาใน 22 อำเภอ
    const matchedDistricts = SISAKET_DISTRICTS.filter(
      (d) => d.name_th.toLowerCase().includes(q) || d.name_en.toLowerCase().includes(q)
    ).map((d) => ({
      name: `อ.${d.name_th} (ศูนย์กลางอำเภอ)`,
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

    updateManualPosition(item.lat, item.lng);
    setGpsStatusInfo({
      type: 'info',
      text: `📍 ปักหมุดที่: ${item.name} (อ.${item.district}) เรียบร้อยแล้ว`,
    });
  };

  const handleDistrictJump = async (targetDistrictName: string) => {
    const target = SISAKET_DISTRICTS.find((d) => d.name_th === targetDistrictName);
    if (!target) return;

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
      markerRef.current.setLatLng([target.lat, target.lng]);
      const L = await import('leaflet');
      updateActiveDistrictLayer(targetDistrictName, mapInstanceRef.current, L);
    }

    updateManualPosition(target.lat, target.lng);
  };

  const isOutside = !isWithinSisaket(latitude, longitude);

  return (
    <div className="space-y-3">
      {/* 1. Main Report Form Location Card (Interactive Preview & Trigger) */}
      <div className="rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50/90 via-white to-stone-50 p-3.5 shadow-sm space-y-3">
        {/* District & Status Headline */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/30 shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                ตำแหน่งจุดชำรุดที่เลือก
              </span>
              <h4 className="text-sm font-extrabold text-stone-900 truncate">
                อ.{district || 'เมืองศรีสะเกษ'}
              </h4>
            </div>
          </div>

          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-bold text-purple-900 border border-purple-300 shrink-0">
            🟣 22 อำเภอ
          </span>
        </div>

        {/* GPS Coordinates Capsule */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-xs text-stone-700 border border-stone-200 shadow-inner">
          <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-stone-800 truncate">
            <Compass className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-stone-500">พิกัด:</span>
            <span className="font-bold text-amber-950 truncate">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          </div>
          {gpsAccuracyMeters && (
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              ±{gpsAccuracyMeters}ม.
            </span>
          )}
        </div>

        {/* Proximity Alert Warning Banner if duplicate */}
        {nearbyWarning && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 p-2.5 text-xs text-amber-950 animate-fadeIn shadow-sm">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900">แจ้งเตือนจุดใกล้เคียง: </span>
              <span>{nearbyWarning}</span>
            </div>
          </div>
        )}

        {isOutside && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-900 shadow-sm">
            <ShieldAlert className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">อยู่นอกพื้นที่: </span>
              <span>ระบบให้บริการเฉพาะภายใน 22 อำเภอ จ.ศรีสะเกษเท่านั้น</span>
            </div>
          </div>
        )}

        {/* Prominent Tap-to-Open Fullscreen Map Button */}
        <button
          type="button"
          onClick={handleOpenMapModal}
          className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 p-0.5 shadow-md shadow-amber-600/20 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3 text-stone-900 group-hover:bg-amber-50/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
                <Maximize2 className="h-4 w-4" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <span>แตะเปิดแผนที่ระบุพิกัด (เต็มจอ)</span>
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse shrink-0" />
                </div>
                <div className="text-[11px] text-stone-500 truncate">
                  จับพิกัดดาวเทียมอัตโนมัติ • ปักหมุดอิสระ 22 อำเภอ
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shrink-0 ml-2">
              <span>เปิดแผนที่</span>
              <CornerDownRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>

        {/* Guided Helper Note */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
          <span>💡 ท่า 1: ล็อก GPS อัตโนมัติ</span>
          <span>ท่า 2: ลากหมุด/ค้นหาเอง</span>
        </div>
      </div>

      {/* 2. Dedicated Fullscreen Map Modal (โหมดเปิด Map ในมือถือเต็มหน้าจอ) */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-stone-900/95 backdrop-blur-md animate-fadeIn h-[100dvh] w-full">
          {/* Top Sticky Header */}
          <div className="flex items-center justify-between bg-stone-900 px-4 py-3 text-white border-b border-stone-800 shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-stone-950 font-bold shadow-md shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  ระบุพิกัดจุดชำรุด (22 อำเภอศรีสะเกษ)
                </h3>
                <p className="text-[10px] text-amber-400 truncate">
                  อ.{selectedDistrict} • {selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseMapModal}
              className="flex items-center gap-1 rounded-xl bg-stone-800 hover:bg-stone-700 px-3 py-1.5 text-xs font-bold text-stone-300 transition-colors shrink-0 ml-2"
              aria-label="ปิดแผนที่"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">ปิด</span>
            </button>
          </div>

          {/* Search & Tool Ribbon */}
          <div className="bg-stone-900/90 p-2.5 space-y-2 border-b border-stone-800 shrink-0 backdrop-blur-md">
            {/* Search Bar */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowDropdown(true);
                  }}
                  placeholder="🔍 ค้นหาชื่อสถานที่, ถนน, วัด, รพ., ชุมชน ในศรีสะเกษ..."
                  className="w-full rounded-2xl border border-stone-700 pl-10 pr-9 py-2 text-xs text-white placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-stone-800/90 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                    }}
                    className="absolute right-3 rounded-full p-1 text-stone-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-2xl bg-stone-800 p-1.5 shadow-2xl border border-stone-700 animate-fadeIn">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-amber-600/30 text-white transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full shrink-0 ml-2 border border-amber-800">
                        อ.{item.district}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Ribbon: 22 Districts Dropdown + GPS Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictJump(e.target.value)}
                  aria-label="เลือกอำเภอ"
                  className="w-full rounded-xl border border-purple-700/60 bg-purple-950/70 px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-purple-200 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer truncate"
                >
                  {SISAKET_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name_th} className="bg-stone-900 text-white">
                      🟣 อ.{d.name_th}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => triggerSatelliteGpsLock()}
                disabled={isLocating}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-3 py-1.5 text-xs font-bold text-stone-950 shadow-md transition-all active:scale-95 shrink-0"
              >
                <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin text-stone-950' : 'text-stone-950'}`} />
                <span>{isLocating ? 'กำลังค้นหา...' : '🛰️ จับพิกัด GPS'}</span>
              </button>
            </div>

            {/* Status Banner */}
            {gpsStatusInfo && (
              <div
                className={`flex items-start gap-2 rounded-xl p-2 text-xs animate-fadeIn shadow-sm border ${
                  gpsStatusInfo.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                    : gpsStatusInfo.type === 'warning'
                    ? 'bg-amber-950/80 border-amber-600 text-amber-200'
                    : 'bg-blue-950/80 border-blue-600 text-blue-200'
                }`}
              >
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span className="font-medium leading-tight">{gpsStatusInfo.text}</span>
              </div>
            )}
          </div>

          {/* Map Viewport Area */}
          <div className="relative flex-1 w-full bg-stone-900 overflow-hidden">
            <div ref={mapContainerRef} className="h-full w-full z-0" />

            {/* Overlay District Badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-xl bg-purple-950/90 text-purple-100 px-3 py-1.5 text-xs font-bold shadow-xl backdrop-blur-md border border-purple-400/60 max-w-[85%] truncate">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping shrink-0" />
              <span className="truncate">🟣 เส้นเขตจริง: อ.{selectedDistrict}</span>
            </div>

            {/* Helper Floating Pin Badge */}
            <div className="absolute top-2 right-2 z-10 rounded-xl bg-stone-900/90 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shadow-lg border border-stone-700 backdrop-blur-md">
              💡 แตะบนแผนที่หรือลากหมุดเพื่อเลื่อน
            </div>
          </div>

          {/* Sticky Bottom Action Panel */}
          <div className="bg-stone-900 border-t border-stone-800 p-3 sm:p-4 shadow-2xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 safe-bottom">
            <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  อ.{selectedDistrict}
                </div>
                <div className="text-[11px] font-mono text-amber-400 truncate">
                  ละติจูด {selectedLat.toFixed(5)}, ลองจิจูด {selectedLng.toFixed(5)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCloseMapModal}
                className="flex-1 sm:flex-initial rounded-2xl bg-stone-800 hover:bg-stone-700 px-4 py-3 text-xs font-bold text-stone-300 transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmLocation}
                className="flex-[2] sm:flex-initial flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-xl shadow-amber-600/30 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>✅ ยืนยันตำแหน่งนี้ (บันทึกพิกัด)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
