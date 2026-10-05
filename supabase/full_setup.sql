-- ==============================================================================
-- 🛣️ Sisaket RoadGuard: Unified Master Database Setup (1-Click SQL Script)
-- องค์กร: จังหวัดศรีสะเกษ (อบจ.ศรีสะเกษ & แขวงทางหลวงศรีสะเกษ)
-- แพลตฟอร์ม: Supabase (PostgreSQL 15+ & PostGIS & Storage)
-- วิธีใช้: คัดลอกโค้ดทั้งหมดไปวางใน Supabase SQL Editor แล้วกด RUN
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE report_status_enum AS ENUM ('PENDING', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES
CREATE TABLE IF NOT EXISTS public.districts (
    id SERIAL PRIMARY KEY,
    district_code VARCHAR(10) UNIQUE NOT NULL,
    name_th VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.road_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    reporter_phone VARCHAR(20) NOT NULL,
    
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_geom GEOMETRY(Point, 4326),
    district VARCHAR(100) NOT NULL,
    subdistrict VARCHAR(100),
    landmark_description TEXT NOT NULL,
    
    photo_context_url TEXT NOT NULL,
    photo_closeup_url TEXT NOT NULL,
    resolution_photo_url TEXT,
    
    severity_level VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(30) DEFAULT 'PENDING',
    admin_notes TEXT,
    assigned_team VARCHAR(150),
    
    upvote_count INT DEFAULT 1,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    rating_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.road_reports(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_name VARCHAR(100) DEFAULT 'ระบบอัตโนมัติ',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sponsor_banners (
    id TEXT PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    target_link TEXT,
    is_active BOOLEAN DEFAULT true,
    "order" INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_road_reports_tracking ON public.road_reports(tracking_code);
CREATE INDEX IF NOT EXISTS idx_road_reports_district ON public.road_reports(district);
CREATE INDEX IF NOT EXISTS idx_road_reports_status ON public.road_reports(status);
CREATE INDEX IF NOT EXISTS idx_road_reports_severity ON public.road_reports(severity_level);
CREATE INDEX IF NOT EXISTS idx_road_reports_created ON public.road_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_reports_geom ON public.road_reports USING GIST(location_geom);
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_order ON public.sponsor_banners("order" ASC);
CREATE INDEX IF NOT EXISTS idx_sponsor_banners_active ON public.sponsor_banners(is_active);

-- 5. VIEWS (PDPA Compliant View with Security Invoker)
CREATE OR REPLACE VIEW public.public_road_reports
WITH (security_invoker = true) AS 
SELECT 
    id,
    tracking_code,
    landmark_description,
    latitude,
    longitude,
    district,
    subdistrict,
    status,
    severity_level,
    photo_context_url,
    photo_closeup_url,
    resolution_photo_url,
    upvote_count,
    rating,
    rating_feedback,
    admin_notes,
    assigned_team,
    created_at,
    resolved_at,
    CONCAT(SUBSTRING(reporter_phone, 1, 3), '-XXX-', SUBSTRING(reporter_phone, 8, 3)) AS masked_phone
FROM public.road_reports;

CREATE OR REPLACE VIEW public.district_summary_stats
WITH (security_invoker = true) AS 
SELECT 
    district,
    COUNT(*) AS total_reports,
    COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_count,
    COUNT(*) FILTER (WHERE status IN ('VERIFIED', 'IN_PROGRESS')) AS in_progress_count,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_count,
    COUNT(*) FILTER (WHERE severity_level IN ('HIGH', 'CRITICAL')) AS urgent_count,
    ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 1) AS avg_satisfaction_rating
FROM public.road_reports
GROUP BY district
ORDER BY total_reports DESC;

-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_road_report_before_write()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.location_geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_road_report_before_write ON public.road_reports;
CREATE TRIGGER trg_road_report_before_write
BEFORE INSERT OR UPDATE ON public.road_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_road_report_before_write();

CREATE OR REPLACE FUNCTION public.handle_report_status_audit()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.report_timeline (report_id, previous_status, new_status, actor_name, notes)
        VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.assigned_team, 'เจ้าหน้าที่'), NEW.admin_notes);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_status_audit ON public.road_reports;
CREATE TRIGGER trg_report_status_audit
AFTER UPDATE ON public.road_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_report_status_audit();

-- 7. ROW LEVEL SECURITY
ALTER TABLE public.road_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert road reports" ON public.road_reports;
CREATE POLICY "Allow public insert road reports" 
ON public.road_reports FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select road reports" ON public.road_reports;
CREATE POLICY "Allow public select road reports" 
ON public.road_reports FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public update upvote and rating" ON public.road_reports;
CREATE POLICY "Allow public update upvote and rating" 
ON public.road_reports FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete road reports" ON public.road_reports;
CREATE POLICY "Allow delete road reports" 
ON public.road_reports FOR DELETE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read districts" ON public.districts;
CREATE POLICY "Allow public read districts" 
ON public.districts FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read timeline" ON public.report_timeline;
CREATE POLICY "Allow public read timeline" 
ON public.report_timeline FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert timeline" ON public.report_timeline;
CREATE POLICY "Allow insert timeline" 
ON public.report_timeline FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete timeline" ON public.report_timeline;
CREATE POLICY "Allow delete timeline" 
ON public.report_timeline FOR DELETE 
TO anon, authenticated 
USING (true);

-- Banners & Settings Policies
ALTER TABLE public.sponsor_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read banners" ON public.sponsor_banners;
CREATE POLICY "Allow public read banners" 
ON public.sponsor_banners FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert banners" ON public.sponsor_banners;
CREATE POLICY "Allow public insert banners" 
ON public.sponsor_banners FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update banners" ON public.sponsor_banners;
CREATE POLICY "Allow public update banners" 
ON public.sponsor_banners FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete banners" ON public.sponsor_banners;
CREATE POLICY "Allow public delete banners" 
ON public.sponsor_banners FOR DELETE 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public read settings" ON public.system_settings;
CREATE POLICY "Allow public read settings" 
ON public.system_settings FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public modify settings" ON public.system_settings;
CREATE POLICY "Allow public modify settings" 
ON public.system_settings FOR ALL 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 8. STORAGE BUCKET & POLICIES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'road-reports',
    'road-reports',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public Upload Road Photos" ON storage.objects;
CREATE POLICY "Public Upload Road Photos" 
ON storage.objects FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'road-reports');

