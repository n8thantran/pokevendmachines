import requests
import json
import time
from typing import Dict, List, Union

def add_coordinates_nominatim(location_data: Union[Dict, List[Dict]], delay: float = 1.0) -> Union[Dict, List[Dict]]:
    """
    Takes a JSON object or list of JSON objects with addresses, queries Nominatim OpenStreetMap API 
    to get coordinates, and returns the data with lat/lng added.
    
    Args:
        location_data: Single JSON object or list of JSON objects with address field
        delay: Delay between requests in seconds (default 1.0 to respect rate limits)
    
    Returns:
        Updated JSON object(s) with coordinates filled in
    """
    
    def geocode_single_location(location_json: Dict) -> Dict:
        """Geocode a single location"""
        base_url = "https://nominatim.openstreetmap.org/search"
        
        # Important: Use a proper User-Agent to avoid being blocked
        headers = {
            'User-Agent': 'PokemonVendingMachineLocator/1.0 (your-email@example.com)'
        }
        
        params = {
            'q': location_json['address'],
            'format': 'json',
            'limit': 1,
            'addressdetails': 1  # Get more detailed address info
        }
        
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                response = requests.get(base_url, headers=headers, params=params, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        # Successfully found coordinates
                        location_json['coordinates']['lat'] = float(data[0]['lat'])
                        location_json['coordinates']['lng'] = float(data[0]['lon'])
                        print(f"✓ Geocoded: {location_json['name']} - {location_json['address']}")
                        return location_json
                    else:
                        print(f"⚠ No results found for: {location_json['address']}")
                        location_json['coordinates']['lat'] = None
                        location_json['coordinates']['lng'] = None
                        return location_json
                        
                elif response.status_code == 429:
                    # Rate limited - wait longer
                    print(f"Rate limited, waiting {retry_delay * (attempt + 1)} seconds...")
                    time.sleep(retry_delay * (attempt + 1))
                    continue
                    
                else:
                    print(f"HTTP Error {response.status_code} for: {location_json['address']}")
                    
            except requests.exceptions.RequestException as e:
                print(f"Network error (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
        
        # If all retries failed
        print(f"✗ Failed to geocode: {location_json['address']}")
        location_json['coordinates']['lat'] = None
        location_json['coordinates']['lng'] = None
        return location_json
    
    # Handle single object or list of objects
    if isinstance(location_data, dict):
        return geocode_single_location(location_data.copy())
    elif isinstance(location_data, list):
        results = []
        total = len(location_data)
        
        for i, location in enumerate(location_data, 1):
            print(f"Processing {i}/{total}...")
            result = geocode_single_location(location.copy())
            results.append(result)
            
            # Rate limiting - wait between requests
            if i < total:  # Don't wait after the last request
                time.sleep(delay)
        
        return results
    else:
        raise ValueError("Input must be a dictionary or list of dictionaries")

def save_results(data: Union[Dict, List[Dict]], filename: str = 'geocoded_locations.json'):
    """Save results to a JSON file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Results saved to {filename}")

def load_from_file(filename: str) -> Union[Dict, List[Dict]]:
    """Load JSON data from file"""
    with open(filename, 'r') as f:
        return json.load(f)

# Example usage
if __name__ == "__main__":
    # Load Pokemon vending machine data
    input_filename = 'pokemon_vending_machines.json'
    output_filename = 'pokemon_vending_machines_with_coordinates.json'
    
    try:
        print(f"Loading Pokemon vending machine data from {input_filename}...")
        pokemon_locations = load_from_file(input_filename)
        
        print(f"Found {len(pokemon_locations)} Pokemon vending machine locations")
        print("Starting geocoding process...")
        print("Note: This will take a while due to rate limiting (1 second delay between requests)")
        
        # Process all locations with coordinates
        geocoded_locations = add_coordinates_nominatim(pokemon_locations, delay=1.0)
        
        # Save results
        save_results(geocoded_locations, output_filename)
        
        # Print summary
        successful_geocodes = sum(1 for loc in geocoded_locations if loc['coordinates']['lat'] is not None)
        failed_geocodes = len(geocoded_locations) - successful_geocodes
        
        print(f"\nGeocoding Summary:")
        print(f"✓ Successfully geocoded: {successful_geocodes}")
        print(f"✗ Failed to geocode: {failed_geocodes}")
        print(f"📁 Results saved to: {output_filename}")
        
        # Show some examples of successful geocodes
        if successful_geocodes > 0:
            print(f"\nFirst few successful geocodes:")
            count = 0
            for location in geocoded_locations:
                if location['coordinates']['lat'] is not None and count < 5:
                    lat = location['coordinates']['lat']
                    lng = location['coordinates']['lng']
                    print(f"✓ {location['name']} ({location['machine_id']}) - {location['address']}")
                    print(f"  Coordinates: {lat}, {lng}")
                    count += 1
        
        # Show some examples of failed geocodes
        if failed_geocodes > 0:
            print(f"\nFirst few failed geocodes:")
            count = 0
            for location in geocoded_locations:
                if location['coordinates']['lat'] is None and count < 5:
                    print(f"✗ {location['name']} ({location['machine_id']}) - {location['address']}")
                    count += 1
                    
    except FileNotFoundError:
        print(f"Error: Could not find {input_filename}")
        print("Please make sure the pokemon_vending_machines.json file is in the same directory as this script.")
    except Exception as e:
        print(f"Error: {e}")
