import 'dart:async';

import 'package:attendance/src/features/attendance/domain/device_location_service.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:geolocator/geolocator.dart';

final class GeolocatorDeviceLocationService implements DeviceLocationService {
  const GeolocatorDeviceLocationService();

  @override
  Future<DeviceLocationSample> captureCurrentLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const DeviceLocationServiceDisabledException();
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationPermissionPermanentlyDeniedException();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationPermissionDeniedException();
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
      return DeviceLocationSample(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        capturedAt: position.timestamp.toUtc(),
        isMocked: position.isMocked,
      );
    } on TimeoutException {
      throw const LocationCaptureTimeoutException();
    }
  }
}