DROP POLICY IF EXISTS "Public Read Road Photos" ON storage.objects;
CREATE POLICY "Public Read Road Photos" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'road-reports');

-- 9. REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.road_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsor_banners;

-- 10. SEED DATA
INSERT INTO public.districts (district_code, name_th, name_en, latitude, longitude) VALUES
('3301', 'เมืองศรีสะเกษ', 'Mueang Sisaket', 15.1186, 104.3220),
('3302', 'ยางชุมน้อย', 'Yang Chum Noi', 15.2892, 104.3985),
('3303', 'กันทรารมย์', 'Kanthararom', 15.1118, 104.5762),
('3304', 'กันทรลักษ์', 'Kantharalak', 14.6406, 104.6508),
('3305', 'ขุขันธ์', 'Khukhan', 14.7121, 104.1983),
('3306', 'ไพรบึง', 'Phrai Bueng', 14.7505, 104.3592),
('3307', 'ปรางค์กู่', 'Prang Ku', 14.8550, 103.9856),
('3308', 'ขุนหาญ', 'Khun Han', 14.6192, 104.4283),
('3309', 'ราษีไศล', 'Rasi Salai', 15.3444, 104.1539),
('3310', 'อุทุมพรพิสัย', 'Uthumphon Phisai', 15.1114, 104.1417),
('3311', 'บึงบูรพ์', 'Bueng Bun', 15.3789, 104.0536),
('3312', 'ห้วยทับทัน', 'Huai Thap Than', 15.0617, 104.0206),
('3313', 'โนนคูณ', 'Non Khun', 14.9392, 104.7083),
('3314', 'ศรีรัตนะ', 'Si Rattana', 14.7892, 104.4750),
('3315', 'น้ำเกลี้ยง', 'Nam Kliang', 14.9450, 104.5028),
('3316', 'วังหิน', 'Wang Hin', 14.9819, 104.2817),
('3317', 'ภูสิงห์', 'Phu Sing', 14.4167, 104.0833),
('3318', 'เมืองจันทร์', 'Mueang Chan', 15.1783, 104.0250),
('3319', 'เบญจลักษ์', 'Benchalak', 14.8333, 104.7167),
('3320', 'พยุห์', 'Phayu', 14.9583, 104.3833),
('3321', 'โพธิ์ศรีสุวรรณ', 'Pho Si Suwan', 15.2250, 104.0833),
('3322', 'ศิลาลาด', 'Sila Lat', 15.5167, 104.0833)
ON CONFLICT (district_code) DO NOTHING;

