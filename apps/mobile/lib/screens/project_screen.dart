import 'dart:io';
import 'dart:math' as math;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';

import '../api.dart';
import '../local_media.dart';
import '../theme.dart';

const fps = 30;

/// One project on the phone: preview + timeline, the media on this device, and Cine.
class ProjectScreen extends StatefulWidget {
  const ProjectScreen({super.key, required this.projectId});
  final String projectId;
  @override
  State<ProjectScreen> createState() => _ProjectScreenState();
}

class _ProjectScreenState extends State<ProjectScreen> {
  String _title = '';
  Map<String, dynamic>? _timeline;
  bool _canUndo = false;
  bool _canRedo = false;
  List<Map<String, dynamic>> _assets = [];
  final Map<String, File> _local = {};
  String? _selected;
  int _playhead = 0;
  bool _saving = false;
  String? _error;

  int get _version => (_timeline?['version'] ?? 0) as int;
  List<Map<String, dynamic>> get _tracks => ((_timeline?['tracks'] ?? const []) as List).cast<Map<String, dynamic>>();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await Api.instance.call('GET', '/projects/${widget.projectId}') as Map<String, dynamic>;
      _apply(p);
      _title = (p['project'] as Map)['title'] as String;
      _assets = (p['assets'] as List).cast<Map<String, dynamic>>();
      if (!kIsWeb) {
        for (final a in _assets) {
          final f = await LocalMedia.find(widget.projectId, a['id'] as String);
          if (f != null) _local[a['id'] as String] = f;
        }
      }
      if (mounted) setState(() {});
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  void _apply(Map<String, dynamic> s) {
    setState(() {
      _timeline = s['timeline'] as Map<String, dynamic>;
      _canUndo = s['canUndo'] == true;
      _canRedo = s['canRedo'] == true;
    });
  }

