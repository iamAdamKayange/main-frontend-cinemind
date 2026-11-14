import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../theme.dart';
import 'projects_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _signup = false;
  bool _busy = false;
  bool _showPassword = false;
  String? _error;
  Map<String, bool> _social = const {'google': false, 'facebook': false};
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void initState() {
    super.initState();
    Api.instance.socialProviders().then((s) => mounted ? setState(() => _social = s) : null);
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_signup) {
        await Api.instance.register(_name.text.trim(), _email.text.trim(), _password.text);
      } else {
        await Api.instance.login(_email.text.trim(), _password.text);
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const ProjectsScreen()));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _oauth(String provider) async {
    final ok = await launchUrl(Api.instance.oauthStart(provider), mode: LaunchMode.externalApplication);
    if (!ok && mounted) setState(() => _error = 'Could not open the browser.');
  }

  Widget _socialButton(String provider, String label, IconData icon, Color color) {
    final enabled = _social[provider] == true;
    return Opacity(
      opacity: enabled ? 1 : .45,
      child: OutlinedButton.icon(
        onPressed: enabled ? () => _oauth(provider) : null,
        icon: Icon(icon, color: color, size: 20),
        label: Text(label, style: const TextStyle(color: CM.text, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          side: const BorderSide(color: Color(0x2B8CDCE6)),
          shape: const StadiumBorder(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 32),
          children: [
            Row(children: [
              const _LogoMark(),
              const SizedBox(width: 10),
              RichText(text: const TextSpan(style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700), children: [TextSpan(text: 'Cine'), TextSpan(text: 'Mind', style: TextStyle(color: CM.accent))])),
            ]),
            const SizedBox(height: 48),
            Text(_signup ? 'Anza kuunda.' : 'Karibu tena.', style: const TextStyle(fontSize: 38, height: 1, fontWeight: FontWeight.w700, letterSpacing: -1.5)),
            const SizedBox(height: 8),
            Text(_signup ? 'Free account. Same projects on web, desktop and phone.' : 'Sign in to continue your projects.', style: const TextStyle(color: CM.soft)),
            const SizedBox(height: 28),
            _socialButton('google', 'Continue with Google', Icons.g_mobiledata, const Color(0xFF4285F4)),
            const SizedBox(height: 10),
            _socialButton('facebook', 'Continue with Facebook', Icons.facebook, const Color(0xFF1877F2)),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 22),
              child: Row(children: [Expanded(child: Divider()), Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('or with email', style: TextStyle(color: CM.muted, fontSize: 12))), Expanded(child: Divider())]),
            ),
            if (_signup) ...[
              TextField(controller: _name, decoration: const InputDecoration(labelText: 'Name'), textInputAction: TextInputAction.next),
              const SizedBox(height: 12),
            ],
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], textInputAction: TextInputAction.next),
            const SizedBox(height: 12),
            TextField(
              controller: _password,
              obscureText: !_showPassword,
              autofillHints: [_signup ? AutofillHints.newPassword : AutofillHints.password],
              onSubmitted: (_) => _submit(),
              decoration: InputDecoration(
                labelText: 'Password',
                helperText: _signup ? 'At least 8 characters' : null,
                suffixIcon: IconButton(
                  tooltip: _showPassword ? 'Hide password' : 'Show password',
                  icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: CM.muted),
                  onPressed: () => setState(() => _showPassword = !_showPassword),
                ),
              ),
            ),
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(top: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: CM.danger.withValues(alpha: .1), borderRadius: BorderRadius.circular(12), border: Border.all(color: CM.danger.withValues(alpha: .4))),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFFFB3A8), fontSize: 13)),
              ),
            const SizedBox(height: 20),
            PrimaryButton(label: _signup ? 'Create account' : 'Sign in', icon: Icons.arrow_forward, busy: _busy, onPressed: _submit),
            const SizedBox(height: 18),
            TextButton(
              onPressed: () => setState(() {
                _signup = !_signup;
                _error = null;
              }),
              child: Text(_signup ? 'Already have an account? Sign in' : 'New to CineMind? Create an account', style: const TextStyle(color: CM.accent)),
            ),
            const SizedBox(height: 24),
            const TzStripe(),
          ],
        ),
      ),
    );
  }
}

class _LogoMark extends StatelessWidget {
  const _LogoMark();
  @override
  Widget build(BuildContext context) => ClipOval(
        child: SizedBox(
          width: 30,
          height: 30,
          child: Stack(children: [
            Positioned.fill(child: Transform.rotate(angle: .785, child: const TzStripe(height: 30))),
            const Center(child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20)),
          ]),
        ),
      );
}
