import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';
import type { InsightRoute } from '@/lib/insights';

export function RouteMap({
  routes,
  fullscreen = false,
  globe = false,
}: {
  routes: InsightRoute[];
  fullscreen?: boolean;
  globe?: boolean;
}) {
  if (globe) {
    return (
      <View style={[styles.globeBackdrop, fullscreen && styles.fullscreen]}>
        <View style={styles.glow} />
        <View style={styles.globe}>
          <View style={[styles.globeLine, styles.equator]} />
          <View style={[styles.globeLine, styles.latitudeNorth]} />
          <View style={[styles.globeLine, styles.latitudeSouth]} />
          <View style={[styles.globeLine, styles.meridian]} />
          <View style={[styles.globeLine, styles.meridianTilted]} />
          {routes.length > 0 && (
            <>
              <View style={styles.routeArc} />
              <View style={[styles.routePoint, styles.routePointOrigin]} />
              <View style={[styles.routePoint, styles.routePointDestination]} />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.title}>Route map is available on iOS and Android.</Text>
      <Text style={styles.body}>
        {routes.length} mapped {routes.length === 1 ? 'route' : 'routes'}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { ...StyleSheet.absoluteFillObject },
  globeBackdrop: {
    alignItems: 'center',
    backgroundColor: '#03070D',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    backgroundColor: '#0B3157',
    borderRadius: 210,
    height: 420,
    opacity: 0.32,
    position: 'absolute',
    width: 420,
  },
  globe: {
    backgroundColor: '#0B2136',
    borderColor: '#3279B9',
    borderRadius: 145,
    borderWidth: 1,
    height: 290,
    overflow: 'hidden',
    shadowColor: palette.accent,
    shadowOpacity: 0.45,
    shadowRadius: 34,
    width: 290,
  },
  globeLine: {
    borderColor: '#276493',
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.65,
    position: 'absolute',
  },
  equator: { height: 1, left: 0, right: 0, top: 144 },
  latitudeNorth: { borderRadius: 100, height: 70, left: 0, right: 0, top: 54 },
  latitudeSouth: { borderRadius: 100, bottom: 54, height: 70, left: 0, right: 0 },
  meridian: { borderRadius: 145, bottom: 0, left: 92, top: 0, width: 104 },
  meridianTilted: {
    borderRadius: 145,
    bottom: -18,
    left: 101,
    top: -18,
    transform: [{ rotate: '34deg' }],
    width: 86,
  },
  routeArc: {
    borderColor: palette.accent,
    borderRadius: 90,
    borderTopWidth: 2,
    height: 80,
    left: 64,
    position: 'absolute',
    top: 83,
    transform: [{ rotate: '-12deg' }],
    width: 164,
  },
  routePoint: {
    backgroundColor: palette.accent,
    borderColor: '#CBE5FF',
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  routePointOrigin: { left: 64, top: 145 },
  routePointDestination: { right: 57, top: 108 },
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