INSERT INTO public.road_reports (
    tracking_code,
    reporter_phone,
    latitude,
    longitude,
    district,
    subdistrict,
    landmark_description,
    photo_context_url,
    photo_closeup_url,
    resolution_photo_url,
    severity_level,
    status,
    admin_notes,
    assigned_team,
    upvote_count,
    rating,
    rating_feedback,
    created_at,
    resolved_at
) VALUES
(
    'SK2610-0001',
    '0812345678',
    15.1189,
    104.3265,
    'เมืองศรีสะเกษ',
    'เมืองใต้',
    'หน้าโรงเรียนสตรีสิริเกศ ใกล้เสาไฟฟ้าต้นที่ 4 ฝั่งตรงข้ามร้านเครื่องเขียน',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    NULL,
    'HIGH',
    'IN_PROGRESS',
    'ส่งทีมช่างแขวงทางหลวงศรีสะเกษเข้าเตรียมพื้นผิวลาดยางมะตอย',
    'แขวงทางหลวงศรีสะเกษ ชุดปฏิบัติการที่ 1',
    7,
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    NULL
),
(
    'SK2610-0002',
    '0898765432',
    15.1104,
    104.3584,
    'เมืองศรีสะเกษ',
    'หนองครก',
    'ใกล้ร้านสีแสงยางยนต์ มุ่งหน้าสี่แยกบายพาสอุบลราชธานี หลุมลึกประมาณ 10 ซม.',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584463699039-44e99f018e6c?w=800&auto=format&fit=crop&q=80',
    'CRITICAL',
    'RESOLVED',
    'ซ่อมแซมลาดยางมะตอยสำเร็จเรียบร้อย ผิวทางเรียบสนิท',
    'เทศบาลเมืองศรีสะเกษ กองช่างสุขาภิบาล',
    14,
    5,
    'ซ่อมไวมากครับ ขอบคุณทีมช่างมากครับ ปลอดภัยขึ้นเยอะเลย',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '1 day'
),
(
    'SK2610-0003',
    '0955551234',
    14.6406,
    104.6508,
    'กันทรลักษ์',
    'น้ำอ้อม',
    'ถนนสายขึ้นผามออีแดง-เขาพระวิหาร ก่อนถึงป้อมตรวจอุทยานฯ 500 เมตร ผิวทางแตกร้าวทรุดตัว',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=80',
    NULL,
    'HIGH',
    'VERIFIED',
    'รับเรื่องแล้ว ประสานงานหมวดทางหลวงกันทรลักษ์ลงสำรวจ',
    'หมวดทางหลวงกันทรลักษ์',
    4,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    NULL
),
(
    'SK2610-0004',
    '0871112233',
    15.3444,
    104.1539,
    'ราษีไศล',
    'เมืองคง',
    'หน้าทางเข้าเขื่อนราษีไศล ตรงข้ามป้ายหมู่บ้าน หลุมกว้างกลางเลนซ้าย',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    NULL,
    'MEDIUM',
    'PENDING',
    NULL,
    NULL,
    2,
    NULL,
    NULL,
    NOW() - INTERVAL '3 hours',
    NULL
)
ON CONFLICT (tracking_code) DO NOTHING;

-- Seed Data: Sponsor & PR Banners (5 ลิงก์มาตรฐานของระบบ)
INSERT INTO public.sponsor_banners (id, title, image_url, is_active, "order", created_at) VALUES
('ban-001', 'ป้ายประชาสัมพันธ์ 1', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzGImso0DdeSKyj6m1vEw530UiyFqv19PYnR1cE5cFd3iR1-h8LN-2l94&s=10', true, 1, NOW() - INTERVAL '5 days'),
('ban-002', 'ป้ายประชาสัมพันธ์ 2', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRw4OqfAtI22mYtiFgx6rhY4cKmJv2hRMfHgAOztMDUKkDLlpXQgiSARRI&s=10', true, 2, NOW() - INTERVAL '4 days'),
('ban-003', 'ป้ายประชาสัมพันธ์ 3', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJjNkj36ZbjkhaFwxxt4GFbcV5_jxJiF2CNkUGNMrNs9tE5uJzyngLI9U&s=10', true, 3, NOW() - INTERVAL '3 days'),
('ban-004', 'ป้ายประชาสัมพันธ์ 4', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3Mf1-2DlE6Mkz833PdbTfXWYGNwv3PHfs0N6Iud_FXCL-2vUyuAmbRaA&s=10', true, 4, NOW() - INTERVAL '2 days'),
('ban-005', 'ป้ายประชาสัมพันธ์ 5', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzGImso0DdeSKyj6m1vEw530UiyFqv19PYnR1cE5cFd3iR1-h8LN-2l94&s=10', true, 5, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: System Settings (Header Theme Config)
INSERT INTO public.system_settings (key, value, updated_at) VALUES
('header_theme', '{"mode": "preset", "custom_images": [], "banner_speed_seconds": 5, "overlay_darkness": 75}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
