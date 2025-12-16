import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Search, ShoppingCart, Bell, User, LogOut, Package, Heart, Settings, X, Clock, ChefHat, UtensilsCrossed, Filter, MapPin, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SearchSuggestion {
  type: 'restaurant' | 'cuisine' | 'dish';
  value: string;
  restaurant_id: string | null;
}

interface SearchHistory {
  search_id: string;
  search_query: string;
  created_at: string;
}

interface Notification {
  notification_id: string;
  notification_type: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

type DropdownState = 'search' | 'notifications' | 'user_menu' | null;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // ========================================================================
  // GLOBAL STATE (CRITICAL: Individual selectors only)
  // ========================================================================

  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartItems = useAppStore(state => state.cart_state.items);
  const unreadNotificationCount = useAppStore(state => state.notification_state.unread_count);
  const activeFilters = useAppStore(state => state.active_filters);
  const locationPermissionGranted = useAppStore(state => state.user_location.permission_granted);
  const logoutUser = useAppStore(state => state.logout_user);

  // Calculate derived values
  const cartItemCount = cartItems.length;
  const activeFiltersCount = [
    activeFilters.cuisine_types.length > 0,
    activeFilters.price_min !== null,
    activeFilters.price_max !== null,
    activeFilters.distance_max !== null,
    activeFilters.rating_min !== null,
    activeFilters.dietary_preferences.length > 0,
    activeFilters.open_now,
    activeFilters.has_discount,
  ].filter(Boolean).length;

  // ========================================================================
  // LOCAL STATE
  // ========================================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dropdownOpenState, setDropdownOpenState] = useState<DropdownState>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Refs for dropdown containers
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuDropdownRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // DEBOUNCE SEARCH QUERY (300ms)
  // ========================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ========================================================================
  // API QUERIES
  // ========================================================================

