import 'package:attendance/src/core/theme/app_colors.dart';
import 'package:attendance/src/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses the approved PT Kuda Prima brand palette', () {
    final scheme = AppTheme.light.colorScheme;

    expect(AppTheme.light.scaffoldBackgroundColor, AppColors.background);
    expect(scheme.primary, AppColors.blue);
    expect(scheme.secondary, AppColors.orange);
    expect(scheme.tertiary, AppColors.purple);
  });

  test('brand foreground pairs meet normal text contrast', () {
    final scheme = AppTheme.light.colorScheme;

    expect(
      _contrast(scheme.primary, scheme.onPrimary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(scheme.secondary, scheme.onSecondary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(scheme.tertiary, scheme.onTertiary),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      _contrast(scheme.surface, scheme.onSurface),
      greaterThanOrEqualTo(4.5),
    );
  });
}

double _contrast(Color first, Color second) {
  final firstLuminance = first.computeLuminance();
  final secondLuminance = second.computeLuminance();
  final lighter = firstLuminance > secondLuminance
      ? firstLuminance
      : secondLuminance;
  final darker = firstLuminance > secondLuminance
      ? secondLuminance
      : firstLuminance;
  return (lighter + 0.05) / (darker + 0.05);
}
