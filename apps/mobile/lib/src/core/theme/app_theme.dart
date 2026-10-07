import 'package:attendance/src/core/theme/app_colors.dart';
import 'package:flutter/material.dart';

abstract final class AppTheme {
  static ThemeData get light {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: AppColors.blue,
      brightness: Brightness.light,
    );

    final colorScheme = baseScheme.copyWith(
      primary: AppColors.blue,
      onPrimary: Colors.white,
      primaryContainer: AppColors.blueContainer,
      onPrimaryContainer: AppColors.onBlueContainer,
      secondary: AppColors.orange,
      onSecondary: AppColors.onOrange,
      secondaryContainer: AppColors.orangeContainer,
      onSecondaryContainer: AppColors.onOrangeContainer,
      tertiary: AppColors.purple,
      onTertiary: Colors.white,
      tertiaryContainer: AppColors.purpleContainer,
      onTertiaryContainer: AppColors.onPurpleContainer,
      surface: AppColors.background,
      onSurface: AppColors.foreground,
      outline: AppColors.border,
    );

    return ThemeData(
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.background,
      cardTheme: const CardThemeData(
        color: Colors.white,
        elevation: 1,
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.blue, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Colors.redAccent, width: 1.8),
        ),
      ),
      useMaterial3: true,
    );
  }
}