  Future<void> _ops(List<Map<String, dynamic>> ops, [String? done]) async {
    setState(() => _saving = true);
    try {
      final s = await Api.instance.call('POST', '/projects/${widget.projectId}/timeline/operations', {'expectedVersion': _version, 'operations': ops}) as Map<String, dynamic>;
      _apply(s);
      if (done != null) _toast(done);
    } on ApiException catch (e) {
      _toast(e.message, error: true);
      if (e.status == 409) _load();
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _history(String which) async {
    try {
      _apply(await Api.instance.call('POST', '/projects/${widget.projectId}/timeline/$which') as Map<String, dynamic>);
    } on ApiException catch (e) {
      _toast(e.message, error: true);
    }
  }

  void _toast(String m, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m), backgroundColor: error ? const Color(0xFF3A1A16) : CM.surface2, behavior: SnackBarBehavior.floating));
  }

  // ---------- media on this phone ----------
  Future<void> _addMedia() async {
    if (kIsWeb) return _toast('Open the CineMind phone app to add media from this device.', error: true);
    final files = await FilePicker.pickFiles(type: FileType.media);
    for (final pf in files) {
      final path = pf.path;
      if (path == null) continue;
      final kind = LocalMedia.kindOf(path);
      if (kind == null) {
        _toast('${pf.name}: unsupported file', error: true);
        continue;
      }
      try {
        final file = File(path);
        final probe = await LocalMedia.probe(file, kind);
        final fp = await LocalMedia.fingerprint(file);
        final a = await Api.instance.call('POST', '/projects/${widget.projectId}/media/register', {
          'name': pf.name,
          'kind': kind,
          'mimeType': LocalMedia.mimeOf(path),
          'sizeBytes': await file.length(),
          'fingerprint': fp,
          'durationFrames': math.max(1, (probe.seconds * fps).round()),
          'width': probe.width,
          'height': probe.height,
          'hasAudio': kind != 'image',
        }) as Map<String, dynamic>;
        _local[a['id'] as String] = await LocalMedia.store(widget.projectId, a['id'] as String, file);
        setState(() => _assets = [a, ..._assets.where((x) => x['id'] != a['id'])]);
        _toast('${pf.name} added — stored on this phone');
      } catch (e) {
        _toast('${pf.name}: $e', error: true);
      }
    }
  }

  Future<void> _relink(Map<String, dynamic> a) async {
    final res = await FilePicker.pickFiles(type: FileType.media);
    final path = res.isEmpty ? null : res.first.path;
    if (path == null) return;
    final fp = await LocalMedia.fingerprint(File(path));
    if (a['fingerprint'] != null && a['fingerprint'] != fp) return _toast('That is not the same file as “${a['name']}”.', error: true);
    _local[a['id'] as String] = await LocalMedia.store(widget.projectId, a['id'] as String, File(path));
    setState(() {});
    _toast('Relinked ${a['name']}');
  }

  void _insert(Map<String, dynamic> a) {
    if (!_local.containsKey(a['id'])) {
      _toast('This media is not on this phone. Relink the original file before editing it.', error: true);
      return;
    }
    final kind = a['kind'] as String;
    final track = _tracks.where((t) => t['kind'] == (kind == 'audio' ? 'audio' : 'video') && t['locked'] != true).toList()
      ..sort((x, y) => (x['order'] as int).compareTo(y['order'] as int));
    if (track.isEmpty) return;
    final end = (track.first['clips'] as List).fold<int>(0, (m, c) => math.max(m, _end(c as Map<String, dynamic>)));
    _ops([
      {'type': 'clip.insert', 'assetId': a['id'], 'trackId': track.first['id'], 'timelineStartFrames': end},
    ], 'Added ${a['name']}');
  }

  static int _end(Map<String, dynamic> c) => (c['timelineStartFrames'] as int) + (c['sourceOutFrames'] as int) - (c['sourceInFrames'] as int);

  Map<String, dynamic>? _clipById(String? id) {
    for (final t in _tracks) {
      for (final c in (t['clips'] as List).cast<Map<String, dynamic>>()) {
        if (c['id'] == id) return c;
      }
    }
    return null;
  }

  int get _duration => _tracks.fold<int>(0, (m, t) => (t['clips'] as List).fold<int>(m, (mm, c) => math.max(mm, _end(c as Map<String, dynamic>))));

  Future<void> _showClipProperties(Map<String, dynamic> clip) async {
    final current = (clip['transform'] as Map?) ?? const {};
    var x = ((current['x'] ?? 0) as num).toDouble();
    var y = ((current['y'] ?? 0) as num).toDouble();
    var scale = ((current['scaleX'] ?? 1) as num).toDouble();
    var opacity = ((current['opacity'] ?? 1) as num).toDouble();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: CM.surface,
      builder: (sheetContext) => StatefulBuilder(builder: (context, setSheetState) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, 16 + MediaQuery.of(context).viewInsets.bottom),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(clip['label'] as String? ?? 'Clip properties', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text('Scale · ${(scale * 100).round()}%', style: const TextStyle(color: CM.soft)),
            Slider(value: scale.clamp(.5, 3).toDouble(), min: .5, max: 3, onChanged: (v) => setSheetState(() => scale = v)),
            Text('Position X · ${x.round()} px', style: const TextStyle(color: CM.soft)),
            Slider(value: x.clamp(-960, 960).toDouble(), min: -960, max: 960, onChanged: (v) => setSheetState(() => x = v)),
            Text('Position Y · ${y.round()} px', style: const TextStyle(color: CM.soft)),
            Slider(value: y.clamp(-960, 960).toDouble(), min: -960, max: 960, onChanged: (v) => setSheetState(() => y = v)),
            Text('Opacity · ${(opacity * 100).round()}%', style: const TextStyle(color: CM.soft)),
            Slider(value: opacity.clamp(0, 1).toDouble(), min: 0, max: 1, onChanged: (v) => setSheetState(() => opacity = v)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(sheetContext), child: const Text('Cancel'))),
              const SizedBox(width: 10),
              Expanded(child: FilledButton(onPressed: () {
                Navigator.pop(sheetContext);
                _ops([{'type': 'clip.setTransform', 'clipId': clip['id'], 'transform': {'x': x.round(), 'y': y.round(), 'scaleX': scale, 'scaleY': scale, 'opacity': opacity}}], 'Clip framing updated');
              }, child: const Text('Apply'))),
            ]),
          ]),
        ),
      )),
    );
  }

  @override
  Widget build(BuildContext context) {
    final seq = (_timeline?['sequence'] ?? const {'width': 1920, 'height': 1080}) as Map;
    final w = (seq['width'] as num).toDouble();
    final h = (seq['height'] as num).toDouble();
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            Text(_saving ? 'Saving…' : 'Saved · v$_version', style: const TextStyle(fontSize: 11, color: CM.muted)),
          ]),
          actions: [
            IconButton(tooltip: 'Undo', onPressed: _canUndo ? () => _history('undo') : null, icon: const Icon(Icons.undo)),
            IconButton(tooltip: 'Redo', onPressed: _canRedo ? () => _history('redo') : null, icon: const Icon(Icons.redo)),
            PopupMenuButton<String>(
              tooltip: 'Frame',
              icon: const Icon(Icons.aspect_ratio),
              onSelected: (v) {
                const sizes = {'16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080], '4:5': [1080, 1350]};
                _ops([
                  {'type': 'sequence.update', 'width': sizes[v]![0], 'height': sizes[v]![1]},
                ], 'Frame changed to $v');
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: '9:16', child: Text('9:16 · TikTok, Reels, Status')),
                PopupMenuItem(value: '16:9', child: Text('16:9 · YouTube')),
                PopupMenuItem(value: '1:1', child: Text('1:1 · Square')),
                PopupMenuItem(value: '4:5', child: Text('4:5 · Portrait')),
              ],
            ),
          ],
          bottom: const TabBar(
            indicatorColor: CM.accent,
            labelColor: CM.text,
            unselectedLabelColor: CM.muted,
            tabs: [Tab(text: 'Edit'), Tab(text: 'Media'), Tab(text: 'Cine')],
          ),
        ),
        body: _error != null
            ? Center(child: Text(_error!, style: const TextStyle(color: CM.danger)))
            : _timeline == null
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(children: [_editTab(w, h), _mediaTab(), CineTab(projectId: widget.projectId, playheadSec: _playhead / fps, selectedClipId: _selected, version: _version, onApplied: _apply)]),
      ),
    );
  }

  // ---------- Edit tab ----------
  Widget _editTab(double w, double h) {
    final sel = _clipById(_selected);
    final atPlayhead = _tracks.where((t) => t['kind'] == 'video' && t['hidden'] != true).expand((t) => (t['clips'] as List).cast<Map<String, dynamic>>()).where((c) => _playhead >= (c['timelineStartFrames'] as int) && _playhead < _end(c)).toList();
    final shown = atPlayhead.isEmpty ? null : atPlayhead.first;
    final file = shown != null ? _local[shown['assetId']] : null;
    return Column(children: [
      Expanded(
        child: Container(
          color: CM.bgDeep,
          alignment: Alignment.center,
          padding: const EdgeInsets.all(12),
          child: AspectRatio(
            aspectRatio: w / h,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Container(
                color: Colors.black,
                child: shown == null
                    ? const Center(child: Text('No video at playhead', style: TextStyle(color: CM.muted)))
                    : file != null
                        ? _ClipPreview(key: ValueKey('${shown['id']}-${shown['assetId']}'), file: file, sourceSec: ((shown['sourceInFrames'] as int) + _playhead - (shown['timelineStartFrames'] as int)) / fps, fill: (shown['transform'] as Map?)?['fit'] == 'fill')
                        : Center(child: Text('“${shown['label'] ?? 'Clip'}” is not on this phone', style: const TextStyle(color: CM.muted), textAlign: TextAlign.center)),
              ),
            ),
          ),
        ),
      ),
      Container(
        color: CM.surface,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(children: [
          Text(_tc(_playhead), style: const TextStyle(fontFamily: 'monospace', color: CM.accent, fontSize: 12)),
          const Spacer(),
          IconButton(
            tooltip: 'Split at playhead',
            icon: const Icon(Icons.content_cut, size: 20),
            onPressed: sel != null && _playhead > (sel['timelineStartFrames'] as int) && _playhead < _end(sel) ? () => _ops([{'type': 'clip.split', 'clipId': sel['id'], 'atTimelineFrame': _playhead}], 'Split') : null,
          ),
          IconButton(
            tooltip: 'Delete clip',
            icon: const Icon(Icons.delete_outline, size: 20),
            onPressed: sel != null
                ? () {
                    _ops([{'type': 'clip.delete', 'clipId': sel['id']}], 'Deleted');
                    setState(() => _selected = null);
                  }
                : null,
          ),
          IconButton(
            tooltip: 'Fill frame',
            icon: const Icon(Icons.crop_free, size: 20),
            onPressed: sel != null && sel['assetId'] != null
                ? () => _ops([
                      {
                        'type': 'clip.setTransform',
                        'clipId': sel['id'],
                        'transform': {'fit': (sel['transform'] as Map?)?['fit'] == 'fill' ? 'fit' : 'fill'},
                      }
                    ], 'Frame fit changed')
                : null,
          ),
          IconButton(
            tooltip: 'Frame, scale and opacity',
            icon: const Icon(Icons.tune, size: 20),
            onPressed: sel != null ? () => _showClipProperties(sel) : null,
          ),
          if (sel?['assetId'] != null)
            PopupMenuButton<String>(
              tooltip: 'Colour look',
              icon: const Icon(Icons.color_lens_outlined, size: 20),
              onSelected: (look) => _ops([{'type': 'clip.setEffects', 'clipId': sel!['id'], 'fx': {'look': look}}], '$look look applied'),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'none', child: Text('Original')),
                PopupMenuItem(value: 'cinematic', child: Text('Cinematic')),
                PopupMenuItem(value: 'warm', child: Text('Warm')),
                PopupMenuItem(value: 'cool', child: Text('Cool')),
                PopupMenuItem(value: 'vintage', child: Text('Vintage')),
                PopupMenuItem(value: 'bw', child: Text('Black & white')),
              ],
            ),
        ]),
      ),
      SizedBox(
        height: 200,
        child: _TimelineView(
          tracks: _tracks,
          duration: math.max(_duration, 10 * fps),
          playhead: _playhead,
          selected: _selected,
          onPlayhead: (f) => setState(() => _playhead = f),
          onSelect: (id) => setState(() => _selected = id),
        ),
      ),
    ]);
  }

  // ---------- Media tab ----------
  Widget _mediaTab() {
    return ListView(padding: const EdgeInsets.all(16), children: [
      PrimaryButton(label: 'Add from this phone', icon: Icons.add_photo_alternate_outlined, onPressed: _addMedia),
      const SizedBox(height: 8),
      const Text('Your videos stay on this phone. Only the edit syncs to your account.', style: TextStyle(color: CM.muted, fontSize: 12), textAlign: TextAlign.center),
      const SizedBox(height: 16),
      if (_assets.isEmpty) const Text('No media yet.', style: TextStyle(color: CM.muted)),
      for (final a in _assets)
        Card(
          color: CM.surface,
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: CM.line)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: a['kind'] == 'audio' ? CM.clipAudio : CM.clipVideo,
              child: Icon(a['kind'] == 'audio' ? Icons.music_note : a['kind'] == 'image' ? Icons.image_outlined : Icons.movie_outlined, color: CM.text, size: 20),
            ),
            title: Text(a['name'] as String, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(
              [
                if (a['durationFrames'] != null) '${((a['durationFrames'] as int) / fps).toStringAsFixed(0)}s',
                if ((a['analysis'] as Map?)?['bpm'] != null) '${((a['analysis'] as Map)['bpm'] as num).round()} BPM',
                _local.containsKey(a['id']) ? 'on this phone' : 'not on this phone',
              ].join(' · '),
              style: TextStyle(color: _local.containsKey(a['id']) ? CM.muted : CM.sun, fontSize: 12),
            ),
            trailing: _local.containsKey(a['id'])
                ? IconButton(tooltip: 'Add to timeline', icon: const Icon(Icons.add_circle_outline, color: CM.accent), onPressed: () => _insert(a))
                : TextButton(onPressed: kIsWeb ? null : () => _relink(a), child: const Text('Relink')),
          ),
        ),
    ]);
  }

  static String _tc(int f) {
    final s = f ~/ fps;
    String p(int n) => n.toString().padLeft(2, '0');
    return '${p(s ~/ 60)}:${p(s % 60)}:${p(f % fps)}';
  }
}

