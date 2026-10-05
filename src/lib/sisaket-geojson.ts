import sisaketGeoJson from './sisaket_districts.json';

export interface GeoDistrictFeature {
  type: string;
  properties: {
    amp_code: string;
    amp_th: string;
    amp_en: string;
    pro_code: string;
    pro_th: string;
    pro_en: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

export const SISAKET_GEOJSON = sisaketGeoJson as {
  type: string;
  features: GeoDistrictFeature[];
};

/**
 * ดึง Geometry ของอำเภอที่ระบุตามชื่อภาษาไทย
 */
export function getDistrictGeoJSON(districtNameTh: string): GeoDistrictFeature | undefined {
  const cleanName = districtNameTh.replace(/^(อำเภอ|อ\.)/, '').trim();
  return SISAKET_GEOJSON.features.find(
    (f) => f.properties.amp_th === cleanName || f.properties.amp_th.includes(cleanName)
  );
}

/**
 * ดึงรายชื่อ 22 อำเภอพร้อมรหัสทางการ
 */
export const OFFICIAL_SISAKET_DISTRICTS = SISAKET_GEOJSON.features.map((f) => ({
  code: f.properties.amp_code,
  name_th: f.properties.amp_th,
  name_en: f.properties.amp_en,
}));
