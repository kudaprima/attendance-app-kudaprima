export interface OfficeLocationData {
  readonly active: boolean;
  readonly accuracyThresholdMeters: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly name: string;
  readonly radiusMeters: number;
  readonly timeZone: "Asia/Jakarta";
}

export interface GeofenceEvaluation {
  readonly distanceMeters: number;
  readonly isInsideOffice: boolean;
  readonly locationType: "office" | "field";
  readonly lowAccuracy: boolean;
}

export function distanceBetweenMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMeters = 6371000.0;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const firstLatitudeRadians = toRadians(firstLatitude);
  const secondLatitudeRadians = toRadians(secondLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusMeters * angularDistance;
}

export function evaluateGeofence(
  office: OfficeLocationData,
  latitude: number,
  longitude: number,
  accuracyMeters: number,
): GeofenceEvaluation {
  const distanceMeters = distanceBetweenMeters(
    office.latitude,
    office.longitude,
    latitude,
    longitude,
  );
  const isInsideOffice = distanceMeters <= office.radiusMeters;
  const lowAccuracy = accuracyMeters > office.accuracyThresholdMeters;
  const locationType = isInsideOffice && !lowAccuracy ? "office" : "field";

  return {
    distanceMeters,
    isInsideOffice,
    locationType,
    lowAccuracy,
  };
}
