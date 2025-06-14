'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { VendingMachine } from './components/Map';
import vendingMachinesData from './pokemon_vending_machines_with_coordinates.json';
import { Analytics } from "@vercel/analytics/next"

// Dynamically import the Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('./components/Map'), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
    <span className="text-gray-500">Loading map...</span>
  </div>
});

// Transform the JSON data to match our VendingMachine interface
const transformVendingMachineData = (): VendingMachine[] => {
  return vendingMachinesData
    .filter((machine): machine is typeof machine & { coordinates: { lat: number; lng: number } } => 
      machine.coordinates.lat !== null && machine.coordinates.lng !== null
    )
    .map(machine => ({
      id: machine.machine_id,
      name: `${machine.name} - ${machine.address.split(',')[machine.address.split(',').length - 2]?.trim() || 'California'}`,
      address: machine.address,
      lat: machine.coordinates.lat,
      lng: machine.coordinates.lng,
      type: 'pokemon' as const
    }));
};

// Calculate distance between two coordinates in miles
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function Home() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [vendingMachines, setVendingMachines] = useState<VendingMachine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<VendingMachine | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [locationRequested, setLocationRequested] = useState(false);

  // Initialize vending machines data
  useEffect(() => {
    const machines = transformVendingMachineData();
    setVendingMachines(machines);
    console.log(`Loaded ${machines.length} Pokemon vending machines in California`);
  }, []);

  // Function to request location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setIsLoading(false);
      return;
    }

    setLocationRequested(true);
    setIsLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        
        // Calculate distances to all vending machines
        const allMachines = transformVendingMachineData();
        const machinesWithDistance = allMachines.map(machine => ({
          ...machine,
          distance: calculateDistance(latitude, longitude, machine.lat, machine.lng)
        })).sort((a, b) => a.distance! - b.distance!);
        
        setVendingMachines(machinesWithDistance);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please enable location services and refresh the page.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        setLocationError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Request user's location on component mount
  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      requestLocation();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleMachineSelect = (machine: VendingMachine) => {
    setSelectedMachine(machine);
  };

  const handleRetryLocation = () => {
    setLocationError('');
    requestLocation();
  };

  if (isLoading && !locationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {locationRequested ? 'Getting your location...' : 'Loading Pokemon vending machines...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {locationRequested ? 'Please allow location access when prompted' : `Found ${vendingMachines.length} machines in California`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎮 Pokemon Vending Machine Finder
          </h1>
          <p className="text-lg text-gray-600">
            Find Pokemon card vending machines near you! ({vendingMachines.length} locations in California)
          </p>
          {locationError && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <p className="mb-3">{locationError}</p>
              <button
                onClick={handleRetryLocation}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          {!userLocation && !locationError && !isLoading && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <p className="mb-3">Location access is needed to find machines near you and show distances</p>
              <button
                onClick={handleRetryLocation}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
              >
                Enable Location
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Map View - {vendingMachines.length} Pokemon Vending Machines
              </h2>
              <Map
                userLocation={userLocation}
                vendingMachines={vendingMachines}
                onMachineSelect={handleMachineSelect}
              />
              {userLocation && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📍 Your location: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Nearest Machines */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {userLocation ? 'Nearest Pokemon Machines' : 'Pokemon Machines in California'}
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {vendingMachines.slice(0, 15).map((machine) => (
                  <div
                    key={machine.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMachine?.id === machine.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleMachineSelect(machine)}
                  >
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {machine.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{machine.address}</p>
                    <p className="text-xs text-gray-500 mb-2">ID: {machine.id}</p>
                    {machine.distance && (
                      <p className="text-sm font-medium text-blue-600 mb-3">
                        📍 {machine.distance.toFixed(2)} miles away
                      </p>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={`https://maps.apple.com/?daddr=${encodeURIComponent(machine.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-900 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🍎 Apple
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(machine.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🗺️ Google
                      </a>
                    </div>
                  </div>
                ))}
                {vendingMachines.length > 15 && (
                  <div className="text-center p-4 text-gray-500">
                    <p>... and {vendingMachines.length - 15} more locations</p>
                    <p className="text-xs mt-1">Use the map to explore all locations</p>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Machine Details */}
            {selectedMachine && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Machine Details
                </h2>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-800">
                    {selectedMachine.name}
                  </h3>
                  <p className="text-gray-600">{selectedMachine.address}</p>
                  <p className="text-sm text-gray-500">Machine ID: {selectedMachine.id}</p>
                  {selectedMachine.distance && (
                    <p className="text-blue-600 font-medium">
                      📍 {selectedMachine.distance.toFixed(2)} miles away
                    </p>
                  )}
                  <div className="pt-3 flex gap-3">
                    <a
                      href={`https://maps.apple.com/?daddr=${encodeURIComponent(selectedMachine.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-gray-800 text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors flex items-center gap-2"
                    >
                      🍎 Apple Maps
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedMachine.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      🗺️ Google Maps
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Analytics />
    </div>
  );
}
