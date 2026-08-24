import { useMemo } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { palette, radius, type } from '@/constants/theme';
import type { InsightRoute, RoutePoint } from '@/lib/insights';

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#15191F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8D96A3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080A0D' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#343A44' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0B253D' }] },
];

function regionFor(points: RoutePoint[]) {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(12, Math.min(170, (maxLatitude - minLatitude) * 1.35)),
    longitudeDelta: Math.max(12, Math.min(330, (maxLongitude - minLongitude) * 1.35)),
  };
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
  const points = useMemo(
    () => routes.flatMap((route) => [route.originPoint, route.destinationPoint]),
    [routes],
  );
  const airports = useMemo(() => {
    const unique = new Map<string, { city: string; point: RoutePoint }>();
    for (const route of routes) {
      unique.set(route.origin, { city: route.originCity, point: route.originPoint });
      unique.set(route.destination, {
        city: route.destinationCity,
        point: route.destinationPoint,
      });
    }
    return [...unique];
  }, [routes]);

  if (!points.length && !globe) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No routes to map yet</Text>
        <Text style={styles.emptyBody}>
          Airport coordinates will appear after the insights migration enriches your history.
        </Text>
      </View>
    );
  }

  const region = points.length
    ? regionFor(points)
    : { latitude: 20, longitude: 0, latitudeDelta: 150, longitudeDelta: 300 };
  const globeCamera = {
    altitude: 28_000_000,
    center: { latitude: region.latitude, longitude: region.longitude },
    heading: 0,
    pitch: 0,
    zoom: 1,
  };

  return (
    <View style={[styles.frame, hero && styles.heroFrame, fullscreen && styles.fullscreenFrame]}>
      <MapView
        accessibilityLabel={globe ? 'Globe of saved flight routes' : 'Map of saved flight routes'}
        customMapStyle={globe ? undefined : darkMapStyle}
        initialCamera={globe ? globeCamera : undefined}
        initialRegion={globe ? undefined : region}
        mapType={globe ? (Platform.OS === 'ios' ? 'hybridFlyover' : 'satellite') : 'standard'}
        pitchEnabled={globe}
        rotateEnabled={globe}
        style={styles.map}
      >
        {routes.map((route) => (
          <Polyline
            coordinates={[route.originPoint, route.destinationPoint]}
            geodesic
            key={route.id}
            lineCap="round"
            strokeColor={palette.accent}
            strokeWidth={2}
          />
        ))}
        {airports.map(([iata, airport]) => (
          <Marker
            coordinate={airport.point}
            key={iata}
            title={`${airport.city} (${iata})`}
          >
            <View style={styles.marker}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
  },
  heroFrame: { height: 380 },
  fullscreenFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
    height: undefined,
  },
  map: { flex: 1 },
  marker: {
    alignItems: 'center',
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  markerDot: {
    backgroundColor: palette.accent,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  emptyTitle: { color: palette.text, ...type.title },
  emptyBody: {
    color: palette.muted,
    ...type.body,
    marginTop: 8,
    textAlign: 'center',
  },
});
