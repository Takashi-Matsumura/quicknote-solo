import type { Location } from "../models/note";

export interface GeolocationOptions {
  timeout?: number;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
}

export const DEFAULT_GEO_OPTIONS: GeolocationOptions = {
  timeout: 6000,
  enableHighAccuracy: true,
  maximumAge: 300000, // 5 minutes
};

export function getCurrentPosition(options: GeolocationOptions = DEFAULT_GEO_OPTIONS): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        resolve(location);
      },
      (error) => {
        let message = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "User denied the request for Geolocation.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            message = "The request to get user location timed out.";
            break;
        }
        reject(new Error(message));
      },
      options
    );
  });
}

export function createMapUrl(location: Location): string {
  return `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
}