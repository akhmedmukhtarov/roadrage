export interface Point {
  lat: number;
  long: number;
}

const EARTH_RADIUS_M = 6_371_000;
// Below this the movement is GPS jitter, not a heading
const MIN_HEADING_DISTANCE_M = 3;

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Haversine distance in metres. */
export function distance(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLong = rad(b.long - a.long);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLong / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Compass bearing from a to b: 0 = north, 90 = east. */
function compassBearing(a: Point, b: Point): number {
  const dLong = rad(b.long - a.long);
  const y = Math.sin(dLong) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLong);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Angle from a to b in the client convention, clockwise:
 * 0 = left (west), 90 = north, 180 = right (east), 270 = south.
 */
export function direction(a: Point, b: Point): number {
  return Math.round(compassBearing(a, b) + 90) % 360;
}

/**
 * Direction of travel from a tail of points (oldest first), same convention
 * as `direction`. Null when the device has not moved enough to tell.
 */
export function heading(tail: Point[]): number | null {
  const last = tail[tail.length - 1];
  for (let i = tail.length - 2; i >= 0; i--) {
    if (distance(tail[i], last) >= MIN_HEADING_DISTANCE_M) {
      return direction(tail[i], last);
    }
  }
  return null;
}
