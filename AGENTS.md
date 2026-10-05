# 🤖 AGENTS.md — กติกาและแนวทางการทำงานสำหรับ AI Agents
**Project**: Sisaket RoadGuard (ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม)
**Tech Stack**: Next.js 14 (App Router), Tailwind CSS, Leaflet.js, Supabase (PostGIS & Storage)

---

## 🧭 กฎเหล็กการพัฒนาสำหรับ AI (Core Agent Directives)

### 1. Vibe Coding Workflow & Architectural Integrity
- **Spec First**: พัฒนาตามข้อกำหนดใน [SISAKET_POTHOLE_SYSTEM_SPEC.md](file:///C:/Users/tlelo/.gemini/antigravity/brain/a3094cd2-0c25-4ecf-b2ea-b2ce82847893/SISAKET_POTHOLE_SYSTEM_SPEC.md) เสมอ
- **No-Regression**: โค้ดที่เพิ่มใหม่ต้องไม่ทำให้ฟังก์ชันเดิมเสียหาย และ `npm run build` ต้องผ่าน 0 Errors
- **Mobile-First & Clean UI**: เน้นตัวหนังสือสั้นกระชับ ภาพคมชัด ละเมียดละไม สไตล์ดอกลำดวนศรีสะเกษ

### 2. ข้อกำหนดทางธุรกิจและข้อมูล GIS ขอบเขตจริง (GIS & Business Rules)
- **Real 22 Districts GeoJSON (`RULE-GEO-04`)**: ต้องใช้ชุดข้อมูลพิกัดเขตการปกครองจริง (รหัส 3301 - 3322) และวาดเส้นขอบเขตสีม่วง (`#7E22CE`) ตามแนวเขตอำเภอที่เลือกจริง 100%
- **Geofence Enforcer**: พิกัดต้องอยู่ภายในขอบเขต 22 อำเภอ จ.ศรีสะเกษ (Lat 14.33-15.55, Lng 103.85-104.85)
- **Proximity Alert (No Username)**: หากปักหมุดในรัศมี 20-30 เมตรจากเคสเดิม แจ้งเตือน: *"มีผู้รายงานจุดใกล้เคียงที่ท่านเสนอแล้ว (สถานะ: [กำลังดำเนินการ])"* โดย **ห้ามแสดงชื่อผู้แจ้งเดิมเด็ดขาด** เพื่อรักษาความเป็นส่วนตัว
- **Mandatory Phone (`RULE-PHONE-01`)**: บังคับกรอกเบอร์โทรศัพท์ 10 หลัก (Required 100%) สำหรับให้เจ้าหน้าที่โทรประสานงานหน้างาน
- **Dual Photo Strategy**: บังคับอัปโหลด 2 รูป (1. ภาพมุมกว้างบริบท + 2. ภาพระยะใกล้ตัวหลุม)
- **Photo Collision Guard**: ห้ามใช้ชื่อไฟล์เดิมจากเครื่อง ตั้งชื่อใหม่ด้วย System Hash เสมอ `{code}_{type}_{timestamp}_{hash}.webp` และบีบอัดเป็น WebP < 250KB ผ่าน Canvas
- **Citizen Tracking & Community Feed (`RULE-TRACK-02`)**: บันทึก Tracking Code ลง LocalStorage อัตโนมัติ แสดงผล Timeline 4 ขั้นตอน, ภาพ Before/After, ระบบโหวต +1 และเปิดให้สลับดูเคสอื่นๆ ใน 22 อำเภอได้

### 3. 5-Point Security & UI/UX Checklist
1. **Input Validation**: ตรวจสอบเบอร์โทรและพิกัดทั้งฝั่ง Client และ Server (PostGIS Validation)
2. **Access Control / PDPA**: ซ่อน/Mask เบอร์โทรศัพท์เป็น `08X-XXX-XXXX` บนหน้าสาธารณะ (ผ่าน View)
3. **No Secret in Code**: ดึง Supabase URL และ Keys ผ่าน Environment Variables (`.env.local`)
4. **UI/UX Resiliency**: ป้องกัน Map Scroll-Trap บนมือถือ, ใช้ Contrast สูงสู้แสงแดดกลางแจ้ง, และรองรับ Touch Target ≥ 48px
5. **Zero-Latency Alerts**: เสียงแจ้งเตือนแอดมินใช้ Web Audio API Synth ไม่โหลด MP3 ภายนอก

---

## 🛠️ คำสั่งที่ใช้ในโปรเจกต์
- `npm run dev`: เริ่มต้นรัน Development Server (Port 3000)
- `npm run build`: ตรวจสอบ Type Check และ Production Build
