# 🛣️ Sisaket RoadGuard (ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม)

> 📱 **Mobile-First Web Application สำหรับประชาชนแจ้งซ่อมถนนชำรุด 22 อำเภอ จังหวัดศรีสะเกษ พร้อมระบบศูนย์บัญชาการแอดมิน Real-time**  
> *เอกสารระบบฉบับสมบูรณ์: อ่านต่อได้ที่ [DOCUMENTATION.md](./DOCUMENTATION.md)*

---

## 🌟 ฟีเจอร์หลักของระบบ (System Highlights)

### 1. 👤 ส่วนของประชาชน (Citizen Portal)
- 📍 **Smart GPS & 22 Districts Geofencing**: ตรวจจับพิกัดอัตโนมัติ ล็อคขอบเขตเฉพาะ 22 อำเภอศรีสะเกษ
- 📸 **Dual-Perspective Photos**: ระบบถ่ายภาพ 2 มุม (มุมกว้างบริบท + ระยะใกล้) พร้อมบีบอัดเป็น WebP อัตโนมัติ (<300KB)
- ✍️ **Mandatory Landmark**: บังคับระบุจุดสังเกตพร้อมปุ่มลัดแตะไว (`[หน้าโรงเรียน]`, `[ตรงข้ามวัด]`, `[ใกล้เสาไฟ]`, ฯลฯ)
- 🔍 **Tracking & Wallet**: ออกรหัสติดตามเคสทันที (เช่น `SK2610-1994`) พร้อมแท็บ "กระเป๋าของฉัน", "ฟีดชุมชน", และ "ค้นหา"
- 📈 **3-Stage Progress & Before/After**: แสดงความคืบหน้า 3 ขั้นตอน (`รอรับเรื่อง` ➡️ `กำลังซ่อมแซม` ➡️ `เสร็จสิ้น ✨`) พร้อมภาพ Before / After หลังซ่อมเสร็จ
- ⭐ **Upvote & Star Rating**: ร่วมโหวตเคสเร่งด่วน และประเมินความพึงพอใจการซ่อม (1-5 ดาว)

### 2. 🛡️ ส่วนของศูนย์บัญชาการเจ้าหน้าที่ (Admin Command Center)
- 🔒 **PIN Authentication**: ป้องกันด้วยรหัส PIN พิเศษ **`5101`** พร้อม Session Token 12 ชั่วโมง และปุ่ม Logout
- ⚡ **0ms Real-time Synchronization**: เชื่อมต่อ Supabase Realtime เมื่อมีเคสใหม่จะแจ้งเตือนพร้อมเสียงระฆัง Chime และ Toast ทันที
- 🗺️ **Interactive Leaflet Map & GeoJSON Boundary**: แสดงหมุดเคสและเส้นแบ่งเขตอำเภอสีม่วงจริงตาม 22 อำเภอ
- 🚀 **1-Click Rapid Actions**:
  - 📞 **1-Click Call**: โทรหาผู้แจ้งทันที (แสดงเบอร์โทรเต็มเฉพาะเจ้าหน้าที่)
  - 🧭 **1-Click Navigation**: เปิด Google Maps นำทางรถซ่อมไปยังพิกัดจริง
  - ⚡ **Quick Status Update**: ปรับสถานะ (`รับเรื่อง`, `กำลังซ่อม`, `เสร็จสิ้น`) แบบ Optimistic UI 0ms
- 📷 **Resolution Photo Attachment**: แนบภาพถ่ายหลักฐานหลังซ่อมแซมเสร็จสิ้น (อัปโหลดจากกล้อง/เครื่อง หรือวาง URL)
- 📊 **KPI Cards & Filters**: ตัวชี้วัด 5 หมวด (เร่งด่วน, วันนี้, รอรับเรื่อง, กำลังซ่อม, เสร็จสิ้น) พร้อมส่งออก Excel/CSV (UTF-8 BOM)
- 🎨 **Sponsor & Theme Settings**: จัดการป้ายประชาสัมพันธ์ / ผู้สนับสนุน และปรับแต่งภาพพื้นหลังส่วนบน

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

