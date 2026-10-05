import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/security';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: ไม่ได้รับสิทธิ์การจัดการระดับผู้บริหาร' },
      { status: 401 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database service unavailable' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { action, id, status, admin_notes, resolution_photo_url, assigned_team, details } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing report ID' }, { status: 400 });
    }

    if (action === 'status') {
      const updateData: any = {
        status,
        admin_notes: admin_notes || null,
        assigned_team: assigned_team || null,
        updated_at: new Date().toISOString(),
      };

      if (resolution_photo_url) {
        updateData.resolution_photo_url = resolution_photo_url;
      }
      if (status === 'RESOLVED') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('road_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else if (action === 'edit_details') {
      const { data, error } = await supabase
        .from('road_reports')
        .update({
          ...details,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: ไม่ได้รับสิทธิ์การจัดการระดับผู้บริหาร' },
      { status: 401 }
    );
  }

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Database service unavailable' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing report ID' }, { status: 400 });
    }

    // Delete associated timeline first
    await supabase.from('report_timeline').delete().eq('report_id', id);

    const { error } = await supabase.from('road_reports').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'ลบเคสเรียบร้อยแล้ว' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
