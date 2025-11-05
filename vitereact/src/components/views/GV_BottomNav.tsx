import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MapPin, Heart, User, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/main';

const GV_BottomNav: React.FC = () => {
  // ========================================================================
  // STATE & HOOKS
  // ========================================================================
  
  // CRITICAL: Individual Zustand selectors to avoid infinite loops
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const favoritesCount = useAppStore(
    (state) => state.favorites_list.restaurant_ids.length
  );
  const locationPermissionGranted = useAppStore(
    (state) => state.user_location.permission_granted
  );
  
  const location = useLocation();
  const navigate = useNavigate();
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================

  // Determine if current route is active
  const isActive = (path: string): boolean => {
    const currentPath = location.pathname;
    
    // Exact match for home route
    if (path === '/') {
      return currentPath === '/';
    }
    
    // Prefix match for other routes
    return currentPath.startsWith(path);
  };

  // ========================================================================
  // ACTION HANDLERS
  // ========================================================================

  // Handle favorites click - show modal for guests, navigate for authenticated
  const handleFavoritesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setShowSignUpModal(true);
    } else {
      navigate('/favorites');
    }
  };

  // Handle profile click - navigate to login for guests, profile for authenticated
  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/profile');
    }
  };

  // ========================================================================
  // NAVIGATION ITEMS CONFIGURATION
  // ========================================================================

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
      action: null,
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search',
      action: null,
    },
    {
      id: 'map',
      label: 'Map',
      icon: MapPin,
      path: '/map',
      action: null,
      showBadge: !locationPermissionGranted,
      badgeType: 'warning' as const,
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Heart,
      path: '/favorites',
      action: handleFavoritesClick,
      showBadge: isAuthenticated && favoritesCount > 0,
      badgeType: 'count' as const,
      badgeCount: favoritesCount,
    },
    {
      id: 'profile',
      label: isAuthenticated ? 'Profile' : 'Account',
      icon: User,
      path: isAuthenticated ? '/profile' : '/login',
      action: handleProfileClick,
    },
  ];

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <>
      {/* ================================================================== */}
      {/* BOTTOM NAVIGATION BAR - MOBILE ONLY */}
      {/* ================================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            // Navigation item content (shared between Link and button)
            const content = (
              <div className="relative flex flex-col items-center justify-center w-full h-full min-w-[44px] min-h-[44px] transition-colors">
                {/* Icon Container */}
                <div className="relative">
                  <Icon
                    className={`transition-all duration-200 ${
                      active ? 'text-orange-600' : 'text-gray-600'
                    }`}
                    size={24}
                    strokeWidth={active ? 2.5 : 2}
                    fill={
                      active && item.id === 'favorites' && isAuthenticated
                        ? 'currentColor'
                        : 'none'
                    }
                  />
                  
                  {/* Count Badge (Favorites) */}
                  {item.showBadge &&
                    item.badgeType === 'count' &&
                    item.badgeCount &&
                    item.badgeCount > 0 && (
                      <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full">
                        {item.badgeCount > 99 ? '99+' : item.badgeCount}
                      </span>
                    )}
                  
                  {/* Warning Badge (Map - location permission) */}
                  {item.showBadge && item.badgeType === 'warning' && (
                    <span className="absolute -top-1 -right-2 flex items-center justify-center w-[18px] h-[18px]">
                      <AlertCircle className="text-orange-500" size={14} />
                    </span>
                  )}
                </div>
                
                {/* Label */}
                <span
                  className={`text-[11px] mt-1 font-medium transition-colors ${
                    active ? 'text-orange-600' : 'text-gray-600'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            );

            // If item has custom action handler, render as button
            if (item.action) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded-lg"
                  aria-label={item.label}
                >
                  {content}
                </button>
              );
            }

            // Otherwise, render as Link for standard navigation
            return (
              <Link
                key={item.id}
                to={item.path}
                className="flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded-lg"
                aria-label={item.label}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ================================================================== */}
      {/* SIGN-UP MODAL - SHOWN WHEN GUEST CLICKS FAVORITES */}
      {/* ================================================================== */}
      {showSignUpModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 px-4"
          onClick={() => setShowSignUpModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="text-center">
              {/* Icon */}
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Heart className="text-orange-600" size={32} />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Join Local Eats
              </h2>
              
              {/* Subtitle */}
              <p className="text-gray-600 mb-6">
                Sign up to save your favorite restaurants and unlock exclusive features
              </p>

              {/* Benefits List */}
              <div className="text-left mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">
                    Save favorite restaurants for quick access
                  </span>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">
                    Place orders in seconds
                  </span>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">
                    Write reviews and earn badges
                  </span>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">
                    Get personalized recommendations
                  </span>
                </div>
                
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">
                    Access exclusive discounts
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Sign Up Button */}
                <Link
                  to="/signup"
                  onClick={() => setShowSignUpModal(false)}
                  className="block w-full px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200"
                >
                  Sign Up
                </Link>
                
                {/* Log In Link */}
                <Link
                  to="/login"
                  onClick={() => setShowSignUpModal(false)}
                  className="block w-full px-6 py-3 text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors duration-200"
                >
                  Log In
                </Link>
                
                {/* Continue as Guest */}
                <button
                  onClick={() => setShowSignUpModal(false)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_BottomNav;