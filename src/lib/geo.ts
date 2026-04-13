/** Haversine distance in meters (WGS84). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Branch geofence. `toleranceMultiplier` defaults to 1.15 (~15% slack for GPS jitter).
 * Clock-out uses a looser multiplier and/or proximity to clock-in (see clock-out route).
 */
export function isInsideBranchRadius(
  lat: number,
  lng: number,
  branchLat: number | null,
  branchLng: number | null,
  radiusM: number,
  toleranceMultiplier = 1.15
): boolean {
  if (branchLat == null || branchLng == null) return false;
  return distanceMeters(lat, lng, branchLat, branchLng) <= radiusM * toleranceMultiplier;
}

/** True if current fix is within maxM of a prior fix (same desk; GPS often drifts 20–80m between reads). */
export function isNearRecordedFix(
  lat: number,
  lng: number,
  priorLat: number | null,
  priorLng: number | null,
  maxM: number
): boolean {
  if (priorLat == null || priorLng == null) return false;
  return distanceMeters(lat, lng, priorLat, priorLng) <= maxM;
}
