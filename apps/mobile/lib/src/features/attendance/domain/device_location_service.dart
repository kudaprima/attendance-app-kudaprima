import 'package:attendance/src/features/attendance/domain/office_location.dart';

abstract interface class DeviceLocationService {
  Future<DeviceLocationSample> captureCurrentLocation();
}

sealed class DeviceLocationException implements Exception {
  const DeviceLocationException();
}

final class DeviceLocationServiceDisabledException
    extends DeviceLocationException {
  const DeviceLocationServiceDisabledException();
}

final class LocationPermissionDeniedException extends DeviceLocationException {
  const LocationPermissionDeniedException();
}

final class LocationPermissionPermanentlyDeniedException
    extends DeviceLocationException {
  const LocationPermissionPermanentlyDeniedException();
}

final class LocationCaptureTimeoutException extends DeviceLocationException {
  const LocationCaptureTimeoutException();
}
