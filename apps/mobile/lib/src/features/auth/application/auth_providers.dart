import 'package:attendance/src/features/auth/data/firebase_auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) =>
      FirebaseAuthRepository(FirebaseAuth.instance, FirebaseFirestore.instance),
);

final authSessionProvider = StreamProvider<AuthSession?>((ref) {
  return ref.watch(authRepositoryProvider).watchSession();
});
