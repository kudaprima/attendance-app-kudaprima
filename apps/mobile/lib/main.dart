import 'package:attendance/src/app.dart';
import 'package:attendance/src/core/firebase/firebase_bootstrap.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID');
  await FirebaseBootstrap.initialize();
  runApp(const ProviderScope(child: AttendanceApp()));
}
