/**
 * Tiện ích bóc tách tọa độ và tên quán từ liên kết Google Maps hoặc tọa độ thô.
 */
export interface ParsedLocation {
  lat: number;
  lng: number;
  name?: string;
}

export function isShortGoogleMapsUrl(url: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url.trim());
}

export function extractMapsCoords(input: string): ParsedLocation | null {
  if (!input) return null;
  const str = input.trim();

  // 1. Tọa độ thô: "21.028511, 105.854167" hoặc "21.028511,105.854167"
  const rawCoord = str.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawCoord) {
    const lat = parseFloat(rawCoord[1]);
    const lng = parseFloat(rawCoord[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Tọa độ trong URL dạng @lat,lng
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  // 3. Tọa độ trong tham số dữ liệu !3dlat!4dlng
  const dataMatch = str.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

  // 4. Tọa độ trong query params: ?q=lat,lng hoặc &query=lat,lng hoặc &ll=lat,lng
  const queryMatch = str.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);

  // 5. Tọa độ dạng /place/.../lat,lng
  const searchMatch = str.match(/(?:search|place)\/(-?\d+\.\d+),(-?\d+\.\d+)/);

  const latStr = atMatch?.[1] || dataMatch?.[1] || queryMatch?.[1] || searchMatch?.[1];
  const lngStr = atMatch?.[2] || dataMatch?.[2] || queryMatch?.[2] || searchMatch?.[2];

  let name: string | undefined;
  const placeMatch = str.match(/\/place\/([^/@?]+)/);
  if (placeMatch) {
    try {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      // Bỏ các ký tự rác nếu có
      if (decoded && !/^[0-9.,+-]+$/.test(decoded)) {
        name = decoded;
      }
    } catch {}
  }

  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, name };
    }
  }

  return null;
}
