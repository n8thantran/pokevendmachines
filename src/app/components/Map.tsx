'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface VendingMachine {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'pokemon' | 'general';
  distance?: number;
}

interface MapProps {
  userLocation: [number, number] | null;
  vendingMachines: VendingMachine[];
  onMachineSelect: (machine: VendingMachine) => void;
}

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const pokemonIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Map: React.FC<MapProps> = ({ userLocation, vendingMachines, onMachineSelect }) => {
  const [map, setMap] = useState<L.Map | null>(null);

  // Center the map on user location when it becomes available
  useEffect(() => {
    if (map && userLocation) {
      map.setView(userLocation, 13);
    }
  }, [map, userLocation]);

  const defaultCenter: [number, number] = [35.6762, 139.6503]; // Tokyo, Japan

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={userLocation || defaultCenter}
        zoom={userLocation ? 13 : 5}
        style={{ height: '100%', width: '100%' }}
        ref={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <br />
                You are here!
              </div>
            </Popup>
          </Marker>
        )}

        {/* Pokemon vending machine markers */}
        {vendingMachines.map((machine) => (
          <Marker
            key={machine.id}
            position={[machine.lat, machine.lng]}
            icon={pokemonIcon}
            eventHandlers={{
              click: () => onMachineSelect(machine),
            }}
          >
            <Popup>
              <div className="min-w-48">
                <h3 className="font-bold text-lg mb-2">{machine.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{machine.address}</p>
                {machine.distance && (
                  <p className="text-sm font-medium text-blue-600 mb-2">
                    {machine.distance.toFixed(2)} miles away
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <a
                    href={`https://maps.apple.com/?daddr=${encodeURIComponent(machine.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors flex items-center gap-1"
                  >
                    🍎 Apple Maps
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(machine.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    🗺️ Google Maps
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map; 