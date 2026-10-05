import pg from 'pg';
const { Client } = pg;

const dbUrl = 'postgresql://postgres:tleloveby357@db.cybjbonnardearxckoig.supabase.co:5432/postgres';

async function clearReports() {
  console.log('\n======================================================');
  console.log('🧹 Sisaket RoadGuard: Clearing All Reports for Testing');
  console.log('======================================================\n');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase DB');

    console.log('⏳ Clearing report_timeline and road_reports...');
    await client.query('DELETE FROM public.report_timeline;');
    await client.query('DELETE FROM public.road_reports;');

    const res = await client.query('SELECT COUNT(*) AS count FROM public.road_reports;');
    console.log(`✅ Cleared! Current road_reports count: ${res.rows[0].count}`);

    const distRes = await client.query('SELECT COUNT(*) AS count FROM public.districts;');
    console.log(`🏛️ 22 Districts retained: ${distRes.rows[0].count} districts`);

    console.log('\n🎉 ฐานข้อมูลคำร้องว่างเปล่า 100% พร้อมสำหรับการทดสอบแจ้งซ่อมสดแล้วครับ!\n');
  } catch (err) {
    console.error('❌ Error clearing reports:', err);
  } finally {
    await client.end();
  }
}

clearReports();
