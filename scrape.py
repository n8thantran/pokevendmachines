import requests
from bs4 import BeautifulSoup
import json
import pandas as pd
import re

def scrape_pokemon_vending_machines(html_content):
    """
    Scrapes Pokemon vending machine data from raw HTML content
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Find the table containing vending machine data
        table = soup.find('table')
        
        if not table:
            # If no table found, look for pipe-separated data in the text
            page_text = soup.get_text()
            return parse_pipe_separated_data(page_text)
        
        json_output = []
        
        # Process table rows
        rows = table.find_all('tr')[1:]  # Skip header row
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                retailer = cols[0].get_text(strip=True)
                machine_id = cols[1].get_text(strip=True)
                address = cols[2].get_text(strip=True)
                city_state = cols[3].get_text(strip=True)
                
                # Create full address
                full_address = f"{address}, {city_state}"
                
                # Create JSON object for this location
                location_data = {
                    'name': retailer,
                    'machine_id': machine_id,
                    'address': full_address,
                    'coordinates': {
                        'lat': None,
                        'lng': None
                    }
                }
                
                json_output.append(location_data)
        
        return json_output
        
    except Exception as e:
        print(f"Error processing HTML: {e}")
        return None

def parse_pipe_separated_data(text):
    """
    Fallback parser for pipe-separated data format
    """
    # Extract data using regex pattern for the table format
    pattern = r'([A-Za-z\s&]+)\s*\|\s*([Q]\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)'
    matches = re.findall(pattern, text)
    
    json_output = []
    
    for match in matches:
        retailer, machine_id, address, city_state = match
        
        # Clean up the data
        retailer = retailer.strip()
        machine_id = machine_id.strip()
        address = address.strip()
        city_state = city_state.strip()
        
        # Skip header row or invalid data
        if retailer.lower() in ['retailer', 'store'] or not machine_id.startswith('Q'):
            continue
        
        # Create full address
        full_address = f"{address}, {city_state}"
        
        # Create JSON object for this location
        location_data = {
            'name': retailer,
            'machine_id': machine_id,
            'address': full_address,
            'coordinates': {
                'lat': None,
                'lng': None
            }
        }
        
        json_output.append(location_data)
    
    return json_output

def save_to_file(data, filename='pokemon_vending_machines.json'):
    """
    Save the scraped data to a JSON file
    """
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Data saved to {filename}")

def load_existing_data(filename='pokemon_vending_machines.json'):
    """
    Load existing Pokemon vending machine data from JSON file
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"Loaded {len(data)} locations from {filename}")
        return data
    except FileNotFoundError:
        print(f"Error: {filename} file not found")
        return None
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return None

def add_geocoding(data, api_key=None):
    """
    Add geocoding using Google Maps API or other geocoding service
    Requires a Google Maps API key
    """
    if not api_key:
        print("No API key provided. Coordinates will remain null.")
        return data
    
    try:
        import googlemaps
        gmaps = googlemaps.Client(key=api_key)
    except ImportError:
        print("googlemaps library not installed. Install with: pip install googlemaps")
        return data
    
    print("Starting geocoding process...")
    for i, location in enumerate(data):
        try:
            print(f"Geocoding {i+1}/{len(data)}: {location['address']}")
            geocode_result = gmaps.geocode(location['address'])
            if geocode_result:
                lat = geocode_result[0]['geometry']['location']['lat']
                lng = geocode_result[0]['geometry']['location']['lng']
                location['coordinates']['lat'] = lat
                location['coordinates']['lng'] = lng
                print(f"  Success: {lat}, {lng}")
            else:
                print(f"  No results found for address")
        except Exception as e:
            print(f"  Geocoding failed: {e}")
    
    return data

def process_locations(data, operation='geocode', api_key=None):
    """
    Process each location in the data based on the specified operation
    """
    if operation == 'geocode':
        return add_geocoding(data, api_key)
    elif operation == 'validate':
        # Add validation logic here if needed
        print("Validating location data...")
        valid_count = 0
        for location in data:
            if location.get('name') and location.get('machine_id') and location.get('address'):
                valid_count += 1
        print(f"Found {valid_count} valid locations out of {len(data)} total")
        return data
    else:
        print(f"Unknown operation: {operation}")
        return data

# Main execution
if __name__ == "__main__":
    try:
        # Load existing JSON data
        data = load_existing_data('pokemon_vending_machines.json')
        
        if data:
            print(f"Processing {len(data)} Pokemon vending machine locations...")
            
            # Print first few entries as example
            print("\nFirst 3 entries:")
            print(json.dumps(data[:3], indent=2))
            
            # Choose what operation to perform on each object
            operation = input("\nWhat would you like to do with each location?\n"
                            "1. Add geocoding (coordinates) - requires Google Maps API key\n"
                            "2. Validate data only\n"
                            "3. Just display summary\n"
                            "Enter choice (1/2/3): ").strip()
            
            if operation == '1':
                # Add geocoding
                api_key = input("Enter your Google Maps API key (or press Enter to skip): ").strip()
                if api_key:
                    processed_data = process_locations(data, 'geocode', api_key)
                    save_to_file(processed_data, 'pokemon_machines_with_coordinates.json')
                    print("Data with coordinates saved to pokemon_machines_with_coordinates.json")
                else:
                    print("No API key provided, skipping geocoding")
            elif operation == '2':
                # Validate data
                process_locations(data, 'validate')
            else:
                # Just display summary
                print(f"\nSummary:")
                print(f"Total locations: {len(data)}")
                
                # Count by retailer
                retailers = {}
                for location in data:
                    name = location.get('name', 'Unknown')
                    retailers[name] = retailers.get(name, 0) + 1
                
                print(f"Unique retailers: {len(retailers)}")
                print("Top retailers:")
                for retailer, count in sorted(retailers.items(), key=lambda x: x[1], reverse=True)[:10]:
                    print(f"  {retailer}: {count} locations")
                
                # Check how many have coordinates
                with_coords = sum(1 for loc in data if loc.get('coordinates', {}).get('lat') is not None)
                print(f"Locations with coordinates: {with_coords}/{len(data)}")
            
        else:
            print("Failed to load data")
    except Exception as e:
        print(f"Error: {e}")