```
sisaket-roadguard/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── page.tsx              # หน้าหลักประชาชน (Form / Tracker / Map)
│   │   ├── admin/page.tsx        # หน้าศูนย์บัญชาการแอดมิน (PIN: 5101)
│   │   └── api/                  # Secure API Endpoints (Auth, Reports, Banners, Settings)
│   ├── components/               # React UI Components
│   │   ├── AdminCommandCenter.tsx # ศูนย์ควบคุมแอดมิน แผนที่ และการจัดการเคส
│   │   ├── AdminSettingsModal.tsx # การตั้งค่าป้ายสปอนเซอร์และธีม
│   │   ├── CitizenReportForm.tsx  # ฟอร์มแจ้งซ่อมถนน 2 รูปภาพ + พิกัด GPS
│   │   ├── CitizenTrackingPortal.tsx # กระเป๋าติดตามสถานะและประเมินผล
│   │   ├── PublicMapFeed.tsx     # แผนที่สาธารณะแสดงเคส 22 อำเภอ
│   │   ├── ReportMapPicker.tsx   # เครื่องมือปักหมุดพร้อม Geofencing
│   │   └── SisaketHeader.tsx     # แถบหัวเว็บและภาพแลนด์มาร์กศรีสะเกษ
│   └── lib/                      # Business Logic & Infrastructure
│       ├── db-store.ts           # Hybrid SWR In-Memory Store & Supabase Client
│       ├── geofence.ts           # รายชื่อและพิกัดศูนย์กลาง 22 อำเภอศรีสะเกษ
│       ├── sisaket-geojson.ts    # เส้นแบ่งเขต GeoJSON 22 อำเภอจริง
│       ├── security.ts           # HMAC Tokens, PDPA Masking, Rate Limiting
│       ├── audio-synth.ts        # Web Audio API Chime Synthesizer
│       └── image-processor.ts    # Client-Side WebP Compression
└── supabase/
    └── full_setup.sql            # สคริปต์ SQL 1-Click สร้างตาราง, PostGIS, และ RLS
```

---

## 🚀 วิธีการติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (`.env.local`)
สร้างไฟล์ `.env.local` ในโฟลเดอร์โปรเจกต์:
```env
NEXT_PUBLIC_SUPABASE_URL=https://cybjbonnardearxckoig.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ow4P72Jh-Tz36aeBhalO_A_7AziO04D
ADMIN_PIN=5101
NEXT_PUBLIC_ADMIN_PIN=5101
```

### 3. รัน Development Server
```bash
npm run dev
```
เปิดใช้งานผ่านเบราว์เซอร์:
- 📱 **หน้าประชาชน**: [http://localhost:3000](http://localhost:3000)
- 🛡️ **หน้าแอดมิน**: [http://localhost:3000/admin](http://localhost:3000/admin) *(PIN: `5101`)*

### 4. การ Build และทดสอบ Production
```bash
npm run build
npm run start
```

---

## 🔒 นโยบายความปลอดภัยและ PDPA (Security & Compliance)
- 🛡️ **PDPA Masking**: ปิดบังเบอร์โทรศัพท์ประชาชนสำหรับบุคคลทั่วไป (`081-XXX-5678`)
- 🔑 **Cryptographic HMAC Sessions**: Token แอดมินเข้ารหัสด้วย SHA-256 มีอายุ 12 ชม. พร้อม Token Revocation เมื่อ Logout
- ⏱️ **Rate Limiting**: ป้องกันการส่งสแปมรายงาน (จำกัด 10 เคส ต่อ 10 นาที ต่อ IP)
- 🗄️ **Row Level Security (RLS)**: ป้องกันและจำกัดสิทธิ์การเข้าถึงข้อมูลใน Supabase ทุกตาราง

---

## 📖 เอกสารอ้างอิงเพิ่มเติม
- [DOCUMENTATION.md](./DOCUMENTATION.md) — คู่มือรายละเอียดระบบทั้งหมดและแผนการพัฒนาต่อยอด
- [supabase/full_setup.sql](./supabase/full_setup.sql) — สคริปต์ฐานข้อมูล PostgreSQL + PostGIS 1-Click Setup
