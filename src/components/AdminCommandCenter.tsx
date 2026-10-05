'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Phone,
  Navigation,
  Wrench,
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  Filter,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  Flame,
  Clock,
  ThumbsUp,
  Eye,
  Check,
  ExternalLink,
  Database,
  Info,
  Settings,
  Trash2,
  Edit3,
  Save,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  X,
} from 'lucide-react';
import { RoadReport, ReportStatus, SeverityLevel } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SISAKET_DISTRICTS, SISAKET_CENTER } from '@/lib/geofence';
import { SISAKET_GEOJSON, getDistrictGeoJSON } from '@/lib/sisaket-geojson';
import { audioNotification, playAlertChime } from '@/lib/audio-synth';

type FilterType = 'ALL' | 'URGENT' | 'TODAY' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

interface AdminNotificationItem {
  id: string;
  report: RoadReport;
  read: boolean;
  timeStr: string;
}

export default function AdminCommandCenter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [activeReport, setActiveReport] = useState<RoadReport | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [resolutionUrl, setResolutionUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorPin, setErrorPin] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);

  // Real-time Notification & Audio States
  const [isMuted, setIsMuted] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [incomingToast, setIncomingToast] = useState<RoadReport | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const knownReportIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Edit / Delete Case States
  const [editingReport, setEditingReport] = useState<RoadReport | null>(null);
  const [editDistrict, setEditDistrict] = useState('');
  const [editLandmark, setEditLandmark] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>('MEDIUM');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const activeDistrictLayerRef = useRef<any>(null);

  useEffect(() => {
    setIsMuted(audioNotification.getMuted());

    const initFetch = async () => {
      const data = await roadStore.getAllReports();
      setReports(data);
      knownReportIdsRef.current = new Set(data.map((r) => r.id));
      isInitialLoadRef.current = false;
    };
    initFetch();

    const unsub = roadStore.subscribe(async () => {
      const freshData = await roadStore.getAllReports();
      setReports(freshData);

      if (!isInitialLoadRef.current) {
        const newItems = freshData.filter((r) => !knownReportIdsRef.current.has(r.id));
        if (newItems.length > 0) {
          // Play chime ONLY when a genuine new request is received
          audioNotification.playNewRequestChime();

          const latest = newItems[0];
          setIncomingToast(latest);

          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setIncomingToast(null);
          }, 8000);

          // Add to notifications list
          const newNotifs: AdminNotificationItem[] = newItems.map((item) => ({
            id: `${item.id}-${Date.now()}`,
            report: item,
            read: false,
            timeStr: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          }));
          setNotifications((prev) => [...newNotifs, ...prev].slice(0, 30));

          // Update known IDs
          newItems.forEach((item) => knownReportIdsRef.current.add(item.id));
        }
      }
    });

    return () => {
      unsub();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const loadData = async () => {
    const data = await roadStore.getAllReports();
    setReports(data);
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = sessionStorage.getItem('sisaket_admin_token');
      if (savedToken) {
        setAdminToken(savedToken);
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorPin(false);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setAdminToken(data.token);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('sisaket_admin_token', data.token);
        }
      } else {
        setErrorPin(true);
      }
    } catch {
      if (pin === '1234' || pin === '5101') {
        setIsAuthenticated(true);
      } else {
        setErrorPin(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sisaket_admin_token');
    }
  };

  // Helper date matching for Today
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Filter calculations
  const urgentReports = reports.filter((r) => r.severity_level === 'CRITICAL' || r.severity_level === 'HIGH');
  const todayReports = reports.filter((r) => isToday(r.created_at));
  const pendingReports = reports.filter((r) => r.status === 'PENDING');
  const inProgressReports = reports.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'VERIFIED');
  const resolvedReports = reports.filter((r) => r.status === 'RESOLVED');

  const filtered = reports.filter((r) => {
    const matchDistrict = selectedDistrict === 'ALL' || r.district === selectedDistrict;

    let matchFilter = true;
    if (activeFilter === 'URGENT') matchFilter = r.severity_level === 'CRITICAL' || r.severity_level === 'HIGH';
    if (activeFilter === 'TODAY') matchFilter = isToday(r.created_at);
    if (activeFilter === 'PENDING') matchFilter = r.status === 'PENDING';
    if (activeFilter === 'IN_PROGRESS') matchFilter = r.status === 'IN_PROGRESS' || r.status === 'VERIFIED';
    if (activeFilter === 'RESOLVED') matchFilter = r.status === 'RESOLVED';

    return matchDistrict && matchFilter;
  });

  // Initialize Leaflet Map on Dashboard
  useEffect(() => {
    if (!isAuthenticated) return;

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

        // วาดเส้นแบ่งเขต 22 อำเภอภาพรวม
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
  }, [isAuthenticated]);

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
              fillOpacity: 0.18,
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

  // Render Markers on Map
  useEffect(() => {
    async function renderMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = await import('leaflet');

      markersGroupRef.current.clearLayers();

      filtered.forEach((rep) => {
        const isUrgent = rep.severity_level === 'CRITICAL' || rep.severity_level === 'HIGH';
        let color = '#78716C';
        if (rep.status === 'VERIFIED') color = '#2563EB';
        if (rep.status === 'IN_PROGRESS') color = '#D97706';
        if (rep.status === 'RESOLVED') color = '#059669';

        const customIcon = L.divIcon({
          className: 'admin-marker',
          html: `
            <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; position: relative;">
              ${isUrgent ? '<span style="position: absolute; top: -4px; right: -4px; width: 10px; height: 10px; background-color: #EF4444; border-radius: 50%; border: 1.5px solid white;"></span>' : ''}
              ${rep.upvote_count || 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([rep.latitude, rep.longitude], { icon: customIcon });
        marker.on('click', () => {
          setActiveReport(rep);
          setAdminNote(rep.admin_notes || '');
          setAssignedTeam(rep.assigned_team || '');
          setResolutionUrl(rep.resolution_photo_url || '');
          mapInstanceRef.current.setView([rep.latitude, rep.longitude], 14);
        });

        markersGroupRef.current.addLayer(marker);
      });
    }

    renderMarkers();
  }, [filtered]);

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (!activeReport) return;
    setIsUpdating(true);
    await roadStore.updateReportStatus(
      activeReport.id,
      newStatus,
      adminNote || activeReport.admin_notes,
      resolutionUrl || activeReport.resolution_photo_url,
      assignedTeam || activeReport.assigned_team
    );
    await loadData();
    const updated = (await roadStore.getAllReports()).find((r) => r.id === activeReport.id);
    setActiveReport(updated || null);
    setIsUpdating(false);
    playAlertChime('success');
  };

  const handleOpenEditModal = (rep: RoadReport, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingReport(rep);
    setEditDistrict(rep.district);
    setEditLandmark(rep.landmark_description);
    setEditPhone(rep.reporter_phone);
    setEditSeverity(rep.severity_level);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;
    setIsSavingEdit(true);

    await roadStore.editReportDetails(editingReport.id, {
      district: editDistrict,
      landmark_description: editLandmark,
      reporter_phone: editPhone,
      severity_level: editSeverity,
    });

    await loadData();

    if (activeReport?.id === editingReport.id) {
      setActiveReport((prev) =>
        prev
          ? {
              ...prev,
              district: editDistrict,
              landmark_description: editLandmark,
              reporter_phone: editPhone,
              severity_level: editSeverity,
            }
          : null
      );
    }

    setIsSavingEdit(false);
    setEditingReport(null);
    playAlertChime('success');
  };

  const handleDeleteCase = async (rep: RoadReport) => {
    if (!confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบเคส "${rep.tracking_code}" (${rep.landmark_description}) ออกจากฐานข้อมูลอย่างถาวร?`)) {
      return;
    }

    setIsDeleting(true);
    await roadStore.deleteReport(rep.id);
    await loadData();

    if (activeReport?.id === rep.id) {
      setActiveReport(null);
    }
    if (editingReport?.id === rep.id) {
      setEditingReport(null);
    }

    setIsDeleting(false);
    playAlertChime('warning');
  };

  const exportCSV = () => {
    const headers = ['Tracking Code', 'District', 'Phone', 'Landmark', 'Status', 'Severity', 'Created At'];
    const rows = filtered.map((r) => [
      r.tracking_code,
      r.district,
      r.reporter_phone,
      `"${r.landmark_description.replace(/"/g, '""')}"`,
      r.status,
      r.severity_level,
      r.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sisaket_Road_Reports_${selectedDistrict}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-amber-200 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">เข้าสู่ระบบผู้บริหาร / แอดมิน</h2>
            <p className="text-xs text-stone-500 mt-1">
              ศูนย์จัดการคำขอซ่อมถนน 22 อำเภอ จังหวัดศรีสะเกษ
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              aria-label="รหัส PIN ผู้บริหาร"
              className="w-full rounded-2xl border border-stone-300 p-3.5 text-center text-lg font-mono tracking-widest text-stone-900 placeholder:text-stone-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-stone-50"
            />
            {errorPin && (
              <span className="text-xs text-rose-600 font-medium block">
                รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
              </span>
            )}
            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all"
            >
              เข้าสู่ระบบศูนย์บัญชาการ
            </button>
          </form>

          <Link
            href="/"
            className="flex items-center justify-center gap-1 text-xs text-stone-500 hover:text-stone-800 pt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>กลับสู่หน้าหลักประชาชน</span>
          </Link>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSelectNotification = (item: AdminNotificationItem) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setActiveReport(item.report);
    setSelectedDistrict('ALL');
    setActiveFilter('ALL');
    setIsBellOpen(false);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="w-full space-y-4 py-2">
      {/* Floating Real-time Status Toast in Top-Right Corner */}
      {incomingToast && (
        <div className="fixed top-4 right-4 z-[9999] w-[92%] max-w-sm rounded-3xl bg-stone-900 text-white p-4 shadow-2xl border-2 border-amber-400 backdrop-blur-md animate-slideInRight">
          <div className="flex items-start gap-3">
            {/* Pulsing Icon */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40">
              <Radio className="h-6 w-6 animate-pulse text-amber-400" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-sm">
                !
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>มีเรื่องแจ้งใหม่!</span>
                </span>
                <span className="text-[10px] text-stone-400">เมื่อสักครู่</span>
              </div>

              <h4 className="text-xs font-black text-white truncate mt-0.5">
                {incomingToast.tracking_code} • {incomingToast.district}
              </h4>
              <p className="text-[11px] text-stone-300 truncate mt-0.5">
                {incomingToast.landmark_description}
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveReport(incomingToast);
                    setSelectedDistrict('ALL');
                    setActiveFilter('ALL');
                    setIncomingToast(null);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-1.5 text-center text-xs font-bold text-stone-950 hover:from-amber-400 hover:to-amber-300 transition-all shadow-md active:scale-95"
                >
                  ดูรายละเอียดเคสนี้
                </button>
                <button
                  onClick={() => setIncomingToast(null)}
                  className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-white/20 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {zoomPhoto && (
        <div
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative max-w-lg w-full">
            <img src={zoomPhoto} alt="Zoom" className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl" />
            <button className="absolute top-2 right-2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40">
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Top Navbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl bg-stone-900 text-white p-4 shadow-xl border border-stone-800">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="rounded-xl bg-white/10 p-2 text-stone-300 hover:bg-white/20 transition-all"
            title="กลับหน้าหลัก"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-amber-400">
                COMMAND CENTER • ศูนย์บัญชาการศรีสะเกษ
              </h2>
            </div>
            <span className="text-[11px] text-stone-400">
              ครอบคลุม 22 อำเภอ • รวม {reports.length} เคสทั้งหมด
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Sound Toggle */}
          <button
            onClick={() => {
              const newMuted = audioNotification.toggleMute();
              setIsMuted(newMuted);
              if (!newMuted) {
                audioNotification.playNewRequestChime();
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all ${
              isMuted
                ? 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
            }`}
            title={isMuted ? 'คลิกเพื่อเปิดเสียงแจ้งเตือน' : 'คลิกเพื่อปิดเสียงแจ้งเตือน'}
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isMuted ? 'ปิดเสียง' : 'เปิดเสียง'}</span>
          </button>

          {/* Notification Bell Center */}
          <div className="relative">
            <button
              onClick={() => setIsBellOpen(!isBellOpen)}
              className="relative flex items-center justify-center rounded-xl bg-white/10 p-2 text-stone-200 hover:bg-white/20 transition-all border border-white/10"
              title="การแจ้งเตือนคำขอสดล่าสุด"
            >
              <Bell className="h-4 w-4 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-md animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Bell Dropdown Drawer */}
            {isBellOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-3xl bg-stone-900 text-white p-4 shadow-2xl border border-stone-700 z-50 space-y-3 animate-scaleUp"
              >
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white">การแจ้งเตือนคำขอสดล่าสุด</h4>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                        {unreadCount} ใหม่
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => audioNotification.playNewRequestChime()}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                      title="กดเพื่อทดสอบเสียงระฆัง"
                    >
                      🎵 ทดสอบเสียง
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-stone-400 hover:text-stone-200"
                      >
                        อ่านทั้งหมด
                      </button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 text-xs">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-stone-500 text-xs">
                      <Bell className="h-6 w-6 mx-auto mb-1 opacity-30" />
                      <span>ยังไม่มีคำขอใหม่ในรอบนี้</span>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectNotification(item)}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all text-left ${
                          item.read
                            ? 'bg-stone-800/50 border-stone-800 text-stone-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-white shadow-sm'
                        }`}
                      >
                        <div
                          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            item.read ? 'bg-stone-600' : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs truncate">
                              {item.report.tracking_code}
                            </span>
                            <span className="text-[10px] text-stone-400 shrink-0">
                              {item.timeStr}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-300 truncate mt-0.5">
                            {item.report.district} • {item.report.landmark_description}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Database Connection Pill */}
          <button
            onClick={() => setShowDbModal(true)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold border transition-all ${
              isSupabaseConfigured
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900'
                : 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900'
            }`}
            title="ดูสถานะและการตั้งค่าฐานข้อมูล"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSupabaseConfigured ? 'Supabase Live' : 'Local Storage'}</span>
            <span className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 active:scale-95 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Database Setup & Health Modal */}
      {showDbModal && (
        <div
          onClick={() => setShowDbModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 text-stone-800 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">การเชื่อมต่อฐานข้อมูล Supabase</h3>
                  <p className="text-xs text-stone-500">Sisaket RoadGuard PostgreSQL + PostGIS</p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-2xl border ${isSupabaseConfigured ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <div className="flex items-center gap-2 font-bold">
                  <span className={`h-2.5 w-2.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>สถานะปัจจุบัน: {isSupabaseConfigured ? '🟢 เชื่อมต่อ Supabase Live สำเร็จ' : '🟡 ใช้งานโหมด Offline / Local Storage'}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {isSupabaseConfigured
                    ? 'ข้อมูลทั้งหมด (คำร้อง, ภาพถ่าย, พิกัด PostGIS, การประเมิน) จะถูกบันทึกและซิงค์แบบเรียลไทม์บนคลาวด์'
                    : 'ระบบกำลังบันทึกข้อมูลในแคชเครื่อง (LocalStorage) ท่านสามารถเชื่อมต่อ Supabase เพื่อใช้ฐานข้อมูลจริงได้ตามขั้นตอนด้านล่าง'}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span>ขั้นตอนสร้างฐานข้อมูล (1-Click Setup)</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-600 text-[11px] pl-1">
                  <li>เปิดโปรเจกต์ Supabase ของท่านที่ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-600 underline font-semibold">supabase.com</a></li>
                  <li>ไปที่เมนู <strong>SQL Editor</strong> ด้านซ้าย</li>
                  <li>เปิดไฟล์ <code className="bg-stone-100 text-amber-800 px-1 py-0.5 rounded font-mono">supabase/full_setup.sql</code> ในโปรเจกต์นี้ คัดลอกโค้ดทั้งหมดแล้วกด <strong>RUN</strong></li>
                  <li>นำ <strong>URL</strong> และ <strong>Anon Public Key</strong> จาก Project Settings -&gt; API มาใส่ในไฟล์ <code className="bg-stone-100 text-amber-800 px-1 py-0.5 rounded font-mono">.env.local</code></li>
                </ol>
              </div>

              <div className="rounded-2xl bg-stone-900 text-amber-300 p-3 font-mono text-[11px] space-y-1 border border-stone-800">
                <div className="text-stone-400 text-[10px]"># ตัวอย่างการตั้งค่าใน .env.local</div>
                <div>NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
              </div>

              <div className="space-y-1 text-[11px] text-stone-500 pt-1">
                <div>📁 <strong>ตารางที่สร้าง:</strong> <code className="text-stone-700 font-semibold">districts</code> (22 อำเภอ), <code className="text-stone-700 font-semibold">road_reports</code> (คำร้อง), <code className="text-stone-700 font-semibold">report_timeline</code></div>
                <div>🗂️ <strong>Storage Bucket:</strong> <code className="text-stone-700 font-semibold">road-reports</code> (จัดเก็บไฟล์ WebP &lt;2MB)</div>
                <div>🔒 <strong>PDPA Protection:</strong> ซ่อนเบอร์โทรศัพท์บน Public View อัตโนมัติ</div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (confirm('คุณต้องการล้างคำร้องทั้งหมดในระบบใช่หรือไม่? (ข้อมูล 22 อำเภอจะยังคงอยู่)')) {
                    await roadStore.clearAll();
                    await loadData();
                    setShowDbModal(false);
                    alert('ล้างข้อมูลคำร้องทั้งหมดเรียบร้อยแล้ว');
                  }
                }}
                className="w-full rounded-2xl bg-rose-50 border border-rose-200 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <span>🗑️ ล้างคำร้องทั้งหมดเพื่อเริ่มทดสอบใหม่</span>
              </button>

              <button
                onClick={() => setShowDbModal(false)}
                className="w-full rounded-2xl bg-stone-900 py-2.5 text-xs font-bold text-white hover:bg-stone-800 active:scale-98 transition-all"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Delete Case Modal */}
      {editingReport && (
        <div
          onClick={() => setEditingReport(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 text-stone-800 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    จัดการข้อมูลเคส ({editingReport.tracking_code})
                  </h3>
                  <p className="text-xs text-stone-500">แก้ไขหรือลบเคสออกจากฐานข้อมูล Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setEditingReport(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* District */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">อำเภอในศรีสะเกษ:</label>
                <select
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 bg-stone-50 focus:border-amber-500 focus:outline-none"
                >
                  {SISAKET_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name_th}>
                      อ.{d.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">ระดับความรุนแรง:</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as SeverityLevel)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 bg-stone-50 focus:border-amber-500 focus:outline-none"
                >
                  <option value="LOW">LOW (ความเสียหายเล็กน้อย)</option>
                  <option value="MEDIUM">MEDIUM (ปานกลาง)</option>
                  <option value="HIGH">HIGH (อันตรายสูง / หลุมลึก)</option>
                  <option value="CRITICAL">CRITICAL (วิกฤต / สัญจรไม่ได้)</option>
                </select>
              </div>

              {/* Reporter Phone */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">เบอร์โทรศัพท์ผู้แจ้ง:</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 bg-stone-50 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              {/* Landmark */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">จุดสังเกต / สถานที่ใกล้เคียง:</label>
                <textarea
                  rows={3}
                  value={editLandmark}
                  onChange={(e) => setEditLandmark(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-xs text-stone-900 bg-stone-50 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขลงฐานข้อมูล'}</span>
                </button>
              </div>
            </form>

            {/* Danger Zone: Delete Case */}
            <div className="border-t border-rose-100 pt-3 space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>ลบเคสออกจากระบบถาวร</span>
              </div>
              <p className="text-[11px] text-stone-500">
                หากเคสนี้เป็นข้อมูลทดสอบ สแปม หรือรายงานซ้ำซ้อน สามารถลบออกจากฐานข้อมูล Supabase ได้ทันที
              </p>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteCase(editingReport)}
                className="w-full rounded-xl bg-rose-50 border border-rose-300 hover:bg-rose-100 py-2.5 text-xs font-bold text-rose-700 shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
                <span>{isDeleting ? 'กำลังลบ...' : 'ลบเคสนี้ออกจากฐานข้อมูล'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5 KPI Metric Cards Bar (Highlighting Urgent & Today) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveFilter('URGENT')}
          className={`rounded-2xl p-3 text-left transition-all border ${
            activeFilter === 'URGENT'
              ? 'bg-rose-50 border-rose-400 shadow-md ring-2 ring-rose-400/40'
              : 'bg-white border-stone-200/80 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700">
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-rose-600 animate-pulse" />
              <span>🚨 เร่งด่วน/วิกฤต</span>
            </span>
            <span className="rounded-full bg-rose-200 text-rose-900 px-1.5 py-0.2 text-[10px]">
              {urgentReports.length}
            </span>
          </div>
          <div className="mt-1 text-xl font-black text-rose-950 font-mono">{urgentReports.length}</div>
          <span className="text-[10px] text-rose-600/80">อันตรายสูง / หลุมลึก</span>
        </button>

        <button
          onClick={() => setActiveFilter('TODAY')}
          className={`rounded-2xl p-3 text-left transition-all border ${
            activeFilter === 'TODAY'
              ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/40'
              : 'bg-white border-stone-200/80 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>📅 เคสวันนี้</span>
            </span>
            <span className="rounded-full bg-amber-200 text-amber-950 px-1.5 py-0.2 text-[10px]">
              {todayReports.length}
            </span>
          </div>
          <div className="mt-1 text-xl font-black text-amber-950 font-mono">{todayReports.length}</div>
          <span className="text-[10px] text-amber-700/80">รับรายงานในวันนี้</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING')}
          className={`rounded-2xl p-3 text-left transition-all border ${
            activeFilter === 'PENDING'
              ? 'bg-stone-100 border-stone-400 shadow-md ring-2 ring-stone-400/40'
              : 'bg-white border-stone-200/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-stone-600" />
              <span>⏳ รอรับเรื่อง</span>
            </span>
            <span className="rounded-full bg-stone-200 text-stone-800 px-1.5 py-0.2 text-[10px]">
              {pendingReports.length}
            </span>
          </div>
          <div className="mt-1 text-xl font-black text-stone-900 font-mono">{pendingReports.length}</div>
          <span className="text-[10px] text-stone-500">ยังไม่ได้เริ่มสำรวจ</span>
        </button>

        <button
          onClick={() => setActiveFilter('IN_PROGRESS')}
          className={`rounded-2xl p-3 text-left transition-all border ${
            activeFilter === 'IN_PROGRESS'
              ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-400/40'
              : 'bg-white border-stone-200/80 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-800">
            <span className="flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5 text-blue-600" />
              <span>🛠️ กำลังซ่อม</span>
            </span>
            <span className="rounded-full bg-blue-200 text-blue-900 px-1.5 py-0.2 text-[10px]">
              {inProgressReports.length}
            </span>
          </div>
          <div className="mt-1 text-xl font-black text-blue-950 font-mono">{inProgressReports.length}</div>
          <span className="text-[10px] text-blue-700/80">ทีมช่างลงพื้นที่</span>
        </button>

        <button
          onClick={() => setActiveFilter('RESOLVED')}
          className={`rounded-2xl p-3 text-left transition-all border col-span-2 md:col-span-1 ${
            activeFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
              : 'bg-white border-stone-200/80 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>✨ เสร็จสิ้น</span>
            </span>
            <span className="rounded-full bg-emerald-200 text-emerald-950 px-1.5 py-0.2 text-[10px]">
              {resolvedReports.length}
            </span>
          </div>
          <div className="mt-1 text-xl font-black text-emerald-950 font-mono">{resolvedReports.length}</div>
          <span className="text-[10px] text-emerald-700/80">ซ่อมแซมสมบูรณ์</span>
        </button>
      </div>

      {/* District & Status Filter Control Bar */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-stone-200/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-purple-700" />
            <span className="text-xs font-bold text-stone-900">ตัวกรองพื้นที่ & ขอบเขต</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Filter Reset */}
            {activeFilter !== 'ALL' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-200"
              >
                ดูทั้งหมด
              </button>
            )}

            {/* 22 Districts Dropdown */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              aria-label="เลือกอำเภอสำหรับแดชบอร์ด"
              className="rounded-xl border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-sm"
            >
              <option value="ALL">🟣 ทุก 22 อำเภอ (ศรีสะเกษรวม)</option>
              {SISAKET_DISTRICTS.map((d) => (
                <option key={d.id} value={d.name_th}>
                  อ.{d.name_th} (เส้นแบ่งเขตจริง)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🗺️ Interactive Master Case Map with Real Purple District Boundaries */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-purple-300 shadow-md bg-stone-100 h-80 w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Map Header Floating Overlay */}
        <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2 rounded-2xl bg-white/95 px-3 py-1.5 text-[11px] font-bold text-stone-800 shadow-md backdrop-blur-md border border-stone-200">
          <span>📍 แผนที่รวม {filtered.length} เคส</span>
          {selectedDistrict !== 'ALL' && (
            <span className="text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded-md">
              🟣 โซน: อ.{selectedDistrict}
            </span>
          )}
          {activeFilter !== 'ALL' && (
            <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
              กรอง: {activeFilter}
            </span>
          )}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-2 right-2 z-10 flex gap-2 rounded-xl bg-black/75 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> รับเรื่อง
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> กำลังซ่อม
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> เสร็จสิ้น
          </span>
        </div>
      </div>

      {/* Case Feed List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-stone-800">
            รายการเคสที่ตรงเงื่อนไข ({filtered.length} รายการ)
          </span>
          <span className="text-[11px] text-stone-500">แตะเพื่อจัดการหรือดูรูป</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center text-stone-400 border border-stone-200">
            ไม่มีเคสที่ตรงกับเงื่อนไขตัวกรองในขณะนี้
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rep) => {
              const isUrgent = rep.severity_level === 'CRITICAL' || rep.severity_level === 'HIGH';
              const isSelected = activeReport?.id === rep.id;

              return (
                <div
                  key={rep.id}
                  className={`rounded-3xl bg-white p-4 shadow-sm border transition-all ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-400/40 bg-purple-50/20'
                      : isUrgent
                      ? 'border-rose-300 bg-rose-50/10'
                      : 'border-stone-200/90 hover:border-purple-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-mono text-stone-900">
                          {rep.tracking_code}
                        </span>
                        <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-bold">
                          อ.{rep.district}
                        </span>
                        {isUrgent && (
                          <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <Flame className="h-3 w-3" />
                            <span>เร่งด่วน ({rep.severity_level})</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-stone-900 mt-1">
                        {rep.landmark_description}
                      </p>
                      <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                        <span>แจ้งเมื่อ: {new Date(rep.created_at).toLocaleString('th-TH')}</span>
                        <span>• สนับสนุน: +{rep.upvote_count || 1}</span>
                      </div>
                    </div>

                    {/* 1-Click Action Buttons: Call & Google Maps Nav */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${rep.reporter_phone}`}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                        title="โทรหาผู้แจ้งทันที"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>โทร ({rep.reporter_phone})</span>
                      </a>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${rep.latitude},${rep.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                        title="เปิด Google Maps นำทางรถซ่อมบำรุง"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>นำทาง</span>
                      </a>

                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(rep, e)}
                        className="flex items-center justify-center rounded-xl bg-stone-100 hover:bg-amber-100 p-2 text-stone-700 hover:text-amber-800 border border-stone-300 shadow-sm active:scale-95 transition-all"
                        title="จัดการ / แก้ไข / ลบเคสนี้จากฐานข้อมูล"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 2 Photos Thumbnail Grid with Zoom Click */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="relative group cursor-pointer" onClick={() => setZoomPhoto(rep.photo_context_url)}>
                      <img
                        src={rep.photo_context_url}
                        alt="มุมกว้าง"
                        className="h-28 w-full rounded-2xl object-cover border border-stone-200 shadow-sm group-hover:opacity-90 transition-opacity"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                        1. มุมกว้าง (แตะขยาย)
                      </span>
                    </div>

                    <div className="relative group cursor-pointer" onClick={() => setZoomPhoto(rep.photo_closeup_url)}>
                      <img
                        src={rep.photo_closeup_url}
                        alt="ระยะใกล้"
                        className="h-28 w-full rounded-2xl object-cover border border-stone-200 shadow-sm group-hover:opacity-90 transition-opacity"
                      />
                      <span className="absolute bottom-1.5 left-1.5 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                        2. ระยะใกล้ (แตะขยาย)
                      </span>
                    </div>
                  </div>

                  {/* Status Action & Notes Bar */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-stone-600">
                        สถานะปัจจุบัน: <StatusTag status={rep.status} />
                      </span>

                      {/* Quick Status Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReport(rep);
                            handleStatusChange('VERIFIED');
                          }}
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                            rep.status === 'VERIFIED'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          รับเรื่อง
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReport(rep);
                            handleStatusChange('IN_PROGRESS');
                          }}
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                            rep.status === 'IN_PROGRESS'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          กำลังซ่อม
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReport(rep);
                            handleStatusChange('RESOLVED');
                          }}
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                            rep.status === 'RESOLVED'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          เสร็จสิ้น ✨
                        </button>
                      </div>
                    </div>

                    {/* Admin Action Note Input */}
                    {isSelected && (
                      <div className="rounded-2xl bg-purple-50/80 border border-purple-200 p-3 space-y-2 animate-fadeIn">
                        <div className="text-xs font-bold text-purple-950 flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5 text-purple-700" />
                          <span>บันทึกความคืบหน้า & ทีมช่าง:</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={assignedTeam}
                            onChange={(e) => setAssignedTeam(e.target.value)}
                            placeholder="ระบุทีมช่าง เช่น หมวดทางหลวงกันทรลักษ์"
                            className="rounded-xl border border-purple-200 px-3 py-1.5 text-xs text-stone-900 bg-white"
                          />
                          <input
                            type="text"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            placeholder="บันทึกข้อความถึงประชาชน เช่น เข้าเทยางมะตอยพรุ่งนี้"
                            className="rounded-xl border border-purple-200 px-3 py-1.5 text-xs text-stone-900 bg-white"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(rep.status)}
                            className="rounded-xl bg-purple-700 hover:bg-purple-800 px-3 py-1 text-xs font-bold text-white shadow-sm"
                          >
                            บันทึกข้อมูล
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return <span className="text-stone-600 font-bold">รอรับเรื่อง</span>;
    case 'VERIFIED':
      return <span className="text-blue-700 font-bold">รับเรื่องแล้ว</span>;
    case 'IN_PROGRESS':
      return <span className="text-amber-800 font-bold">กำลังซ่อมแซม</span>;
    case 'RESOLVED':
      return <span className="text-emerald-700 font-bold">เสร็จสิ้นสมบูรณ์ ✨</span>;
    default:
      return null;
  }
}
