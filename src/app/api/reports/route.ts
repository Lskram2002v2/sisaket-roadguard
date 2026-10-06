import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RoadReport, SeverityLevel } from '@/lib/types';
import { isWithinSisaket } from '@/lib/geofence';
import { isAuthorized, maskPhoneNumber, sanitizeString, checkRateLimit, getClientIp } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports
 * ดึงรายการรายงานทั้งหมด (PDPA Protected: บุคคลทั่วไปจะเห็นเบอร์ที่ถูก Mask เช่น 081-XXX-5678)
 */
export async function GET(req: Request) {
  try {
    const isAdmin = isAuthorized(req);
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
        // PDPA Compliance: ถ้าไม่ใช่แอดมิน ให้ Mask เบอร์โทรศัพท์ทั้งหมด
        const sanitizedData = data.map((report) => ({
          ...report,
          reporter_phone: isAdmin ? report.reporter_phone : maskPhoneNumber(report.reporter_phone),
        }));

        return NextResponse.json({ success: true, source: 'database', data: sanitizedData });
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
 * สร้างรายงานถนนชำรุดใหม่ (Rate Limited + Strict Validation)
 */
export async function POST(req: Request) {
  const clientIp = getClientIp(req);

  // Rate Limit: 10 reports per 10 minutes per IP
  const rateLimit = checkRateLimit(`report:${clientIp}`, 10, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'คุณส่งรายงานบ่อยเกินไป กรุณารอสักครู่ก่อนส่งข้อมูลใหม่' },
      { status: 429 }
    );
  }

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
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lngNum) || !isWithinSisaket(latNum, lngNum)) {
      return NextResponse.json(
        { success: false, error: 'พิกัดอยู่นอกพื้นที่ 22 อำเภอ จังหวัดศรีสะเกษ' },
        { status: 400 }
      );
    }

    if (!photo_context_url || !photo_closeup_url) {
      return NextResponse.json(
        { success: false, error: 'กรุณาแนบรูปภาพให้ครบทั้ง 2 รูป (ภาพมุมกว้าง และ ภาพระยะใกล้)' },
        { status: 400 }
      );
    }

    const cleanPhone = (reporter_phone || '').replace(/\D/g, '');
    if (cleanPhone && (cleanPhone.length < 9 || cleanPhone.length > 10 || !cleanPhone.startsWith('0'))) {
      return NextResponse.json(
        { success: false, error: 'หากระบุเบอร์โทรศัพท์ กรุณากรอกเบอร์ที่ถูกต้อง (เช่น 0812345678)' },
        { status: 400 }
      );
    }

    const landmarkClean = sanitizeString(landmark_description, 500);
    if (!landmarkClean || landmarkClean.length < 5) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุจุดสังเกตหรือสถานที่ใกล้เคียงอย่างน้อย 5 ตัวอักษร' },
        { status: 400 }
      );
    }

    const validSeverities: SeverityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const safeSeverity = validSeverities.includes(severity_level) ? severity_level : 'MEDIUM';

    const trackingCodePreview = `SK${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
    const generatedCode = tracking_code || `${trackingCodePreview}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: RoadReport = {
      id: `rep-${Date.now().toString(36)}`,
      tracking_code: generatedCode,
      reporter_phone: cleanPhone,
      latitude: latNum,
      longitude: lngNum,
      district: sanitizeString(district, 100) || 'เมืองศรีสะเกษ',
      subdistrict: subdistrict ? sanitizeString(subdistrict, 100) : undefined,
      landmark_description: landmarkClean,
      photo_context_url,
      photo_closeup_url,
      severity_level: safeSeverity,
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
 * อัปโหวต (upvote) หรือประเมินความพึงพอใจ (rating) พร้อม Rate Limiter
 */
export async function PATCH(req: Request) {
  const clientIp = getClientIp(req);

  // Rate limit: 30 actions per minute per IP
  const rateLimit = checkRateLimit(`action:${clientIp}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'คุณทำรายการเร็วเกินไป กรุณารอสักครู่' },
      { status: 429 }
    );
  }

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
      const ratingNum = parseInt(rating, 10);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return NextResponse.json({ success: false, error: 'คะแนนการประเมินต้องอยู่ระหว่าง 1 ถึง 5 ดาว' }, { status: 400 });
      }

      const feedbackClean = feedback ? sanitizeString(feedback, 500) : null;

      if (isSupabaseConfigured && supabase) {
        const updateData: any = { rating: ratingNum };
        if (feedbackClean) updateData.rating_feedback = feedbackClean;
        const updateQuery = id ? supabase.from('road_reports').update(updateData).eq('id', id)
          : supabase.from('road_reports').update(updateData).eq('tracking_code', tracking_code);
        await updateQuery;
        return NextResponse.json({ success: true, rating: ratingNum, feedback: feedbackClean });
      }
      return NextResponse.json({ success: true, rating: ratingNum, feedback: feedbackClean });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/reports PATCH error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
