import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RoadReport, SeverityLevel } from '@/lib/types';
import { isWithinSisaket } from '@/lib/geofence';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports
 * ดึงรายการรายงานทั้งหมด หรือค้นหาตาม tracking_code, phone, district
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('tracking_code');
    const phone = searchParams.get('phone');
    const district = searchParams.get('district');

    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('road_reports').select('*').order('created_at', { ascending: false });

      if (code) {
        query = query.or(`tracking_code.ilike.${code},id.eq.${code}`);
      }
      if (phone) {
        query = query.ilike('reporter_phone', `%${phone.replace(/\D/g, '')}%`);
      }
      if (district && district !== 'ALL') {
        query = query.eq('district', district);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return NextResponse.json({ success: true, source: 'database', data });
      }
    }

    return NextResponse.json({ success: true, source: 'fallback', data: [] });
  } catch (err: any) {
    console.error('API /api/reports GET error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/reports
 * สร้างรายงานถนนชำรุดใหม่
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tracking_code,
      reporter_phone,
      latitude,
      longitude,
      district,
      subdistrict,
      landmark_description,
      photo_context_url,
      photo_closeup_url,
      severity_level,
    } = body;

    // Validation
    if (!latitude || !longitude || !isWithinSisaket(latitude, longitude)) {
      return NextResponse.json(
        { success: false, error: 'พิกัดอยู่นอกพื้นที่ 22 อำเภอ จังหวัดศรีสะเกษ' },
        { status: 400 }
      );
    }

    if (!photo_context_url || !photo_closeup_url) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพให้ครบทั้ง 2 รูป' },
        { status: 400 }
      );
    }

    const cleanPhone = (reporter_phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์ติดต่อ 10 หลักที่ถูกต้อง' },
        { status: 400 }
      );
    }

    const trackingCodePreview = `SK${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
    const generatedCode = tracking_code || `${trackingCodePreview}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: RoadReport = {
      id: `rep-${Date.now().toString(36)}`,
      tracking_code: generatedCode,
      reporter_phone: cleanPhone,
      latitude,
      longitude,
      district: district || 'เมืองศรีสะเกษ',
      subdistrict: subdistrict || undefined,
      landmark_description: (landmark_description || '').trim(),
      photo_context_url,
      photo_closeup_url,
      severity_level: (severity_level as SeverityLevel) || 'MEDIUM',
      status: 'PENDING',
      upvote_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('road_reports')
        .insert({
          tracking_code: newReport.tracking_code,
          reporter_phone: newReport.reporter_phone,
          latitude: newReport.latitude,
          longitude: newReport.longitude,
          district: newReport.district,
          subdistrict: newReport.subdistrict || null,
          landmark_description: newReport.landmark_description,
          photo_context_url: newReport.photo_context_url,
          photo_closeup_url: newReport.photo_closeup_url,
          severity_level: newReport.severity_level,
          status: 'PENDING',
          upvote_count: 1,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    return NextResponse.json({ success: true, data: newReport }, { status: 201 });
  } catch (err: any) {
    console.error('API /api/reports POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/reports
 * อัปโหวต (upvote) หรือประเมินความพึงพอใจ (rating)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, id, tracking_code, rating, feedback } = body;

    if (!id && !tracking_code) {
      return NextResponse.json({ success: false, error: 'Missing report identifier' }, { status: 400 });
    }

    if (action === 'upvote') {
      if (isSupabaseConfigured && supabase) {
        const query = id ? supabase.from('road_reports').select('upvote_count').eq('id', id).single()
          : supabase.from('road_reports').select('upvote_count').eq('tracking_code', tracking_code).single();
        const { data } = await query;
        if (data) {
          const newCount = (data.upvote_count || 1) + 1;
          const updateQuery = id ? supabase.from('road_reports').update({ upvote_count: newCount }).eq('id', id)
            : supabase.from('road_reports').update({ upvote_count: newCount }).eq('tracking_code', tracking_code);
          await updateQuery;
          return NextResponse.json({ success: true, upvote_count: newCount });
        }
      }
      return NextResponse.json({ success: true, message: 'Upvoted' });
    }

    if (action === 'rate') {
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json({ success: false, error: 'Rating must be 1-5' }, { status: 400 });
      }

      if (isSupabaseConfigured && supabase) {
        const updateData: any = { rating };
        if (feedback) updateData.rating_feedback = feedback;
        const updateQuery = id ? supabase.from('road_reports').update(updateData).eq('id', id)
          : supabase.from('road_reports').update(updateData).eq('tracking_code', tracking_code);
        await updateQuery;
        return NextResponse.json({ success: true, rating, feedback });
      }
      return NextResponse.json({ success: true, rating, feedback });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/reports PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