  // Fetch search suggestions (when user is typing)
  const { data: searchSuggestions = [] } = useQuery<SearchSuggestion[]>({
    queryKey: ['searchSuggestions', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return [];
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/search/suggestions`,
        {
          params: {
            query: debouncedSearchQuery,
            limit: 10,
          },
        }
      );
      
      return response.data.suggestions || [];
    },
    enabled: debouncedSearchQuery.length > 0,
    staleTime: 60000, // 1 minute
  });

  // Fetch recent searches (when search bar is focused and empty)
  const { data: recentSearchesData } = useQuery<{ searches: SearchHistory[] }>({
    queryKey: ['recentSearches'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/search/recent`,
        {
          params: { limit: 10 },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      
      return response.data;
    },
    enabled: isAuthenticated && searchFocused && searchQuery.length === 0,
    staleTime: 60000,
  });

  const recentSearches = recentSearchesData?.searches || [];

  // Fetch notifications (when bell icon is clicked)
  const { data: notificationsData, refetch: refetchNotifications } = useQuery<{
    notifications: Notification[];
    unread_count: number;
  }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications`,
        {
          params: { limit: 20, offset: 0 },
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      
      return response.data;
    },
    enabled: false, // Fetch manually when dropdown opens
    staleTime: 30000, // 30 seconds
  });

  const notificationsList = notificationsData?.notifications || [];

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  // Clear search history
  const clearSearchHistoryMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/search/recent`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentSearches'] });
    },
  });

  // Mark notification as read
  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all notifications as read
  const markAllNotificationsReadMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/read-all`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (authToken) {
        try {
          await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`,
            {},
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          );
        } catch (error) {
          console.warn('Logout API call failed, but proceeding with client-side logout:', error);
        }
      }
      logoutUser();
    },
    onSuccess: () => {
      navigate('/');
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      navigate('/');
    },
  });

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setDropdownOpenState(null);
      setSearchFocused(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'restaurant' && suggestion.restaurant_id) {
      navigate(`/restaurant/${suggestion.restaurant_id}`);
    } else {
      navigate(`/search?query=${encodeURIComponent(suggestion.value)}`);
    }
    setSearchQuery('');
    setDropdownOpenState(null);
    setSearchFocused(false);
  };

  const handleRecentSearchClick = (searchQuery: string) => {
    navigate(`/search?query=${encodeURIComponent(searchQuery)}`);
    setSearchQuery('');
    setDropdownOpenState(null);
    setSearchFocused(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markNotificationReadMutation.mutate(notification.notification_id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
    
    setDropdownOpenState(null);
  };

  const handleLogout = async () => {
    setDropdownOpenState(null);
    try {
      logoutMutation.mutate();
    } catch (error) {
      console.error('Error during logout:', error);
      logoutUser();
      navigate('/');
    }
  };

  const toggleDropdown = (dropdown: DropdownState) => {
    if (dropdownOpenState === dropdown) {
      setDropdownOpenState(null);
    } else {
      setDropdownOpenState(dropdown);
      
      // Fetch notifications when opening notifications dropdown
      if (dropdown === 'notifications' && isAuthenticated) {
        refetchNotifications();
      }
    }
  };

  // ========================================================================
  // CLICK OUTSIDE HANDLER
  // ========================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(target) &&
        dropdownOpenState === 'search'
      ) {
        setDropdownOpenState(null);
        setSearchFocused(false);
      }
      
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(target) &&
        dropdownOpenState === 'notifications'
      ) {
        setDropdownOpenState(null);
      }
      
      if (
        userMenuDropdownRef.current &&
        !userMenuDropdownRef.current.contains(target) &&
        dropdownOpenState === 'user_menu'
      ) {
        setDropdownOpenState(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpenState]);

  // ========================================================================
  // KEYBOARD HANDLER (ESC to close dropdowns)
  // ========================================================================

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpenState(null);
        setSearchFocused(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  // ========================================================================
  // CLOSE DROPDOWNS ON ROUTE CHANGE
  // ========================================================================

  useEffect(() => {
    setDropdownOpenState(null);
    setSearchFocused(false);
  }, [location.pathname]);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_update':
        return <Package className="w-4 h-4 text-blue-600" />;
      case 'promotion':
      case 'discount':
        return <UtensilsCrossed className="w-4 h-4 text-orange-600" />;
      case 'badge_earned':
        return <ChefHat className="w-4 h-4 text-yellow-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Determine if filter button should be shown
  const showFilterButton = [
    '/',
    '/search',
    '/favorites',
    '/map',
  ].some(path => location.pathname.startsWith(path));

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-[70px]">
            
            {/* ============================================================ */}
            {/* LEFT SECTION: Logo */}
            {/* ============================================================ */}
            
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-all duration-200 group">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative w-11 h-11 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                    <div className="text-xl">🍽️</div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">Local Eats</span>
                  <span className="text-xs text-gray-500 font-medium">Hidden Gems</span>
                </div>
              </Link>
            </div>

            {/* ============================================================ */}
            {/* CENTER SECTION: Search Bar */}
            {/* ============================================================ */}
            
            <div className="flex-1 max-w-2xl mx-8 relative" ref={searchDropdownRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search restaurants, cuisines, dishes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      setSearchFocused(true);
                      setDropdownOpenState('search');
                    }}
                    className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>

              {/* Search Dropdown */}
              {dropdownOpenState === 'search' && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border-2 border-gray-100 max-h-[450px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Search Suggestions */}
                  {searchQuery.trim() && searchSuggestions.length > 0 && (
                    <div className="p-3">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2.5">
                        Suggestions
                      </div>
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-orange-200 hover:shadow-sm"
                        >
                          {suggestion.type === 'restaurant' && <UtensilsCrossed className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />}
                          {suggestion.type === 'cuisine' && <ChefHat className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />}
                          {suggestion.type === 'dish' && <UtensilsCrossed className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />}
                          <span className="text-sm font-medium text-gray-900 flex-1 group-hover:text-orange-600 transition-colors">{suggestion.value}</span>
                          <span className="text-xs font-semibold text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded-full group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">{suggestion.type}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recent Searches */}
                  {isAuthenticated && !searchQuery.trim() && recentSearches.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Recent Searches
                        </div>
                        <button
                          onClick={() => clearSearchHistoryMutation.mutate()}
                          className="text-xs text-orange-600 hover:text-orange-700 font-bold hover:underline transition-all"
                        >
                          Clear All
                        </button>
                      </div>
                      {recentSearches.map((search) => (
                        <button
                          key={search.search_id}
                          onClick={() => handleRecentSearchClick(search.search_query)}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-orange-200 hover:shadow-sm"
                        >
                          <Clock className="w-5 h-5 text-gray-400 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
                          <span className="text-sm font-medium text-gray-900 flex-1 group-hover:text-orange-600 transition-colors">{search.search_query}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!searchQuery.trim() && (!isAuthenticated || recentSearches.length === 0) && (
                    <div className="p-10 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl mb-4">
                        <Search className="w-8 h-8 text-orange-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-600">
                        Start typing to search restaurants, cuisines, or dishes
                      </p>
                    </div>
                  )}

                  {searchQuery.trim() && searchSuggestions.length === 0 && (
                    <div className="p-10 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        No suggestions found
                      </p>
                      <p className="text-xs text-gray-500">
                        Press Enter to search for "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* RIGHT SECTION: Action Buttons */}
            {/* ============================================================ */}
            
            <div className="flex items-center space-x-1">
              
              {/* Map Button */}
              <Link
                to="/map"
                className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Map"
              >
                <MapPin className="w-5 h-5" />
                {!locationPermissionGranted && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  </span>
                )}
              </Link>

              {/* Filters Button (conditional) */}
              {showFilterButton && (
                <button
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  aria-label="Filters"
                >
                  <Filter className="w-5 h-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              )}

              {/* Favorites Button (authenticated users only) */}
              {isAuthenticated && (
                <Link
                  to="/favorites"
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  aria-label="Favorites"
                >
                  <Heart className="w-5 h-5" />
                </Link>
              )}

              {/* Cart Button (authenticated users only) */}
              {isAuthenticated && (
                <Link
                  to="/cart"
                  className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  aria-label="Shopping Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Notifications Button (authenticated users only) */}
              {isAuthenticated && (
                <div className="relative" ref={notificationsDropdownRef}>
                  <button
                    onClick={() => toggleDropdown('notifications')}
                    className="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {dropdownOpenState === 'notifications' && (
                    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-hidden z-50">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {notificationsList.some(n => !n.is_read) && (
                          <button
                            onClick={() => markAllNotificationsReadMutation.mutate()}
                            className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                          >
                            Mark All as Read
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="overflow-y-auto max-h-[420px]">
                        {notificationsList.length > 0 ? (
                          notificationsList.map((notification) => (
                            <button
                              key={notification.notification_id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`w-full flex items-start space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left ${
                                !notification.is_read ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                {getNotificationIcon(notification.notification_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatNotificationTime(notification.created_at)}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-8 text-center text-sm text-gray-500">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p>You're all caught up!</p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notificationsList.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <Link
                            to="/notifications"
                            onClick={() => setDropdownOpenState(null)}
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          >
                            View All Notifications
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* User Menu (authenticated) or Auth Buttons (guest) */}
              {isAuthenticated ? (
                <div className="relative ml-2" ref={userMenuDropdownRef}>
                  <button
                    onClick={() => toggleDropdown('user_menu')}
                    className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label="User Menu"
                  >
                    {currentUser?.profile_picture_url ? (
                      <img
                        src={currentUser.profile_picture_url}
                        alt={currentUser.full_name}
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>

                  {/* User Menu Dropdown */}
                  {dropdownOpenState === 'user_menu' && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="font-semibold text-gray-900 truncate">{currentUser?.full_name}</p>
                        <p className="text-sm text-gray-600 truncate">{currentUser?.email}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpenState(null)}
                          className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-900">Profile</span>
                        </Link>

                        <Link
                          to="/order-history"
                          onClick={() => setDropdownOpenState(null)}
                          className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <Package className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-900">Order History</span>
                        </Link>

                        <Link
                          to="/favorites"
                          onClick={() => setDropdownOpenState(null)}
                          className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <Heart className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-900">Favorites</span>
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setDropdownOpenState(null)}
                          className="flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-900">Settings</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-200">
                        <button
                          onClick={handleLogout}
                          disabled={logoutMutation.isPending}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {logoutMutation.isPending ? 'Logging out...' : 'Log Out'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 ml-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Spacer to prevent content from going under fixed header */}
      <div className="hidden md:block h-16 md:h-[70px]"></div>
    </>
  );
};

export default GV_TopNav;