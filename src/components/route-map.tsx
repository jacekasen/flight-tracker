import { StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing, type } from '@/constants/theme';
import type { InsightRoute, RoutePoint } from '@/lib/insights';

const GLOBE_SIZE = 290;
const GLOBE_CENTER = GLOBE_SIZE / 2;
const GLOBE_RADIUS = 124;

function projectToGlobe(point: RoutePoint) {
  const latitudeRadians = (point.latitude * Math.PI) / 180;
  return {
    x:
      GLOBE_CENTER +
      (point.longitude / 180) * GLOBE_RADIUS * Math.cos(latitudeRadians),
    y: GLOBE_CENTER - (point.latitude / 90) * GLOBE_RADIUS,
  };
}

function RoutePath({ route }: { route: InsightRoute }) {
  const origin = projectToGlobe(route.originPoint);
  const destination = projectToGlobe(route.destinationPoint);
  const deltaX = destination.x - origin.x;
  const deltaY = destination.y - origin.y;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  return (
    <View
      style={[
        styles.routePath,
        {
          left: (origin.x + destination.x - length) / 2,
          top: (origin.y + destination.y) / 2,
          transform: [{ rotate: `${angle}deg` }],
          width: length,
        },
      ]}
    />
  );
}

export function RouteMap({
  routes,
  fullscreen = false,
  globe = false,
  hero = false,
}: {
  routes: InsightRoute[];
  fullscreen?: boolean;
  globe?: boolean;
  hero?: boolean;
}) {
  if (globe) {
    const airports = new Map<string, RoutePoint>();
    for (const route of routes) {
      airports.set(route.origin, route.originPoint);
      airports.set(route.destination, route.destinationPoint);
    }

    return (
      <View
        accessibilityLabel={`Globe showing ${routes.length} saved flight ${routes.length === 1 ? 'path' : 'paths'}`}
        style={[styles.globeBackdrop, hero && styles.heroBackdrop, fullscreen && styles.fullscreen]}
      >
        <View style={styles.glow} />
        <View style={styles.globe}>
          <View style={[styles.globeLine, styles.equator]} />
          <View style={[styles.globeLine, styles.latitudeNorth]} />
          <View style={[styles.globeLine, styles.latitudeSouth]} />
          <View style={[styles.globeLine, styles.meridian]} />
          <View style={[styles.globeLine, styles.meridianTilted]} />
          {routes.map((route) => <RoutePath key={route.id} route={route} />)}
          {[...airports].map(([iata, point]) => {
            const projected = projectToGlobe(point);
            return (
              <View
                key={iata}
                style={[styles.routePoint, { left: projected.x - 3, top: projected.y - 3 }]}
              />
            );
          })}
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
  heroBackdrop: { minHeight: 380 },
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
  routePath: {
    backgroundColor: palette.accent,
    borderRadius: 2,
    height: 1.5,
    opacity: 0.72,
    position: 'absolute',
  },
  routePoint: {
    backgroundColor: palette.accent,
    borderColor: '#CBE5FF',
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  fallback: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: spacing.lg,
  },
  title: { color: palette.text, textAlign: 'center', ...type.title },
  body: { color: palette.muted, marginTop: spacing.sm, textAlign: 'center', ...type.body },
});
