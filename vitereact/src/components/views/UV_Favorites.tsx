import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Heart, Search, X, Filter, Check, MapPin, Star, DollarSign, AlertCircle } from 'lucide-react';

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

interface Favorite {
  favorite_id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
}

interface FavoriteWithRestaurant {
  favorite: Favorite;
  restaurant: Restaurant;
}

interface FavoritesListResponse {
  favorites: FavoriteWithRestaurant[];
  total_count: number;
}

interface ActiveFilters {
  cuisine_types: string[];
  price_min: number | null;
  price_max: number | null;
  open_now: boolean;
}

interface PendingUndoRemoval {
  favorite_id: string;
  restaurant_id: string;
  timeout_id: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Favorites: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // ========================================================================
  // GLOBAL STATE (Individual selectors to avoid infinite loops)
  // ========================================================================
  
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const userLocation = useAppStore(state => state.user_location);
  const globalFavorites = useAppStore(state => state.favorites_list.restaurant_ids);
  const syncFavorites = useAppStore(state => state.sync_favorites);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    cuisine_types: searchParams.get('cuisine_types')?.split(',').filter(Boolean) || [],
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null,
    open_now: searchParams.get('open_now') === 'true',
  });

  const [sortOption, setSortOption] = useState<string>(searchParams.get('sort_by') || 'recently_added');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchSelectMode, setBatchSelectMode] = useState<boolean>(false);
  const [selectedFavoritesIds, setSelectedFavoritesIds] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);
  const [pendingUndoRemoval, setPendingUndoRemoval] = useState<PendingUndoRemoval | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; action?: () => void } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // ========================================================================
  // AUTH CHECK & REDIRECT
  // ========================================================================
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/favorites' } });
    }
  }, [isAuthenticated, navigate]);

  // ========================================================================
  // API CALLS WITH REACT QUERY
  // ========================================================================
  
  // Fetch favorites
  const { data: favoritesData, isLoading, error } = useQuery<FavoritesListResponse>({
    queryKey: ['favorites', activeFilters, sortOption, authToken],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (activeFilters.cuisine_types.length > 0) {
        params.append('cuisine_types', activeFilters.cuisine_types.join(','));
      }
      if (activeFilters.price_min !== null) {
        params.append('price_min', String(activeFilters.price_min));
      }
      if (activeFilters.price_max !== null) {
        params.append('price_max', String(activeFilters.price_max));
      }
      if (activeFilters.open_now) {
        params.append('open_now', 'true');
      }
      if (sortOption) {
        params.append('sort_by', sortOption);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites?${params}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      return response.data;
    },
    enabled: !!authToken && isAuthenticated,
    staleTime: 60000,
    retry: 1,
  });

  // Remove single favorite
  const removeFavoriteMutation = useMutation({
    mutationFn: async (restaurant_id: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites/${restaurant_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    },
    onSuccess: (_, restaurant_id) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      
      // Update global favorites list
      const updatedGlobalFavorites = globalFavorites.filter(id => id !== restaurant_id);
      syncFavorites(updatedGlobalFavorites);
    },
  });

  // Batch remove favorites
  const batchRemoveMutation = useMutation({
    mutationFn: async (restaurant_ids: string[]) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: { restaurant_ids },
        }
      );
    },
    onSuccess: (_, restaurant_ids) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      
      // Update global favorites list
      const updatedGlobalFavorites = globalFavorites.filter(id => !restaurant_ids.includes(id));
      syncFavorites(updatedGlobalFavorites);
      
      setBatchSelectMode(false);
      setSelectedFavoritesIds([]);
      showToast(`${restaurant_ids.length} restaurant${restaurant_ids.length > 1 ? 's' : ''} removed from favorites`);
    },
  });

  // Restore favorite (undo)
  const restoreFavoriteMutation = useMutation({
    mutationFn: async (restaurant_id: string) => {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/favorites`,
        { restaurant_id },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    },
    onSuccess: (_, restaurant_id) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      
      // Update global favorites list
      const updatedGlobalFavorites = [...globalFavorites, restaurant_id];
      syncFavorites(updatedGlobalFavorites);
    },
  });

  // ========================================================================
  // CLIENT-SIDE FILTERING & SORTING
  // ========================================================================
  
  const filteredAndSortedFavorites = useMemo(() => {
    if (!favoritesData?.favorites) return [];

    let filtered = [...favoritesData.favorites];

    // Client-side search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fav => 
        fav.restaurant.restaurant_name.toLowerCase().includes(query) ||
        fav.restaurant.cuisine_types.some(cuisine => cuisine.toLowerCase().includes(query))
      );
    }

    // Client-side sorting (in case API doesn't handle it)
    if (sortOption === 'recently_added') {
      filtered.sort((a, b) => new Date(b.favorite.created_at).getTime() - new Date(a.favorite.created_at).getTime());
    } else if (sortOption === 'alphabetical') {
      filtered.sort((a, b) => a.restaurant.restaurant_name.localeCompare(b.restaurant.restaurant_name));
    } else if (sortOption === 'rating') {
      filtered.sort((a, b) => b.restaurant.average_rating - a.restaurant.average_rating);
    } else if (sortOption === 'distance' && userLocation.latitude && userLocation.longitude) {
      filtered.sort((a, b) => {
        const distA = calculateDistance(userLocation.latitude!, userLocation.longitude!, a.restaurant.latitude, a.restaurant.longitude);
        const distB = calculateDistance(userLocation.latitude!, userLocation.longitude!, b.restaurant.latitude, b.restaurant.longitude);
        return distA - distB;
      });
    }

    return filtered;
  }, [favoritesData, searchQuery, sortOption, userLocation]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  const showToast = (message: string, action?: () => void) => {
    setToastMessage({ message, action });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRemoveFavorite = (restaurant_id: string, favorite_id: string) => {
    // Set pending undo
    const timeoutId = window.setTimeout(() => {
      removeFavoriteMutation.mutate(restaurant_id);
      setPendingUndoRemoval(null);
    }, 5000);

    setPendingUndoRemoval({ favorite_id, restaurant_id, timeout_id: timeoutId });
    
    showToast('Removed from Favorites', () => handleUndoRemoval());
  };

  const handleUndoRemoval = () => {
    if (pendingUndoRemoval) {
      window.clearTimeout(pendingUndoRemoval.timeout_id);
      restoreFavoriteMutation.mutate(pendingUndoRemoval.restaurant_id);
      setPendingUndoRemoval(null);
      setToastMessage(null);
    }
  };

  const handleBatchRemove = () => {
    if (selectedFavoritesIds.length === 0) return;
    setShowConfirmModal(true);
  };

  const confirmBatchRemove = () => {
    batchRemoveMutation.mutate(selectedFavoritesIds);
    setShowConfirmModal(false);
  };

  const toggleFavoriteSelection = (restaurant_id: string) => {
    setSelectedFavoritesIds(prev => 
      prev.includes(restaurant_id) 
        ? prev.filter(id => id !== restaurant_id)
        : [...prev, restaurant_id]
    );
  };

  const handleSortChange = (newSort: string) => {
    setSortOption(newSort);
    const params = new URLSearchParams(searchParams);
    params.set('sort_by', newSort);
    setSearchParams(params);
  };

  const handleApplyFilters = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    setFilterPanelOpen(false);
    
    // Update URL params
    const params = new URLSearchParams();
    if (filters.cuisine_types.length > 0) {
      params.set('cuisine_types', filters.cuisine_types.join(','));
    }
    if (filters.price_min !== null) {
      params.set('price_min', String(filters.price_min));
    }
    if (filters.price_max !== null) {
      params.set('price_max', String(filters.price_max));
    }
    if (filters.open_now) {
      params.set('open_now', 'true');
    }
    if (sortOption) {
      params.set('sort_by', sortOption);
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setActiveFilters({
      cuisine_types: [],
      price_min: null,
      price_max: null,
      open_now: false,
    });
    setSearchQuery('');
    setSearchParams({});
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.cuisine_types.length > 0) count++;
    if (activeFilters.price_min !== null || activeFilters.price_max !== null) count++;
    if (activeFilters.open_now) count++;
    return count;
  }, [activeFilters]);

  // ========================================================================
  // RENDER
  // ========================================================================
  
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
                <p className="mt-1 text-sm text-gray-600">
                  You have {filteredAndSortedFavorites.length} favorite{filteredAndSortedFavorites.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="alphabetical">Alphabetical (A-Z)</option>
                  {userLocation.latitude && userLocation.longitude && (
                    <option value="distance">Distance (Nearest First)</option>
                  )}
                  <option value="rating">Rating (Highest First)</option>
                  <option value="price_low">Price (Low to High)</option>
                  <option value="price_high">Price (High to Low)</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your favorites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Batch Actions Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Filter Button */}
              <button
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span className="font-medium">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-orange-600 text-white text-xs font-semibold rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Batch Select Button */}
              {filteredAndSortedFavorites.length > 0 && (
                <button
                  onClick={() => {
                    setBatchSelectMode(!batchSelectMode);
                    setSelectedFavoritesIds([]);
                  }}
                  className={`px-4 py-2 border rounded-lg font-medium transition-colors ${
                    batchSelectMode
                      ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }`}
                >
                  {batchSelectMode ? 'Cancel Selection' : 'Select'}
                </button>
              )}

              {/* Remove Selected Button */}
              {batchSelectMode && selectedFavoritesIds.length > 0 && (
                <button
                  onClick={handleBatchRemove}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Remove Selected ({selectedFavoritesIds.length})
                </button>
              )}

              {/* Clear Filters */}
              {(activeFilterCount > 0 || searchQuery) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {filterPanelOpen && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <FilterPanel
                activeFilters={activeFilters}
                onApply={handleApplyFilters}
                onClose={() => setFilterPanelOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Favorites</h3>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'Failed to load favorites'}
              </p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['favorites'] })}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State - No Favorites */}
          {!isLoading && !error && filteredAndSortedFavorites.length === 0 && !searchQuery && activeFilterCount === 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center relative overflow-hidden max-w-2xl mx-auto">
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-100 to-pink-100 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-orange-100 to-red-100 rounded-full blur-3xl opacity-50"></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Heart illustration */}
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-red-200 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-red-100 to-pink-100 rounded-full p-8 mb-2">
                    <Heart className="w-20 h-20 text-red-500 mx-auto" strokeWidth={1.5} />
                  </div>
                  {/* Floating food icons */}
                  <div className="absolute -top-2 -right-2 text-3xl animate-bounce">❤️</div>
                  <div className="absolute -bottom-2 -left-2 text-2xl animate-bounce animation-delay-2000">⭐</div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3">You haven't saved any favorites yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                  Start building your collection of favorite local restaurants. When you find something you love, tap the heart to save it here!
                </p>
                
                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <span>Explore Restaurants</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/local-picks"
                    className="inline-flex items-center justify-center px-8 py-4 border-2 border-orange-200 bg-white text-orange-600 rounded-xl font-semibold hover:bg-orange-50 transition-all duration-200"
                  >
                    Explore Local Picks
                  </Link>
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🔖</div>
                    <div className="text-xs text-gray-600">Quick Access</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-xs text-gray-600">Track Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">💝</div>
                    <div className="text-xs text-gray-600">Easy Ordering</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State - No Search/Filter Results */}
          {!isLoading && !error && filteredAndSortedFavorites.length === 0 && (searchQuery || activeFilterCount > 0) && (
            <div className="text-center py-16">
              <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites match your search/filters</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filters
              </p>
              <button
                onClick={handleClearFilters}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Clear Search & Filters
              </button>
            </div>
          )}

          {/* Favorites Grid */}
          {!isLoading && !error && filteredAndSortedFavorites.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedFavorites.map((fav) => {
                const isPendingRemoval = pendingUndoRemoval?.restaurant_id === fav.restaurant.restaurant_id;
                const isSelected = selectedFavoritesIds.includes(fav.restaurant.restaurant_id);
                
                return (
                  <RestaurantCard
                    key={fav.favorite.favorite_id}
                    favorite={fav}
                    userLocation={userLocation}
                    batchSelectMode={batchSelectMode}
                    isSelected={isSelected}
                    isPendingRemoval={isPendingRemoval}
                    onToggleSelect={toggleFavoriteSelection}
                    onRemove={handleRemoveFavorite}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4">
              <span>{toastMessage.message}</span>
              {toastMessage.action && (
                <button
                  onClick={toastMessage.action}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded font-medium transition-colors"
                >
                  Undo
                </button>
              )}
              <button
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Remove {selectedFavoritesIds.length} restaurant{selectedFavoritesIds.length > 1 ? 's' : ''} from favorites?
              </h3>
              <p className="text-gray-600 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBatchRemove}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// RESTAURANT CARD COMPONENT
// ============================================================================

interface RestaurantCardProps {
  favorite: FavoriteWithRestaurant;
  userLocation: {
    latitude: number | null;
    longitude: number | null;
    permission_granted: boolean;
  };
  batchSelectMode: boolean;
  isSelected: boolean;
  isPendingRemoval: boolean;
  onToggleSelect: (restaurant_id: string) => void;
  onRemove: (restaurant_id: string, favorite_id: string) => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  favorite,
  userLocation,
  batchSelectMode,
  isSelected,
  isPendingRemoval,
  onToggleSelect,
  onRemove,
}) => {
  const { restaurant } = favorite;

  const distance = useMemo(() => {
    if (userLocation.latitude && userLocation.longitude) {
      return calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
    }
    return null;
  }, [userLocation, restaurant]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (batchSelectMode) {
      e.preventDefault();
      onToggleSelect(restaurant.restaurant_id);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
        isPendingRemoval ? 'opacity-50' : 'hover:shadow-xl hover:scale-105'
      } ${batchSelectMode ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      {/* Checkbox for batch select */}
      {batchSelectMode && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-orange-600 border-orange-600'
                : 'bg-white border-gray-300'
            }`}
          >
            {isSelected && <Check className="h-4 w-4 text-white" />}
          </div>
        </div>
      )}

      {/* Restaurant Image */}
      <Link to={`/restaurant/${restaurant.restaurant_id}`} className="block">
        <div className="relative h-48 bg-gray-200">
          {restaurant.primary_hero_image_url ? (
            <img
              src={restaurant.primary_hero_image_url}
              alt={restaurant.restaurant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
          
          {/* Favorite Icon */}
          {!batchSelectMode && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(restaurant.restaurant_id, favorite.favorite.favorite_id);
              }}
              className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            </button>
          )}
        </div>
      </Link>

      {/* Restaurant Info */}
      <Link to={`/restaurant/${restaurant.restaurant_id}`} className="block p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
          {restaurant.restaurant_name}
        </h3>

        {/* Cuisine Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {restaurant.cuisine_types.slice(0, 2).map((cuisine, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full"
            >
              {cuisine}
            </span>
          ))}
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-900">
              {Number(restaurant.average_rating).toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ({restaurant.total_review_count})
          </span>
        </div>

        {/* Price & Distance */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">
              {'$'.repeat(restaurant.price_range)}
            </span>
          </div>
          {distance !== null && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{distance.toFixed(1)} mi</span>
            </div>
          )}
        </div>

        {/* Open/Closed Status */}
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              restaurant.is_currently_open
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {restaurant.is_currently_open ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </Link>

      {/* Order Now Button */}
      {!batchSelectMode && restaurant.is_currently_open && (
        <div className="px-4 pb-4">
          <Link
            to={`/restaurant/${restaurant.restaurant_id}`}
            className="block w-full px-4 py-2 bg-orange-600 text-white text-center rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Order Now
          </Link>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FILTER PANEL COMPONENT
// ============================================================================

interface FilterPanelProps {
  activeFilters: ActiveFilters;
  onApply: (filters: ActiveFilters) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ activeFilters, onApply, onClose }) => {
  const [filters, setFilters] = useState<ActiveFilters>(activeFilters);

  const cuisineOptions = [
    'Italian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'Indian', 'American',
    'Mediterranean', 'Korean', 'Vietnamese', 'Middle Eastern', 'French'
  ];

  const toggleCuisine = (cuisine: string) => {
    setFilters(prev => ({
      ...prev,
      cuisine_types: prev.cuisine_types.includes(cuisine)
        ? prev.cuisine_types.filter(c => c !== cuisine)
        : [...prev.cuisine_types, cuisine]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Cuisine Types */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Cuisine Type</h3>
        <div className="flex flex-wrap gap-2">
          {cuisineOptions.map(cuisine => (
            <button
              key={cuisine}
              onClick={() => toggleCuisine(cuisine)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filters.cuisine_types.includes(cuisine)
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(price => (
            <button
              key={price}
              onClick={() => {
                if (filters.price_min === price && filters.price_max === price) {
                  setFilters(prev => ({ ...prev, price_min: null, price_max: null }));
                } else {
                  setFilters(prev => ({ ...prev, price_min: price, price_max: price }));
                }
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.price_min === price && filters.price_max === price
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {'$'.repeat(price)}
            </button>
          ))}
        </div>
      </div>

      {/* Open Now Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Open Now</span>
        <button
          onClick={() => setFilters(prev => ({ ...prev, open_now: !prev.open_now }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            filters.open_now ? 'bg-orange-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              filters.open_now ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onApply(filters)}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default UV_Favorites;