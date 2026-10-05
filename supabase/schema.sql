-- ==============================================================================
-- 🛣️ Sisaket RoadGuard Database Schema (Master DDL)
-- องค์กร: จังหวัดศรีสะเกษ (อบจ.ศรีสะเกษ & แขวงทางหลวงศรีสะเกษ)
-- ฐานข้อมูล: Supabase (PostgreSQL 15+ with PostGIS Extension)
-- ==============================================================================

-- 1. เปิดใช้งาน Extensions ที่จำเป็น
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. สร้าง Enum Types สำหรับสถานะและความเร่งด่วน
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

-- ------------------------------------------------------------------------------
-- 3. ตาราง 22 อำเภอในจังหวัดศรีสะเกษ (Official Districts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.districts (
    id SERIAL PRIMARY KEY,
    district_code VARCHAR(10) UNIQUE NOT NULL, -- เช่น 3301, 3302
    name_th VARCHAR(100) NOT NULL,             -- เช่น เมืองศรีสะเกษ, กันทรลักษ์
    name_en VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. ตารางรายงานความเสียหายถนน (Road Reports - Core Master Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.road_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(20) UNIQUE NOT NULL, -- เช่น SK2610-0001
    reporter_phone VARCHAR(20) NOT NULL,       -- บังคับ 100% สำหรับเจ้าหน้าที่โทรติดต่อ
    
    -- พิกัดทางภูมิศาสตร์ & สถานที่
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_geom GEOMETRY(Point, 4326),        -- PostGIS Point สำหรับคำนวณระยะห่าง
    district VARCHAR(100) NOT NULL,            -- อำเภอ (1 ใน 22 อำเภอ)
    subdistrict VARCHAR(100),                  -- ตำบล
    landmark_description TEXT NOT NULL,        -- บังคับ: จุดสังเกต/อยู่ใกล้กับอะไร
    
    -- รูปถ่าย 2 รูป (Context & Close-up)
    photo_context_url TEXT NOT NULL,           -- รูปที่ 1: ภาพมุมกว้างบริบท
    photo_closeup_url TEXT NOT NULL,           -- รูปที่ 2: ภาพระยะใกล้ตัวหลุม
    resolution_photo_url TEXT,                 -- รูปที่ 3: ภาพถ่ายหลังซ่อมแซมเสร็จสิ้น
    
    -- ระดับความรุนแรง & สถานะงาน
    severity_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    status VARCHAR(30) DEFAULT 'PENDING',        -- PENDING, VERIFIED, IN_PROGRESS, RESOLVED, REJECTED
    admin_notes TEXT,                          -- บันทึกข้อความจากเจ้าหน้าที่
    assigned_team VARCHAR(150),                -- หน่วยงานที่รับผิดชอบ เช่น หมวดทางหลวงกันทรลักษ์
    
    -- การมีส่วนร่วม & ประเมินผล
    upvote_count INT DEFAULT 1,                -- จำนวนคนกดสนับสนุนเคส (+1)
    rating INT CHECK (rating >= 1 AND rating <= 5), -- คะแนนความพึงพอใจ 1-5 ดาว
    rating_feedback TEXT,                      -- ความคิดเห็นของผู้แจ้งหลังซ่อมเสร็จ
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ตารางประวัติการเปลี่ยนสถานะ (Audit Trail Timeline)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.road_reports(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    actor_name VARCHAR(100) DEFAULT 'ระบบอัตโนมัติ',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. ระบบ Index สำหรับเพิ่มความเร็วการสืบค้น (Performance Indexes)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_road_reports_tracking ON public.road_reports(tracking_code);
CREATE INDEX IF NOT EXISTS idx_road_reports_district ON public.road_reports(district);
CREATE INDEX IF NOT EXISTS idx_road_reports_status ON public.road_reports(status);
CREATE INDEX IF NOT EXISTS idx_road_reports_severity ON public.road_reports(severity_level);
CREATE INDEX IF NOT EXISTS idx_road_reports_created ON public.road_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_road_reports_geom ON public.road_reports USING GIST(location_geom);

-- ------------------------------------------------------------------------------
-- 7. Database Views (PDPA Compliance & Dashboard Analytics)
-- ------------------------------------------------------------------------------

-- View ที่ 1: หน้าสาธารณะ (ซ่อนเบอร์โทรตามกฎหมาย PDPA ให้เห็นเป็น 08X-XXX-XXXX)
CREATE OR REPLACE VIEW public.public_road_reports AS 
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

-- View ที่ 2: สรุปสถิติภาพรวมรายอำเภอ (District Executive Summary)
CREATE OR REPLACE VIEW public.district_summary_stats AS
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

-- ------------------------------------------------------------------------------
-- 8. Triggers & Stored Functions
-- ------------------------------------------------------------------------------

-- ฟังก์ชันอัปเดต updated_at และ Geometry Point อัตโนมัติเมื่อมีการบันทึก
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

-- ฟังก์ชันบันทึก Timeline อัตโนมัติเมื่อสถานะเปลี่ยน
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

-- ------------------------------------------------------------------------------
-- 9. Row Level Security (RLS Policies)
-- ------------------------------------------------------------------------------
ALTER TABLE public.road_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_timeline ENABLE ROW LEVEL SECURITY;

-- นโยบายตาราง road_reports
CREATE POLICY "Allow public insert road reports" 
ON public.road_reports FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public select road reports" 
ON public.road_reports FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public update upvote and rating" 
ON public.road_reports FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- นโยบายตาราง districts & timeline (อ่านได้ทุกคน)
CREATE POLICY "Allow public read districts" 
ON public.districts FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public read timeline" 
ON public.report_timeline FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow insert timeline" 
ON public.report_timeline FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. เปิดใช้งาน Realtime Publication
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.road_reports;
