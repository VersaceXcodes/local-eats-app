import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Heart, Star, MapPin, Award } from 'lucide-react';

// ============================================================================
// INTERFACES (Based on OpenAPI Spec)
// ============================================================================

interface WeeklyLocalPick {
  pick_id: string;
  restaurant_id: string;
  week_start_date: string;
  week_end_date: string;
  featured_description: string | null;
  display_order: number;
  selection_criteria: string | null;
  created_at: string;
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  description: string | null;
  cuisine_types: string[];
  price_range: number;
  street_address: string;
  city: string;
  state: string;
  phone_number: string;
  primary_hero_image_url: string | null;
  average_rating: number;
  total_review_count: number;
  is_currently_open: boolean;
  is_featured: boolean;
  featured_description: string | null;
  latitude: number;
  longitude: number;
}

interface WeeklyPickWithRestaurant {
  pick: WeeklyLocalPick;
  restaurant: Restaurant;
}

interface WeeklyPicksResponse {
  picks: WeeklyPickWithRestaurant[];
  week_start_date: string;
  week_end_date: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCurrentWeekMonday = (): string => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
};

const fetchWeeklyPicks = async (weekOf?: string): Promise<WeeklyPicksResponse> => {
  const params = weekOf ? { week_of: weekOf } : {};
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/weekly-picks`,
    { params }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_LocalPicks: React.FC = () => {
  // URL params
  const [searchParams] = useSearchParams();
  const weekOfParam = searchParams.get('week_of');
  
  // Local state
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(
    weekOfParam || getCurrentWeekMonday()
  );
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const isAuthenticated = useAppStore(
    state => state.authentication_state.authentication_status.is_authenticated
  );
  const favoriteIds = useAppStore(state => state.favorites_list.restaurant_ids);
  const toggleFavorite = useAppStore(state => state.toggle_favorite);
  const userLocation = useAppStore(state => state.user_location);
  
  // Calculate distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // React Query for fetching weekly picks
  const {
    data: weeklyPicksData,
    isLoading,
    error,
    refetch
  } = useQuery<WeeklyPicksResponse, Error>({
    queryKey: ['weekly-picks', selectedWeekDate],
    queryFn: () => fetchWeeklyPicks(selectedWeekDate),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  // Update selected week when URL param changes
  useEffect(() => {
    if (weekOfParam && weekOfParam !== selectedWeekDate) {
      setSelectedWeekDate(weekOfParam);
    }
  }, [weekOfParam, selectedWeekDate]);
  
  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent, restaurantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please sign in to save favorites');
      return;
    }
    
    toggleFavorite(restaurantId);
  };
  
  // Render price range
  const renderPriceRange = (priceRange: number) => {
    return '$'.repeat(priceRange);
  };
  
  // Render star rating
  const renderStars = (rating: number) => {
    const stars: JSX.Element[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />
      );
    }
    
    return stars;
  };
  
  const isSubscribed = false;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
        
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Award className="w-8 h-8" />
                <h1 className="text-4xl md:text-5xl font-bold">Weekly Local Picks</h1>
              </div>
              <p className="text-xl md:text-2xl text-orange-100 mb-2">
                Handpicked by our team for you
              </p>
              {weeklyPicksData && (
                <p className="text-lg text-orange-200">
                  Week of {formatDateRange(weeklyPicksData.week_start_date, weeklyPicksData.week_end_date)}
                </p>
              )}
              <p className="text-base text-orange-100 mt-4 max-w-2xl mx-auto">
                Discover the best new and trending local spots each week!
              </p>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mb-4"></div>
              <p className="text-gray-600 text-lg">Loading this week&apos;s picks...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
              <p className="text-red-700 text-lg font-semibold mb-2">
                Failed to load weekly picks
              </p>
              <p className="text-red-600 mb-4">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Featured Restaurants Grid */}
          {!isLoading && !error && weeklyPicksData && (
            <>
              {weeklyPicksData.picks.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <p className="text-gray-600 text-lg mb-4">
                    No picks available for this week yet.
                  </p>
                  <Link
                    to="/"
                    className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Browse All Restaurants
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {weeklyPicksData.picks
                    .sort((a, b) => a.pick.display_order - b.pick.display_order)
                    .map((pickData) => {
                      const { pick, restaurant } = pickData;
                      const isFavorited = favoriteIds.includes(restaurant.restaurant_id);
                      
                      let distance: number | null = null;
                      if (userLocation.latitude && userLocation.longitude) {
                        distance = calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          restaurant.latitude,
                          restaurant.longitude
                        );
                      }
                      
                      return (
                        <Link
                          key={pick.pick_id}
                          to={`/restaurant/${restaurant.restaurant_id}`}
                          className="group bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-200"
                        >
                          <div className="relative aspect-[16/9] overflow-hidden">
                            <img
                              src={restaurant.primary_hero_image_url || `https://picsum.photos/seed/${restaurant.restaurant_id}/800/450`}
                              alt={restaurant.restaurant_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            
                            <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              Featured Pick
                            </div>
                            
                            <button
                              onClick={(e) => handleFavoriteClick(e, restaurant.restaurant_id)}
                              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Heart
                                className={`w-5 h-5 transition-colors ${
                                  isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
                                }`}
                              />
                            </button>
                            
                            {pick.featured_description && pick.featured_description.toLowerCase().includes('discount') && (
                              <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-lg">
                                Special Offer
                              </div>
                            )}
                          </div>
                          
                          <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                              {restaurant.restaurant_name}
                            </h2>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                              {restaurant.cuisine_types.slice(0, 3).map((cuisine, idx) => (
                                <span
                                  key={idx}
                                  className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium"
                                >
                                  {cuisine}
                                </span>
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-4 mb-4">
                              <div className="flex items-center gap-1">
                                {renderStars(restaurant.average_rating)}
                                <span className="ml-2 text-sm font-semibold text-gray-700">
                                  {Number(restaurant.average_rating).toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ({restaurant.total_review_count})
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-700">
                                {renderPriceRange(restaurant.price_range)}
                              </span>
                            </div>
                            
                            {distance !== null && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span>{distance.toFixed(1)} mi away</span>
                              </div>
                            )}
                            
                            {pick.featured_description && (
                              <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                                {pick.featured_description}
                              </p>
                            )}
                            
                            <div className="pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-orange-600 font-semibold group-hover:text-orange-700 transition-colors">
                                  View Restaurant →
                                </span>
                                {restaurant.is_currently_open ? (
                                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    Open Now
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    Closed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
              
              {weeklyPicksData.picks.length > 0 && (
                <div className="mt-16 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Why These Picks?
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Our team carefully curates this week&apos;s featured restaurants based on several criteria to bring you the best local dining experiences:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-gray-700">Highest rated new additions from the past month</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Award className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-gray-700">Most popular restaurants based on recent orders</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Heart className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-gray-700">Hidden gems with exceptional reviews but fewer orders</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-gray-700">Seasonal favorites and trending cuisines</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {weeklyPicksData.picks.length > 0 && (
                <div className="mt-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg p-8 text-white text-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Never Miss a Pick!
                  </h2>
                  <p className="text-lg text-orange-100 mb-6 max-w-2xl mx-auto">
                    Get notified every Monday when we release new weekly picks. Discover the best local restaurants straight to your inbox!
                  </p>
                  
                  {isAuthenticated ? (
                    <div>
                      {isSubscribed ? (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 inline-block">
                          <p className="text-white font-semibold flex items-center gap-2 justify-center">
                            <Award className="w-5 h-5" />
                            You&apos;re subscribed to weekly picks!
                          </p>
                        </div>
                      ) : (
                        <Link
                          to="/settings?section=notifications"
                          className="inline-block bg-white text-orange-600 px-8 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors shadow-lg"
                        >
                          Enable Notifications
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        to="/signup"
                        className="inline-block bg-white text-orange-600 px-8 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors shadow-lg"
                      >
                        Sign Up to Subscribe
                      </Link>
                      <p className="text-sm text-orange-100">
                        Already have an account?{' '}
                        <Link to="/login" className="underline hover:text-white">
                          Log in
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_LocalPicks;