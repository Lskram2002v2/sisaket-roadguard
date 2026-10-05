import pg from 'pg';
const { Client } = pg;

const dbUrl = 'postgresql://postgres:tleloveby357@db.cybjbonnardearxckoig.supabase.co:5432/postgres';

async function fixTimelineRls() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database to patch trigger and RLS...');

    const fixSql = `
      -- 1. Update trigger function with SECURITY DEFINER
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

      -- 2. Add INSERT policy for report_timeline
      DROP POLICY IF EXISTS "Allow insert timeline" ON public.report_timeline;
      CREATE POLICY "Allow insert timeline" 
      ON public.report_timeline FOR INSERT 
      TO anon, authenticated 
      WITH CHECK (true);
    `;

    await client.query(fixSql);
    console.log('✅ Trigger function & RLS policy successfully patched on Supabase!');
  } catch (err) {
    console.error('Error applying patch:', err);
  } finally {
    await client.end();
  }
}

fixTimelineRls();
