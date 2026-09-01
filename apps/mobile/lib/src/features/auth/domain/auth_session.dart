enum UserRole {
  technician('Teknisi'),
  supervisor('Supervisor'),
  admin('Admin');

  const UserRole(this.label);

  final String label;

  static UserRole? fromClaim(Object? claim) {
    if (claim is! String) return null;

    for (final role in values) {
      if (role.name == claim) return role;
    }

    return null;
  }
}

class AuthSession {
  const AuthSession({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
  });

  final String uid;
  final String email;
  final String? displayName;
  final UserRole role;

  String get greetingName =>
      displayName?.trim().isNotEmpty == true ? displayName!.trim() : email;
}

class InvalidRoleClaimException implements Exception {
  const InvalidRoleClaimException();

  @override
  String toString() => 'The authenticated user has no valid role claim.';
}
