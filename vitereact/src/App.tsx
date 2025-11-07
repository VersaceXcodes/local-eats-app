import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// Global Views
import GV_TopNav from '@/components/views/GV_TopNav';
import GV_BottomNav from '@/components/views/GV_BottomNav';
import GV_Footer from '@/components/views/GV_Footer';

// Unique Views
import UV_Landing from '@/components/views/UV_Landing';
import UV_SignUp from '@/components/views/UV_SignUp';
import UV_Login from '@/components/views/UV_Login';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword';
import UV_ResetPassword from '@/components/views/UV_ResetPassword';
import UV_RestaurantDetail from '@/components/views/UV_RestaurantDetail';
import UV_SearchResults from '@/components/views/UV_SearchResults';
import UV_MapView from '@/components/views/UV_MapView';
import UV_Favorites from '@/components/views/UV_Favorites';
import UV_Cart from '@/components/views/UV_Cart';
import UV_Checkout from '@/components/views/UV_Checkout';
import UV_OrderConfirmation from '@/components/views/UV_OrderConfirmation';
import UV_OrderTracking from '@/components/views/UV_OrderTracking';
import UV_OrderHistory from '@/components/views/UV_OrderHistory';
import UV_OrderDetail from '@/components/views/UV_OrderDetail';
import UV_WriteReview from '@/components/views/UV_WriteReview';
import UV_EditReview from '@/components/views/UV_EditReview';
import UV_Profile from '@/components/views/UV_Profile';
import UV_Settings from '@/components/views/UV_Settings';
import UV_Notifications from '@/components/views/UV_Notifications';
import UV_LocalPicks from '@/components/views/UV_LocalPicks';
import UV_Terms from '@/components/views/UV_Terms';
import UV_Privacy from '@/components/views/UV_Privacy';
import UV_404 from '@/components/views/UV_404';

// ============================================================================
// QUERY CLIENT SETUP
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// LOADING SPINNER COMPONENT
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITICAL: Use individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const isLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================

// Define which routes show which global components
const LAYOUT_CONFIG: Record<
  string,
  { showTopNav: boolean; showBottomNav: boolean; showFooter: boolean }
> = {
  '/': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/signup': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/login': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/password-reset': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/reset': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/search': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/map': { showTopNav: true, showBottomNav: true, showFooter: false },
  '/restaurant': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/favorites': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/cart': { showTopNav: true, showBottomNav: true, showFooter: false },
  '/checkout': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/order-confirmation': { showTopNav: false, showBottomNav: false, showFooter: false },
  '/order-history': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/order': { showTopNav: true, showBottomNav: true, showFooter: false },
  '/profile': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/settings': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/notifications': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/review': { showTopNav: true, showBottomNav: true, showFooter: false },
  '/local-picks': { showTopNav: true, showBottomNav: true, showFooter: true },
  '/terms': { showTopNav: true, showBottomNav: false, showFooter: true },
  '/privacy': { showTopNav: true, showBottomNav: false, showFooter: true },
  '/404': { showTopNav: true, showBottomNav: true, showFooter: true },
};

