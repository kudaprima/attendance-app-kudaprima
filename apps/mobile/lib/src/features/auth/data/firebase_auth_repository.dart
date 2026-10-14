import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

final class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(this._auth, [this._firestore]);

  final FirebaseAuth _auth;
  final FirebaseFirestore? _firestore;
  static Future<void>? _googleInitialization;

  @override
  Stream<AuthSession?> watchSession() {
    return _auth.idTokenChanges().asyncMap((user) async {
      if (user == null) return null;

      final email = user.email?.trim();
      if (email == null || email.isEmpty) {
        throw const InvalidRoleClaimException();
      }

      final token = await user.getIdTokenResult();
      var role = UserRole.fromClaim(token.claims?['role']);
      var displayName = user.displayName;

      final firestore = _firestore;
      if (firestore != null &&
          (role == null || !AppConfig.useFirebaseEmulators)) {
        final resolved = await _resolveOrProvisionFirestoreProfile(
          firestore: firestore,
          user: user,
          email: email,
        );
        role = resolved.role ?? role;
        if (resolved.fullName != null && resolved.fullName!.isNotEmpty) {
          displayName = resolved.fullName;
        }
      }

      if (role == null) {
        throw const InvalidRoleClaimException();
      }

      return AuthSession(
        uid: user.uid,
        email: email,
        displayName: displayName,
        role: role,
      );
    });
  }

  Future<({UserRole? role, String? fullName})>
  _resolveOrProvisionFirestoreProfile({
    required FirebaseFirestore firestore,
    required User user,
    required String email,
  }) async {
    final userRef = firestore.collection('users').doc(user.uid);
    final snap = await userRef.get();
    final existingData = snap.data();

    if (snap.exists && existingData != null) {
      return (
        role: UserRole.fromClaim(existingData['role']),
        fullName: (existingData['fullName'] as String?)?.trim(),
      );
    }

    if (AppConfig.useFirebaseEmulators) {
      return (role: null, fullName: null);
    }

    var provisionedName = (user.displayName?.trim().isNotEmpty == true)
        ? user.displayName!.trim()
        : email.split('@').first;
    if (provisionedName.length < 2) {
      provisionedName = 'Karyawan PT Kuda Prima';
    }

    await firestore.runTransaction((tx) async {
      final currentSnap = await tx.get(userRef);
      if (currentSnap.exists) return;

      final counterRef = firestore
          .collection('systemCounters')
          .doc('employeeId');
      final counterSnap = await tx.get(counterRef);
      final nextSeq = counterSnap.exists
          ? ((counterSnap.data()?['nextSequence'] as num?)?.toInt() ?? 1)
          : 1;
      final formattedId = 'KP-${nextSeq.toString().padLeft(6, '0')}';

      tx.set(counterRef, {
        'nextSequence': nextSeq + 1,
        'updatedAt': FieldValue.serverTimestamp(),
        'updatedBy': user.uid,
      }, SetOptions(merge: true));

      final nowWib = DateTime.now().toUtc().add(const Duration(hours: 7));
      final startDate =
          '${nowWib.year.toString().padLeft(4, '0')}-'
          '${nowWib.month.toString().padLeft(2, '0')}-'
          '${nowWib.day.toString().padLeft(2, '0')}';

      tx.set(userRef, {
        'authUid': user.uid,
        'employeeId': formattedId,
        'fullName': provisionedName,
        'email': email.toLowerCase(),
        'role': 'technician',
        'jobTitle': 'Teknisi Operasional',
        'employmentStatus': 'permanent',
        'employmentStartDate': startDate,
        'active': true,
        'revision': 1,
        'phone': null,
        'birthDate': null,
        'gender': null,
        'homeAddress': null,
        'createdAt': FieldValue.serverTimestamp(),
        'createdBy': user.uid,
        'updatedAt': FieldValue.serverTimestamp(),
        'updatedBy': user.uid,
      });
    });

    return (role: UserRole.technician, fullName: provisionedName);
  }

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  @override
  Future<void> signInWithGoogle() async {
    // Real Google credentials must never be sent to the local Auth emulator.
    if (AppConfig.useFirebaseEmulators) {
      throw FirebaseAuthException(code: 'google-emulator-unavailable');
    }
    try {
      await (_googleInitialization ??= GoogleSignIn.instance.initialize());
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) {
        throw FirebaseAuthException(code: 'invalid-credential');
      }
      await _auth.signInWithCredential(
        GoogleAuthProvider.credential(idToken: idToken),
      );
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) return;
      throw FirebaseAuthException(code: 'google-sign-in-failed');
    }
  }

  @override
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      // Do not disclose whether an email belongs to an employee.
      if (error.code != 'user-not-found') rethrow;
    }
  }

  @override
  Future<void> signOut() async {
    await _auth.signOut();
    if (_googleInitialization != null) await GoogleSignIn.instance.signOut();
  }
}
