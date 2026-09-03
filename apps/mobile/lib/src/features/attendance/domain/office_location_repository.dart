import 'package:attendance/src/features/attendance/domain/office_location.dart';

abstract interface class OfficeLocationRepository {
  Future<OfficeLocation> fetchPrimaryOffice();
}

class InvalidOfficeLocationException implements Exception {
  const InvalidOfficeLocationException();

  @override
  String toString() => 'The office location configuration is invalid.';
}

class MissingOfficeLocationException implements Exception {
  const MissingOfficeLocationException();

  @override
  String toString() => 'The primary office location is not configured.';
}
