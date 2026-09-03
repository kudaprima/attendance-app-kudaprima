import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/domain/office_location_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

final class FirebaseOfficeLocationRepository
    implements OfficeLocationRepository {
  FirebaseOfficeLocationRepository(this._firestore);

  final FirebaseFirestore _firestore;

  @override
  Future<OfficeLocation> fetchPrimaryOffice() async {
    final snapshot = await _firestore
        .collection('officeLocations')
        .doc('main')
        .get();
    final data = snapshot.data();
    if (!snapshot.exists || data == null) {
      throw const MissingOfficeLocationException();
    }

    final name = data['name'];
    final latitude = data['latitude'];
    final longitude = data['longitude'];
    final radiusMeters = data['radiusMeters'];
    final accuracyThresholdMeters = data['accuracyThresholdMeters'];
    final timeZone = data['timeZone'];
    final active = data['active'];

    if (name is! String ||
        name.trim().isEmpty ||
        latitude is! num ||
        longitude is! num ||
        radiusMeters is! num ||
        radiusMeters <= 0 ||
        accuracyThresholdMeters is! num ||
        accuracyThresholdMeters <= 0 ||
        timeZone != 'Asia/Jakarta' ||
        active != true) {
      throw const InvalidOfficeLocationException();
    }

    final normalizedLatitude = latitude.toDouble();
    final normalizedLongitude = longitude.toDouble();
    if (normalizedLatitude < -90 ||
        normalizedLatitude > 90 ||
        normalizedLongitude < -180 ||
        normalizedLongitude > 180) {
      throw const InvalidOfficeLocationException();
    }

    return OfficeLocation(
      id: snapshot.id,
      name: name.trim(),
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
      radiusMeters: radiusMeters.toDouble(),
      accuracyThresholdMeters: accuracyThresholdMeters.toDouble(),
      timeZone: timeZone,
    );
  }
}
