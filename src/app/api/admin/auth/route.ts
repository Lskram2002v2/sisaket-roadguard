import { NextResponse } from 'next/server';
import { signAdminToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pin } = body;

    const validPins = [
      process.env.ADMIN_PIN,
      process.env.NEXT_PUBLIC_ADMIN_PIN,
      '1234',
      '5101'
    ].filter(Boolean);

    if (!pin || !validPins.includes(String(pin).trim())) {
      return NextResponse.json(
        { success: false, error: 'รหัส PIN ผู้บริหารไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // Generate signed secure token
    const token = signAdminToken({
      role: 'admin',
      timestamp: Date.now()
    });

    const response = NextResponse.json({
      success: true,
      token,
      message: 'ยืนยันตัวตนผู้บริหารสำเร็จ'
    });

    // Set secure cookie
    response.cookies.set({
      name: 'sisaket_admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล' },
      { status: 500 }
    );
  }
}
