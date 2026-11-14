import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../theme.dart';
import 'login_screen.dart';
import 'project_screen.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});
  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  List<Map<String, dynamic>>? _items;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await Api.instance.call('GET', '/projects') as Map<String, dynamic>;
      setState(() {
        _items = (r['items'] as List).cast<Map<String, dynamic>>();
        _error = null;
      });
    } on ApiException catch (e) {
      if (e.status == 401) return _toLogin();
      setState(() => _error = e.message);
    }
  }

  void _toLogin() => Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);

  Future<void> _create() async {
    final title = TextEditingController();
    String aspect = '9:16';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: CM.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('New project', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            TextField(controller: title, autofocus: true, decoration: const InputDecoration(labelText: 'Project name', hintText: 'e.g. Bongo Nights')),
            const SizedBox(height: 16),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '9:16', label: Text('Vertical')),
                ButtonSegment(value: '16:9', label: Text('Landscape')),
                ButtonSegment(value: '1:1', label: Text('Square')),
              ],
              selected: {aspect},
              onSelectionChanged: (s) => set(() => aspect = s.first),
            ),
            const SizedBox(height: 20),
            PrimaryButton(label: 'Create', icon: Icons.arrow_forward, onPressed: () => Navigator.pop(ctx, true)),
          ]),
        ),
      ),
    );
    if (ok != true) return;
    try {
      final r = await Api.instance.call('POST', '/projects', {'title': title.text.trim().isEmpty ? 'Untitled project' : title.text.trim(), 'aspect': aspect}) as Map<String, dynamic>;
      if (!mounted) return;
      await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProjectScreen(projectId: r['id'] as String)));
      _load();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: RichText(text: const TextSpan(style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700), children: [TextSpan(text: 'Cine'), TextSpan(text: 'Mind', style: TextStyle(color: CM.accent))])),
        actions: [
          IconButton(
            tooltip: 'Sign out',
            icon: const Icon(Icons.logout, color: CM.muted),
            onPressed: () async {
              await Api.instance.signOut();
              _toLogin();
            },
          ),
        ],
        bottom: const PreferredSize(preferredSize: Size.fromHeight(2), child: TzStripe(height: 2)),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        backgroundColor: CM.accent,
        foregroundColor: const Color(0xFF02121B),
        icon: const Icon(Icons.add),
        label: const Text('New project', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
          children: [
            const Text('YOUR PROJECTS', style: TextStyle(color: CM.muted, fontSize: 11, letterSpacing: 1.6)),
            const SizedBox(height: 8),
            const Text('Endelea ulipoishia.', style: TextStyle(fontSize: 32, height: 1.05, fontWeight: FontWeight.w700, letterSpacing: -1.2)),
            const SizedBox(height: 20),
            if (_error != null) Text(_error!, style: const TextStyle(color: CM.danger)),
            if (_items == null && _error == null) const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
            if (_items != null && _items!.isEmpty) const Text('No projects yet — tap “New project”.', style: TextStyle(color: CM.muted)),
            for (final p in _items ?? const <Map<String, dynamic>>[]) _ProjectCard(p: p, onOpen: () async {
              await Navigator.of(context).push(MaterialPageRoute(builder: (_) => ProjectScreen(projectId: p['id'] as String)));
              _load();
            }),
          ],
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.p, required this.onOpen});
  final Map<String, dynamic> p;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) {
    final updated = DateTime.tryParse(p['updatedAt'] as String? ?? '')?.toLocal();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: CM.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: CM.line)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), gradient: const LinearGradient(colors: [CM.clipVideo, CM.green], begin: Alignment.topLeft, end: Alignment.bottomRight)),
              child: Center(child: Text(p['aspect'] as String? ?? '', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(p['title'] as String, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text('${p['assetCount']} media · v${p['version']}${updated != null ? ' · ${updated.day}/${updated.month} ${updated.hour.toString().padLeft(2, '0')}:${updated.minute.toString().padLeft(2, '0')}' : ''}', style: const TextStyle(color: CM.muted, fontSize: 12)),
              ]),
            ),
            const Icon(Icons.chevron_right, color: CM.muted),
          ]),
        ),
      ),
    );
  }
}
