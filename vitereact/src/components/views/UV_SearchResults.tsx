import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  MapPin,
  Heart,
  Loader2,
  AlertCircle,
  Home,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// TYPES
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

interface SearchResponse {
  restaurants: Restaurant[];
  total_count: number;
  page: number;
  limit: number;
}

interface ActiveFilters {
  cuisine_types: string[];
  price_min: number | null;
  price_max: number | null;
  distance_max: number | null;
  rating_min: number | null;
  dietary_preferences: string[];
  open_now: boolean;
  has_discount: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian',
  'American', 'Mediterranean', 'Korean', 'Vietnamese', 'Middle Eastern',
  'French', 'Greek', 'Spanish', 'Caribbean', 'African'
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Halal', 'Kosher'
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'distance', label: 'Distance' },
  { value: 'rating', label: 'Rating' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
];

const DISTANCE_OPTIONS = [
  { value: 0.5, label: '0.5 miles' },
  { value: 1, label: '1 mile' },
  { value: 2, label: '2 miles' },
  { value: 5, label: '5 miles' },
  { value: 10, label: '10 miles' },
];

const RATING_OPTIONS = [
  { value: null, label: 'Any Rating' },
  { value: 3.0, label: '3.0+' },
  { value: 3.5, label: '3.5+' },
  { value: 4.0, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
];

// ============================================================================
// SKELETON LOADING COMPONENT
// ============================================================================

const RestaurantCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200"></div>
    <div className="p-6 space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded w-16"></div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ========================================================================
  // GLOBAL STATE (Individual Selectors)
  // ========================================================================
  const userLatitude = useAppStore(state => state.user_location.latitude);
  const userLongitude = useAppStore(state => state.user_location.longitude);
  const favoriteIds = useAppStore(state => state.favorites_list.restaurant_ids);
  const toggleFavorite = useAppStore(state => state.toggle_favorite);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Parse URL params into local state
  const searchQuery = searchParams.get('query') || '';
  const sortBy = searchParams.get('sort_by') || 'recommended';
  const currentPage = Number(searchParams.get('page')) || 1;

  // Parse filters from URL
  const activeFilters: ActiveFilters = useMemo(() => ({
    cuisine_types: searchParams.get('cuisine_types')?.split(',').filter(Boolean) || [],
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null,
    distance_max: searchParams.get('distance_max') ? Number(searchParams.get('distance_max')) : null,
    rating_min: searchParams.get('rating_min') ? Number(searchParams.get('rating_min')) : null,
    dietary_preferences: searchParams.get('dietary_preferences')?.split(',').filter(Boolean) || [],
    open_now: searchParams.get('open_now') === 'true',
    has_discount: searchParams.get('has_discount') === 'true',
  }), [searchParams]);

  // ========================================================================
  // API QUERY
  // ========================================================================
  const { data, isLoading, error, refetch } = useQuery<SearchResponse>({
    queryKey: ['restaurants', 'search', {
      query: searchQuery,
      filters: activeFilters,
      sort: sortBy,
      page: currentPage,
      lat: userLatitude,
      lng: userLongitude,
    }],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: 20,
        offset: (currentPage - 1) * 20,
      };

      if (searchQuery) params.query = searchQuery;
      if (activeFilters.cuisine_types.length > 0) {
        params.cuisine_types = activeFilters.cuisine_types.join(',');
      }
      if (activeFilters.price_min !== null) params.price_min = activeFilters.price_min;
      if (activeFilters.price_max !== null) params.price_max = activeFilters.price_max;
      if (activeFilters.distance_max !== null) params.distance_max = activeFilters.distance_max;
      if (activeFilters.rating_min !== null) params.rating_min = activeFilters.rating_min;
      if (activeFilters.dietary_preferences.length > 0) {
        params.dietary_preferences = activeFilters.dietary_preferences.join(',');
      }
      if (activeFilters.open_now) params.open_now = true;
      if (activeFilters.has_discount) params.has_discount = true;
      if (userLatitude && userLongitude) {
        params.latitude = userLatitude;
        params.longitude = userLongitude;
      }

      // Map sort option to API params
      if (sortBy === 'distance') {
        params.sort_by = 'distance';
        params.sort_order = 'asc';
      } else if (sortBy === 'rating') {
        params.sort_by = 'average_rating';
        params.sort_order = 'desc';
      } else if (sortBy === 'price_low') {
        params.sort_by = 'price_range';
        params.sort_order = 'asc';
      } else if (sortBy === 'price_high') {
        params.sort_by = 'price_range';
        params.sort_order = 'desc';
      } else if (sortBy === 'newest') {
        params.sort_by = 'created_at';
        params.sort_order = 'desc';
      } else if (sortBy === 'popular') {
        params.sort_by = 'total_order_count';
        params.sort_order = 'desc';
      } else {
        // recommended (default algorithmic)
        params.sort_by = 'average_rating';
        params.sort_order = 'desc';
      }

      const response = await axios.get<SearchResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/restaurants`,
        { params }
      );

      return response.data;
    },
    staleTime: 60000, // 1 minute
    select: (data) => ({
      restaurants: data.restaurants.map(r => ({
        ...r,
        price_range: Number(r.price_range),
        average_rating: Number(r.average_rating),
        total_review_count: Number(r.total_review_count),
        total_order_count: Number(r.total_order_count),
      })),
      total_count: Number(data.total_count),
      page: Number(data.page),
      limit: Number(data.limit),
    }),
  });

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const updateURLParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  const handleSortChange = (newSort: string) => {
    updateURLParams({ sort_by: newSort, page: '1' });
  };

  const handleApplyFilters = (newFilters: ActiveFilters) => {
    const updates: Record<string, string | null> = {
      cuisine_types: newFilters.cuisine_types.length > 0 ? newFilters.cuisine_types.join(',') : null,
      price_min: newFilters.price_min !== null ? String(newFilters.price_min) : null,
      price_max: newFilters.price_max !== null ? String(newFilters.price_max) : null,
      distance_max: newFilters.distance_max !== null ? String(newFilters.distance_max) : null,
      rating_min: newFilters.rating_min !== null ? String(newFilters.rating_min) : null,
      dietary_preferences: newFilters.dietary_preferences.length > 0 ? newFilters.dietary_preferences.join(',') : null,
      open_now: newFilters.open_now ? 'true' : null,
      has_discount: newFilters.has_discount ? 'true' : null,
      page: '1',
    };
    updateURLParams(updates);
    setFilterPanelOpen(false);
  };

  const handleRemoveFilter = (filterType: string, value?: string) => {
    const newFilters = { ...activeFilters };

    if (filterType === 'cuisine_types' && value) {
      newFilters.cuisine_types = newFilters.cuisine_types.filter(c => c !== value);
    } else if (filterType === 'dietary_preferences' && value) {
      newFilters.dietary_preferences = newFilters.dietary_preferences.filter(d => d !== value);
    } else if (filterType === 'price_min') {
      newFilters.price_min = null;
    } else if (filterType === 'price_max') {
      newFilters.price_max = null;
    } else if (filterType === 'distance_max') {
      newFilters.distance_max = null;
    } else if (filterType === 'rating_min') {
      newFilters.rating_min = null;
    } else if (filterType === 'open_now') {
      newFilters.open_now = false;
    } else if (filterType === 'has_discount') {
      newFilters.has_discount = false;
    }

    handleApplyFilters(newFilters);
  };

  const handleClearAllFilters = () => {
    const emptyFilters: ActiveFilters = {
      cuisine_types: [],
      price_min: null,
      price_max: null,
      distance_max: null,
      rating_min: null,
      dietary_preferences: [],
      open_now: false,
      has_discount: false,
    };
    handleApplyFilters(emptyFilters);
  };

  const handleClearSearch = () => {
    updateURLParams({ query: null, page: '1' });
  };

  const handleLoadMore = () => {
    updateURLParams({ page: String(currentPage + 1) });
  };

  const handleToggleFavorite = (restaurantId: string) => {
    toggleFavorite(restaurantId);
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.cuisine_types.length > 0) count += activeFilters.cuisine_types.length;
    if (activeFilters.dietary_preferences.length > 0) count += activeFilters.dietary_preferences.length;
    if (activeFilters.price_min !== null) count += 1;
    if (activeFilters.price_max !== null) count += 1;
    if (activeFilters.distance_max !== null) count += 1;
    if (activeFilters.rating_min !== null) count += 1;
    if (activeFilters.open_now) count += 1;
    if (activeFilters.has_discount) count += 1;
    return count;
  }, [activeFilters]);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Link to="/" className="hover:text-orange-600 transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900">Search</span>
              {searchQuery && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-900 font-medium">{searchQuery}</span>
                </>
              )}
            </div>

            {/* Heading */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {searchQuery ? `Results for "${searchQuery}"` : 'Search Results'}
            </h1>

            {/* Result Count */}
            {!isLoading && data && (
              <p className="text-gray-600">
                Found {data.total_count} restaurant{data.total_count !== 1 ? 's' : ''}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            )}

            {/* Active Search Query Chip */}
            {searchQuery && (
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full">
                  <Search className="w-4 h-4" />
                  <span className="font-medium">{searchQuery}</span>
                  <button
                    onClick={handleClearSearch}
                    className="hover:bg-orange-200 rounded-full p-1 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {/* Sort Dropdown */}
            <div className="relative">
              <label htmlFor="sort" className="sr-only">Sort by</label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-900 font-medium hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setFilterPanelOpen(true)}
              className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-medium hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Active Filters:</span>
                
                {activeFilters.cuisine_types.map(cuisine => (
                  <div key={cuisine} className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm">
                    <span>{cuisine}</span>
                    <button
                      onClick={() => handleRemoveFilter('cuisine_types', cuisine)}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${cuisine} filter`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {activeFilters.dietary_preferences.map(pref => (
                  <div key={pref} className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm">
                    <span>{pref}</span>
                    <button
                      onClick={() => handleRemoveFilter('dietary_preferences', pref)}
                      className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${pref} filter`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(activeFilters.price_min !== null || activeFilters.price_max !== null) && (
                  <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-sm">
                    <span>
                      {'$'.repeat(activeFilters.price_min || 1)}
                      {activeFilters.price_max && activeFilters.price_max !== activeFilters.price_min
                        ? ` - ${'$'.repeat(activeFilters.price_max)}`
                        : ''}
                    </span>
                    <button
                      onClick={() => {
                        handleRemoveFilter('price_min');
                        handleRemoveFilter('price_max');
                      }}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove price filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activeFilters.distance_max !== null && (
                  <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm">
                    <span>Within {activeFilters.distance_max} mi</span>
                    <button
                      onClick={() => handleRemoveFilter('distance_max')}
                      className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove distance filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activeFilters.rating_min !== null && (
                  <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm">
                    <span>{activeFilters.rating_min}+ Stars</span>
                    <button
                      onClick={() => handleRemoveFilter('rating_min')}
                      className="hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove rating filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activeFilters.open_now && (
                  <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 px-3 py-1.5 rounded-full text-sm">
                    <span>Open Now</span>
                    <button
                      onClick={() => handleRemoveFilter('open_now')}
                      className="hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove open now filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {activeFilters.has_discount && (
                  <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-3 py-1.5 rounded-full text-sm">
                    <span>Has Discount</span>
                    <button
                      onClick={() => handleRemoveFilter('has_discount')}
                      className="hover:bg-red-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove discount filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={handleClearAllFilters}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium underline"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Results</h3>
              <p className="text-gray-600 mb-6">
                {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !error && data && data.restaurants.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-20 h-20 text-gray-300 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No restaurants found
                {searchQuery && ` for "${searchQuery}"`}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
                  : 'Try different search terms or browse all restaurants.'}
              </p>
              <div className="flex gap-4">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAllFilters}
                    className="bg-white border-2 border-orange-600 text-orange-600 px-6 py-3 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/"
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Browse All Restaurants
                </Link>
              </div>
            </div>
          )}

          {!isLoading && !error && data && data.restaurants.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.restaurants.map(restaurant => {
                  const isFavorite = favoriteIds.includes(restaurant.restaurant_id);
                  const priceSymbols = '$'.repeat(restaurant.price_range);

                  return (
                    <div key={restaurant.restaurant_id} className="group">
                      <Link
                        to={`/restaurant/${restaurant.restaurant_id}`}
                        className="block bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 overflow-hidden"
                      >
                        {/* Image */}
                        <div className="relative h-48 bg-gray-200">
                          {restaurant.primary_hero_image_url ? (
                            <img
                              src={restaurant.primary_hero_image_url}
                              alt={restaurant.restaurant_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100">
                              <span className="text-4xl">🍽️</span>
                            </div>
                          )}

                          {/* Favorite Icon */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleFavorite(restaurant.restaurant_id);
                            }}
                            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-lg hover:scale-110 transition-transform z-10"
                            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart
                              className={`w-5 h-5 ${
                                isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                              }`}
                            />
                          </button>

                          {/* Open/Closed Badge */}
                          <div className="absolute top-3 left-3">
                            {restaurant.is_currently_open ? (
                              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                OPEN
                              </span>
                            ) : (
                              <span className="bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                CLOSED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          {/* Name */}
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                            {restaurant.restaurant_name}
                          </h3>

                          {/* Cuisine Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {restaurant.cuisine_types.slice(0, 2).map(cuisine => (
                              <span
                                key={cuisine}
                                className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
                              >
                                {cuisine}
                              </span>
                            ))}
                            {restaurant.cuisine_types.length > 2 && (
                              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                +{restaurant.cuisine_types.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const filled = i < Math.floor(restaurant.average_rating);
                                const partial = i === Math.floor(restaurant.average_rating) &&
                                  restaurant.average_rating % 1 >= 0.5;

                                return (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      filled || partial
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-200 text-gray-200'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {restaurant.average_rating.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({restaurant.total_review_count})
                            </span>
                          </div>

                          {/* Price & Distance */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 font-semibold">{priceSymbols}</span>
                            {userLatitude && userLongitude && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {(
                                    Math.sqrt(
                                      Math.pow(restaurant.latitude - userLatitude, 2) +
                                      Math.pow(restaurant.longitude - userLongitude, 2)
                                    ) * 69
                                  ).toFixed(1)} mi
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {data.restaurants.length < data.total_count && (
                <div className="mt-12 text-center">
                  <button
                    onClick={handleLoadMore}
                    className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
                  >
                    Load More Restaurants
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              )}

              {data.restaurants.length >= data.total_count && data.total_count > 20 && (
                <div className="mt-12 text-center">
                  <p className="text-gray-600">You've seen all {data.total_count} restaurants</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <FilterPanel
            activeFilters={activeFilters}
            onApply={handleApplyFilters}
            onClose={() => setFilterPanelOpen(false)}
            hasLocationPermission={userLatitude !== null && userLongitude !== null}
          />
        )}
      </div>
    </>
  );
};

// ============================================================================
// FILTER PANEL COMPONENT
// ============================================================================

interface FilterPanelProps {
  activeFilters: ActiveFilters;
  onApply: (filters: ActiveFilters) => void;
  onClose: () => void;
  hasLocationPermission: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  activeFilters,
  onApply,
  onClose,
  hasLocationPermission,
}) => {
  const [localFilters, setLocalFilters] = useState<ActiveFilters>(activeFilters);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([
    'cuisine',
    'price',
    'distance',
    'rating',
    'dietary',
    'other',
  ]));

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleClearAll = () => {
    const emptyFilters: ActiveFilters = {
      cuisine_types: [],
      price_min: null,
      price_max: null,
      distance_max: null,
      rating_min: null,
      dietary_preferences: [],
      open_now: false,
      has_discount: false,
    };
    setLocalFilters(emptyFilters);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cuisine Type */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('cuisine')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Cuisine Type</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('cuisine') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('cuisine') && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {CUISINE_OPTIONS.map(cuisine => (
                  <label key={cuisine} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={localFilters.cuisine_types.includes(cuisine)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters(prev => ({
                            ...prev,
                            cuisine_types: [...prev.cuisine_types, cuisine],
                          }));
                        } else {
                          setLocalFilters(prev => ({
                            ...prev,
                            cuisine_types: prev.cuisine_types.filter(c => c !== cuisine),
                          }));
                        }
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-900">{cuisine}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('price')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Price Range</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('price') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('price') && (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(price => {
                  const isSelected =
                    (localFilters.price_min !== null && localFilters.price_min <= price) &&
                    (localFilters.price_max !== null && localFilters.price_max >= price);

                  return (
                    <button
                      key={price}
                      onClick={() => {
                        if (localFilters.price_min === price && localFilters.price_max === price) {
                          // Deselect
                          setLocalFilters(prev => ({
                            ...prev,
                            price_min: null,
                            price_max: null,
                          }));
                        } else {
                          // Select range
                          setLocalFilters(prev => {
                            const newMin = prev.price_min === null ? price : Math.min(prev.price_min, price);
                            const newMax = prev.price_max === null ? price : Math.max(prev.price_max, price);
                            return {
                              ...prev,
                              price_min: newMin,
                              price_max: newMax,
                            };
                          });
                        }
                      }}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                        isSelected
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-500'
                      }`}
                    >
                      {'$'.repeat(price)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distance */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('distance')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Distance</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('distance') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('distance') && (
              <>
                {!hasLocationPermission && (
                  <p className="text-sm text-gray-600 mb-3">
                    Enable location to filter by distance
                  </p>
                )}
                <div className="space-y-2">
                  {DISTANCE_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors ${
                        !hasLocationPermission ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="distance"
                        checked={localFilters.distance_max === option.value}
                        onChange={() => {
                          setLocalFilters(prev => ({
                            ...prev,
                            distance_max: option.value,
                          }));
                        }}
                        disabled={!hasLocationPermission}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-gray-900">{option.label}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="distance"
                      checked={localFilters.distance_max === null}
                      onChange={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          distance_max: null,
                        }));
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-gray-900">Any Distance</span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Rating */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('rating')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Minimum Rating</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('rating') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('rating') && (
              <div className="space-y-2">
                {RATING_OPTIONS.map(option => (
                  <label
                    key={option.value || 'any'}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="radio"
                      name="rating"
                      checked={localFilters.rating_min === option.value}
                      onChange={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          rating_min: option.value,
                        }));
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                    />
                    <div className="flex items-center gap-1">
                      {option.value !== null && (
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const filled = i < Math.floor(option.value!);
                            return (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  filled
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            );
                          })}
                        </div>
                      )}
                      <span className="text-gray-900 ml-2">{option.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Dietary Preferences */}
          <div className="border-b border-gray-200 pb-6">
            <button
              onClick={() => toggleSection('dietary')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Dietary Preferences</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('dietary') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('dietary') && (
              <div className="space-y-2">
                {DIETARY_OPTIONS.map(pref => (
                  <label
                    key={pref}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.dietary_preferences.includes(pref)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLocalFilters(prev => ({
                            ...prev,
                            dietary_preferences: [...prev.dietary_preferences, pref],
                          }));
                        } else {
                          setLocalFilters(prev => ({
                            ...prev,
                            dietary_preferences: prev.dietary_preferences.filter(d => d !== pref),
                          }));
                        }
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-gray-900">{pref}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Other Filters */}
          <div className="pb-6">
            <button
              onClick={() => toggleSection('other')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">Other Filters</h3>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  openSections.has('other') ? '' : '-rotate-90'
                }`}
              />
            </button>
            {openSections.has('other') && (
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                  <span className="text-gray-900 font-medium">Open Now</span>
                  <input
                    type="checkbox"
                    checked={localFilters.open_now}
                    onChange={(e) => {
                      setLocalFilters(prev => ({
                        ...prev,
                        open_now: e.target.checked,
                      }));
                    }}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                  <span className="text-gray-900 font-medium">Has Discount</span>
                  <input
                    type="checkbox"
                    checked={localFilters.has_discount}
                    onChange={(e) => {
                      setLocalFilters(prev => ({
                        ...prev,
                        has_discount: e.target.checked,
                      }));
                    }}
                    className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3">
          <button
            onClick={handleClearAll}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default UV_SearchResults;