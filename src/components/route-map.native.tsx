import { useMemo } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
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

export function RouteMap({ routes }: { routes: InsightRoute[] }) {
  const points = useMemo(
    () => routes.flatMap((route) => [route.originPoint, route.destinationPoint]),
    [routes],
  );
  const airports = useMemo(() => {
    const unique = new Map<string, RoutePoint>();
    for (const route of routes) {
      unique.set(route.origin, route.originPoint);
      unique.set(route.destination, route.destinationPoint);
    }
    return [...unique];
  }, [routes]);

  if (!points.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No routes to map yet</Text>
        <Text style={styles.emptyBody}>
          Airport coordinates will appear after the insights migration enriches your history.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <MapView
        accessibilityLabel="Map of saved flight routes"
        customMapStyle={darkMapStyle}
        initialRegion={regionFor(points)}
        pitchEnabled={false}
        rotateEnabled={false}
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
        {airports.map(([iata, point]) => (
          <Marker coordinate={point} key={iata} title={iata}>
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
    borderRadius: 20,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
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
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
  },
  emptyTitle: { color: palette.text, fontSize: 16, fontWeight: '700' },
  emptyBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
});
