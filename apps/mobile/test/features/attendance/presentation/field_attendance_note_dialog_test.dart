import 'package:attendance/src/features/attendance/presentation/field_attendance_note_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('validates note requirement and returns submitted note', (
    tester,
  ) async {
    String? submittedNote;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                submittedNote = await FieldAttendanceNoteDialog.show(context);
              },
              child: const Text('Buka Dialog'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Buka Dialog'));
    await tester.pumpAndSettle();

    expect(find.text('Catatan Lapangan'), findsOneWidget);

    // Try submitting empty note
    await tester.tap(find.byKey(const Key('submit-field-note-button')));
    await tester.pumpAndSettle();

    expect(find.text('Catatan kegiatan wajib diisi.'), findsOneWidget);
    expect(submittedNote, isNull);

    // Fill valid note and submit
    await tester.enterText(
      find.byKey(const Key('field-note-input')),
      'Kunjungan customer PT Maju',
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('submit-field-note-button')));
    await tester.pumpAndSettle();

    expect(submittedNote, 'Kunjungan customer PT Maju');
  });
}
