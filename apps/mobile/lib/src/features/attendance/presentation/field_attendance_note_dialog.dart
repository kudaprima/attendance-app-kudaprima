import 'package:flutter/material.dart';

class FieldAttendanceNoteDialog extends StatefulWidget {
  const FieldAttendanceNoteDialog({super.key});

  static Future<String?> show(BuildContext context) {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const FieldAttendanceNoteDialog(),
    );
  }

  @override
  State<FieldAttendanceNoteDialog> createState() =>
      _FieldAttendanceNoteDialogState();
}

class _FieldAttendanceNoteDialogState extends State<FieldAttendanceNoteDialog> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.edit_note, size: 28),
          SizedBox(width: 8),
          Text('Catatan Lapangan'),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Anda berada di luar radius kantor atau akurasi GPS rendah. '
              'Tuliskan keterangan lokasi atau kegiatan Anda (wajib).',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('field-note-input'),
              controller: _controller,
              maxLines: 3,
              maxLength: 500,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: 'Contoh: Maintenance jaringan di lokasi klien XYZ',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Catatan kegiatan wajib diisi.';
                }
                if (value.trim().length < 3) {
                  return 'Catatan minimal 3 karakter.';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text('Batal'),
        ),
        FilledButton(
          key: const Key('submit-field-note-button'),
          onPressed: () {
            if (_formKey.currentState?.validate() == true) {
              Navigator.of(context).pop(_controller.text.trim());
            }
          },
          child: const Text('Lanjutkan'),
        ),
      ],
    );
  }
}
