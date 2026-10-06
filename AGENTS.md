# 🤖 AGENTS.md — กติกาและแนวทางการทำงานสำหรับ AI Agents
**Project**: Sisaket RoadGuard (ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม)  
**Tech Stack**: Next.js 14 (App Router), Tailwind CSS, Leaflet.js, Supabase (PostgreSQL + PostGIS + Storage)

---

## 🚨 กฎเหล็กสูงสุด (Absolute Directives & Deployment Rules)

> [!IMPORTANT]
> ### 1. 🛡️ ห้ามทดสอบบน Product / Production จริงเด็ดขาด (No Testing on Production)
> - **การพัฒนาและทดสอบทั้งหมดต้องทำบน Local Environment / Mock Data เท่านั้น**
> - ห้ามส่งข้อมูลทดสอบ (Dummy/Spam Data) เข้าสู่ฐานข้อมูลจริงของระบบ Production
> - ห้ามทดสอบฟังก์ชันที่ทำให้ข้อมูลจริงของประชาชนหรือเจ้าหน้าที่ในระบบจริงเกิดความเสียหายหรือปะปน

> [!IMPORTANT]
> ### 2. ✋ อัปเดตขึ้น Production จริงได้ต่อเมื่อผู้ใช้อนุญาตเท่านั้น (Explicit User Approval Required)
> - **ห้าม Push ขึ้น Production / Main Branch หรือ Deploy ระบบจริงโดยพลการ**
> - เมื่อพัฒนาฟังก์ชันหรือแก้ไขโค้ดเสร็จสิ้น ให้ดำเนินการ:
>   1. ตรวจสอบความถูกต้องและทดสอบในเครื่อง (`npx tsc --noEmit` และ `npm run build`)
>   2. รายงานสรุปสิ่งที่ทำและผลการทดสอบให้ผู้ใช้ทราบ
>   3. **ขอคำอนุญาตจากผู้ใช้ก่อนเสมอ** เมื่อผู้ใช้พิมพ์อนุญาต (เช่น *"อัปเดตได้เลย"*, *"อนุญาต"*, *"ขึ้นระบบได้"*) จึงจะทำการ Push หรือ Deploy สู่ Production

---

## 🧭 กฎการพัฒนาเชิงเทคนิค (Core Technical Directives)

### 1. Vibe Coding Workflow & Architectural Integrity
- **Spec First**: พัฒนาตามข้อกำหนดใน [SISAKET_POTHOLE_SYSTEM_SPEC.md](file:///C:/Users/tlelo/.gemini/antigravity/brain/a3094cd2-0c25-4ecf-b2ea-b2ce82847893/SISAKET_POTHOLE_SYSTEM_SPEC.md) และ [DOCUMENTATION.md](./DOCUMENTATION.md) เสมอ
- **No-Regression**: โค้ดที่เพิ่มใหม่ต้องไม่ทำให้ฟังก์ชันเดิมเสียหาย และ `npm run build` ต้องผ่าน 0 Errors
- **Mobile-First & Clean UI**: เน้นตัวหนังสือสั้นกระชับ ภาพคมชัด ละเมียดละไม สไตล์ดอกลำดวนศรีสะเกษ
- **Optimistic UI (0ms Response)**: ปุ่มและการตอบสนองของ UI ต้องรวดเร็ว 60 FPS ไม่เกิดการค้างหรือรอนาน

### 2. ข้อกำหนดทางธุรกิจและข้อมูล GIS ขอบเขตจริง (GIS & Business Rules)
- **Real 22 Districts GeoJSON (`RULE-GEO-04`)**: ต้องใช้ชุดข้อมูลพิกัดเขตการปกครองจริง (รหัส 3301 - 3322) และวาดเส้นขอบเขตสีม่วง (`#7E22CE`) ตามแนวเขตอำเภอที่เลือกจริง 100%
- **Geofence Enforcer**: พิกัดต้องอยู่ภายในขอบเขต 22 อำเภอ จ.ศรีสะเกษ (Lat 14.33-15.55, Lng 103.85-104.85)
- **Contact Phone (`RULE-PHONE-01`)**: เบอร์โทรศัพท์เป็นทางเลือก (Optional) ไม่บังคับกรอก หากระบุจะถูก Mask ตาม PDPA บนหน้าสาธารณะ และใช้ให้เจ้าหน้าที่โทรสอบถามเฉพาะกรณีหาพิกัดไม่เจอ
- **Dual Photo Strategy**: บังคับอัปโหลด 2 รูป (1. ภาพมุมกว้างบริบท + 2. ภาพระยะใกล้ตัวหลุม) พร้อมบีบอัดเป็น WebP บน Client
- **Resolution Photo**: รองรับการแนบภาพถ่ายหลังซ่อมแซมเสร็จสิ้นเพื่อแสดงผล Before/After ให้ประชาชนติดตาม
- **Admin Authentication**: บังคับใช้ PIN `5101` เท่านั้น พร้อมระบบ HMAC Session Token และปุ่ม Logout

### 3. มาตรการความปลอดภัยและ PDPA (Security Checklist)
1. **PDPA Compliance**: ซ่อน/Mask เบอร์โทรศัพท์เป็น `08X-XXX-XXXX` บนหน้าสาธารณะ (เปิดเผยเฉพาะแอดมินที่ล็อกอิน)
2. **Input Sanitization**: ลบแท็กอันตราย `<>` ป้องกัน XSS Injection และตรวจจับ Rate Limit
3. **No Secret in Code**: ดึง Supabase URL และ Keys ผ่าน Environment Variables (`.env.local`)
4. **Zero-Latency Alerts**: เสียงแจ้งเตือนแอดมินใช้ Web Audio API Synth ไม่โหลด MP3 ภายนอก

---

## 🛠️ คำสั่งที่ใช้ในโปรเจกต์
- `npm run dev`: เริ่มต้นรัน Development Server (Port 3000)
- `npx tsc --noEmit`: ตรวจสอบความถูกต้องของ Type
- `npm run build`: ตรวจสอบ Type Check และ Production Build
