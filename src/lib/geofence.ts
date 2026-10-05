import { SisaketDistrict, RoadReport } from './types';

// พิกัด 22 อำเภอในจังหวัดศรีสะเกษ
export const SISAKET_DISTRICTS: SisaketDistrict[] = [
  { id: 1, name_th: 'เมืองศรีสะเกษ', name_en: 'Mueang Sisaket', lat: 15.1186, lng: 104.3220 },
  { id: 2, name_th: 'ยางชุมน้อย', name_en: 'Yang Chum Noi', lat: 15.2892, lng: 104.3985 },
  { id: 3, name_th: 'กันทรารมย์', name_en: 'Kanthararom', lat: 15.1118, lng: 104.5762 },
  { id: 4, name_th: 'กันทรลักษ์', name_en: 'Kantharalak', lat: 14.6406, lng: 104.6508 },
  { id: 5, name_th: 'ขุขันธ์', name_en: 'Khukhan', lat: 14.7121, lng: 104.1983 },
  { id: 6, name_th: 'ไพรบึง', name_en: 'Phrai Bueng', lat: 14.7505, lng: 104.3592 },
  { id: 7, name_th: 'ปรางค์กู่', name_en: 'Prang Ku', lat: 14.8550, lng: 103.9856 },
  { id: 8, name_th: 'ขุนหาญ', name_en: 'Khun Han', lat: 14.6192, lng: 104.4283 },
  { id: 9, name_th: 'ราษีไศล', name_en: 'Rasi Salai', lat: 15.3444, lng: 104.1539 },
  { id: 10, name_th: 'อุทุมพรพิสัย', name_en: 'Uthumphon Phisai', lat: 15.1114, lng: 104.1417 },
  { id: 11, name_th: 'บึงบูรพ์', name_en: 'Bueng Bun', lat: 15.3789, lng: 104.0536 },
  { id: 12, name_th: 'ห้วยทับทัน', name_en: 'Huai Thap Than', lat: 15.0617, lng: 104.0206 },
  { id: 13, name_th: 'โนนคูณ', name_en: 'Non Khun', lat: 14.9392, lng: 104.7083 },
  { id: 14, name_th: 'ศรีรัตนะ', name_en: 'Si Rattana', lat: 14.7892, lng: 104.4750 },
  { id: 15, name_th: 'น้ำเกลี้ยง', name_en: 'Nam Kliang', lat: 14.9450, lng: 104.5028 },
  { id: 16, name_th: 'วังหิน', name_en: 'Wang Hin', lat: 14.9819, lng: 104.2817 },
  { id: 17, name_th: 'ภูสิงห์', name_en: 'Phu Sing', lat: 14.4167, lng: 104.0833 },
  { id: 18, name_th: 'เมืองจันทร์', name_en: 'Mueang Chan', lat: 15.1783, lng: 104.0250 },
  { id: 19, name_th: 'เบญจลักษ์', name_en: 'Benchalak', lat: 14.8333, lng: 104.7167 },
  { id: 20, name_th: 'พยุห์', name_en: 'Phayu', lat: 14.9583, lng: 104.3833 },
  { id: 21, name_th: 'โพธิ์ศรีสุวรรณ', name_en: 'Pho Si Suwan', lat: 15.2250, lng: 104.0833 },
  { id: 22, name_th: 'ศิลาลาด', name_en: 'Sila Lat', lat: 15.5167, lng: 104.0833 },
];

// ขอบเขตพิกัดพื้นที่อำเภอเมืองศรีสะเกษ (Polygon Coordinates สำหรับตีเส้นสีม่วง)
export const MUEANG_SISAKET_POLYGON: [number, number][] = [
  [15.1850, 104.2700],
  [15.1950, 104.3400],
  [15.1700, 104.3950],
  [15.1200, 104.4150],
  [15.0650, 104.3800],
  [15.0500, 104.3200],
  [15.0700, 104.2500],
  [15.1300, 104.2350],
  [15.1850, 104.2700],
];

// กรอบขอบเขตจังหวัดศรีสะเกษ (Bounding Box)
export const SISAKET_BOUNDS = {
  minLat: 14.3300,
  maxLat: 15.5500,
  minLng: 103.8500,
  maxLng: 104.8500,
};

export const SISAKET_CENTER = {
  lat: 15.1186,
  lng: 104.3220,
};

/**
 * คำนวณระยะห่างระหว่าง 2 พิกัดด้วยสูตร Haversine (หน่วยเป็นเมตร)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * ตรวจสอบว่าพิกัดอยู่ในขอบเขตจังหวัดศรีสะเกษหรือไม่
 */
export function isWithinSisaket(lat: number, lng: number): boolean {
  return (
    lat >= SISAKET_BOUNDS.minLat &&
    lat <= SISAKET_BOUNDS.maxLat &&
    lng >= SISAKET_BOUNDS.minLng &&
    lng <= SISAKET_BOUNDS.maxLng
  );
}

/**
 * ค้นหาอำเภอที่ใกล้ที่สุดจากพิกัด
 */
export function findNearestDistrict(lat: number, lng: number): SisaketDistrict {
  let nearest = SISAKET_DISTRICTS[0];
  let minDistance = Infinity;

  for (const district of SISAKET_DISTRICTS) {
    const dist = calculateDistance(lat, lng, district.lat, district.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = district;
    }
  }

  return nearest;
}

/**
 * ตรวจสอบว่ามีรายงานจุดใกล้เคียงในรัศมี 25-30 เมตรหรือไม่ (Proximity Detection)
 */
export function findNearbyReport(
  lat: number,
  lng: number,
  existingReports: RoadReport[],
  radiusMeters: number = 25
): { isNearby: boolean; report?: RoadReport; distanceMeters?: number } {
  for (const report of existingReports) {
    if (['PENDING', 'VERIFIED', 'IN_PROGRESS'].includes(report.status)) {
      const distance = calculateDistance(lat, lng, report.latitude, report.longitude);
      if (distance <= radiusMeters) {
        return {
          isNearby: true,
          report,
          distanceMeters: distance,
        };
      }
    }
  }
  return { isNearby: false };
}
