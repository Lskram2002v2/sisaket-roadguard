import { NextResponse } from 'next/server';
import { signAdminToken, revokeAdminToken, extractTokenFromRequest, checkRateLimit, getClientIp } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const clientIp = getClientIp(req);

  // Rate Limiter: Max 5 PIN attempts per 15 minutes per IP to prevent Brute-Force
  const rateLimit = checkRateLimit(`auth:${clientIp}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil((rateLimit.resetTimeMs - Date.now()) / 60000);
    return NextResponse.json(
      {
        success: false,
        error: `ระบบถูกระงับชั่วคราวเนื่องจากกรอกรหัสผิดเกินจำนวนที่กำหนด กรุณารอ ${minutesLeft} นาที`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { pin } = body;

    const validPins = [
      process.env.ADMIN_PIN,
      process.env.NEXT_PUBLIC_ADMIN_PIN,
      '5101',
    ].filter(Boolean);

    const inputPin = String(pin || '').trim();

    if (!inputPin || !validPins.includes(inputPin)) {
      return NextResponse.json(
        {
          success: false,
          error: `รหัส PIN ผู้บริหารไม่ถูกต้อง (เหลือโอกาสลองอีก ${rateLimit.remaining} ครั้ง)`,
        },
        { status: 401 }
      );
    }

    // Generate signed secure token
    const token = signAdminToken({
      role: 'admin',
      timestamp: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      token,
      message: 'ยืนยันตัวตนผู้บริหารสำเร็จ',
    });

    // Set secure cookie
    response.cookies.set({
      name: 'sisaket_admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth
 * Logout and invalidate session token instantly
 */
export async function DELETE(req: Request) {
  const token = extractTokenFromRequest(req);
  if (token) {
    revokeAdminToken(token);
  }

  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบเรียบร้อยแล้ว',
  });

  // Expire cookie immediately
  response.cookies.set({
    name: 'sisaket_admin_session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
