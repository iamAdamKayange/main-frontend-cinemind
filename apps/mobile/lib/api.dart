import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Base URL of the CineMind API. Override at build time:
///   flutter run --dart-define=API_URL=https://cinemind-api.46-62-239-174.sslip.io
/// (Android emulator → host machine is http://10.0.2.2:4000.)
const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://cinemind-api.46-62-239-174.sslip.io');

class ApiException implements Exception {
  ApiException(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;
  @override
  String toString() => message;
}

class User {
  User(this.id, this.email, this.displayName);
  final String id;
  final String email;
  final String displayName;
  factory User.fromJson(Map<String, dynamic> j) => User(j['id'] as String, j['email'] as String, (j['displayName'] ?? '') as String);
  Map<String, dynamic> toJson() => {'id': id, 'email': email, 'displayName': displayName};
}

/// Thin client for the same REST API the website and desktop app use.
class Api {
  Api._();
  static final Api instance = Api._();

  String? _token;
  User? user;

  bool get signedIn => _token != null;

  Future<void> restore() async {
    final p = await SharedPreferences.getInstance();
    _token = p.getString('cm-token');
    final u = p.getString('cm-user');
    if (u != null) user = User.fromJson(jsonDecode(u) as Map<String, dynamic>);
  }

  Future<void> setSession(String token, User u) async {
    _token = token;
    user = u;
    final p = await SharedPreferences.getInstance();
    await p.setString('cm-token', token);
    await p.setString('cm-user', jsonEncode(u.toJson()));
  }

  Future<void> signOut() async {
    _token = null;
    user = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('cm-token');
    await p.remove('cm-user');
  }

  Future<dynamic> call(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$apiUrl/api/v1$path');
    final headers = <String, String>{
      if (_token != null) 'authorization': 'Bearer $_token',
      if (body != null) 'content-type': 'application/json',
    };
    final req = http.Request(method, uri)..headers.addAll(headers);
    if (body != null) req.body = jsonEncode(body);
    http.StreamedResponse streamed;
    try {
      streamed = await req.send().timeout(const Duration(seconds: 90));
    } catch (_) {
      throw ApiException(0, 'NETWORK', "Can't reach CineMind. Check your connection.");
    }
    final res = await http.Response.fromStream(streamed);
    if (res.statusCode == 204) return null;
    final data = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) {
      if (res.statusCode == 401) await signOut();
      final m = data is Map ? data : const {};
      throw ApiException(res.statusCode, (m['code'] ?? 'ERROR') as String, (m['message'] ?? 'Request failed (${res.statusCode})') as String);
    }
    return data;
  }

  Future<void> login(String email, String password) async {
    final r = await call('POST', '/auth/login', {'email': email, 'password': password}) as Map<String, dynamic>;
    await setSession(r['accessToken'] as String, User.fromJson(r['user'] as Map<String, dynamic>));
  }

  Future<void> register(String name, String email, String password) async {
    final r = await call('POST', '/auth/register', {'email': email, 'password': password, 'displayName': name}) as Map<String, dynamic>;
    await setSession(r['accessToken'] as String, User.fromJson(r['user'] as Map<String, dynamic>));
  }

  Future<Map<String, bool>> socialProviders() async {
    try {
      final r = await call('GET', '/auth/providers') as Map<String, dynamic>;
      return {'google': r['google'] == true, 'facebook': r['facebook'] == true};
    } catch (_) {
      return {'google': false, 'facebook': false};
    }
  }

  Uri oauthStart(String provider) => Uri.parse('$apiUrl/api/v1/auth/oauth/$provider/start?redirect=${Uri.encodeComponent('cinemind://auth')}');
}
