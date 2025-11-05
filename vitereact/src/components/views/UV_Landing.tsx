import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { MapPin, Star, DollarSign, Heart, X, SlidersHorizontal, ChevronDown, RefreshCw, Flame, Clock, TrendingUp, Tag, Sparkles } from 'lucide-react';

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

const fetchWeeklyPicks = async (): Promise<WeeklyPicksResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/weekly-picks`
  );
  return data;
};

const fetchRecommendations = async (token: string): Promise<RecommendationsResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/recommendations`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10 }
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
    <div className="w-full h-48 bg-gray-200"></div>
    <div className="p-6 space-y-3">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 bg-gray-200 rounded w-24"></div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
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
  const currentUser = useAppStore(state => state.authentication_state.current_user);
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
    queryKey: ['weeklyPicks'],
    queryFn: fetchWeeklyPicks,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  // Recommendations Query (only if authenticated)
  const { data: recommendations, isLoading: isLoadingRecommendations, refetch: refetchRecommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => fetchRecommendations(authToken!),
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    keepPreviousData: true,
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
          <section className="relative bg-gradient-to-r from-orange-600 to-red-600 text-white py-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={handleDismissHero}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss hero section"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-w-7xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                Discover Hidden Gem Restaurants
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-orange-100">
                Support local eateries and enjoy exclusive deals
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center px-8 py-4 bg-white text-orange-600 rounded-lg font-semibold text-lg hover:bg-orange-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
            </div>
          </section>
        )}

        {/* Weekly Local Picks */}
        {weeklyPicks && weeklyPicks.picks.length > 0 && (
          <section className="py-12 lg:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
                    <Flame className="w-8 h-8 text-orange-600" />
                    Weekly Local Picks
                  </h2>
                  <p className="text-gray-600 mt-2">
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
                      className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-200"
                    >
                      <div className="relative">
                        <div className="absolute top-3 left-3 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg z-10">
                          Featured
                        </div>
                        <button
                          onClick={(e) => handleToggleFavorite(pick.restaurant.restaurant_id, e)}
                          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full transition-colors z-10 shadow-lg"
                          aria-label={favoriteIds.includes(pick.restaurant.restaurant_id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart
                            className={`w-6 h-6 transition-colors ${
                              favoriteIds.includes(pick.restaurant.restaurant_id)
                                ? 'fill-red-600 text-red-600'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                        <img
                          src={pick.restaurant.primary_hero_image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
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
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{pick.restaurant.average_rating.toFixed(1)}</span>
                            <span className="text-gray-500">({pick.restaurant.total_review_count})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              {'$'.repeat(pick.restaurant.price_range)}
                            </span>
                            {userLocation.permission_granted && pick.restaurant.distance_miles && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{pick.restaurant.distance_miles.toFixed(1)} mi</span>
                              </div>
                            )}
                          </div>
                        </div>
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
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-blue-600" />
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
                        className="block bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-200"
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
                            src={rec.restaurant.primary_hero_image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
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
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{rec.restaurant.average_rating.toFixed(1)}</span>
                              <span className="text-gray-500">({rec.restaurant.total_review_count})</span>
                            </div>
                            <span className="text-gray-700">
                              {'$'.repeat(rec.restaurant.price_range)}
                            </span>
                          </div>
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
        <section className="py-6 px-4 sm:px-6 lg:px-8 border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => handleQuickFilter('near_me')}
                disabled={!userLocation.permission_granted}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilters.distance_max === 2
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-600'
                } ${!userLocation.permission_granted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MapPin className="w-4 h-4" />
                Near Me
              </button>
              <button
                onClick={() => handleQuickFilter('open_now')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilters.open_now
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-600'
                }`}
              >
                <Clock className="w-4 h-4" />
                Open Now
              </button>
              <button
                onClick={() => handleQuickFilter('highly_rated')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilters.rating_min === 4
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-600'
                }`}
              >
                <Star className="w-4 h-4" />
                Highly Rated (4+)
              </button>
              <button
                onClick={() => handleQuickFilter('best_deals')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-all whitespace-nowrap ${
                  activeFilters.has_discount
                    ? 'bg-orange-600 border-orange-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-orange-600'
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
                        className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-200"
                      >
                        <div className="relative">
                          {restaurant.is_featured && (
                            <div className="absolute top-3 left-3 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg z-10">
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
                            src={restaurant.primary_hero_image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'}
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
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{restaurant.average_rating.toFixed(1)}</span>
                              <span className="text-gray-500">({restaurant.total_review_count})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">
                                {'$'.repeat(restaurant.price_range)}
                              </span>
                              {userLocation.permission_granted && restaurant.distance_miles && (
                                <div className="flex items-center gap-1 text-gray-600">
                                  <MapPin className="w-4 h-4" />
                                  <span>{restaurant.distance_miles.toFixed(1)} mi</span>
                                </div>
                              )}
                            </div>
                          </div>
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
              <div className="text-center py-16">
                <div className="mb-6">
                  <TrendingUp className="w-16 h-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No restaurants found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your filters or search criteria</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
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