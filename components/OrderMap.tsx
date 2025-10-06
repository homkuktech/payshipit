import React, { useRef, useEffect } from 'react';
import { StyleSheet, Image, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useTheme } from '@/contexts/ThemeContext';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance: number;
  duration: number;
}

interface OrderMapProps {
  pickupLocation: Coordinate;
  destination: Coordinate;
  riderLocation?: Coordinate & { heading?: number | null };
  onRouteReady?: (info: RouteInfo) => void;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const OrderMap: React.FC<OrderMapProps> = ({
  pickupLocation,
  destination,
  riderLocation,
  onRouteReady,
}) => {
  const { colors, isDarkMode } = useTheme();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // Fit map to all points (origin, destination, and rider)
    if (mapRef.current && pickupLocation && destination) {
      const coordinates = [pickupLocation, destination];
      if (riderLocation) {
        coordinates.push(riderLocation);
      }
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [pickupLocation, destination, riderLocation]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <View style={styles.map}>
        <Text>Map configuration error.</Text>
      </View>
    );
  }

  // The route origin is the rider's current location if available, otherwise it's the pickup spot.
  const routeOrigin = riderLocation || pickupLocation;

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider="google"
      initialRegion={{
        ...pickupLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      customMapStyle={isDarkMode ? mapStyleDark : []}
    >
      <MapViewDirections
        origin={routeOrigin}
        destination={destination}
        apikey={GOOGLE_MAPS_API_KEY}
        strokeWidth={4}
        strokeColor={colors.primary}
        onReady={(result) => {
          if (onRouteReady) {
            onRouteReady({
              distance: result.distance,
              duration: result.duration,
            });
          }
        }}
      />
      <Marker coordinate={pickupLocation} title="Pickup" pinColor={colors.primary} />
      <Marker coordinate={destination} title="Dropoff" pinColor={colors.error} />
      {riderLocation && (
        <Marker
          coordinate={riderLocation}
          title="Rider"
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={riderLocation.heading ?? 0}
        >
          {/* Using a custom image for the rider marker */}
          <Image source={require('../assets/images/rider-marker.png')} style={styles.riderMarker} />
        </Marker>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
  },
  riderMarker: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});

// Optional: Add a dark mode style for the map
const mapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  // ... more styles from https://mapstyle.withgoogle.com/
];

export default OrderMap;