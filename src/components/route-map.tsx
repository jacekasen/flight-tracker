import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';
import type { InsightRoute } from '@/lib/insights';

export function RouteMap({ routes }: { routes: InsightRoute[] }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Route map is available on iOS and Android.</Text>
      <Text style={styles.body}>
        {routes.length} mapped {routes.length === 1 ? 'route' : 'routes'} in this recap.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.lg,
  },
  title: { color: palette.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  body: { color: palette.muted, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
