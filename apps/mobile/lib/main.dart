import 'dart:async';
import 'dart:convert';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';

import 'api.dart';
import 'screens/login_screen.dart';
import 'screens/projects_screen.dart';
import 'theme.dart';

/// CineMind AI mobile (Android & iOS). Same account, projects, timeline and Cine as the
/// website and desktop app; media stays on this phone.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.instance.restore();
  runApp(const CineMindApp());
}

class CineMindApp extends StatefulWidget {
  const CineMindApp({super.key});
  @override
  State<CineMindApp> createState() => _CineMindAppState();
}

class _CineMindAppState extends State<CineMindApp> {
  final _nav = GlobalKey<NavigatorState>();
  StreamSubscription<Uri>? _links;
  String? _lastAuthLink;

  @override
  void initState() {
    super.initState();
    // Google / Facebook sign-in returns to cinemind://auth#token=…&user=…
    if (!kIsWeb) {
      final appLinks = AppLinks();
      _links = appLinks.uriLinkStream.listen(_onLink, onError: (_) {});
      appLinks.getInitialLink().then((uri) {
        if (uri != null) _onLink(uri);
      }).catchError((_) {});
    }
  }

  Future<void> _onLink(Uri uri) async {
    if (uri.scheme != 'cinemind' || uri.host != 'auth' || uri.path.isNotEmpty || uri.hasQuery) return;
    if (_lastAuthLink == uri.toString()) return;
    _lastAuthLink = uri.toString();
    final f = Uri.splitQueryString(uri.fragment);
    final token = f['token'];
    final user = f['user'];
    if (token == null || user == null) {
      final context = _nav.currentContext;
      if (context != null) ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(f['error'] ?? 'Sign-in failed.')));
      return;
    }
    try {
      final json = utf8.decode(base64Url.decode(base64Url.normalize(user)));
      await Api.instance.setSession(token, User.fromJson(jsonDecode(json) as Map<String, dynamic>));
      _nav.currentState?.pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const ProjectsScreen()), (_) => false);
    } catch (_) {
      final context = _nav.currentContext;
      if (context != null) ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('Sign-in response was invalid. Please try again.')));
    }
  }

  @override
  void dispose() {
    _links?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'CineMind AI',
        navigatorKey: _nav,
        debugShowCheckedModeBanner: false,
        theme: CM.theme(),
        home: Api.instance.signedIn ? const ProjectsScreen() : const LoginScreen(),
      );
}
