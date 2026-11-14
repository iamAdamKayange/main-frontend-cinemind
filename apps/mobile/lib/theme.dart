import 'package:material_ui/material_ui.dart';

/// "Bahari usiku" — Indian-Ocean night with the Tanzanian flag colours as accents.
class CM {
  static const bg = Color(0xFF061317);
  static const bgDeep = Color(0xFF030B0E);
  static const surface = Color(0xFF0A1C22);
  static const surface2 = Color(0xFF0F252C);
  static const line = Color(0x178CDCE6);
  static const text = Color(0xFFEFFAF8);
  static const soft = Color(0xFFCFE3E0);
  static const muted = Color(0xFF87A5A6);
  static const accent = Color(0xFF29BDF0);
  static const accentStrong = Color(0xFF00A3DD);
  static const green = Color(0xFF1EB53A);
  static const greenText = Color(0xFF45D363);
  static const sun = Color(0xFFFCD116);
  static const danger = Color(0xFFFF6B57);
  static const clipVideo = Color(0xFF0F5A76);
  static const clipAudio = Color(0xFF17652F);
  static const clipText = Color(0xFF7D6206);

  static ThemeData theme() => ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(primary: accent, onPrimary: Color(0xFF02121B), secondary: green, surface: surface, onSurface: text, error: danger),
        dividerColor: line,
        appBarTheme: const AppBarTheme(backgroundColor: bg, elevation: 0, scrolledUnderElevation: 0),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0x2B8CDCE6))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: accent, width: 1.5)),
          labelStyle: const TextStyle(color: muted),
        ),
      );
}

/// The diagonal band of the Tanzanian flag, used as the brand stripe.
class TzStripe extends StatelessWidget {
  const TzStripe({super.key, this.height = 3});
  final double height;
  @override
  Widget build(BuildContext context) => Container(
        height: height,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [CM.green, CM.green, CM.sun, CM.sun, Color(0xFF050505), Color(0xFF050505), CM.sun, CM.sun, CM.accentStrong, CM.accentStrong],
            stops: [0, .38, .38, .43, .43, .57, .57, .62, .62, 1],
          ),
        ),
      );
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({super.key, required this.label, required this.onPressed, this.icon, this.busy = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;
  @override
  Widget build(BuildContext context) => Opacity(
        opacity: onPressed == null ? .45 : 1,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: busy ? null : onPressed,
            child: Ink(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), gradient: const LinearGradient(colors: [CM.green, Color(0xFF14AE8A), CM.accentStrong])),
              child: Row(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
                if (busy) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF02121B))) else if (icon != null) Icon(icon, size: 18, color: const Color(0xFF02121B)),
                if (icon != null || busy) const SizedBox(width: 8),
                Text(label, style: const TextStyle(color: Color(0xFF02121B), fontWeight: FontWeight.w700)),
              ]),
            ),
          ),
        ),
      );
}
