import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { HeaderThemeConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DEFAULT_THEME: HeaderThemeConfig = {
  mode: 'preset',
  custom_images: [],
  banner_speed_seconds: 5,
  overlay_darkness: 75,
  updated_at: new Date().toISOString(),
};

/**
 * GET /api/settings
 * ดึงการตั้งค่าระบบ (เช่น header_theme)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || 'header_theme';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (!error && data?.value) {
        return NextResponse.json({ success: true, key, data: data.value });
      }
    }

    return NextResponse.json({ success: true, key, data: DEFAULT_THEME });
  } catch (err: any) {
    console.error('API /api/settings GET error:', err);
    return NextResponse.json({ success: true, key: 'header_theme', data: DEFAULT_THEME });
  }
}

/**
 * POST /api/settings
 * อัปเดตการตั้งค่าระบบลงในตาราง system_settings
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;
    const settingKey = key || 'header_theme';

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key: settingKey,
          value: value,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, data: data.value });
      }
    }

    return NextResponse.json({ success: true, data: value });
  } catch (err: any) {
    console.error('API /api/settings POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
