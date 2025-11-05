import React, { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon, divIcon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/main';
import { Heart, MapPin, Star, Navigation, Filter, List, X, Search, MapPinIcon } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  description: string | null;
  cuisine_types: string[];
  price_range: number;
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  phone_number: string;
  primary_hero_image_url: string | null;
  average_rating: number;
  total_review_count: number;
  total_order_count: number;
  is_currently_open: boolean;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  delivery_fee: number;
  minimum_order_amount: number;
  delivery_radius_miles: number;
  estimated_prep_time_minutes: number;
  estimated_delivery_time_minutes: number;
  is_featured: boolean;
  featured_week_start: string | null;
  featured_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MapBounds {
  north: number;
  east: number;
  south: number;
  west: number;
}

interface ActiveFilters {
  cuisine_types: string[];
  price_min: number | null;
  price_max: number | null;
  rating_min: number | null;
  dietary_preferences: string[];
  open_now: boolean;
  has_discount: boolean;
}

// ============================================================================
// CUSTOM MARKER ICONS
// ============================================================================

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const discountIcon = divIcon({
  html: '<div style="background-color: #f97316; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 16px; font-weight: bold;">%</span></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
  className: ''
});

const favoriteIcon = divIcon({
  html: '<div style="background-color: #ef4444; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 16px;">♥</span></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
  className: ''
});

const userLocationIcon = divIcon({
  html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  className: ''
});

// ============================================================================
// MAP COMPONENTS
// ============================================================================

interface MapEventsHandlerProps {
  onBoundsChange: (bounds: MapBounds) => void;
  onZoomChange: (zoom: number) => void;
}

const MapEventsHandler: React.FC<MapEventsHandlerProps> = ({ onBoundsChange, onZoomChange }) => {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        east: bounds.getEast(),
        south: bounds.getSouth(),
        west: bounds.getWest()
      });
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    }
  });

  return null;
};

interface RecenterButtonProps {
  center: LatLngExpression;
  zoom: number;
}

