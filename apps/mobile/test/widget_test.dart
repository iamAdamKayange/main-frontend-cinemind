import 'package:flutter_test/flutter_test.dart';
import 'package:cinemind_mobile/screens/login_screen.dart';
import 'package:cinemind_mobile/theme.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('Login screen has social buttons and a password eye toggle', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: CM.theme(), home: const LoginScreen()));
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Continue with Facebook'), findsOneWidget);
    expect(find.byTooltip('Show password'), findsOneWidget);
    await tester.tap(find.byTooltip('Show password'));
    await tester.pump();
    expect(find.byTooltip('Hide password'), findsOneWidget);
  });
}
