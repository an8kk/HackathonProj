import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/new_writeoff_screen.dart';
import 'screens/history_screen.dart';
import 'screens/camera_screen.dart';
import 'screens/success_screen.dart';
import 'store/write_off_store.dart';
import 'store/auth_store.dart';
import 'widgets/scaffold_with_nav.dart';

final router = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    final auth = Provider.of<AuthStore>(context, listen: false);
    final onLogin = state.matchedLocation == '/login';
    if (!auth.isLoggedIn && !onLogin) return '/login';
    if (auth.isLoggedIn && onLogin) return '/dashboard';
    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    ShellRoute(
      builder: (context, state, child) => ScaffoldWithNav(child: child),
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardScreen(),
        ),
        GoRoute(
          path: '/camera',
          builder: (context, state) => const CameraScreen(),
        ),
        GoRoute(
          path: '/new',
          builder: (context, state) {
            final extra = state.extra as Map<String, dynamic>?;
            return NewWriteoffScreen(
              initialPhotoPath: extra?['photoPath'] as String?,
              initialAnalysis: extra?['analysis'] as Map<String, dynamic>?,
              prefill: extra?['prefill'] as Map<String, dynamic>?,
            );
          },
        ),
        GoRoute(
          path: '/history',
          builder: (context, state) => const HistoryScreen(),
        ),
        GoRoute(
          path: '/success',
          builder: (context, state) {
            final entry = state.extra as WriteOffEntry;
            return SuccessScreen(entry: entry);
          },
        ),
      ],
    ),
  ],
);
