import pg from 'pg';
const { Client } = pg;

const dbUrl = 'postgresql://postgres:tleloveby357@db.cybjbonnardearxckoig.supabase.co:5432/postgres';

async function patchDeletePolicy() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB to add DELETE policies...');

    const sql = `
      DROP POLICY IF EXISTS "Allow delete road reports" ON public.road_reports;
      CREATE POLICY "Allow delete road reports" 
      ON public.road_reports FOR DELETE 
      TO anon, authenticated 
      USING (true);

      DROP POLICY IF EXISTS "Allow delete timeline" ON public.report_timeline;
      CREATE POLICY "Allow delete timeline" 
      ON public.report_timeline FOR DELETE 
      TO anon, authenticated 
      USING (true);
    `;

    await client.query(sql);
    console.log('✅ DELETE policies added to Supabase!');
  } catch (err) {
    console.error('Error adding delete policy:', err);
  } finally {
    await client.end();
  }
}

patchDeletePolicy();