// ============================================================================
// LAYOUT WRAPPER COMPONENT
// ============================================================================

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // Determine layout configuration based on current path
  const getLayoutConfig = () => {
    const path = location.pathname;

    // Exact match first
    if (LAYOUT_CONFIG[path]) {
      return LAYOUT_CONFIG[path];
    }

    // Partial match for dynamic routes
    for (const [key, config] of Object.entries(LAYOUT_CONFIG)) {
      if (path.startsWith(key)) {
        return config;
      }
    }

    // Default: show all navigation
    return { showTopNav: true, showBottomNav: true, showFooter: true };
  };

  const { showTopNav, showBottomNav, showFooter } = getLayoutConfig();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation - Desktop/Tablet (hidden on mobile via CSS) */}
      {showTopNav && (
        <div className="hidden md:block">
          <GV_TopNav />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      {showFooter && <GV_Footer />}

      {/* Bottom Navigation - Mobile only (hidden on desktop via CSS) */}
      {showBottomNav && (
        <div className="md:hidden">
          <GV_BottomNav />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  // CRITICAL: Use individual selectors to avoid infinite loops
  const isLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const initializeAuth = useAppStore((state) => state.initialize_auth);
  const setUserLocation = useAppStore((state) => state.set_user_location);
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const userLocation = useAppStore((state) => state.user_location);

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Request browser geolocation when user is authenticated with location permission
  useEffect(() => {
    if (!currentUser) return;

    const requestGeolocation = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token}`,
            },
          }
        );
        const userData = await response.json();

        if (userData.location_permission_granted && !userLocation.permission_granted) {
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation(
                  position.coords.latitude,
                  position.coords.longitude
                );
              },
              (error) => {
                console.log('Geolocation error:', error.message);
                setUserLocation(45.5152, -122.6784, 'Portland', 'OR');
              },
              {
                timeout: 5000,
                maximumAge: 300000
              }
            );
          } else {
            setUserLocation(45.5152, -122.6784, 'Portland', 'OR');
          }
        }
      } catch (error) {
        console.error('Failed to check location permission:', error);
      }
    };

    requestGeolocation();
  }, [currentUser, setUserLocation, userLocation.permission_granted]);

  // Show loading spinner during auth initialization
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <LayoutWrapper>
          <Routes>
            {/* ============================================================ */}
            {/* PUBLIC ROUTES */}
            {/* ============================================================ */}

            {/* Landing Page */}
            <Route path="/" element={<UV_Landing />} />

            {/* Authentication Routes */}
            <Route path="/signup" element={<UV_SignUp />} />
            <Route path="/login" element={<UV_Login />} />
            <Route path="/password-reset" element={<UV_ForgotPassword />} />
            <Route path="/reset/:reset_token" element={<UV_ResetPassword />} />

            {/* Discovery Routes */}
            <Route path="/search" element={<UV_SearchResults />} />
            <Route path="/map" element={<UV_MapView />} />
            <Route path="/restaurant/:restaurant_id" element={<UV_RestaurantDetail />} />
            <Route path="/local-picks" element={<UV_LocalPicks />} />

            {/* Legal Pages */}
            <Route path="/terms" element={<UV_Terms />} />
            <Route path="/privacy" element={<UV_Privacy />} />

            {/* Cart - Public but limited without auth */}
            <Route path="/cart" element={<UV_Cart />} />

            {/* ============================================================ */}
            {/* PROTECTED ROUTES */}
            {/* ============================================================ */}

            {/* Favorites */}
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <UV_Favorites />
                </ProtectedRoute>
              }
            />

            {/* Checkout & Orders */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <UV_Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-confirmation/:order_id"
              element={
                <ProtectedRoute>
                  <UV_OrderConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:order_id/track"
              element={
                <ProtectedRoute>
                  <UV_OrderTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-history"
              element={
                <ProtectedRoute>
                  <UV_OrderHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order/:order_id"
              element={
                <ProtectedRoute>
                  <UV_OrderDetail />
                </ProtectedRoute>
              }
            />

            {/* Reviews */}
            <Route
              path="/restaurant/:restaurant_id/review"
              element={
                <ProtectedRoute>
                  <UV_WriteReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review/:review_id/edit"
              element={
                <ProtectedRoute>
                  <UV_EditReview />
                </ProtectedRoute>
              }
            />

            {/* User Account */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UV_Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <UV_Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <UV_Notifications />
                </ProtectedRoute>
              }
            />

            {/* ============================================================ */}
            {/* CATCH-ALL 404 ROUTE */}
            {/* ============================================================ */}
            <Route path="*" element={<UV_404 />} />
          </Routes>
        </LayoutWrapper>
      </Router>
    </QueryClientProvider>
  );
};

export default App;