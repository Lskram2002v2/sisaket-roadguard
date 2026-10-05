export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface RoadReport {
  id: string;
  tracking_code: string;
  reporter_phone: string;
  latitude: number;
  longitude: number;
  district: string;
  subdistrict?: string;
  landmark_description: string;
  photo_context_url: string; // ภาพมุมกว้างบริบท
  photo_closeup_url: string; // ภาพระยะใกล้ตัวหลุม
  resolution_photo_url?: string; // ภาพหลังซ่อมเสร็จ
  severity_level: SeverityLevel;
  status: ReportStatus;
  admin_notes?: string;
  assigned_team?: string;
  upvote_count: number;
  rating?: number; // 1-5 ดาว
  rating_feedback?: string;
  created_at: string;
  resolved_at?: string;
  updated_at: string;
}

export interface SisaketDistrict {
  id: number;
  name_th: string;
  name_en: string;
  lat: number;
  lng: number;
}

export interface SponsorBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  target_link?: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface HeaderThemeConfig {
  mode: 'preset' | 'custom';
  custom_images: string[];
  banner_speed_seconds?: number;
  overlay_darkness?: number; // 0 - 100%
  updated_at: string;
}

