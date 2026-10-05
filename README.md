# 🛣️ Sisaket RoadGuard (ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม)

> 📱 **Web Application สำหรับประชาชนรายงานหลุมบ่อและถนนชำรุดในจังหวัดศรีสะเกษ พร้อมหน้า Admin จัดการคำขอ**

---

## ✨ ฟีเจอร์หลัก (Core Features)

1. **📍 ระบบปักหมุดอัจฉริยะ (Smart Location)**:
   - ตรวจจับพิกัด GPS อัตโนมัติ หรือเลื่อนหมุดบนแผนที่ได้อิสระ
   - ล็อคขอบเขตเฉพาะ 22 อำเภอในจังหวัดศรีสะเกษ (Geofencing)
2. **📸 ระบบอัปโหลด 2 รูปภาพ (Dual Perspective)**:
   - รูปที่ 1: ภาพมุมกว้างบริบท (เห็นเสาไฟ/ป้าย/ถนน)
   - รูปที่ 2: ภาพระยะใกล้ (เห็นสภาพหลุมชัดเจน)
   - บีบอัดรูปภาพอัตโนมัติก่อนส่ง (WebP < 800KB)
3. **✍️ ช่องระบุจุดสังเกต (Mandatory Landmark)**:
   - บังคับระบุจุดสังเกต พร้อมปุ่มลัดแตะไว (`[หน้าโรงเรียน]`, `[ตรงข้ามวัด]`, `[ใกล้เสาไฟ]`)
4. **💻 แดชบอร์ดแอดมิน (Admin Command Center)**:
   - ดูรายการคำขอแบบ Realtime
   - ปุ่มโทรด่วน (1-Click Call) + ปุ่มนำทาง (1-Click Google Maps)
   - ปรับสถานะงาน พร้อมแนบรูปภาพหลังซ่อมเสร็จ
5. **🌸 ดีไซน์ละเมียดละไม (Lamduan Classic Aesthetic)**:
   - โทนสีอบอุ่นงดงาม ดอกลำดวนและปราสาทขอมโบราณ
   - ตัวหนังสือสั้น กระชับ คลีน เข้าใจง่าย

---

## 🚀 วิธีการติดตั้งและรัน (Getting Started)

```bash
# ติดตั้ง dependencies
npm install

# รันโหมด Development
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000`

---

## 🗄️ การเชื่อมต่อ Supabase Database
นำสคริปต์ SQL จาก `supabase/schema.sql` หรือใน `SISAKET_POTHOLE_SYSTEM_SPEC.md` ไปรันใน Supabase SQL Editor แล้วกำหนดค่าใน `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