const RecenterButton: React.FC<RecenterButtonProps> = ({ center, zoom }) => {
  const map = useMap();

  const handleRecenter = () => {
    map.setView(center, zoom);
  };

  return (
    <button
      onClick={handleRecenter}
      className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-50 p-3 rounded-lg shadow-lg transition-colors"
      aria-label="Recenter map to your location"
    >
      <Navigation className="w-5 h-5 text-gray-700" />
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_MapView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ========================================================================
  // GLOBAL STATE (Individual Selectors)
  // ========================================================================
  const userLocation = useAppStore(state => state.user_location);
  const favoriteIds = useAppStore(state => state.favorites_list.restaurant_ids);
  const toggleFavorite = useAppStore(state => state.toggle_favorite);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: parseFloat(searchParams.get('lat') || '') || userLocation.latitude || 45.5231,
    longitude: parseFloat(searchParams.get('lng') || '') || userLocation.longitude || -122.6765
  });

  const [mapZoom, setMapZoom] = useState<number>(
    parseInt(searchParams.get('zoom') || '') || 13
  );

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [showSearchThisArea, setShowSearchThisArea] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    cuisine_types: searchParams.get('cuisine_types')?.split(',').filter(Boolean) || [],
    price_min: searchParams.get('price_min') ? parseInt(searchParams.get('price_min')!) : null,
    price_max: searchParams.get('price_max') ? parseInt(searchParams.get('price_max')!) : null,
    rating_min: searchParams.get('rating_min') ? parseFloat(searchParams.get('rating_min')!) : null,
    dietary_preferences: searchParams.get('dietary_preferences')?.split(',').filter(Boolean) || [],
    open_now: searchParams.get('open_now') === 'true',
    has_discount: searchParams.get('has_discount') === 'true'
  });

  // ========================================================================
  // DATA FETCHING
  // ========================================================================
  const fetchRestaurants = async (): Promise<{ restaurants: Restaurant[] }> => {
    const params: any = {
      is_active: 'true',
      limit: '1000',
      offset: '0'
    };

    if (activeFilters.cuisine_types.length > 0) {
      params.cuisine_types = activeFilters.cuisine_types.join(',');
    }
    if (activeFilters.price_min !== null) {
      params.price_min = activeFilters.price_min.toString();
    }
    if (activeFilters.price_max !== null) {
      params.price_max = activeFilters.price_max.toString();
    }
    if (activeFilters.rating_min !== null) {
      params.rating_min = activeFilters.rating_min.toString();
    }
    if (activeFilters.dietary_preferences.length > 0) {
      params.dietary_preferences = activeFilters.dietary_preferences.join(',');
    }
    if (activeFilters.open_now) {
      params.open_now = 'true';
    }
    if (activeFilters.has_discount) {
      params.has_discount = 'true';
    }

    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/restaurants`,
      { params }
    );

    return response.data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurants', activeFilters],
    queryFn: fetchRestaurants,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  // ========================================================================
  // FILTERED RESTAURANTS (Client-side bounds filtering)
  // ========================================================================
  const visibleRestaurants = useMemo(() => {
    if (!data?.restaurants || !mapBounds) {
      return data?.restaurants || [];
    }

    return data.restaurants.filter(restaurant => {
      return (
        restaurant.latitude >= mapBounds.south &&
        restaurant.latitude <= mapBounds.north &&
        restaurant.longitude >= mapBounds.west &&
        restaurant.longitude <= mapBounds.east
      );
    });
  }, [data?.restaurants, mapBounds]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
    setShowSearchThisArea(true);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    setShowSearchThisArea(false);
    refetch();
  }, [refetch]);

  const handleApplyFilters = useCallback(() => {
    // Update URL params
    const params: any = {};
    if (activeFilters.cuisine_types.length > 0) {
      params.cuisine_types = activeFilters.cuisine_types.join(',');
    }
    if (activeFilters.price_min !== null) {
      params.price_min = activeFilters.price_min.toString();
    }
    if (activeFilters.price_max !== null) {
      params.price_max = activeFilters.price_max.toString();
    }
    if (activeFilters.rating_min !== null) {
      params.rating_min = activeFilters.rating_min.toString();
    }
    if (activeFilters.dietary_preferences.length > 0) {
      params.dietary_preferences = activeFilters.dietary_preferences.join(',');
    }
    if (activeFilters.open_now) {
      params.open_now = 'true';
    }
    if (activeFilters.has_discount) {
      params.has_discount = 'true';
    }

    setSearchParams(params);
    setFilterPanelOpen(false);
    refetch();
  }, [activeFilters, setSearchParams, refetch]);

  const handleClearFilters = useCallback(() => {
    setActiveFilters({
      cuisine_types: [],
      price_min: null,
      price_max: null,
      rating_min: null,
      dietary_preferences: [],
      open_now: false,
      has_discount: false
    });
  }, []);

  const handleToggleToList = useCallback(() => {
    const params: any = {};
    if (activeFilters.cuisine_types.length > 0) {
      params.cuisine_types = activeFilters.cuisine_types.join(',');
    }
    if (activeFilters.price_min !== null) {
      params.price_min = activeFilters.price_min.toString();
    }
    if (activeFilters.price_max !== null) {
      params.price_max = activeFilters.price_max.toString();
    }
    if (activeFilters.rating_min !== null) {
      params.rating_min = activeFilters.rating_min.toString();
    }
    if (activeFilters.dietary_preferences.length > 0) {
      params.dietary_preferences = activeFilters.dietary_preferences.join(',');
    }
    if (activeFilters.open_now) {
      params.open_now = 'true';
    }
    if (activeFilters.has_discount) {
      params.has_discount = 'true';
    }

    const queryString = new URLSearchParams(params).toString();
    navigate(queryString ? `/?${queryString}` : '/');
  }, [activeFilters, navigate]);

  const handleToggleFavorite = useCallback((restaurantId: string) => {
    if (!isAuthenticated) {
      // Show sign-up prompt
      alert('Please sign in to save favorites');
      return;
    }
    toggleFavorite(restaurantId);
  }, [isAuthenticated, toggleFavorite]);

  // Calculate distance from user location
  const calculateDistance = useCallback((lat: number, lng: number): string => {
    if (!userLocation.latitude || !userLocation.longitude) {
      return '';
    }

    const R = 3959; // Earth's radius in miles
    const dLat = (lat - userLocation.latitude) * Math.PI / 180;
    const dLon = (lng - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return `${distance.toFixed(1)} mi`;
  }, [userLocation]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.cuisine_types.length > 0) count++;
    if (activeFilters.price_min !== null || activeFilters.price_max !== null) count++;
    if (activeFilters.rating_min !== null) count++;
    if (activeFilters.dietary_preferences.length > 0) count++;
    if (activeFilters.open_now) count++;
    if (activeFilters.has_discount) count++;
    return count;
  }, [activeFilters]);

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <>
      <div className="relative w-full h-screen bg-gray-100">
        {/* Top Controls Bar */}
        <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Filter Button */}
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative"
            >
              <Filter className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-md shadow-sm text-sm font-medium text-gray-900"
              >
                <MapPinIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={handleToggleToList}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
              {activeFilters.cuisine_types.map(cuisine => (
                <div key={cuisine} className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>{cuisine}</span>
                  <button
                    onClick={() => setActiveFilters(prev => ({
                      ...prev,
                      cuisine_types: prev.cuisine_types.filter(c => c !== cuisine)
                    }))}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(activeFilters.price_min !== null || activeFilters.price_max !== null) && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>
                    ${activeFilters.price_min || 1}-${activeFilters.price_max || 4}
                  </span>
                  <button
                    onClick={() => setActiveFilters(prev => ({
                      ...prev,
                      price_min: null,
                      price_max: null
                    }))}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {activeFilters.rating_min !== null && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>{activeFilters.rating_min}+ stars</span>
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, rating_min: null }))}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {activeFilters.open_now && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>Open Now</span>
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, open_now: false }))}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {activeFilters.has_discount && (
                <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                  <span>Has Discount</span>
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, has_discount: false }))}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button
                onClick={handleClearFilters}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Search This Area Button */}
        {showSearchThisArea && (
          <button
            onClick={handleSearchThisArea}
            className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[1000] bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2 transition-all"
          >
            <Search className="w-5 h-5" />
            Search this area
          </button>
        )}

        {/* Map Container */}
        <div className="absolute top-16 left-0 right-0 bottom-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">Failed to load restaurants</p>
                <button
                  onClick={() => refetch()}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <MapContainer
              center={[mapCenter.latitude, mapCenter.longitude]}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapEventsHandler
                onBoundsChange={handleBoundsChange}
                onZoomChange={handleZoomChange}
              />

              {userLocation.latitude && userLocation.longitude && (
                <>
                  <Marker
                    position={[userLocation.latitude, userLocation.longitude]}
                    icon={userLocationIcon}
                  >
                    <Popup>Your Location</Popup>
                  </Marker>
                  <RecenterButton
                    center={[userLocation.latitude, userLocation.longitude]}
                    zoom={13}
                  />
                </>
              )}

              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={60}
                iconCreateFunction={(cluster) => {
                  const count = cluster.getChildCount();
                  return divIcon({
                    html: `<div style="background-color: #ea580c; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${count}</div>`,
                    className: '',
                    iconSize: [40, 40]
                  });
                }}
              >
                {visibleRestaurants.map((restaurant) => {
                  const isFavorite = favoriteIds.includes(restaurant.restaurant_id);
                  const hasDiscount = false;
                  
                  let icon: L.Icon | L.DivIcon = defaultIcon;
                  if (isFavorite) {
                    icon = favoriteIcon;
                  } else if (hasDiscount) {
                    icon = discountIcon;
                  }

                  const distance = calculateDistance(restaurant.latitude, restaurant.longitude);

                  return (
                    <Marker
                      key={restaurant.restaurant_id}
                      position={[restaurant.latitude, restaurant.longitude]}
                      icon={icon}
                      eventHandlers={{
                        click: () => setSelectedMarkerId(restaurant.restaurant_id)
                      }}
                    >
                      <Popup
                        className="custom-popup"
                      >
                        <div className="w-64">
                          {restaurant.primary_hero_image_url && (
                            <img
                              src={restaurant.primary_hero_image_url}
                              alt={restaurant.restaurant_name}
                              className="w-full h-32 object-cover rounded-t-lg"
                            />
                          )}
                          <div className="p-3">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">
                              {restaurant.restaurant_name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm font-medium text-gray-900">
                                  {restaurant.average_rating.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-600">
                                ({restaurant.total_review_count})
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-600">
                                {'$'.repeat(restaurant.price_range)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {restaurant.cuisine_types.join(', ')}
                              </span>
                            </div>
                            {distance && (
                              <p className="text-sm text-gray-600 mb-3">{distance} away</p>
                            )}
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/restaurant/${restaurant.restaurant_id}`}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors text-center"
                              >
                                View Details
                              </Link>
                              <button
                                onClick={() => handleToggleFavorite(restaurant.restaurant_id)}
                                className={`p-2 rounded-lg transition-colors ${
                                  isFavorite
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>

        {/* Location Permission Message */}
        {!userLocation.permission_granted && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
            <p className="text-sm text-blue-800">
              <strong>Enable location</strong> for personalized map view and distance information
            </p>
          </div>
        )}

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="fixed inset-0 z-[2000] bg-black bg-opacity-50 flex items-end md:items-center md:justify-end">
            <div className="bg-white w-full md:w-96 h-[80vh] md:h-full md:max-h-screen flex flex-col rounded-t-2xl md:rounded-none shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Cuisine Types */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Cuisine Type</h3>
                  <div className="space-y-2">
                    {['Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'American', 'Korean'].map(cuisine => (
                      <label key={cuisine} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters.cuisine_types.includes(cuisine)}
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              cuisine_types: e.target.checked
                                ? [...prev.cuisine_types, cuisine]
                                : prev.cuisine_types.filter(c => c !== cuisine)
                            }));
                          }}
                          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{cuisine}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(price => (
                      <label key={price} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            (activeFilters.price_min === null && activeFilters.price_max === null) ||
                            (price >= (activeFilters.price_min || 1) && price <= (activeFilters.price_max || 4))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setActiveFilters(prev => ({
                                ...prev,
                                price_min: Math.min(prev.price_min || price, price),
                                price_max: Math.max(prev.price_max || price, price)
                              }));
                            }
                          }}
                          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{'$'.repeat(price)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Minimum Rating</h3>
                  <div className="space-y-2">
                    {[4.5, 4.0, 3.5, 3.0].map(rating => (
                      <label key={rating} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="rating"
                          checked={activeFilters.rating_min === rating}
                          onChange={() => setActiveFilters(prev => ({ ...prev, rating_min: rating }))}
                          className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{rating}+ stars</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        checked={activeFilters.rating_min === null}
                        onChange={() => setActiveFilters(prev => ({ ...prev, rating_min: null }))}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">Any</span>
                    </label>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Dietary Preferences</h3>
                  <div className="space-y-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free'].map(pref => (
                      <label key={pref} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters.dietary_preferences.includes(pref)}
                          onChange={(e) => {
                            setActiveFilters(prev => ({
                              ...prev,
                              dietary_preferences: e.target.checked
                                ? [...prev.dietary_preferences, pref]
                                : prev.dietary_preferences.filter(p => p !== pref)
                            }));
                          }}
                          className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggle Filters */}
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-gray-900">Open Now</span>
                    <input
                      type="checkbox"
                      checked={activeFilters.open_now}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, open_now: e.target.checked }))}
                      className="w-10 h-6 bg-gray-200 rounded-full relative appearance-none cursor-pointer checked:bg-orange-600 transition-colors"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-gray-900">Has Discount</span>
                    <input
                      type="checkbox"
                      checked={activeFilters.has_discount}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, has_discount: e.target.checked }))}
                      className="w-10 h-6 bg-gray-200 rounded-full relative appearance-none cursor-pointer checked:bg-orange-600 transition-colors"
                    />
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 space-y-3">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_MapView;