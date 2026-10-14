import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

Future<Uint8List> _optimizePhotoBytes(Uint8List rawBytes) async {
  if (rawBytes.lengthInBytes <= 60 * 1024) return rawBytes;
  try {
    final codec = await ui.instantiateImageCodec(rawBytes, targetWidth: 400);
    final frame = await codec.getNextFrame();
    final byteData = await frame.image.toByteData(
      format: ui.ImageByteFormat.png,
    );
    if (byteData != null) {
      return byteData.buffer.asUint8List();
    }
  } catch (_) {}
  return rawBytes;
}

class CameraSelfieDialog extends StatefulWidget {
  const CameraSelfieDialog({this.cameraLoader, super.key});
  final Future<List<CameraDescription>> Function()? cameraLoader;
  static Future<String?> show(BuildContext context) =>
      Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (_) => const CameraSelfieDialog(),
          fullscreenDialog: true,
        ),
      );
  @override
  State<CameraSelfieDialog> createState() => _CameraSelfieDialogState();
}

class _CameraSelfieDialogState extends State<CameraSelfieDialog>
    with WidgetsBindingObserver {
  CameraController? _controller;
  bool _initializing = true;
  bool _capturing = false;
  String? _error;
  Uint8List? _photo;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initialize();
  }

  Future<void> _initialize() async {
    final generation = ++_generation;
    final previous = _controller;
    _controller = null;
    await previous?.dispose();
    CameraController? controller;
    try {
      final cameras = await (widget.cameraLoader ?? availableCameras)();
      if (!mounted || generation != _generation) return;
      if (cameras.isEmpty) throw StateError('Kamera tidak tersedia.');
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      controller = CameraController(
        camera,
        ResolutionPreset.low,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted || generation != _generation) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _initializing = false;
        _error = null;
      });
    } catch (_) {
      await controller?.dispose();
      if (!mounted || generation != _generation) return;
      setState(() {
        _initializing = false;
        _error =
            'Kamera tidak dapat dibuka. Periksa izin kamera lalu coba kembali.';
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      _generation++;
      final controller = _controller;
      setState(() {
        _controller = null;
        _initializing = true;
      });
      controller?.dispose();
    } else if (state == AppLifecycleState.resumed && _controller == null) {
      _initialize();
    }
  }

  @override
  void dispose() {
    _generation++;
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _capture() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _capturing) {
      return;
    }
    setState(() => _capturing = true);
    try {
      final file = await controller.takePicture();
      final bytes = await file.readAsBytes();
      await File(file.path).delete();
      if (mounted) setState(() => _photo = bytes);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Foto belum berhasil diambil. Silakan coba kembali.',
        );
      }
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('selfie-fullscreen'),
      backgroundColor: colors.scrim,
      body: Stack(
        fit: StackFit.expand,
        children: [
          _preview(),
          SafeArea(
            child: Column(
              children: [
                ColoredBox(
                  color: colors.scrim.withAlpha(170),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: 'Tutup kamera',
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                      Expanded(
                        child: Text(
                          _photo == null
                              ? 'Selfie Kehadiran'
                              : 'Konfirmasi Selfie',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  color: colors.scrim.withAlpha(170),
                  padding: const EdgeInsets.all(20),
                  child: _photo == null
                      ? SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            key: const Key('capture-photo-button'),
                            onPressed:
                                _controller?.value.isInitialized == true &&
                                    !_capturing
                                ? _capture
                                : null,
                            icon: const Icon(Icons.camera_alt),
                            label: Text(
                              _capturing ? 'Mengambil...' : 'Ambil Foto',
                            ),
                          ),
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                key: const Key('retake-photo-button'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side: const BorderSide(color: Colors.white),
                                ),
                                onPressed: () => setState(() {
                                  _photo = null;
                                  _error = null;
                                }),
                                child: const Text('Ambil Ulang'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                key: const Key('confirm-photo-button'),
                                onPressed: () async {
                                  final bytes = _photo;
                                  if (bytes == null) return;
                                  final optimized = await _optimizePhotoBytes(
                                    bytes,
                                  );
                                  if (!context.mounted) return;
                                  Navigator.of(context)
                                      .pop(base64Encode(optimized));
                                },
                                child: const Text('Gunakan Foto'),
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _preview() {
    if (_photo != null) return Image.memory(_photo!, fit: BoxFit.cover);
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _error = null;
                    _initializing = true;
                  });
                  _initialize();
                },
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }
    if (_initializing || _controller == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final controller = _controller!;
    final portrait = MediaQuery.orientationOf(context) == Orientation.portrait;
    final size = controller.value.previewSize!;
    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRect(
          child: FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: portrait ? size.height : size.width,
              height: portrait ? size.width : size.height,
              child: CameraPreview(controller),
            ),
          ),
        ),
        Center(
          child: FractionallySizedBox(
            widthFactor: portrait ? .65 : .35,
            heightFactor: .5,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(200),
                border: Border.all(color: Colors.white70, width: 2),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
