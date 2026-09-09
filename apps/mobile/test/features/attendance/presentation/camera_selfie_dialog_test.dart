import 'package:attendance/src/features/attendance/presentation/camera_selfie_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final size in [const Size(412, 915), const Size(915, 412)]) {
    testWidgets(
      'selfie fills $size and camera errors cannot submit synthetic photos',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = size;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(
          MaterialApp(home: CameraSelfieDialog(cameraLoader: () async => [])),
        );
        await tester.pumpAndSettle();
        expect(
          tester.getSize(find.byKey(const Key('selfie-fullscreen'))),
          size,
        );
        expect(find.textContaining('Simulasi'), findsNothing);
        final capture = tester.widget<FilledButton>(
          find.byKey(const Key('capture-photo-button')),
        );
        expect(capture.onPressed, isNull);
        expect(
          find.textContaining('Kamera tidak dapat dibuka'),
          findsOneWidget,
        );
      },
    );
  }
}
