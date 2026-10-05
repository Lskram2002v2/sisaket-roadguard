'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, AlertTriangle, ShieldAlert, Sparkles, Layers, Search, X } from 'lucide-react';
import { SISAKET_CENTER, isWithinSisaket, findNearestDistrict, findNearbyReport, SISAKET_DISTRICTS } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';
import { RoadReport } from '@/lib/types';
import { roadStore } from '@/lib/db-store';

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
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsStatusInfo, setGpsStatusInfo] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);
  const [nearbyWarning, setNearbyWarning] = useState<string | null>(null);
  const [reports, setReports] = useState<RoadReport[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; district: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const allDistrictsLayerRef = useRef<any>(null);
  const activeDistrictLayerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadReports = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
    };
    loadReports();
  }, []);

  // Sync Leaflet marker & map view when latitude/longitude props update from outside (e.g., photo GPS extraction)
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
          zoom: 13,
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
            <div style="background-color: #C27803; width: 34px; height: 34px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 4px 16px rgba(194, 120, 3, 0.7); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
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

        // Auto-Trigger High-Accuracy Satellite GPS Lock on Mount
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          triggerAutoGpsLock(map, marker, L);
        }
      }
    }

    const triggerAutoGpsLock = (mapObj: any, markerObj: any, leafletObj: any) => {
      setIsLocating(true);
      setGpsStatusInfo({
        type: 'info',
        text: '🛰️ กำลังระบุพิกัดดาวเทียม GPS อัตโนมัติความแม่นยำสูง...',
      });

      let bestAcc = Infinity;
      let bestPosition: GeolocationPosition | null = null;
      let count = 0;

      const autoTimeout = setTimeout(() => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsLocating(false);
        if (bestPosition) {
          applyLocation(bestPosition);
        } else {
          setGpsStatusInfo({
            type: 'warning',
            text: '⚠️ เปิดโหมดปักหมุดเอง: ท่านสามารถแตะลากหมุดบนแผนที่ หรือพิมพ์ค้นหาชื่อสถานที่/ถนนได้ทันที',
          });
        }
      }, 5000);

      const applyLocation = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);

        if (isWithinSisaket(lat, lng)) {
          if (accuracyCircleRef.current && mapObj) {
            mapObj.removeLayer(accuracyCircleRef.current);
          }
          if (mapObj && markerObj) {
            accuracyCircleRef.current = leafletObj.circle([lat, lng], {
              radius: accuracy,
              color: '#2563EB',
              weight: 2,
              fillColor: '#3B82F6',
              fillOpacity: 0.15,
            }).addTo(mapObj);

            mapObj.flyTo([lat, lng], 16, { duration: 0.8 });
            markerObj.setLatLng([lat, lng]);
          }

          handlePositionUpdate(lat, lng);
          const nearest = findNearestDistrict(lat, lng);
          setGpsStatusInfo({
            type: 'success',
            text: `🎯 ล็อกพิกัดดาวเทียม GPS อัตโนมัติสำเร็จ: อ.${nearest.name_th} (ความแม่นยำ ±${accuracy} ม.)`,
          });
        } else {
          setGpsStatusInfo({
            type: 'warning',
            text: `⚠️ พิกัดดาวเทียมอยู่นอกพื้นที่ จ.ศรีสะเกษ (เปิดโหมดปักหมุดเอง) — สามารถพิมพ์ค้นหา หรือเลือก 22 อำเภอเพื่อปักหมุดได้ทันที`,
          });
        }
      };

      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            count++;
            const acc = pos.coords.accuracy;
            if (acc < bestAcc) {
              bestAcc = acc;
              bestPosition = pos;
            }

            if (acc <= 25 || count >= 3) {
              clearTimeout(autoTimeout);
              if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
              }
              setIsLocating(false);
              applyLocation(pos);
            }
          },
          () => {
            clearTimeout(autoTimeout);
            setIsLocating(false);
            setGpsStatusInfo({
              type: 'warning',
              text: '⚠️ ไม่สามารถเข้าถึง GPS ได้ (เปิดโหมดปักหมุดเอง) — สามารถแตะลากหมุดบนแผนที่ หรือพิมพ์ค้นหาชื่อสถานที่ได้เลยครับ',
            });
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      } catch (e) {
        clearTimeout(autoTimeout);
        setIsLocating(false);
      }
    };

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
      mapInstanceRef.current.flyTo([target.lat, target.lng], 14, { duration: 0.8 });
      markerRef.current.setLatLng([target.lat, target.lng]);
    }

    handlePositionUpdate(target.lat, target.lng);
  };

  /**
   * ดึงตำแหน่ง GPS ดาวเทียมความแม่นยำสูง (Multi-Sample Satellite Convergence Engine)
   */
  const handleGetLiveLocation = async () => {
    if (!navigator.geolocation) {
      setGeoError('อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    const L = await import('leaflet');
    setIsLocating(true);
    setGeoError(null);
    setGpsStatusInfo({
      type: 'info',
      text: '🛰️ กำลังค้นหาสัญญาณดาวเทียม GPS ความแม่นยำสูง (รอสักครู่ 2-3 วินาที)...',
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

      if (accuracyCircleRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(accuracyCircleRef.current);
      }

      if (mapInstanceRef.current && markerRef.current) {
        accuracyCircleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: '#2563EB',
          weight: 2,
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
        }).addTo(mapInstanceRef.current);

        mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 0.8 });
        markerRef.current.setLatLng([lat, lng]);
      }

      handlePositionUpdate(lat, lng);
      const nearest = findNearestDistrict(lat, lng);

      if (isWithinSisaket(lat, lng)) {
        setGpsStatusInfo({
          type: 'success',
          text: `🎯 ล็อกพิกัดดาวเทียม GPS สำเร็จ: อ.${nearest.name_th} (ความแม่นยำ ±${accuracy} ม.)`,
        });
      } else {
        setGpsStatusInfo({
          type: 'warning',
          text: `📶 พิกัดเครือข่ายอินเทอร์เน็ต (${lat.toFixed(3)}, ${lng.toFixed(3)}) อยู่นอกเขต จ.ศรีสะเกษ — สามารถพิมพ์ค้นหาหรือเลือก 22 อำเภอได้ครับ`,
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
      }
    }, 5500);

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
        setGeoError('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาเปิด Location Service ในการตั้งค่ามือถือ หรือค้นหาชื่อสถานที่ด้านบนแทนครับ');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /**
   * ค้นหาสถานที่ / ถนน / ชุมชน ในศรีสะเกษ
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

    handlePositionUpdate(item.lat, item.lng);
    setGpsStatusInfo({
      type: 'info',
      text: `📍 ปักหมุดที่: ${item.name} (อ.${item.district}) เรียบร้อยแล้ว`,
    });
  };

  const isOutside = !isWithinSisaket(latitude, longitude);

  return (
    <div className="space-y-3">
      {/* Search Bar for Places, Roads, and Villages in Sisaket */}
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
            className="w-full rounded-2xl border border-stone-300 pl-10 pr-9 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-stone-50/80 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowDropdown(false);
              }}
              className="absolute right-3 rounded-full p-1 text-stone-400 hover:text-stone-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Autocomplete Search Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-2xl border border-stone-200 animate-fadeIn">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-amber-50 text-stone-800 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold truncate">{item.name}</span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full shrink-0 ml-2">
                  อ.{item.district}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Header with District Selector & GPS Button */}
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

      {/* GPS Status Banner */}
      {gpsStatusInfo && (
        <div
          className={`flex items-start gap-2 rounded-2xl p-2.5 text-xs animate-fadeIn shadow-sm border ${
            gpsStatusInfo.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : gpsStatusInfo.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <span className="font-medium leading-relaxed">{gpsStatusInfo.text}</span>
          </div>
        </div>
      )}

      {/* Geo Error / GPS Blocked Guide */}
      {geoError && (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-300 p-2.5 text-xs text-rose-800 shadow-sm animate-fadeIn">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">แจ้งเตือนตำแหน่ง: </span>
            <span>{geoError}</span>
          </div>
        </div>
      )}

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

      {isOutside && !gpsStatusInfo && (
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

      {/* District & Location Tailwind Capsule */}
      <div className="flex items-center justify-between gap-1 rounded-xl bg-purple-50/70 px-3.5 py-2 text-xs text-purple-950 border border-purple-200 shadow-sm">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Layers className="h-3.5 w-3.5 text-purple-700 shrink-0" />
          <span className="text-purple-800 font-medium shrink-0">พื้นที่:</span>
          <span className="font-bold text-purple-900 truncate">
            อ.{district || 'เมืองศรีสะเกษ'}
          </span>
        </div>
        <span className="text-[10px] text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full font-medium shrink-0">
          ขอบเขต 22 อำเภอ
        </span>
      </div>
    </div>
  );
}
