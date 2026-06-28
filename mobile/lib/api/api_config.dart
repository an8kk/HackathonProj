/// Base URL for the backend. Override at build time with
/// `--dart-define=API_BASE_URL=https://...`.
const String apiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:4000');
