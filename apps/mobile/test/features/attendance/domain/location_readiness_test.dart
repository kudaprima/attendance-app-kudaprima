import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const office = OfficeLocation(
    id: 'main',
    name: 'Kantor PT Kuda Prima',
    latitude: -6.214737033753623,
    longitude: 106.76089760397757,
    radiusMeters: 100,
    accuracyThresholdMeters: 50,
    timeZone: 'Asia/Jakarta',
  );

  DeviceLocationSample sample({
    double latitude = -6.214737033753623,
    double longitude = 106.76089760397757,
    double accuracyMeters = 10,
    bool isMocked = false,
  }) => DeviceLocationSample(
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: accuracyMeters,
    capturedAt: DateTime.utc(2026, 9, 3),
    isMocked: isMocked,
  );

  group('LocationReadinessPolicy', () {
    test('accepts a genuine accurate sample inside the office radius', () {
      final result = LocationReadinessPolicy.evaluate(
        office: office,
        sample: sample(),
        allowLowAccuracyFallback: false,
      );

      expect(result.status, LocationReadinessStatus.office);
      expect(result.canAttend, isTrue);
      expect(result.distanceMeters, closeTo(0, 0.01));
    });

    test('classifies an accurate sample outside the radius as field', () {
      final result = LocationReadinessPolicy.evaluate(
        office: office,
        sample: sample(latitude: -6.216737033753623),
        allowLowAccuracyFallback: false,
      );

      expect(result.status, LocationReadinessStatus.field);
      expect(result.canAttend, isTrue);
      expect(result.distanceMeters, greaterThan(100));
      expect(result.lowAccuracy, isFalse);
    });

    test('always blocks a sample marked as mock', () {
      final result = LocationReadinessPolicy.evaluate(
        office: office,
        sample: sample(isMocked: true),
        allowLowAccuracyFallback: true,
      );

      expect(result.status, LocationReadinessStatus.mockBlocked);
      expect(result.canAttend, isFalse);
    });

    test('requests one retry for poor accuracy', () {
      final result = LocationReadinessPolicy.evaluate(
        office: office,
        sample: sample(accuracyMeters: 75),
        allowLowAccuracyFallback: false,
      );

      expect(result.status, LocationReadinessStatus.retryAccuracy);
      expect(result.canAttend, isFalse);
    });

    test(
      'falls back to flagged field attendance after poor accuracy persists',
      () {
        final result = LocationReadinessPolicy.evaluate(
          office: office,
          sample: sample(accuracyMeters: 75),
          allowLowAccuracyFallback: true,
        );

        expect(result.status, LocationReadinessStatus.field);
        expect(result.canAttend, isTrue);
        expect(result.lowAccuracy, isTrue);
      },
    );
  });
}
