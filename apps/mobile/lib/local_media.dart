import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_player/video_player.dart';

/// Media stays on the phone (CineMind policy). Files are copied into the app's private
/// documents folder; only metadata and a fingerprint go to the server.
class LocalMedia {
  static Future<Directory> _dir(String projectId) async {
    final docs = await getApplicationDocumentsDirectory();
    final d = Directory('${docs.path}/cinemind/$projectId');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  static Future<File?> find(String projectId, String assetId) async {
    final f = File('${(await _dir(projectId)).path}/$assetId');
    return await f.exists() ? f : null;
  }

  static Future<File> store(String projectId, String assetId, File source) async {
    final dest = File('${(await _dir(projectId)).path}/$assetId');
    return source.copy(dest.path);
  }

  /// Same fingerprint as the web and desktop apps: SHA-256(size + first 2 MB + last 2 MB),
  /// so a file recognised on one device can be relinked on another.
  static Future<String> fingerprint(File f) async {
    const ch = 2 * 1024 * 1024;
    final size = await f.length();
    final raf = await f.open();
    try {
      final head = await raf.read(size < ch ? size : ch);
      await raf.setPosition(size - ch > 0 ? size - ch : 0);
      final tail = await raf.read(size < ch ? size : ch);
      final b = BytesBuilder()
        ..add(Uint8List.fromList(size.toString().codeUnits))
        ..add(head)
        ..add(tail);
      return sha256.convert(b.takeBytes()).toString();
    } finally {
      await raf.close();
    }
  }

  static String? kindOf(String path) {
    final ext = path.split('.').last.toLowerCase();
    if (['mp4', 'mov', 'm4v', 'webm', 'mkv', '3gp'].contains(ext)) return 'video';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'opus'].contains(ext)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].contains(ext)) return 'image';
    return null;
  }

  static String mimeOf(String path) {
    const m = {
      'mp4': 'video/mp4', 'mov': 'video/quicktime', 'm4v': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska', '3gp': 'video/3gpp',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'm4a': 'audio/mp4', 'aac': 'audio/aac', 'ogg': 'audio/ogg', 'flac': 'audio/flac', 'opus': 'audio/ogg',
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'heic': 'image/heic',
    };
    return m[path.split('.').last.toLowerCase()] ?? 'application/octet-stream';
  }

  /// Duration and size via the platform player (no server round-trip).
  static Future<({double seconds, int? width, int? height})> probe(File f, String kind) async {
    if (kind == 'image') return (seconds: 5.0, width: null, height: null);
    final c = VideoPlayerController.file(f);
    try {
      await c.initialize();
      final s = c.value.size;
      return (seconds: c.value.duration.inMilliseconds / 1000.0, width: kind == 'video' ? s.width.round() : null, height: kind == 'video' ? s.height.round() : null);
    } finally {
      await c.dispose();
    }
  }
}
