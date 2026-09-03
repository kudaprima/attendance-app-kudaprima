import 'package:attendance/src/features/attendance/data/firebase_office_location_repository.dart';
import 'package:attendance/src/features/attendance/data/geolocator_device_location_service.dart';
import 'package:attendance/src/features/attendance/domain/device_location_service.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/domain/office_location_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final officeLocationRepositoryProvider = Provider<OfficeLocationRepository>(
  (ref) => FirebaseOfficeLocationRepository(FirebaseFirestore.instance),
);

final primaryOfficeLocationProvider =
    FutureProvider.autoDispose<OfficeLocation>(
      (ref) => ref.watch(officeLocationRepositoryProvider).fetchPrimaryOffice(),
    );

final deviceLocationServiceProvider = Provider<DeviceLocationService>(
  (ref) => const GeolocatorDeviceLocationService(),
);
