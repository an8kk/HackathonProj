import 'package:flutter_test/flutter_test.dart';
import 'package:bahandi_reporter/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BahandiApp());
    expect(find.byType(BahandiApp), findsOneWidget);
  });
}
