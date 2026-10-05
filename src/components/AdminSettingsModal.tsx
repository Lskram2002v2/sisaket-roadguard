'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Image as ImageIcon,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Save,
  Upload,
  AlertTriangle,
  Info,
  HelpCircle,
  FileImage,
} from 'lucide-react';
import { SponsorBanner, HeaderThemeConfig } from '@/lib/types';
import { roadStore } from '@/lib/db-store';
import {
  normalizeImageUrl,
  isGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  FALLBACK_BANNER_IMAGE,
} from '@/lib/image-helper';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'banners' | 'header' | 'guide'>('banners');

  // Banners State
  const [banners, setBanners] = useState<SponsorBanner[]>([]);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTargetLink, setNewTargetLink] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoadedSuccess, setImageLoadedSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File Input Refs
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);

  // Header Theme State
  const [themeConfig, setThemeConfig] = useState<HeaderThemeConfig>({
    mode: 'preset',
    custom_images: [],
    banner_speed_seconds: 5,
    overlay_darkness: 75,
    updated_at: new Date().toISOString(),
  });
  const [customImageInput, setCustomImageInput] = useState('');
  const [headerImageLoadError, setHeaderImageLoadError] = useState(false);

  const loadAllSettings = async () => {
    const loadedBanners = await roadStore.getAllBanners();
    setBanners(loadedBanners);

    const loadedTheme = await roadStore.getThemeConfig();
    setThemeConfig(loadedTheme);
  };

  useEffect(() => {
    if (isOpen) {
      loadAllSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  /**
   * บีบอัดไฟล์ภาพจากเครื่องเป็น WebP/DataURL อัตโนมัติ (ไม่เกิน 200KB)
   */
  const handleLocalFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'banner' | 'header'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP, GIF) เท่านั้น');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/webp', 0.85);

          if (target === 'banner') {
            setNewImageUrl(dataUrl);
            setImageLoadError(false);
            setImageLoadedSuccess(true);
            showFeedback('📁 นำเข้ารูปภาพจากอุปกรณ์สำเร็จ (พร้อมแสดงผลทันที)');
          } else {
            const existing = themeConfig.custom_images || [];
            const updated = [...existing, dataUrl];
            handleSaveTheme({ custom_images: updated, mode: 'custom' });
            showFeedback('📁 เพิ่มรูปพื้นหลังส่วนบนจากอุปกรณ์สำเร็จ');
          }
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add or Edit Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) {
      alert('กรุณากรอก URL รูปภาพ หรือเลือกไฟล์จากอุปกรณ์');
      return;
    }

    setIsSaving(true);
    const normalizedUrl = normalizeImageUrl(newImageUrl);

    if (editingBannerId) {
      await roadStore.saveBanner({
        id: editingBannerId,
        title: newTitle.trim() || 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
        subtitle: newSubtitle.trim() || undefined,
        image_url: normalizedUrl,
        target_link: newTargetLink.trim() || undefined,
        is_active: newIsActive,
        order: banners.find((b) => b.id === editingBannerId)?.order ?? 1,
      });
      showFeedback('✅ อัปเดตป้ายประชาสัมพันธ์เรียบร้อย');
    } else {
      await roadStore.saveBanner({
        title: newTitle.trim() || 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
        subtitle: newSubtitle.trim() || undefined,
        image_url: normalizedUrl,
        target_link: newTargetLink.trim() || undefined,
        is_active: newIsActive,
        order: banners.length + 1,
      });
      showFeedback('✅ เพิ่มป้ายประชาสัมพันธ์ใหม่เรียบร้อย');
    }

    // Reset Form
    setEditingBannerId(null);
    setNewTitle('');
    setNewSubtitle('');
    setNewImageUrl('');
    setNewTargetLink('');
    setNewIsActive(true);
    setImageLoadError(false);
    setImageLoadedSuccess(false);
    setIsSaving(false);

    await loadAllSettings();
  };

  const handleStartEdit = (banner: SponsorBanner) => {
    setEditingBannerId(banner.id);
    setNewTitle(banner.title);
    setNewSubtitle(banner.subtitle || '');
    setNewImageUrl(banner.image_url);
    setNewTargetLink(banner.target_link || '');
    setNewIsActive(banner.is_active);
    setImageLoadError(false);
    setImageLoadedSuccess(false);
  };

  const handleCancelEdit = () => {
    setEditingBannerId(null);
    setNewTitle('');
    setNewSubtitle('');
    setNewImageUrl('');
    setNewTargetLink('');
    setNewIsActive(true);
    setImageLoadError(false);
    setImageLoadedSuccess(false);
  };

  const handleDeleteBanner = async (id: string, title: string) => {
    if (!confirm(`ต้องการลบป้าย "${title}" ใช่หรือไม่?`)) return;
    await roadStore.deleteBanner(id);
    await loadAllSettings();
    showFeedback('🗑️ ลบป้ายเรียบร้อย');
  };

  const handleToggleBanner = async (id: string) => {
    await roadStore.toggleBannerActive(id);
    await loadAllSettings();
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const newArr = [...banners];
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    await roadStore.reorderBanners(newArr.map((b) => b.id));
    await loadAllSettings();
  };

  // Header Theme Actions
  const handleSaveTheme = async (updates: Partial<HeaderThemeConfig>) => {
    const updated = await roadStore.updateThemeConfig(updates);
    setThemeConfig(updated);
    showFeedback('✨ บันทึกการตั้งค่าพื้นหลังส่วนบนเรียบร้อย');
  };

  const handleAddCustomHeaderImage = () => {
    if (!customImageInput.trim()) return;
    const normalized = normalizeImageUrl(customImageInput);
    const existing = themeConfig.custom_images || [];
    if (!existing.includes(normalized)) {
      const updatedImages = [...existing, normalized];
      handleSaveTheme({ custom_images: updatedImages, mode: 'custom' });
    }
    setCustomImageInput('');
    setHeaderImageLoadError(false);
  };

  const handleRemoveCustomHeaderImage = (urlToRemove: string) => {
    const updatedImages = (themeConfig.custom_images || []).filter((u) => u !== urlToRemove);
    handleSaveTheme({ custom_images: updatedImages });
  };

  const isDriveUrlInput = isGoogleDriveUrl(newImageUrl);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-stone-900 text-white shadow-2xl border border-stone-700 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-3.5 bg-stone-950/80">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">ตั้งค่าระบบ & ป้ายประชาสัมพันธ์</h3>
              <p className="text-[11px] text-stone-400">จัดการรูปภาพสปอนเซอร์ และธีมพื้นหลังส่วนบน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-1.5 text-stone-400 hover:bg-white/20 hover:text-white transition-all"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === 'banners'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>ป้ายสปอนเซอร์ ({banners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('header')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === 'header'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>พื้นหลังส่วนบน</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 border-b-2 py-2.5 px-3 text-xs font-bold transition-all ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>วิธีใส่รูปลิงก์ Google</span>
          </button>
        </div>

        {/* Notification Toast */}
        {successMsg && (
          <div className="bg-emerald-600/90 text-white text-xs font-bold py-2 px-4 text-center animate-fadeIn flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ================= TAB 1: SPONSOR BANNERS ================= */}
          {activeTab === 'banners' && (
            <div className="space-y-5">
              {/* Add / Edit Form Card */}
              <div className="rounded-2xl bg-stone-950/70 border border-stone-800 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    {editingBannerId ? 'แก้ไขป้ายประชาสัมพันธ์' : 'เพิ่มป้ายประชาสัมพันธ์ / สปอนเซอร์ใหม่'}
                  </span>
                  {editingBannerId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[11px] text-stone-400 hover:text-stone-200 underline"
                    >
                      ยกเลิกการแก้ไข
                    </button>
                  )}
                </div>

                {/* Option 1: Direct File Upload from Computer/Phone */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Upload className="h-4 w-4" />
                        <span>วิธีที่ 1: อัปโหลดรูปจากเครื่อง (แนะนำ สะดวกที่สุด ไม่ต้องเปิดแชร์)</span>
                      </div>
                      <p className="text-[10px] text-stone-300 mt-0.5">
                        ระบบจะบีบอัดภาพให้อัตโนมัติ แสดงผลคมชัดและโหลดไว 0ms
                      </p>
                    </div>

                    <input
                      type="file"
                      ref={bannerFileInputRef}
                      onChange={(e) => handleLocalFileUpload(e, 'banner')}
                      accept="image/*"
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isCompressing}
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 text-xs font-bold shadow-md transition-all active:scale-95 shrink-0 disabled:opacity-50"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      <span>{isCompressing ? 'กำลังแปลงรูป...' : '📁 เลือกรูปจากเครื่อง'}</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveBanner} className="space-y-3">
                  {/* Option 2: Image URL / Google Drive Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      วิธีที่ 2: วาง URL รูปภาพ หรือ ลิงก์ Google Drive <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="วางลิงก์ เช่น https://drive.google.com/file/d/... หรือ URL รูปภาพ"
                      value={newImageUrl}
                      onChange={(e) => {
                        setNewImageUrl(e.target.value);
                        setImageLoadError(false);
                        setImageLoadedSuccess(false);
                      }}
                      className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white placeholder-stone-500 focus:border-amber-400 focus:outline-none font-mono"
                      required
                    />

                    {/* Google Drive Detection Callout */}
                    {isDriveUrlInput && (
                      <div className="mt-1.5 rounded-lg bg-blue-950/60 border border-blue-500/40 p-2 text-[10px] text-blue-200 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>ตรวจพบลิงก์ Google Drive:</strong> ระบบแปลงเป็น Direct View ให้อัตโนมัติ — 
                          <em> กรุณาตรวจสอบว่าได้ตั้งค่าสิทธิ์ใน Google Drive เป็น <strong>"ทุกคนที่มีลิงก์ (Anyone with the link)"</strong> แล้ว</em>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Live Thumbnail Preview with Verification */}
                  {newImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-stone-700 bg-stone-900 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-stone-400 font-semibold">ตัวอย่างรูปภาพจริง:</span>
                        {imageLoadedSuccess && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> รูปภาพพร้อมแสดงผล
                          </span>
                        )}
                        {imageLoadError && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> โหลดรูปไม่สำเร็จ
                          </span>
                        )}
                      </div>

                      <div className="relative h-28 w-full rounded-lg overflow-hidden bg-black/60 border border-stone-800">
                        <img
                          src={normalizeImageUrl(newImageUrl)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onLoad={() => {
                            setImageLoadedSuccess(true);
                            setImageLoadError(false);
                          }}
                          onError={(e) => {
                            setImageLoadError(true);
                            setImageLoadedSuccess(false);
                            const target = e.target as HTMLImageElement;
                            const thumb = getGoogleDriveThumbnailUrl(newImageUrl);
                            if (target.src !== thumb && thumb !== target.src) {
                              target.src = thumb;
                            } else {
                              target.src = FALLBACK_BANNER_IMAGE;
                            }
                          }}
                        />
                      </div>

                      {/* Error Warning & Advice */}
                      {imageLoadError && (
                        <div className="rounded-lg bg-rose-950/70 border border-rose-600/50 p-2 text-[10px] text-rose-200 space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                            รูปภาพไม่แสดงผล (HTTP 403 Forbidden หรือ ลิงก์ไม่ถูกต้อง)
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 text-stone-300">
                            <li>หากเป็น Google Drive: ไฟล์ยังถูกตั้งค่าเป็น "จำกัด (Restricted)" ให้ไปที่ Google Drive กดแชร์ แล้วเปลี่ยนเป็น <strong>"ทุกคนที่มีลิงก์"</strong></li>
                            <li>หรือกดปุ่ม <strong>"📁 เลือกรูปจากเครื่อง"</strong> ด้านบนเพื่ออัปโหลดตรงได้ทันที</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      ชื่อหัวข้อ / ข้อความป้าย
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น โครงการ Sisaket Smart City ถนนสวย ไร้หลุม"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white placeholder-stone-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Subtitle / Description Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      คำบรรยายย่อย (ถ้ามี)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ขับเคลื่อนโดย แขวงทางหลวงศรีสะเกษ"
                      value={newSubtitle}
                      onChange={(e) => setNewSubtitle(e.target.value)}
                      className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white placeholder-stone-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Target Link */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      ลิงก์เมื่อกดคลิก (URL ปลายทาง เช่น เว็บไซต์ หรือ tel:1586)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น https://sisaket.go.th หรือ tel:1586"
                      value={newTargetLink}
                      onChange={(e) => setNewTargetLink(e.target.value)}
                      className="w-full rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white placeholder-stone-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Active Toggle & Submit */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={newIsActive}
                        onChange={(e) => setNewIsActive(e.target.checked)}
                        className="h-4 w-4 rounded accent-amber-500"
                      />
                      <span>เปิดใช้งานป้ายนี้ทันที</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSaving || isCompressing}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-xs font-bold text-stone-950 shadow-md hover:from-amber-400 hover:to-amber-300 transition-all disabled:opacity-50"
                    >
                      {editingBannerId ? (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>บันทึกการแก้ไข</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>เพิ่มป้ายสปอนเซอร์</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Current Banners List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  รายการป้ายทั้งหมด ({banners.length} ป้าย)
                </h4>

                {banners.length === 0 ? (
                  <div className="text-center py-6 text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl">
                    ยังไม่มีป้ายประชาสัมพันธ์ กรุณาเพิ่มจากฟอร์มด้านบน
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {banners.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          item.is_active
                            ? 'bg-stone-950/60 border-stone-800'
                            : 'bg-stone-950/30 border-stone-800/50 opacity-60'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-14 w-20 shrink-0 rounded-xl overflow-hidden bg-black/60 border border-stone-700">
                          <img
                            src={normalizeImageUrl(item.image_url)}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_BANNER_IMAGE;
                            }}
                          />
                          {!item.is_active && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[9px] font-bold text-stone-400">
                              ปิดใช้งาน
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400">
                              ลำดับ {idx + 1}
                            </span>
                            <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                          </div>
                          {item.subtitle && (
                            <p className="text-[10px] text-stone-400 truncate mt-0.5">{item.subtitle}</p>
                          )}
                          {item.target_link && (
                            <span className="text-[9px] text-amber-400/80 truncate block mt-0.5 flex items-center gap-1">
                              <ExternalLink className="h-2.5 w-2.5" />
                              {item.target_link}
                            </span>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reorder buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveOrder(idx, 'up')}
                              className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-20 transition-all"
                              title="เลื่อนขึ้น"
                            >
                              <MoveUp className="h-3 w-3" />
                            </button>
                            <button
                              disabled={idx === banners.length - 1}
                              onClick={() => handleMoveOrder(idx, 'down')}
                              className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-20 transition-all"
                              title="เลื่อนลง"
                            >
                              <MoveDown className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleBanner(item.id)}
                            className={`p-1.5 rounded-xl border transition-all ${
                              item.is_active
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-stone-800 text-stone-500 border-stone-700'
                            }`}
                            title={item.is_active ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                          >
                            {item.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-all"
                            title="แก้ไข"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteBanner(item.id, item.title)}
                            className="p-1.5 rounded-xl bg-stone-800 hover:bg-rose-950/80 text-rose-400 border border-stone-700 hover:border-rose-600 transition-all"
                            title="ลบป้าย"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: HEADER THEME ================= */}
          {activeTab === 'header' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-stone-950/70 border border-stone-800 p-4 space-y-4">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  เลือกรูปแบบพื้นหลังส่วนบน (Header Hero Background)
                </span>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSaveTheme({ mode: 'preset' })}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      themeConfig.mode === 'preset'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Sparkles className="h-5 w-5 text-amber-400 mb-1" />
                    <span className="text-xs">แลนด์มาร์กศรีสะเกษ (เริ่มต้น)</span>
                    <span className="text-[10px] text-stone-400 mt-0.5">ผามออีแดง, ปราสาทขอม, ดงลำดวน</span>
                  </button>

                  <button
                    onClick={() => handleSaveTheme({ mode: 'custom' })}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                      themeConfig.mode === 'custom'
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <ImageIcon className="h-5 w-5 text-amber-400 mb-1" />
                    <span className="text-xs">รูปภาพกำหนดเอง (Custom URLs)</span>
                    <span className="text-[10px] text-stone-400 mt-0.5">ใส่ลิงก์ Google Drive หรือเลือกจากเครื่อง</span>
                  </button>
                </div>

                {/* Custom Images Input Section if Custom Mode */}
                {themeConfig.mode === 'custom' && (
                  <div className="space-y-3 pt-2 border-t border-stone-800">
                    {/* Device Upload for Header */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        <span>เพิ่มภาพจากเครื่อง</span>
                      </div>
                      <input
                        type="file"
                        ref={headerFileInputRef}
                        onChange={(e) => handleLocalFileUpload(e, 'header')}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => headerFileInputRef.current?.click()}
                        className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1 text-xs font-bold transition-all"
                      >
                        📁 เลือกไฟล์
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                        หรือ วาง URL รูปภาพ / ลิงก์ Google Drive
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="วาง URL เช่น https://drive.google.com/..."
                          value={customImageInput}
                          onChange={(e) => setCustomImageInput(e.target.value)}
                          className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white placeholder-stone-500 focus:border-amber-400 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomHeaderImage}
                          className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-2 text-xs font-bold transition-all shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>เพิ่มรูป</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Images Gallery */}
                    <div className="space-y-2">
                      <span className="text-[11px] text-stone-400 block">
                        รูปภาพส่วนบนที่เลือกไว้ ({themeConfig.custom_images?.length || 0} รูป):
                      </span>

                      {(!themeConfig.custom_images || themeConfig.custom_images.length === 0) ? (
                        <div className="py-4 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-xl">
                          ยังไม่ได้ใส่รูปภาพกำหนดเอง (ระบบจะใช้ภาพเริ่มต้นอัตโนมัติ)
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {themeConfig.custom_images.map((url, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden h-20 border border-stone-700 bg-black">
                              <img src={normalizeImageUrl(url)} alt={`Header ${idx + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomHeaderImage(url)}
                                className="absolute top-1 right-1 rounded-full bg-rose-600/90 text-white p-1 hover:bg-rose-500 transition-all shadow-md"
                                title="ลบรูปนี้"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transition Speed Config */}
                <div className="pt-2 border-t border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-300 font-semibold">ความเร็วในการสลับภาพสไลด์:</span>
                    <span className="text-amber-400 font-bold">{themeConfig.banner_speed_seconds || 5} วินาที</span>
                  </div>
                  <div className="flex gap-2">
                    {[3, 5, 8, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSaveTheme({ banner_speed_seconds: sec })}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          themeConfig.banner_speed_seconds === sec
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {sec} วินาที
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: GUIDE ================= */}
          {activeTab === 'guide' && (
            <div className="space-y-4 rounded-2xl bg-stone-950/70 border border-stone-800 p-4 text-xs text-stone-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Info className="h-4 w-4" />
                <span>คู่มือการใช้งานรูปภาพ & วิเคราะห์ปัญหาที่พบบ่อย</span>
              </div>

              <div className="space-y-3 leading-relaxed">
                <div className="rounded-xl bg-stone-900 p-3 border border-stone-800 space-y-1.5">
                  <h5 className="font-bold text-white text-xs">1. วิธีแก้ปัญหารูปจาก Google Drive ไม่แสดงผล (403 Forbidden)</h5>
                  <p className="text-[11px] text-stone-300">
                    Google Drive มีระบบความปลอดภัย หากอัปโหลดแล้วแชร์ทันที ค่าเริ่มต้นจะถูกตั้งเป็น <strong>"จำกัด (Restricted)"</strong> ทำให้คนทั่วไปไม่สามารถเห็นภาพได้
                  </p>
                  <div className="rounded-lg bg-black/50 p-2 text-[11px] text-amber-300 space-y-1">
                    <p><strong>ขั้นตอนการเปิดสิทธิ์ใน Google Drive:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 text-stone-200">
                      <li>คลิกขวาที่ไฟล์รูปใน Google Drive เลือก <strong>"แชร์ (Share)"</strong></li>
                      <li>ในหัวข้อ "การเข้าถึงทั่วไป (General access)" เปลี่ยนจาก "จำกัด" เป็น <strong>"ทุกคนที่มีลิงก์ (Anyone with the link)"</strong></li>
                      <li>กด <strong>"คัดลอกลิงก์ (Copy link)"</strong> แล้วนำมาวางในระบบได้ทันที</li>
                    </ol>
                  </div>
                </div>

                <div className="rounded-xl bg-stone-900 p-3 border border-stone-800 space-y-1.5">
                  <h5 className="font-bold text-white text-xs">2. แนะนำ: ใช้วิธี "เลือกรูปจากเครื่อง" ง่ายที่สุด</h5>
                  <p className="text-[11px] text-stone-300">
                    หากไม่อยากตั้งค่า Google Drive ให้กดปุ่ม <strong>"📁 เลือกรูปจากเครื่อง"</strong> ระบบจะแปลงภาพและบันทึกลงในระบบทันที ไม่ต้องมีโฮสต์ภายนอก
                  </p>
                </div>

                <div className="rounded-xl bg-stone-900 p-3 border border-stone-800 space-y-1.5">
                  <h5 className="font-bold text-white text-xs">3. รูปภาพจาก Google Search (Google Images)</h5>
                  <p className="text-[11px] text-stone-300">
                    หากค้นหารูปใน Google ให้คลิกขวาที่ภาพแล้วเลือก <strong>"คัดลอกที่อยู่รูปภาพ (Copy Image Address)"</strong> (อย่าเลือก Copy Link Address เพราะจะได้ลิงก์หน้าเว็บแทนไฟล์รูป)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-800 bg-stone-950/80 px-5 py-3">
          <span className="text-[10px] text-stone-500">
            ระบบบันทึกแบบ Real-time และกระจายข้อมูลไปยังหน้าหลักทันที 0ms
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 px-4 py-1.5 text-xs font-bold transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
