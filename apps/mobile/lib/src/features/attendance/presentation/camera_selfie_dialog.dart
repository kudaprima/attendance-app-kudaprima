import 'dart:convert';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

class CameraSelfieDialog extends StatefulWidget {
  const CameraSelfieDialog({super.key});

  static Future<String?> show(BuildContext context) {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const CameraSelfieDialog(),
    );
  }

  @override
  State<CameraSelfieDialog> createState() => _CameraSelfieDialogState();
}

class _CameraSelfieDialogState extends State<CameraSelfieDialog> {
  CameraController? _controller;
  bool _isInitializing = true;
  String? _errorMessage;
  Uint8List? _capturedBytes;
  bool _isCapturing = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() {
          _isInitializing = false;
          _errorMessage = 'Tidak ada kamera yang terdeteksi pada perangkat.';
        });
        return;
      }

      final frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _isInitializing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
        _errorMessage = 'Gagal mengakses kamera: $e';
      });
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (_isCapturing) return;

    setState(() => _isCapturing = true);
    try {
      final xFile = await _controller!.takePicture();
      final bytes = await xFile.readAsBytes();
      if (!mounted) return;

      setState(() {
        _capturedBytes = bytes;
        _isCapturing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCapturing = false;
        _errorMessage = 'Gagal mengambil foto: $e';
      });
    }
  }

  void _retakePhoto() {
    setState(() {
      _capturedBytes = null;
      _errorMessage = null;
    });
  }

  void _confirmPhoto() {
    if (_capturedBytes == null) return;
    final base64String = base64Encode(_capturedBytes!);
    Navigator.of(context).pop(base64String);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          color: Colors.black,
          width: double.infinity,
          height: 520,
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                color: Colors.black87,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _capturedBytes == null
                          ? 'Selfie Presensi'
                          : 'Konfirmasi Selfie',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(null),
                    ),
                  ],
                ),
              ),

              // Viewfinder / Preview
              Expanded(child: _buildCameraBody(theme)),

              // Bottom action bar
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.black87,
                child: _capturedBytes == null
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          FilledButton.icon(
                            key: const Key('capture-photo-button'),
                            onPressed:
                                _controller?.value.isInitialized == true &&
                                    !_isCapturing
                                ? _capturePhoto
                                : null,
                            icon: _isCapturing
                                ? const SizedBox.square(
                                    dimension: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.camera_alt),
                            label: const Text('Ambil Foto'),
                          ),
                        ],
                      )
                    : Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              key: const Key('retake-photo-button'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.white54),
                              ),
                              onPressed: _retakePhoto,
                              child: const Text('Ambil Ulang'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: FilledButton(
                              key: const Key('confirm-photo-button'),
                              onPressed: _confirmPhoto,
                              child: const Text('Gunakan Foto'),
                            ),
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCameraBody(ThemeData theme) {
    if (_isInitializing) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 16),
            Text(
              'Menyiapkan kamera...',
              style: TextStyle(color: Colors.white70),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.amber, size: 48),
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 16),
              // Support simulation fallback in dev/test when physical camera is unavailable
              OutlinedButton(
                style: OutlinedButton.styleFrom(foregroundColor: Colors.white),
                onPressed: () {
                  // Fallback synthetic 1x1 jpeg base64
                  Navigator.of(context).pop(
                    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
                  );
                },
                child: const Text('Gunakan Foto Simulasi (Dev)'),
              ),
            ],
          ),
        ),
      );
    }

    if (_capturedBytes != null) {
      return Center(child: Image.memory(_capturedBytes!, fit: BoxFit.contain));
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        CameraPreview(_controller!),
        // Oval face guideline overlay
        Center(
          child: Container(
            width: 220,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.rectangle,
              borderRadius: BorderRadius.circular(110),
              border: Border.all(
                color: Colors.white.withAlpha(180),
                width: 2.5,
              ),
            ),
          ),
        ),
        const Positioned(
          top: 16,
          left: 0,
          right: 0,
          child: Text(
            'Posisikan wajah Anda di dalam lingkaran',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 13,
              shadows: [Shadow(blurRadius: 4, color: Colors.black)],
            ),
          ),
        ),
      ],
    );
  }
}
