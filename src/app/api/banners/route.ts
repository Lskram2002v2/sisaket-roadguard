import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SponsorBanner } from '@/lib/types';
import { INITIAL_BANNERS } from '@/lib/db-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/banners
 * ดึงข้อมูลป้ายประชาสัมพันธ์ / ผู้สนับสนุน ทั้งหมดจากฐานข้อมูล (เรียงตามลำดับ order)
 */
export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('sponsor_banners')
        .select('*')
        .order('order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json({ success: true, source: 'database', data });
      }
    }

    // กรณีที่ยังไม่ได้ตั้งค่า DB หรือ DB ยังว่าง ให้ส่ง Initial Banners เริ่มต้น
    return NextResponse.json({ success: true, source: 'default', data: INITIAL_BANNERS });
  } catch (err: any) {
    console.error('API /api/banners GET error:', err);
    return NextResponse.json({ success: true, source: 'fallback', data: INITIAL_BANNERS });
  }
}

/**
 * POST /api/banners
 * เพิ่มป้ายประชาสัมพันธ์ใหม่ลงในฐานข้อมูล
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, subtitle, image_url, target_link, is_active, order } = body;

    if (!image_url) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ URL รูปภาพ' },
        { status: 400 }
      );
    }

    const newBanner: SponsorBanner = {
      id: `ban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title || 'ป้ายประชาสัมพันธ์ / ผู้สนับสนุน',
      subtitle: subtitle || undefined,
      image_url: image_url,
      target_link: target_link || undefined,
      is_active: is_active ?? true,
      order: order ?? 1,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('sponsor_banners')
        .insert({
          id: newBanner.id,
          title: newBanner.title,
          subtitle: newBanner.subtitle || null,
          image_url: newBanner.image_url,
          target_link: newBanner.target_link || null,
          is_active: newBanner.is_active,
          order: newBanner.order,
          created_at: newBanner.created_at,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert banner warning:', error.message);
      } else if (data) {
        return NextResponse.json({ success: true, data }, { status: 201 });
      }
    }

    return NextResponse.json({ success: true, data: newBanner }, { status: 201 });
  } catch (err: any) {
    console.error('API /api/banners POST error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/banners
 * อัปเดต / แก้ไข / สลับสถานะ / จัดลำดับป้าย
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, id, banner, orderedIds } = body;

    if (action === 'reorder' && Array.isArray(orderedIds)) {
      if (isSupabaseConfigured && supabase) {
        for (let i = 0; i < orderedIds.length; i++) {
          await supabase
            .from('sponsor_banners')
            .update({ order: i + 1, updated_at: new Date().toISOString() })
            .eq('id', orderedIds[i]);
        }
      }
      return NextResponse.json({ success: true, message: 'จัดเรียงลำดับสำเร็จ' });
    }

    if (action === 'toggle' && id) {
      if (isSupabaseConfigured && supabase) {
        const { data: current } = await supabase
          .from('sponsor_banners')
          .select('is_active')
          .eq('id', id)
          .single();

        if (current) {
          const newStatus = !current.is_active;
          await supabase
            .from('sponsor_banners')
            .update({ is_active: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);
          return NextResponse.json({ success: true, is_active: newStatus });
        }
      }
      return NextResponse.json({ success: true, message: 'สลับสถานะเรียบร้อย' });
    }

    if (action === 'update' && (id || banner?.id)) {
      const bannerId = id || banner.id;
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('sponsor_banners')
          .update({
            title: banner.title,
            subtitle: banner.subtitle || null,
            image_url: banner.image_url,
            target_link: banner.target_link || null,
            is_active: banner.is_active ?? true,
            order: banner.order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bannerId)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ success: true, data });
        }
      }
      return NextResponse.json({ success: true, data: banner });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/banners PUT error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการอัปเดต' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/banners?id=...
 * ลบป้ายประชาสัมพันธ์ออกจากฐานข้อมูล
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ ID ป้ายที่ต้องการลบ' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('sponsor_banners').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete banner warning:', error.message);
      }
    }

    return NextResponse.json({ success: true, message: `ลบป้าย ID ${id} เรียบร้อยแล้ว` });
  } catch (err: any) {
    console.error('API /api/banners DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
}
