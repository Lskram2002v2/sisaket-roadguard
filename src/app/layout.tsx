import type { Metadata, Viewport } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sisaket RoadGuard | ศรีสะเกษ ถนนสวย ปลอดภัย ไร้หลุม',
  description: 'ระบบรายงานและติดตามถนนชำรุด หลุมบ่อ จังหวัดศรีสะเกษ 22 อำเภอ รวดเร็ว ปลอดภัย โปร่งใส',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF8F5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#FAF8F5] text-stone-800 antialiased selection:bg-amber-100 selection:text-amber-900"
        suppressHydrationWarning
      >
        <div className="mx-auto min-h-screen max-w-lg md:max-w-4xl lg:max-w-5xl flex flex-col justify-between">
          {children}
        </div>
      </body>
    </html>
  );
}