/// Plays the clip under the playhead from the file on this phone.
class _ClipPreview extends StatefulWidget {
  const _ClipPreview({super.key, required this.file, required this.sourceSec, required this.fill});
  final File file;
  final double sourceSec;
  final bool fill;
  @override
  State<_ClipPreview> createState() => _ClipPreviewState();
}

class _ClipPreviewState extends State<_ClipPreview> {
  late final VideoPlayerController _c = VideoPlayerController.file(widget.file);
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _c.initialize().then((_) async {
      await _c.seekTo(Duration(milliseconds: (widget.sourceSec * 1000).round()));
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  void didUpdateWidget(covariant _ClipPreview old) {
    super.didUpdateWidget(old);
    if (_ready && !_c.value.isPlaying && (old.sourceSec - widget.sourceSec).abs() > .05) {
      _c.seekTo(Duration(milliseconds: (widget.sourceSec * 1000).round()));
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) return const Center(child: CircularProgressIndicator());
    return GestureDetector(
      onTap: () => setState(() => _c.value.isPlaying ? _c.pause() : _c.play()),
      child: Stack(fit: StackFit.expand, children: [
        FittedBox(fit: widget.fill ? BoxFit.cover : BoxFit.contain, clipBehavior: Clip.hardEdge, child: SizedBox(width: _c.value.size.width, height: _c.value.size.height, child: VideoPlayer(_c))),
        if (!_c.value.isPlaying) const Center(child: Icon(Icons.play_circle_fill, size: 56, color: Colors.white70)),
      ]),
    );
  }
}

/// Scrollable multitrack view; tap a clip to select, tap the ruler to move the playhead.
class _TimelineView extends StatelessWidget {
  const _TimelineView({required this.tracks, required this.duration, required this.playhead, required this.selected, required this.onPlayhead, required this.onSelect});
  final List<Map<String, dynamic>> tracks;
  final int duration;
  final int playhead;
  final String? selected;
  final ValueChanged<int> onPlayhead;
  final ValueChanged<String?> onSelect;

  static const pxPerFrame = 2.0;

  @override
  Widget build(BuildContext context) {
    final ordered = [...tracks]..sort((a, b) {
        const o = {'video': 0, 'text': 1, 'audio': 2};
        final k = o[a['kind']]!.compareTo(o[b['kind']]!);
        return k != 0 ? k : (a['kind'] == 'audio' ? (a['order'] as int).compareTo(b['order'] as int) : (b['order'] as int).compareTo(a['order'] as int));
      });
    final width = (duration + 5 * fps) * pxPerFrame;
    return Container(
      color: const Color(0xFF071A20),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SizedBox(
          width: width,
          child: Stack(children: [
            Column(children: [
              GestureDetector(
                onTapDown: (d) => onPlayhead((d.localPosition.dx / pxPerFrame).round()),
                onHorizontalDragUpdate: (d) => onPlayhead(math.max(0, (d.localPosition.dx / pxPerFrame).round())),
                child: Container(
                  height: 22,
                  color: CM.surface,
                  child: Stack(children: [
                    for (var s = 0; s * fps * pxPerFrame < width; s += 5)
                      Positioned(left: s * fps * pxPerFrame, top: 0, bottom: 0, child: Container(padding: const EdgeInsets.only(left: 3), decoration: const BoxDecoration(border: Border(left: BorderSide(color: CM.line))), child: Text('${s ~/ 60}:${(s % 60).toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 9, color: CM.muted)))),
                  ]),
                ),
              ),
              for (final t in ordered)
                SizedBox(
                  height: t['kind'] == 'text' ? 26 : 38,
                  child: Stack(children: [
                    Positioned.fill(child: Container(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: CM.line))))),
                    for (final c in (t['clips'] as List).cast<Map<String, dynamic>>())
                      Positioned(
                        left: (c['timelineStartFrames'] as int) * pxPerFrame,
                        width: math.max(4, ((c['sourceOutFrames'] as int) - (c['sourceInFrames'] as int)) * pxPerFrame),
                        top: 3,
                        bottom: 3,
                        child: GestureDetector(
                          onTap: () => onSelect(selected == c['id'] ? null : c['id'] as String),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            alignment: Alignment.centerLeft,
                            decoration: BoxDecoration(
                              color: t['kind'] == 'video' ? CM.clipVideo : t['kind'] == 'audio' ? CM.clipAudio : CM.clipText,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: selected == c['id'] ? CM.accent : Colors.white12, width: selected == c['id'] ? 2 : 1),
                            ),
                            child: Text((c['label'] ?? c['text'] ?? '') as String, maxLines: 1, overflow: TextOverflow.clip, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ),
                  ]),
                ),
            ]),
            Positioned(left: playhead * pxPerFrame, top: 0, bottom: 0, child: IgnorePointer(child: Container(width: 2, color: CM.sun))),
          ]),
        ),
      ),
    );
  }
}

/// Chat with Cine; proposals are applied only when approved.
class CineTab extends StatefulWidget {
  const CineTab({super.key, required this.projectId, required this.playheadSec, required this.selectedClipId, required this.version, required this.onApplied});
  final String projectId;
  final double playheadSec;
  final String? selectedClipId;
  final int version;
  final ValueChanged<Map<String, dynamic>> onApplied;
  @override
  State<CineTab> createState() => _CineTabState();
}

class _CineTabState extends State<CineTab> with AutomaticKeepAliveClientMixin {
  final _input = TextEditingController();
  final List<Map<String, dynamic>> _msgs = [
    {'role': 'cine', 'text': 'Habari! Niambie edit unayotaka — kwa Kiswahili au Kiingereza. Nitapendekeza mabadiliko, nawe utaidhinisha.'},
  ];
  bool _thinking = false;
  String _provider = 'anthropic';

  @override
  bool get wantKeepAlive => true;

  Future<void> _send(String text) async {
    final t = text.trim();
    if (t.isEmpty || _thinking) return;
    setState(() {
      _msgs.add({'role': 'user', 'text': t});
      _thinking = true;
      _input.clear();
    });
    try {
      final r = await Api.instance.call('POST', '/projects/${widget.projectId}/ai/chat', {'message': t, 'provider': _provider, 'selectedClipId': widget.selectedClipId, 'playheadSec': widget.playheadSec}) as Map<String, dynamic>;
      setState(() => _msgs.add({'role': 'cine', 'text': r['reply'], 'proposal': r, 'status': (r['operations'] as List).isEmpty ? 'none' : 'proposed'}));
    } on ApiException catch (e) {
      setState(() => _msgs.add({'role': 'cine', 'text': 'Cine could not complete that request. No edit was applied and your video stayed on this phone. ${e.message}', 'retryPrompt': t, 'status': 'failed'}));
    } finally {
      setState(() => _thinking = false);
    }
  }

  Future<void> _decide(Map<String, dynamic> m, bool approve) async {
    final id = (m['proposal'] as Map)['id'];
    try {
      if (approve) {
        final s = await Api.instance.call('POST', '/projects/${widget.projectId}/ai/operations/$id/approve') as Map<String, dynamic>;
        widget.onApplied(s);
        setState(() => m['status'] = 'applied');
      } else {
        await Api.instance.call('POST', '/projects/${widget.projectId}/ai/operations/$id/reject');
        setState(() => m['status'] = 'rejected');
      }
    } on ApiException catch (e) {
      setState(() {
        m['status'] = 'failed';
        m['text'] = '${m['text']}\n${e.message}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    const suggestions = ['Kata video kwenye beat, kila beat 2', 'Ondoa ukimya kwenye clip ya kwanza', 'Fade out the audio over 3 seconds', 'Add a title "Bongo Nights"'];
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
        child: SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'anthropic', label: Text('Claude')), ButtonSegment(value: 'openai', label: Text('OpenAI')), ButtonSegment(value: 'google', label: Text('Gemini'))],
          selected: {_provider},
          onSelectionChanged: (s) => setState(() => _provider = s.first),
        ),
      ),
      Expanded(
        child: ListView(padding: const EdgeInsets.all(16), children: [
          for (final m in _msgs) m['role'] == 'user' ? _userBubble(m['text'] as String) : _cineBubble(m),
          if (_thinking) const Padding(padding: EdgeInsets.all(8), child: Text('Cine is reading the timeline…', style: TextStyle(color: CM.accent))),
        ]),
      ),
      SizedBox(
        height: 40,
        child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12), children: [
          for (final s in suggestions) Padding(padding: const EdgeInsets.only(right: 6), child: ActionChip(label: Text(s, style: const TextStyle(fontSize: 12)), onPressed: () => _send(s))),
        ]),
      ),
      SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 12),
          child: Row(children: [
            Expanded(child: TextField(controller: _input, minLines: 1, maxLines: 4, decoration: const InputDecoration(hintText: 'Eleza uhariri… / Describe the edit…'), onSubmitted: _send)),
            const SizedBox(width: 8),
            IconButton.filled(onPressed: () => _send(_input.text), icon: const Icon(Icons.arrow_upward)),
          ]),
        ),
      ),
    ]);
  }

  Widget _userBubble(String t) => Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12, left: 40),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: CM.accent.withValues(alpha: .16), borderRadius: BorderRadius.circular(14)),
          child: Text(t),
        ),
      );

  Widget _cineBubble(Map<String, dynamic> m) {
    final p = m['proposal'] as Map<String, dynamic>?;
    final descs = ((p?['descriptions'] ?? const []) as List).cast<String>();
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('✦ Cine', style: TextStyle(color: CM.accent, fontWeight: FontWeight.w700, fontSize: 12)),
        const SizedBox(height: 4),
        Text(m['text'] as String, style: const TextStyle(color: CM.soft)),
        if (descs.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: CM.bgDeep, borderRadius: BorderRadius.circular(12), border: Border.all(color: CM.line)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              for (var i = 0; i < math.min(descs.length, 8); i++) Text('${i + 1}. ${descs[i]}', style: const TextStyle(fontSize: 12, color: CM.soft)),
              if (descs.length > 8) Text('+ ${descs.length - 8} more', style: const TextStyle(fontSize: 12, color: CM.muted)),
              const SizedBox(height: 10),
              if (m['status'] == 'proposed')
                Row(children: [
                  Expanded(child: PrimaryButton(label: 'Approve', icon: Icons.check, onPressed: () => _decide(m, true))),
                  const SizedBox(width: 8),
                  OutlinedButton(onPressed: () => _decide(m, false), child: const Text('Reject')),
                ])
              else
                Text((m['status'] as String).toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: m['status'] == 'applied' ? CM.greenText : CM.muted)),
            ]),
          ),
        if (m['retryPrompt'] is String)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _thinking ? null : () => _send(m['retryPrompt'] as String),
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Try again'),
            ),
          ),
      ]),
    );
  }
}
