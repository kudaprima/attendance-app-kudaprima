import 'dart:math' as math;

class OfficeLocation {
  const OfficeLocation({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    required this.accuracyThresholdMeters,
    required this.timeZone,
  });

  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double radiusMeters;
  final double accuracyThresholdMeters;
  final String timeZone;
}

class DeviceLocationSample {
  const DeviceLocationSample({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.capturedAt,
    required this.isMocked,
  });

  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final DateTime capturedAt;
  final bool isMocked;
}

enum LocationReadinessStatus { office, field, retryAccuracy, mockBlocked }

class LocationReadiness {
  const LocationReadiness({
    required this.status,
    required this.sample,
    required this.distanceMeters,
    required this.lowAccuracy,
  });

  final LocationReadinessStatus status;
  final DeviceLocationSample sample;
  final double distanceMeters;
  final bool lowAccuracy;

  bool get canAttend =>
      status == LocationReadinessStatus.office ||
      status == LocationReadinessStatus.field;
}

abstract final class LocationReadinessPolicy {
  static LocationReadiness evaluate({
    required OfficeLocation office,
    required DeviceLocationSample sample,
    required bool allowLowAccuracyFallback,
  }) {
    final distanceMeters = distanceBetweenMeters(
      office.latitude,
      office.longitude,
      sample.latitude,
      sample.longitude,
    );

    if (sample.isMocked) {
      return LocationReadiness(
        status: LocationReadinessStatus.mockBlocked,
        sample: sample,
        distanceMeters: distanceMeters,
        lowAccuracy: sample.accuracyMeters > office.accuracyThresholdMeters,
      );
    }

    final lowAccuracy = sample.accuracyMeters > office.accuracyThresholdMeters;
    if (lowAccuracy && !allowLowAccuracyFallback) {
      return LocationReadiness(
        status: LocationReadinessStatus.retryAccuracy,
        sample: sample,
        distanceMeters: distanceMeters,
        lowAccuracy: true,
      );
    }

    return LocationReadiness(
      status: lowAccuracy || distanceMeters > office.radiusMeters
          ? LocationReadinessStatus.field
          : LocationReadinessStatus.office,
      sample: sample,
      distanceMeters: distanceMeters,
      lowAccuracy: lowAccuracy,
    );
  }

  static double distanceBetweenMeters(
    double firstLatitude,
    double firstLongitude,
    double secondLatitude,
    double secondLongitude,
  ) {
    const earthRadiusMeters = 6371000.0;
    final latitudeDelta = _toRadians(secondLatitude - firstLatitude);
    final longitudeDelta = _toRadians(secondLongitude - firstLongitude);
    final firstLatitudeRadians = _toRadians(firstLatitude);
    final secondLatitudeRadians = _toRadians(secondLatitude);

    final haversine =
        math.sin(latitudeDelta / 2) * math.sin(latitudeDelta / 2) +
        math.cos(firstLatitudeRadians) *
            math.cos(secondLatitudeRadians) *
            math.sin(longitudeDelta / 2) *
            math.sin(longitudeDelta / 2);
    final angularDistance =
        2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine));
    return earthRadiusMeters * angularDistance;
  }

  static double _toRadians(double degrees) => degrees * math.pi / 180;
}
