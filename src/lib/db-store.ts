import { RoadReport, ReportStatus, SeverityLevel, SponsorBanner, HeaderThemeConfig } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'sisaket_roadguard_reports_v2';
const MY_REPORTS_KEY = 'sisaket_my_reported_codes_v2';
const BANNERS_STORAGE_KEY = 'sisaket_roadguard_banners_v2';
const THEME_STORAGE_KEY = 'sisaket_roadguard_theme_v2';

// Default sponsor / public relations banners for Sisaket Province
export const INITIAL_BANNERS: SponsorBanner[] = [
  {
    id: 'ban-001',
    title: 'ป้ายประชาสัมพันธ์ 1',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzGImso0DdeSKyj6m1vEw530UiyFqv19PYnR1cE5cFd3iR1-h8LN-2l94&s=10',
    is_active: true,
    order: 1,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ban-002',
    title: 'ป้ายประชาสัมพันธ์ 2',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw4OqfAtI22mYtiFgx6rhY4cKmJv2hRMfHgAOztMDUKkDLlpXQgiSARRI&s=10',
    is_active: true,
    order: 2,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'ban-003',
    title: 'ป้ายประชาสัมพันธ์ 3',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJjNkj36ZbjkhaFwxxt4GFbcV5_jxJiF2CNkUGNMrNs9tE5uJzyngLI9U&s=10',
    is_active: true,
    order: 3,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'ban-004',
    title: 'ป้ายประชาสัมพันธ์ 4',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3Mf1-2DlE6Mkz833PdbTfXWYGNwv3PHfs0N6Iud_FXCL-2vUyuAmbRaA&s=10',
    is_active: true,
    order: 4,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'ban-005',
    title: 'ป้ายประชาสัมพันธ์ 5',
    image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzGImso0DdeSKyj6m1vEw530UiyFqv19PYnR1cE5cFd3iR1-h8LN-2l94&s=10',
    is_active: true,
    order: 5,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const INITIAL_THEME: HeaderThemeConfig = {
  mode: 'preset',
  custom_images: [],
  banner_speed_seconds: 5,
  overlay_darkness: 75,
  updated_at: new Date().toISOString(),
};


// ข้อมูลตัวอย่างสมจริงในจังหวัดศรีสะเกษ
const INITIAL_REPORTS: RoadReport[] = [
  {
    id: 'rep-001',
    tracking_code: 'SK2610-0001',
    reporter_phone: '0812345678',
    latitude: 15.1189,
    longitude: 104.3265,
    district: 'เมืองศรีสะเกษ',
    subdistrict: 'เมืองใต้',
    landmark_description: 'หน้าโรงเรียนสตรีสิริเกศ ใกล้เสาไฟฟ้าต้นที่ 4 ฝั่งตรงข้ามร้านเครื่องเขียน',
    photo_context_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    photo_closeup_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    severity_level: 'HIGH',
    status: 'IN_PROGRESS',
    admin_notes: 'ส่งทีมช่างแขวงทางหลวงศรีสะเกษเข้าเตรียมพื้นผิวลาดยางมะตอย',
    assigned_team: 'แขวงทางหลวงศรีสะเกษ ชุดปฏิบัติการที่ 1',
    upvote_count: 7,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'rep-002',
    tracking_code: 'SK2610-0002',
    reporter_phone: '0898765432',
    latitude: 15.1104,
    longitude: 104.3584,
    district: 'เมืองศรีสะเกษ',
    subdistrict: 'หนองครก',
    landmark_description: 'ใกล้ร้านสีแสงยางยนต์ มุ่งหน้าสี่แยกบายพาสอุบลราชธานี หลุมลึกประมาณ 10 ซม.',
    photo_context_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    photo_closeup_url: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800&auto=format&fit=crop&q=80',
    resolution_photo_url: 'https://images.unsplash.com/photo-1584463699039-44e99f018e6c?w=800&auto=format&fit=crop&q=80',
    severity_level: 'CRITICAL',
    status: 'RESOLVED',
    admin_notes: 'ซ่อมแซมลาดยางมะตอยสำเร็จเรียบร้อย ผิวทางเรียบสนิท',
    assigned_team: 'เทศบาลเมืองศรีสะเกษ กองช่างสุขาภิบาล',
    upvote_count: 14,
    rating: 5,
    rating_feedback: 'ซ่อมไวมากครับ ขอบคุณทีมช่างมากครับ ปลอดภัยขึ้นเยอะเลย',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    resolved_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'rep-003',
    tracking_code: 'SK2610-0003',
    reporter_phone: '0955551234',
    latitude: 14.6406,
    longitude: 104.6508,
    district: 'กันทรลักษ์',
    subdistrict: 'น้ำอ้อม',
    landmark_description: 'ถนนสายขึ้นผามออีแดง-เขาพระวิหาร ก่อนถึงป้อมตรวจอุทยานฯ 500 เมตร ผิวทางแตกร้าวทรุดตัว',
    photo_context_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    photo_closeup_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80',
    severity_level: 'HIGH',
    status: 'VERIFIED',
    admin_notes: 'รับเรื่องแล้ว ประสานงานหมวดทางหลวงกันทรลักษ์ลงสำรวจ',
    assigned_team: 'หมวดทางหลวงกันทรลักษ์',
    upvote_count: 4,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'rep-004',
    tracking_code: 'SK2610-0004',
    reporter_phone: '0871112233',
    latitude: 15.3444,
    longitude: 104.1539,
    district: 'ราษีไศล',
    subdistrict: 'เมืองคง',
    landmark_description: 'หน้าทางเข้าเขื่อนราษีไศล ตรงข้ามป้ายหมู่บ้าน หลุมกว้างกลางเลนซ้าย',
    photo_context_url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
    photo_closeup_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    severity_level: 'MEDIUM',
    status: 'PENDING',
    upvote_count: 2,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

class RoadReportStore {
  private reports: RoadReport[] = [];
  private banners: SponsorBanner[] = [];
  private theme: HeaderThemeConfig = { ...INITIAL_THEME };
  private listeners: Array<() => void> = [];

  // High-Performance SWR Cache & Deduplication
  private lastReportsFetchTime = 0;
  private lastBannersFetchTime = 0;
  private lastThemeFetchTime = 0;
  private readonly CACHE_TTL_MS = 20000; // 20s TTL for background auto-refresh
  private inFlightReportsPromise: Promise<RoadReport[]> | null = null;
  private inFlightBannersPromise: Promise<SponsorBanner[]> | null = null;
  private inFlightThemePromise: Promise<HeaderThemeConfig> | null = null;
  private notifyDebounceTimer: any = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.reports = JSON.parse(stored);
        } catch {
          this.reports = [];
        }
      } else {
        this.reports = [];
      }

      const storedBanners = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (storedBanners) {
        try {
          const parsed = JSON.parse(storedBanners);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.banners = parsed;
          } else {
            this.banners = [...INITIAL_BANNERS];
            this.saveBanners(false);
          }
        } catch {
          this.banners = [...INITIAL_BANNERS];
          this.saveBanners(false);
        }
      } else {
        this.banners = [...INITIAL_BANNERS];
        this.saveBanners(false);
      }

      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        try {
          this.theme = JSON.parse(storedTheme);
        } catch {
          this.theme = { ...INITIAL_THEME };
        }
      } else {
        this.theme = { ...INITIAL_THEME };
        this.saveTheme(false);
      }

      // Initial Live Sync from Supabase
      this.refreshFromSupabase(true).catch(() => {});
      this.refreshBannersFromSupabase().catch(() => {});
      this.refreshThemeFromSupabase().catch(() => {});

      // Connect Supabase Realtime WebSocket for live 0ms updates across devices
      if (isSupabaseConfigured && supabase) {
        try {
          supabase
            .channel('realtime_road_reports_global')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'road_reports' },
              async () => {
                await this.refreshFromSupabase(true);
                this.notifyListeners();
              }
            )
            .subscribe();
        } catch (err) {
          console.warn('Realtime channel subscription error:', err);
        }
      }
    } else {
      this.reports = [...INITIAL_REPORTS];
      this.banners = [...INITIAL_BANNERS];
      this.theme = { ...INITIAL_THEME };
    }
  }

  private save(shouldNotify = true) {
    if (typeof window !== 'undefined') {
      const sanitizedReports = this.reports.map((r) => ({
        ...r,
        reporter_phone:
          r.reporter_phone && r.reporter_phone.length > 6 && !r.reporter_phone.includes('XXX')
            ? `${r.reporter_phone.substring(0, 3)}-XXX-${r.reporter_phone.substring(r.reporter_phone.length - 4)}`
            : r.reporter_phone,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedReports));
      if (shouldNotify) this.debouncedNotify();
    }
  }

  private saveBanners(shouldNotify = true) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(this.banners));
      if (shouldNotify) this.debouncedNotify();
    }
  }

  private saveTheme(shouldNotify = true) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.theme));
      if (shouldNotify) this.debouncedNotify();
    }
  }

  private debouncedNotify() {
    if (this.notifyDebounceTimer) clearTimeout(this.notifyDebounceTimer);
    this.notifyDebounceTimer = setTimeout(() => {
      this.notifyListeners();
    }, 50);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('Error in store listener:', e);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getReportsInstant(): RoadReport[] {
    return [...this.reports];
  }

  public async getAllReports(forceFresh = false): Promise<RoadReport[]> {
    const isCacheFresh = Date.now() - this.lastReportsFetchTime < this.CACHE_TTL_MS;

    // Instant SWR Cache Hit (0ms) without triggering background re-fetch if still fresh
    if (!forceFresh && this.reports.length > 0) {
      if (!isCacheFresh) {
        this.refreshFromSupabase().catch(() => {});
      }
      return [...this.reports];
    }

    return this.refreshFromSupabase();
  }

  public async refreshFromSupabase(forceFresh: boolean = false): Promise<RoadReport[]> {
    // If a request is already in-flight and not forceFresh, return the same promise to prevent duplicate API requests
    if (!forceFresh && this.inFlightReportsPromise) {
      return this.inFlightReportsPromise;
    }

    this.inFlightReportsPromise = (async () => {
      try {
        if (typeof window !== 'undefined') {
          try {
            const res = await fetch('/api/reports', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data)) {
                const prevStr = JSON.stringify(this.reports);
                const nextStr = JSON.stringify(json.data);
                this.reports = json.data;
                this.lastReportsFetchTime = Date.now();
                // Only notify if data actually changed
                if (prevStr !== nextStr) {
                  this.save(true);
                }
                return this.reports;
              }
            }
          } catch (err) {
            console.warn('API /api/reports fetch failed, fallback to local store:', err);
          }
        }

        if (isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase
              .from('road_reports')
              .select('*')
              .order('created_at', { ascending: false });
            if (!error && Array.isArray(data) && data.length > 0) {
              const prevStr = JSON.stringify(this.reports);
              const nextStr = JSON.stringify(data);
              this.reports = data;
              this.lastReportsFetchTime = Date.now();
              if (prevStr !== nextStr) {
                this.save(true);
              }
              return data;
            }
          } catch (err) {
            console.warn('Supabase fetch failed, fallback to local store:', err);
          }
        }

        this.lastReportsFetchTime = Date.now();
        return [...this.reports];
      } finally {
        this.inFlightReportsPromise = null;
      }
    })();

    return this.inFlightReportsPromise;
  }

  public async clearAll(): Promise<void> {
    this.reports = [];
    this.save();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MY_REPORTS_KEY);
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('report_timeline').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('road_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (err) {
        console.warn('Supabase clear failed:', err);
      }
    }
    this.notifyListeners();
  }

  public getReportByCode(code: string): RoadReport | undefined {
    const formatted = code.trim().toUpperCase();
    return this.reports.find(
      (r) => r.tracking_code.toUpperCase() === formatted || r.id === formatted
    );
  }

  public getReportsByPhone(phone: string): RoadReport[] {
    const cleanPhone = phone.replace(/\D/g, '');
    return this.reports.filter((r) => r.reporter_phone.replace(/\D/g, '').includes(cleanPhone));
  }

  public async addReport(newReport: Omit<RoadReport, 'id' | 'created_at' | 'updated_at' | 'upvote_count'>): Promise<RoadReport> {
    const report: RoadReport = {
      ...newReport,
      id: 'rep-' + Date.now().toString(36),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      upvote_count: 1,
    };

    this.reports.unshift(report);
    this.save();

    // บันทึก Tracking code ลง LocalStorage ของผู้ใช้
    if (typeof window !== 'undefined') {
      try {
        const myCodes = JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]');
        if (!myCodes.includes(report.tracking_code)) {
          myCodes.unshift(report.tracking_code);
          localStorage.setItem(MY_REPORTS_KEY, JSON.stringify(myCodes));
        }
      } catch {
        // ignore
      }

      // บันทึกผ่าน REST API Endpoint /api/reports
      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            report.id = json.data.id || report.id;
            this.save();
          }
        }
      } catch (err) {
        console.warn('API /api/reports POST failed:', err);
      }
    }

    return report;
  }

  public async updateReportStatus(
    idOrCode: string,
    status: ReportStatus,
    adminNotes?: string,
    resolutionPhotoUrl?: string,
    assignedTeam?: string
  ): Promise<boolean> {
    const target = this.reports.find(
      (r) => r.id === idOrCode || r.tracking_code.toUpperCase() === idOrCode.toUpperCase()
    );

    if (!target) return false;

    target.status = status;
    target.updated_at = new Date().toISOString();
    if (adminNotes !== undefined) target.admin_notes = adminNotes;
    if (assignedTeam !== undefined) target.assigned_team = assignedTeam;
    if (resolutionPhotoUrl) target.resolution_photo_url = resolutionPhotoUrl;
    if (status === 'RESOLVED') target.resolved_at = new Date().toISOString();

    this.save();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('road_reports')
          .update({
            status,
            admin_notes: target.admin_notes,
            resolution_photo_url: target.resolution_photo_url,
            assigned_team: target.assigned_team,
            resolved_at: target.resolved_at,
            updated_at: target.updated_at,
          })
          .eq('tracking_code', target.tracking_code);
      } catch (err) {
        console.warn('Supabase update failed:', err);
      }
    }

    return true;
  }

  public async upvoteReport(idOrCode: string): Promise<number> {
    const target = this.reports.find(
      (r) => r.id === idOrCode || r.tracking_code.toUpperCase() === idOrCode.toUpperCase()
    );
    if (!target) return 0;

    target.upvote_count = (target.upvote_count || 0) + 1;
    target.updated_at = new Date().toISOString();
    this.save();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('road_reports')
          .update({ upvote_count: target.upvote_count })
          .eq('tracking_code', target.tracking_code);
      } catch (err) {
        console.warn('Supabase upvote update failed:', err);
      }
    }

    return target.upvote_count;
  }

  public async submitRating(trackingCode: string, rating: number, feedback?: string): Promise<boolean> {
    const target = this.reports.find(
      (r) => r.tracking_code.toUpperCase() === trackingCode.toUpperCase()
    );
    if (!target) return false;

    target.rating = rating;
    if (feedback) target.rating_feedback = feedback;
    target.updated_at = new Date().toISOString();
    this.save();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('road_reports')
          .update({ rating, rating_feedback: feedback })
          .eq('tracking_code', trackingCode);
      } catch (err) {
        console.warn('Supabase rating update failed:', err);
      }
    }

    return true;
  }

  public async deleteReport(idOrCode: string): Promise<boolean> {
    const targetIndex = this.reports.findIndex(
      (r) => r.id === idOrCode || r.tracking_code.toUpperCase() === idOrCode.toUpperCase()
    );

    if (targetIndex === -1) return false;

    const target = this.reports[targetIndex];
    this.reports.splice(targetIndex, 1);
    this.save();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('road_reports')
          .delete()
          .eq('tracking_code', target.tracking_code);
      } catch (err) {
        console.warn('Supabase delete failed:', err);
      }
    }

    this.notifyListeners();
    return true;
  }

  public async editReportDetails(
    idOrCode: string,
    updates: Partial<Omit<RoadReport, 'id' | 'tracking_code' | 'created_at'>>
  ): Promise<boolean> {
    const target = this.reports.find(
      (r) => r.id === idOrCode || r.tracking_code.toUpperCase() === idOrCode.toUpperCase()
    );

    if (!target) return false;

    Object.assign(target, updates, { updated_at: new Date().toISOString() });
    this.save();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('road_reports')
          .update({
            district: target.district,
            subdistrict: target.subdistrict,
            landmark_description: target.landmark_description,
            reporter_phone: target.reporter_phone,
            severity_level: target.severity_level,
            latitude: target.latitude,
            longitude: target.longitude,
            updated_at: target.updated_at,
          })
          .eq('tracking_code', target.tracking_code);
      } catch (err) {
        console.warn('Supabase edit failed:', err);
      }
    }

    this.notifyListeners();
    return true;
  }

  public getMyReportedCodes(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(MY_REPORTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  // ================= SPONSOR BANNERS MANAGEMENT =================
  public getBannersInstant(): SponsorBanner[] {
    return [...this.banners].sort((a, b) => a.order - b.order);
  }

  public async getAllBanners(forceFresh = false): Promise<SponsorBanner[]> {
    const isCacheFresh = Date.now() - this.lastBannersFetchTime < this.CACHE_TTL_MS;

    if (!forceFresh && this.banners.length > 0) {
      if (!isCacheFresh) {
        this.refreshBannersFromSupabase().catch(() => {});
      }
      return this.getBannersInstant();
    }

    return this.refreshBannersFromSupabase();
  }

  public async refreshBannersFromSupabase(): Promise<SponsorBanner[]> {
    if (this.inFlightBannersPromise) {
      return this.inFlightBannersPromise;
    }

    this.inFlightBannersPromise = (async () => {
      try {
        if (typeof window !== 'undefined') {
          try {
            const res = await fetch('/api/banners', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                const prevStr = JSON.stringify(this.banners);
                const nextStr = JSON.stringify(json.data);
                this.banners = json.data;
                this.lastBannersFetchTime = Date.now();
                if (prevStr !== nextStr) {
                  this.saveBanners(true);
                }
                return this.getBannersInstant();
              }
            }
          } catch (err) {
            console.warn('API /api/banners fetch failed, fallback to local store:', err);
          }
        }

        if (isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase
              .from('sponsor_banners')
              .select('*')
              .order('order', { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
              const prevStr = JSON.stringify(this.banners);
              const nextStr = JSON.stringify(data);
              this.banners = data;
              this.lastBannersFetchTime = Date.now();
              if (prevStr !== nextStr) {
                this.saveBanners(true);
              }
              return this.getBannersInstant();
            }
          } catch (err) {
            console.warn('Supabase fetch banners failed, fallback to local store:', err);
          }
        }

        this.lastBannersFetchTime = Date.now();
        return this.getBannersInstant();
      } finally {
        this.inFlightBannersPromise = null;
      }
    })();

    return this.inFlightBannersPromise;
  }

  public async saveBanner(bannerData: Omit<SponsorBanner, 'id' | 'created_at'> & { id?: string }): Promise<SponsorBanner> {
    let resultBanner: SponsorBanner;
    const isExisting = Boolean(bannerData.id && this.banners.some((b) => b.id === bannerData.id));

    if (bannerData.id) {
      const idx = this.banners.findIndex((b) => b.id === bannerData.id);
      if (idx !== -1) {
        const updated: SponsorBanner = {
          ...this.banners[idx],
          ...bannerData,
        };
        this.banners[idx] = updated;
        resultBanner = updated;
      } else {
        resultBanner = {
          id: bannerData.id,
          title: bannerData.title || 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
          subtitle: bannerData.subtitle,
          image_url: bannerData.image_url,
          target_link: bannerData.target_link,
          is_active: bannerData.is_active ?? true,
          order: bannerData.order ?? (this.banners.length + 1),
          created_at: new Date().toISOString(),
        };
        this.banners.push(resultBanner);
      }
    } else {
      resultBanner = {
        id: `ban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: bannerData.title || 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
        subtitle: bannerData.subtitle,
        image_url: bannerData.image_url,
        target_link: bannerData.target_link,
        is_active: bannerData.is_active ?? true,
        order: bannerData.order ?? (this.banners.length + 1),
        created_at: new Date().toISOString(),
      };
      this.banners.push(resultBanner);
    }

    this.saveBanners();

    // REST API Sync: /api/banners
    if (typeof window !== 'undefined') {
      try {
        if (isExisting) {
          await fetch('/api/banners', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', banner: resultBanner }),
          });
        } else {
          await fetch('/api/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultBanner),
          });
        }
      } catch (err) {
        console.warn('API /api/banners write failed:', err);
      }
    }

    return resultBanner;
  }

  public async deleteBanner(id: string): Promise<boolean> {
    const idx = this.banners.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    this.banners.splice(idx, 1);
    this.saveBanners();

    if (typeof window !== 'undefined') {
      try {
        await fetch(`/api/banners?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('API /api/banners DELETE failed:', err);
      }
    }

    return true;
  }

  public async toggleBannerActive(id: string): Promise<boolean> {
    const target = this.banners.find((b) => b.id === id);
    if (!target) return false;
    target.is_active = !target.is_active;
    this.saveBanners();

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle', id }),
        });
      } catch (err) {
        console.warn('API /api/banners toggle failed:', err);
      }
    }

    return target.is_active;
  }

  public async reorderBanners(orderedIds: string[]): Promise<boolean> {
    orderedIds.forEach((id, index) => {
      const b = this.banners.find((item) => item.id === id);
      if (b) b.order = index + 1;
    });
    this.saveBanners();

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reorder', orderedIds }),
        });
      } catch (err) {
        console.warn('API /api/banners reorder failed:', err);
      }
    }

    return true;
  }

  // ================= THEME & HEADER MANAGEMENT =================
  public getThemeConfigInstant(): HeaderThemeConfig {
    return { ...this.theme };
  }

  public async getThemeConfig(forceFresh = false): Promise<HeaderThemeConfig> {
    const isCacheFresh = Date.now() - this.lastThemeFetchTime < this.CACHE_TTL_MS;

    if (!forceFresh && this.theme) {
      if (!isCacheFresh) {
        this.refreshThemeFromSupabase().catch(() => {});
      }
      return this.getThemeConfigInstant();
    }

    return this.refreshThemeFromSupabase();
  }

  public async refreshThemeFromSupabase(): Promise<HeaderThemeConfig> {
    if (this.inFlightThemePromise) {
      return this.inFlightThemePromise;
    }

    this.inFlightThemePromise = (async () => {
      try {
        if (typeof window !== 'undefined') {
          try {
            const res = await fetch('/api/settings?key=header_theme', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.data) {
                const prevStr = JSON.stringify(this.theme);
                const nextStr = JSON.stringify(json.data);
                this.theme = json.data as HeaderThemeConfig;
                this.lastThemeFetchTime = Date.now();
                if (prevStr !== nextStr) {
                  this.saveTheme(true);
                }
                return { ...this.theme };
              }
            }
          } catch (err) {
            console.warn('API /api/settings fetch failed:', err);
          }
        }

        if (isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase
              .from('system_settings')
              .select('value')
              .eq('key', 'header_theme')
              .single();
            if (!error && data?.value) {
              const prevStr = JSON.stringify(this.theme);
              const nextStr = JSON.stringify(data.value);
              this.theme = data.value as HeaderThemeConfig;
              this.lastThemeFetchTime = Date.now();
              if (prevStr !== nextStr) {
                this.saveTheme(true);
              }
              return { ...this.theme };
            }
          } catch (err) {
            console.warn('Supabase fetch theme failed, fallback to local store:', err);
          }
        }

        this.lastThemeFetchTime = Date.now();
        return { ...this.theme };
      } finally {
        this.inFlightThemePromise = null;
      }
    })();

    return this.inFlightThemePromise;
  }

  public async updateThemeConfig(updates: Partial<HeaderThemeConfig>): Promise<HeaderThemeConfig> {
    this.theme = {
      ...this.theme,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveTheme();

    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'header_theme', value: this.theme }),
        });
      } catch (err) {
        console.warn('API /api/settings update failed:', err);
      }
    }

    return { ...this.theme };
  }
}

export const roadStore = new RoadReportStore();
