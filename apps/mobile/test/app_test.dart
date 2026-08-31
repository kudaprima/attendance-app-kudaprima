import 'package:attendance/src/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  testWidgets('shows the attendance home', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: AttendanceApp()));
    await tester.pumpAndSettle();

    expect(find.text('PT Kuda Prima'), findsOneWidget);
    expect(find.text('Presensi masuk'), findsOneWidget);
  });
}
