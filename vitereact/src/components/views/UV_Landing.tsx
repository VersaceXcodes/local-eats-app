import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { MapPin, Star, Heart, X, SlidersHorizontal, ChevronDown, RefreshCw, Flame, Clock, TrendingUp, Tag, Sparkles, Truck, ShoppingBag } from 'lucide-react';

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
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  average_rating: number;
  total_review_count: number;
  is_currently_open: boolean;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  delivery_fee: number;
  primary_hero_image_url: string | null;
  distance_miles: number | null;
  is_featured: boolean;
}

interface WeeklyPick {
  pick_id: string;
  restaurant_id: string;
  week_start_date: string;
  week_end_date: string;
  featured_description: string | null;
  display_order: number;
  restaurant: Restaurant;
}

interface Recommendation {
  restaurant: Restaurant;
  reason: string;
}

interface RestaurantFeedResponse {
  restaurants: Restaurant[];
  total_count: number;
  page: number;
  limit: number;
}

interface WeeklyPicksResponse {
  picks: WeeklyPick[];
  week_start_date: string;
  week_end_date: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchWeeklyPicks = async (params?: { latitude?: number; longitude?: number }): Promise<WeeklyPicksResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/weekly-picks`,
    { params }
  );
  return data;
};

const fetchRecommendations = async (token: string, params?: { limit?: number; latitude?: number; longitude?: number }): Promise<RecommendationsResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/recommendations`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10, ...params }
    }
  );
  return data;
};

const fetchRestaurants = async (params: {
  cuisine_types?: string;
  price_min?: number;
  price_max?: number;
  distance_max?: number;
  rating_min?: number;
  dietary_preferences?: string;
  open_now?: boolean;
  has_discount?: boolean;
  sort_by?: string;
  latitude?: number;
  longitude?: number;
  limit: number;
  offset: number;
}): Promise<RestaurantFeedResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/restaurants`,
    { params }
  );
  return data;
};

const addFavorite = async (restaurant_id: string, token: string) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
    { restaurant_id },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const removeFavorite = async (restaurant_id: string, token: string) => {
  const { data } = await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites/${restaurant_id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const dismissRecommendation = async (restaurant_id: string, token: string) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/recommendations/dismiss`,
    { restaurant_id },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

const RestaurantCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
    <div className="w-full h-48 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
    </div>
    <div className="p-6 space-y-3">
      <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-3/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full w-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
        <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Landing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // ============================================================================
  // ZUSTAND GLOBAL STATE (Individual selectors to avoid infinite loops)
  // ============================================================================
  
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const userLocation = useAppStore(state => state.user_location);
  const favoriteIds = useAppStore(state => state.favorites_list.restaurant_ids);
  const toggleFavoriteAction = useAppStore(state => state.toggle_favorite);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [heroDismissed, setHeroDismissed] = useState(() => {
    return sessionStorage.getItem('hero_dismissed') === 'true';
  });
  const [ctaSectionDismissed, setCtaSectionDismissed] = useState(() => {
    return sessionStorage.getItem('cta_section_dismissed') === 'true';
  });

  // Parse URL params for filters
  const urlFilters = useMemo(() => ({
    cuisine_types: searchParams.get('cuisine_types')?.split(',').filter(Boolean) || [],
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null,
    distance_max: searchParams.get('distance_max') ? Number(searchParams.get('distance_max')) : null,
    rating_min: searchParams.get('rating_min') ? Number(searchParams.get('rating_min')) : null,
    dietary_preferences: searchParams.get('dietary_preferences')?.split(',').filter(Boolean) || [],
    open_now: searchParams.get('open_now') === 'true',
    has_discount: searchParams.get('has_discount') === 'true',
  }), [searchParams]);

  const [activeFilters, setActiveFilters] = useState(urlFilters);
  const [activeSort, setActiveSort] = useState(searchParams.get('sort_by') || 'recommended');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync filters with URL on change
  useEffect(() => {
    setActiveFilters(urlFilters);
  }, [urlFilters]);

  // ============================================================================
  // REACT QUERY - DATA FETCHING
  // ============================================================================

  // Featured Picks Query
  const { data: weeklyPicks, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['weeklyPicks', userLocation.latitude, userLocation.longitude],
    queryFn: () => fetchWeeklyPicks({
      latitude: userLocation.permission_granted ? userLocation.latitude || undefined : undefined,
      longitude: userLocation.permission_granted ? userLocation.longitude || undefined : undefined
    }),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  // Recommendations Query (only if authenticated)
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['recommendations', userLocation.latitude, userLocation.longitude],
    queryFn: () => fetchRecommendations(authToken!, {
      latitude: userLocation.permission_granted ? userLocation.latitude || undefined : undefined,
      longitude: userLocation.permission_granted ? userLocation.longitude || undefined : undefined
    }),
    enabled: isAuthenticated && !!authToken,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
  });

  // Restaurant Feed Query
  const restaurantParams = useMemo(() => ({
    cuisine_types: activeFilters.cuisine_types.length > 0 ? activeFilters.cuisine_types.join(',') : undefined,
    price_min: activeFilters.price_min || undefined,
    price_max: activeFilters.price_max || undefined,
    distance_max: activeFilters.distance_max || undefined,
    rating_min: activeFilters.rating_min || undefined,
    dietary_preferences: activeFilters.dietary_preferences.length > 0 ? activeFilters.dietary_preferences.join(',') : undefined,
    open_now: activeFilters.open_now || undefined,
    has_discount: activeFilters.has_discount || undefined,
    sort_by: activeSort,
    latitude: userLocation.permission_granted ? userLocation.latitude || undefined : undefined,
    longitude: userLocation.permission_granted ? userLocation.longitude || undefined : undefined,
    limit: 20,
    offset: (currentPage - 1) * 20,
  }), [activeFilters, activeSort, currentPage, userLocation]);

  const { data: restaurantFeed, isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ['restaurants', restaurantParams],
    queryFn: () => fetchRestaurants(restaurantParams),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const favoriteMutation = useMutation({
    mutationFn: ({ restaurant_id, isFavorited }: { restaurant_id: string; isFavorited: boolean }) => {
      if (!authToken) throw new Error('Not authenticated');
      return isFavorited ? removeFavorite(restaurant_id, authToken) : addFavorite(restaurant_id, authToken);
    },
    onMutate: async ({ restaurant_id }) => {
      toggleFavoriteAction(restaurant_id);
    },
    onError: (error, { restaurant_id }) => {
      toggleFavoriteAction(restaurant_id); // Rollback
      console.error('Favorite toggle error:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (restaurant_id: string) => {
      if (!authToken) throw new Error('Not authenticated');
      return dismissRecommendation(restaurant_id, authToken);
    },
    onSuccess: () => {
      refetchRecommendations();
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleFavorite = (restaurant_id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      // Show signup modal logic would go here
      alert('Please sign in to save favorites');
      navigate('/login');
      return;
    }

    const isFavorited = favoriteIds.includes(restaurant_id);
    favoriteMutation.mutate({ restaurant_id, isFavorited });
  };

  const handleDismissRecommendation = (restaurant_id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismissMutation.mutate(restaurant_id);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    
    if (activeFilters.cuisine_types.length > 0) params.set('cuisine_types', activeFilters.cuisine_types.join(','));
    if (activeFilters.price_min) params.set('price_min', String(activeFilters.price_min));
    if (activeFilters.price_max) params.set('price_max', String(activeFilters.price_max));
    if (activeFilters.distance_max) params.set('distance_max', String(activeFilters.distance_max));
    if (activeFilters.rating_min) params.set('rating_min', String(activeFilters.rating_min));
    if (activeFilters.dietary_preferences.length > 0) params.set('dietary_preferences', activeFilters.dietary_preferences.join(','));
    if (activeFilters.open_now) params.set('open_now', 'true');
    if (activeFilters.has_discount) params.set('has_discount', 'true');
    if (activeSort !== 'recommended') params.set('sort_by', activeSort);
    
    setSearchParams(params);
    setFilterPanelOpen(false);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setActiveFilters({
      cuisine_types: [],
      price_min: null,
      price_max: null,
      distance_max: null,
      rating_min: null,
      dietary_preferences: [],
      open_now: false,
      has_discount: false,
    });
    setActiveSort('recommended');
    setSearchParams(new URLSearchParams());
    setCurrentPage(1);
  };

  const handleRemoveFilter = (filterKey: string, value?: any) => {
    const newFilters = { ...activeFilters };
    
    if (filterKey === 'cuisine_types' && value) {
      newFilters.cuisine_types = newFilters.cuisine_types.filter(c => c !== value);
    } else if (filterKey === 'dietary_preferences' && value) {
      newFilters.dietary_preferences = newFilters.dietary_preferences.filter(d => d !== value);
    } else if (filterKey === 'price_min' || filterKey === 'price_max' || filterKey === 'distance_max' || filterKey === 'rating_min') {
      newFilters[filterKey] = null;
    } else if (filterKey === 'open_now' || filterKey === 'has_discount') {
      newFilters[filterKey] = false;
    }
    
    setActiveFilters(newFilters);
    
    // Update URL
    const params = new URLSearchParams(searchParams);
    if (filterKey === 'cuisine_types') {
      const remaining = newFilters.cuisine_types;
      if (remaining.length > 0) {
        params.set('cuisine_types', remaining.join(','));
      } else {
        params.delete('cuisine_types');
      }
    } else if (filterKey === 'dietary_preferences') {
      const remaining = newFilters.dietary_preferences;
      if (remaining.length > 0) {
        params.set('dietary_preferences', remaining.join(','));
      } else {
        params.delete('dietary_preferences');
      }
    } else {
      params.delete(filterKey);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleQuickFilter = (type: 'near_me' | 'open_now' | 'highly_rated' | 'best_deals') => {
    const newFilters = { ...activeFilters };
    
    switch (type) {
      case 'near_me':
        newFilters.distance_max = newFilters.distance_max === 2 ? null : 2;
        break;
      case 'open_now':
        newFilters.open_now = !newFilters.open_now;
        break;
      case 'highly_rated':
        newFilters.rating_min = newFilters.rating_min === 4 ? null : 4;
        break;
      case 'best_deals':
        newFilters.has_discount = !newFilters.has_discount;
        break;
    }
    
    setActiveFilters(newFilters);
    
    const params = new URLSearchParams(searchParams);
    if (newFilters.distance_max) params.set('distance_max', String(newFilters.distance_max));
    else params.delete('distance_max');
    if (newFilters.open_now) params.set('open_now', 'true');
    else params.delete('open_now');
    if (newFilters.rating_min) params.set('rating_min', String(newFilters.rating_min));
    else params.delete('rating_min');
    if (newFilters.has_discount) params.set('has_discount', 'true');
    else params.delete('has_discount');
    
    setSearchParams(params);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
    const params = new URLSearchParams(searchParams);
    params.set('page', String(currentPage + 1));
    setSearchParams(params);
  };

  const handleDismissHero = () => {
    setHeroDismissed(true);
    sessionStorage.setItem('hero_dismissed', 'true');
  };

  const handleDismissCTA = () => {
    setCtaSectionDismissed(true);
    sessionStorage.setItem('cta_section_dismissed', 'true');
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.cuisine_types.length > 0) count += activeFilters.cuisine_types.length;
    if (activeFilters.price_min || activeFilters.price_max) count++;
    if (activeFilters.distance_max) count++;
    if (activeFilters.rating_min) count++;
    if (activeFilters.dietary_preferences.length > 0) count += activeFilters.dietary_preferences.length;
    if (activeFilters.open_now) count++;
    if (activeFilters.has_discount) count++;
    return count;
  }, [activeFilters]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        {/* Hero Section - Unauthenticated users only */}
        {!isAuthenticated && !heroDismissed && (
          <section className="relative bg-gradient-to-r from-orange-600 via-red-500 to-red-600 text-white py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Multi-layered Background with Food Images */}
            <div className="absolute inset-0 overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-25 scale-110 animate-slow-zoom"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1600&q=80')",
                  filter: 'brightness(0.8) contrast(1.1)'
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/95 via-red-500/90 to-red-600/95"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
            </div>

            <button
              onClick={handleDismissHero}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:rotate-90 z-10 backdrop-blur-sm"
              aria-label="Dismiss hero section"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold animate-bounce shadow-xl border border-white/30">
                <span className="text-2xl">🎉</span>
                <span>New users get 20% off first order</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
                Discover Hidden Gem<br />
                <span className="bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                  Restaurants
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl mb-12 text-orange-50 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
                Support local eateries, earn rewards, and enjoy exclusive deals from your neighborhood's best kept secrets
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link
                  to="/signup"
                  className="inline-flex items-center px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95 group"
                >
                  <span>Get Started Free</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/search"
                  className="inline-flex items-center px-8 py-4 bg-white/10 border-2 border-white/50 text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 backdrop-blur-md shadow-xl"
                >
                  Browse Restaurants
                </Link>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl mb-2">🍕</div>
                  <div className="text-sm font-semibold">Local Favorites</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl mb-2">🎁</div>
                  <div className="text-sm font-semibold">Exclusive Deals</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="text-sm font-semibold">Earn Rewards</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl mb-2">🚚</div>
                  <div className="text-sm font-semibold">Fast Delivery</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Weekly Local Picks */}
        {weeklyPicks && weeklyPicks.picks.length > 0 && (
          <section className="py-12 lg:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-md">
                      <Flame className="w-7 h-7 text-white" />
                    </div>
                    Weekly Picks
                  </h2>
                  <p className="text-gray-600 mt-2 ml-14">
                    Week of {new Date(weeklyPicks.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weeklyPicks.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {isLoadingFeatured ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <RestaurantCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {weeklyPicks.picks.map((pick) => (
                    <Link
                      key={pick.pick_id}
                      to={`/restaurant/${pick.restaurant.restaurant_id}`}
                      className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-2 transition-all duration-300 relative"
                    >
                      <div className="relative">
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-600 to-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg z-10 flex items-center gap-1">
                          <Flame className="w-4 h-4" />
                          Featured
                        </div>
                        <button
                          onClick={(e) => handleToggleFavorite(pick.restaurant.restaurant_id, e)}
                          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-all duration-200 z-10 shadow-lg hover:scale-110 active:scale-95"
                          aria-label={favoriteIds.includes(pick.restaurant.restaurant_id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart
                            className={`w-6 h-6 transition-all duration-200 ${
                              favoriteIds.includes(pick.restaurant.restaurant_id)
                                ? 'fill-red-600 text-red-600 scale-110'
                                : 'text-gray-600 hover:text-red-500'
                            }`}
                          />
                        </button>
                          <img
                            src={pick.restaurant.primary_hero_image_url || `https://images.unsplash.com/photo-${['1517248135467-4c7edcad34c4', '1504674900247-0877df9cc836', '1414235077428-338989a2e8c0', '1555939594-58d7cb561ad1', '1546069901-ba9599a7e63c', '1565299624946-b28f40a0ae38'][Math.floor(Math.random() * 6)]}?w=800&q=80`}
                            alt={pick.restaurant.restaurant_name}
                            className="w-full h-56 object-cover"
                            loading="lazy"
                          />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                          {pick.restaurant.restaurant_name}
                        </h3>
                        {pick.featured_description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {pick.featured_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {pick.restaurant.cuisine_types.slice(0, 2).map((cuisine) => (
                            <span key={cuisine} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              {cuisine}
                            </span>
                          ))}
                        </div>

                        {/* Delivery/Pickup Badges */}
                        <div className="flex gap-2 mb-3">
                          {pick.restaurant.accepts_delivery && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Truck className="w-3 h-3" />
                              Delivery
                            </span>
                          )}
                          {pick.restaurant.accepts_pickup && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              <ShoppingBag className="w-3 h-3" />
                              Pickup
                            </span>
                          )}
                        </div>

                        {/* Open/Closed Status */}
                        <div className="mb-3">
                          {pick.restaurant.is_currently_open ? (
                            <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                              <Clock className="w-4 h-4" />
                              Open Now
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              Closed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-sm mb-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{Number(pick.restaurant.average_rating).toFixed(1)}</span>
                            <span className="text-gray-500">({pick.restaurant.total_review_count})</span>
                          </div>
                          <span className="text-gray-700">
                            {'$'.repeat(pick.restaurant.price_range)}
                          </span>
                        </div>

                        {/* Distance Display */}
                        {pick.restaurant.distance_miles !== null && pick.restaurant.distance_miles !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>{Number(pick.restaurant.distance_miles).toFixed(1)} mi away</span>
                          </div>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/restaurant/${pick.restaurant.restaurant_id}`);
                          }}
                          className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <span>View Menu</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Personalized Recommendations */}
        {isAuthenticated && recommendations && recommendations.recommendations.length > 0 && (
          <section className="py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  Recommended for You
                </h2>
                <button
                  onClick={() => refetchRecommendations()}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  aria-label="Refresh recommendations"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {isLoadingRecommendations ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-none w-80">
                      <RestaurantCardSkeleton />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                  {recommendations.recommendations.map((rec) => (
                    <div key={rec.restaurant.restaurant_id} className="flex-none w-80">
                      <Link
                        to={`/restaurant/${rec.restaurant.restaurant_id}`}
                        className="block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                      >
                        <div className="relative">
                          <button
                            onClick={(e) => handleDismissRecommendation(rec.restaurant.restaurant_id, e)}
                            className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-white rounded-full transition-colors z-10 shadow-lg"
                            aria-label="Dismiss recommendation"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => handleToggleFavorite(rec.restaurant.restaurant_id, e)}
                            className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full transition-colors z-10 shadow-lg"
                            aria-label={favoriteIds.includes(rec.restaurant.restaurant_id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart
                              className={`w-5 h-5 transition-colors ${
                                favoriteIds.includes(rec.restaurant.restaurant_id)
                                  ? 'fill-red-600 text-red-600'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                          <img
                            src={rec.restaurant.primary_hero_image_url || `https://images.unsplash.com/photo-${['1517248135467-4c7edcad34c4', '1504674900247-0877df9cc836', '1414235077428-338989a2e8c0', '1555939594-58d7cb561ad1', '1546069901-ba9599a7e63c', '1565299624946-b28f40a0ae38'][Math.floor(Math.random() * 6)]}?w=800&q=80`}
                            alt={rec.restaurant.restaurant_name}
                            className="w-full h-40 object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <div className="mb-2">
                            <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {rec.reason}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                            {rec.restaurant.restaurant_name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {rec.restaurant.cuisine_types.slice(0, 2).map((cuisine) => (
                              <span key={cuisine} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                {cuisine}
                              </span>
                            ))}
                          </div>

                          {/* Delivery/Pickup Badges */}
                          <div className="flex gap-2 mb-2">
                            {rec.restaurant.accepts_delivery && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <Truck className="w-3 h-3" />
                                Delivery
                              </span>
                            )}
                            {rec.restaurant.accepts_pickup && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <ShoppingBag className="w-3 h-3" />
                                Pickup
                              </span>
                            )}
                          </div>

                          {/* Open/Closed Status */}
                          <div className="mb-2">
                            {rec.restaurant.is_currently_open ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                <Clock className="w-3 h-3" />
                                Open Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                Closed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{Number(rec.restaurant.average_rating).toFixed(1)}</span>
                              <span className="text-gray-500">({rec.restaurant.total_review_count})</span>
                            </div>
                            <span className="text-gray-700">
                              {'$'.repeat(rec.restaurant.price_range)}
                            </span>
                          </div>

                          {/* Distance Display */}
                          {rec.restaurant.distance_miles !== null && rec.restaurant.distance_miles !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span>{Number(rec.restaurant.distance_miles).toFixed(1)} mi away</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Quick Filter Chips */}
        <section className="py-6 px-4 sm:px-6 lg:px-8 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleQuickFilter('near_me')}
                disabled={!userLocation.permission_granted}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap shadow-sm hover:shadow-md ${
                  activeFilters.distance_max === 2
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 border-transparent text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-500'
                } ${!userLocation.permission_granted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MapPin className="w-4 h-4" />
                Near Me
              </button>
              <button
                onClick={() => handleQuickFilter('open_now')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap shadow-sm hover:shadow-md ${
                  activeFilters.open_now
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-transparent text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-500'
                }`}
              >
                <Clock className="w-4 h-4" />
                Open Now
              </button>
              <button
                onClick={() => handleQuickFilter('highly_rated')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap shadow-sm hover:shadow-md ${
                  activeFilters.rating_min === 4
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 border-transparent text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-500'
                }`}
              >
                <Star className="w-4 h-4" />
                Highly Rated (4+)
              </button>
              <button
                onClick={() => handleQuickFilter('best_deals')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap shadow-sm hover:shadow-md ${
                  activeFilters.has_discount
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-500'
                }`}
              >
                <Tag className="w-4 h-4" />
                Best Deals
              </button>
            </div>
          </div>
        </section>

        {/* Main Restaurant Grid */}
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Grid Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {restaurantFeed ? `${restaurantFeed.total_count} Restaurants` : 'Restaurants'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={activeSort}
                    onChange={(e) => {
                      setActiveSort(e.target.value);
                      const params = new URLSearchParams(searchParams);
                      if (e.target.value !== 'recommended') {
                        params.set('sort_by', e.target.value);
                      } else {
                        params.delete('sort_by');
                      }
                      setSearchParams(params);
                      setCurrentPage(1);
                    }}
                    className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="distance">Distance</option>
                    <option value="rating">Rating</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Filters Button */}
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-orange-600 text-white rounded-full text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {activeFilters.cuisine_types.map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => handleRemoveFilter('cuisine_types', cuisine)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    {cuisine}
                    <X className="w-3.5 h-3.5" />
                  </button>
                ))}
                {activeFilters.price_min && (
                  <button
                    onClick={() => handleRemoveFilter('price_min')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    Min: {'$'.repeat(activeFilters.price_min)}
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeFilters.price_max && (
                  <button
                    onClick={() => handleRemoveFilter('price_max')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    Max: {'$'.repeat(activeFilters.price_max)}
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeFilters.distance_max && (
                  <button
                    onClick={() => handleRemoveFilter('distance_max')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    Within {activeFilters.distance_max} mi
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeFilters.rating_min && (
                  <button
                    onClick={() => handleRemoveFilter('rating_min')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    {activeFilters.rating_min}+ Stars
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeFilters.dietary_preferences.map((pref) => (
                  <button
                    key={pref}
                    onClick={() => handleRemoveFilter('dietary_preferences', pref)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    {pref}
                    <X className="w-3.5 h-3.5" />
                  </button>
                ))}
                {activeFilters.open_now && (
                  <button
                    onClick={() => handleRemoveFilter('open_now')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    Open Now
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeFilters.has_discount && (
                  <button
                    onClick={() => handleRemoveFilter('has_discount')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                  >
                    Has Discount
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 text-orange-700 hover:text-orange-800 text-sm font-medium underline"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Restaurant Grid */}
            {isLoadingRestaurants ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(12)].map((_, i) => (
                  <RestaurantCardSkeleton key={i} />
                ))}
              </div>
            ) : restaurantFeed && restaurantFeed.restaurants.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {restaurantFeed.restaurants.map((restaurant, index) => (
                    <React.Fragment key={restaurant.restaurant_id}>
                      <Link
                        to={`/restaurant/${restaurant.restaurant_id}`}
                        className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
                      >
                        <div className="relative">
                          {restaurant.is_featured && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-600 to-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg z-10">
                              Featured
                            </div>
                          )}
                          <button
                            onClick={(e) => handleToggleFavorite(restaurant.restaurant_id, e)}
                            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-colors z-10 shadow-lg"
                            aria-label={favoriteIds.includes(restaurant.restaurant_id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart
                              className={`w-5 h-5 transition-colors ${
                                favoriteIds.includes(restaurant.restaurant_id)
                                  ? 'fill-red-600 text-red-600'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                          <img
                            src={restaurant.primary_hero_image_url || `https://images.unsplash.com/photo-${['1517248135467-4c7edcad34c4', '1504674900247-0877df9cc836', '1414235077428-338989a2e8c0', '1555939594-58d7cb561ad1', '1546069901-ba9599a7e63c', '1565299624946-b28f40a0ae38', '1493770348161-369560ae357d', '1540189549336-e6e99c3679fe', '1567620905732-2d1ec7ab7445', '1565958011703-44f9829ba187'][index % 10]}?w=800&q=80`}
                            alt={restaurant.restaurant_name}
                            className="w-full h-48 object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {restaurant.restaurant_name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {restaurant.cuisine_types.slice(0, 2).map((cuisine) => (
                              <span key={cuisine} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                {cuisine}
                              </span>
                            ))}
                          </div>
                          
                          {/* Delivery/Pickup Badges */}
                          <div className="flex gap-2 mb-3">
                            {restaurant.accepts_delivery && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                <Truck className="w-3 h-3" />
                                Delivery
                              </span>
                            )}
                            {restaurant.accepts_pickup && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <ShoppingBag className="w-3 h-3" />
                                Pickup
                              </span>
                            )}
                          </div>

                          {/* Open/Closed Status */}
                          <div className="mb-3">
                            {restaurant.is_currently_open ? (
                              <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                                <Clock className="w-4 h-4" />
                                Open Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                Closed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{Number(restaurant.average_rating).toFixed(1)}</span>
                              <span className="text-gray-500">({restaurant.total_review_count})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">
                                {'$'.repeat(restaurant.price_range)}
                              </span>
                            </div>
                          </div>

                          {/* Distance Display */}
                          {restaurant.distance_miles !== null && restaurant.distance_miles !== undefined && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                              <MapPin className="w-4 h-4" />
                              <span>{Number(restaurant.distance_miles).toFixed(1)} mi away</span>
                            </div>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/restaurant/${restaurant.restaurant_id}`);
                            }}
                            className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                          >
                            View Menu
                          </button>
                        </div>
                      </Link>

                      {/* CTA Section after 10-12 cards for unauthenticated users */}
                      {!isAuthenticated && !ctaSectionDismissed && index === 11 && (
                        <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-8 text-white relative">
                          <button
                            onClick={handleDismissCTA}
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Dismiss CTA"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <div className="max-w-3xl mx-auto text-center">
                            <h3 className="text-3xl font-bold mb-4">
                              Save Your Favorites & Get Exclusive Deals
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                  <Heart className="w-6 h-6" />
                                </div>
                                <span className="text-sm">Save Favorites</span>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                  <Tag className="w-6 h-6" />
                                </div>
                                <span className="text-sm">Exclusive Deals</span>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                  <TrendingUp className="w-6 h-6" />
                                </div>
                                <span className="text-sm">Earn Badges</span>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                  <Sparkles className="w-6 h-6" />
                                </div>
                                <span className="text-sm">Personalized</span>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                              <Link
                                to="/signup"
                                className="px-8 py-3 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition-colors shadow-lg"
                              >
                                Sign Up Free
                              </Link>
                              <Link
                                to="/login"
                                className="text-white hover:text-orange-100 font-medium underline"
                              >
                                Already have an account? Log in
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Load More Button */}
                {restaurantFeed.restaurants.length < restaurantFeed.total_count && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Load More Restaurants
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="mb-6 relative inline-block">
                  <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-orange-100 to-red-100 rounded-full p-6">
                    <TrendingUp className="w-16 h-16 text-orange-500 mx-auto" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">No restaurants found</h3>
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">Try adjusting your filters or search criteria to discover more delicious options</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="px-8 py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setFilterPanelOpen(false)}
            ></div>
            <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Filters</h3>
                <button
                  onClick={() => setFilterPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Cuisine Types */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Cuisine Type</h4>
                  <div className="space-y-2">
                    {['Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'American', 'Mediterranean'].map((cuisine) => (
                      <label key={cuisine} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters.cuisine_types.includes(cuisine)}
                          onChange={(e) => {
                            const newCuisines = e.target.checked
                              ? [...activeFilters.cuisine_types, cuisine]
                              : activeFilters.cuisine_types.filter(c => c !== cuisine);
                            setActiveFilters({ ...activeFilters, cuisine_types: newCuisines });
                          }}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-gray-700">{cuisine}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Price Range</h4>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((price) => (
                      <button
                        key={price}
                        onClick={() => {
                          setActiveFilters({
                            ...activeFilters,
                            price_min: activeFilters.price_min === price ? null : price,
                            price_max: activeFilters.price_max === price ? null : price,
                          });
                        }}
                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                          (activeFilters.price_min === price || activeFilters.price_max === price)
                            ? 'bg-orange-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-orange-600'
                        }`}
                      >
                        {'$'.repeat(price)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Minimum Rating</h4>
                  <div className="flex gap-2">
                    {[3, 3.5, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          setActiveFilters({
                            ...activeFilters,
                            rating_min: activeFilters.rating_min === rating ? null : rating,
                          });
                        }}
                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                          activeFilters.rating_min === rating
                            ? 'bg-orange-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-orange-600'
                        }`}
                      >
                        {rating}+
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Distance</h4>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 5, 10].map((distance) => (
                      <button
                        key={distance}
                        onClick={() => {
                          setActiveFilters({
                            ...activeFilters,
                            distance_max: activeFilters.distance_max === distance ? null : distance,
                          });
                        }}
                        disabled={!userLocation.permission_granted}
                        className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                          activeFilters.distance_max === distance
                            ? 'bg-orange-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-orange-600'
                        } ${!userLocation.permission_granted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {distance} mi
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Dietary Preferences</h4>
                  <div className="space-y-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'].map((pref) => (
                      <label key={pref} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeFilters.dietary_preferences.includes(pref)}
                          onChange={(e) => {
                            const newPrefs = e.target.checked
                              ? [...activeFilters.dietary_preferences, pref]
                              : activeFilters.dietary_preferences.filter(p => p !== pref);
                            setActiveFilters({ ...activeFilters, dietary_preferences: newPrefs });
                          }}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-gray-700">{pref}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
                <button
                  onClick={handleClearFilters}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default UV_Landing;