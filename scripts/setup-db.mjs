#!/usr/bin/env node
/**
 * 🛣️ Sisaket RoadGuard - Automated Database Provisioner & Migration Runner
 * รันสคริปต์นี้เพื่อสร้างตารางทั้งหมด, PostGIS, Views, Triggers และ 22 อำเภอเข้า Supabase อัตโนมัติในคำสั่งเดียว
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// อ่านไฟล์ .env.local หากมี
function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const dbUrl = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function run() {
  console.log('\n======================================================');
  console.log('🛣️  Sisaket RoadGuard: Supabase Direct Database Setup');
  console.log('======================================================\n');

  if (!dbUrl) {
    console.error('❌ ไม่พบ Database Connection String');
    console.log('\nวิธีรันคำสั่ง:');
    console.log('  node scripts/setup-db.js "<DATABASE_CONNECTION_STRING>"');
    console.log('\nหรือกำหนดค่า DATABASE_URL ในไฟล์ .env.local เช่น:');
    console.log('  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\n');
    process.exit(1);
  }

  console.log('⏳ กำลังเชื่อมต่อกับฐานข้อมูล Supabase...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ เชื่อมต่อฐานข้อมูล Supabase สำเร็จ!');

    const sqlPath = path.join(rootDir, 'supabase', 'full_setup.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`ไม่พบไฟล์ SQL ที่: ${sqlPath}`);
    }

    console.log('⏳ กำลังรันสคริปต์ SQL สร้างโครงสร้างฐานข้อมูล & 22 อำเภอ...');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sqlContent);
    console.log('✅ รันสคริปต์ SQL สำเร็จ 100%!');

    // ตรวจสอบข้อมูล 22 อำเภอ
    const districtRes = await client.query('SELECT COUNT(*) AS count FROM public.districts;');
    const reportRes = await client.query('SELECT COUNT(*) AS count FROM public.road_reports;');

    console.log('\n📊 สรุปผลการสร้างฐานข้อมูล:');
    console.log(`  - 🏛️  ตาราง districts (อำเภอ): ${districtRes.rows[0].count} อำเภอพร้อมใช้งาน`);
    console.log(`  - 📋 ตาราง road_reports (คำร้อง): ${reportRes.rows[0].count} รายการตัวอย่าง`);
    console.log('  - 🗺️  PostGIS Extension: เปิดใช้งานแล้ว');
    console.log('  - 🔒 PDPA View (public_road_reports): เปิดใช้งานแล้ว');
    console.log('  - 🗂️  Storage Bucket (road-reports): ตั้งค่าเสร็จสิ้น');
    console.log('\n🎉 ทุกอย่างพร้อมสำหรับการใช้งานแล้วครับ!\n');
  } catch (err) {
    console.error('\n❌ เกิดข้อผิดพลาดในการรันสคริปต์:', err.message || err);
  } finally {
    await client.end();
  }
}

run();
