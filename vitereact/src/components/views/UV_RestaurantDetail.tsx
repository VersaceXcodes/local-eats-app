import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Phone, 
  Clock, 
  ChevronRight, 
  X, 
  Search,
  Star,
  ThumbsUp,
  Flag,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle
} from 'lucide-react';

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

interface RestaurantHours {
  hours_id: string;
  restaurant_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

interface RestaurantPhoto {
  photo_id: string;
  restaurant_id: string;
  photo_url: string;
  caption: string | null;
  display_order: number;
  uploaded_by_user_id: string | null;
  created_at: string;
}

interface MenuCategory {
  category_id: string;
  restaurant_id: string;
  category_name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface MenuItem {
  menu_item_id: string;
  restaurant_id: string;
  category_id: string;
  item_name: string;
  description: string | null;
  base_price: number;
  item_photo_url: string | null;
  dietary_preferences: string[];
  allergen_info: string[];
  spice_level: number | null;
  is_popular: boolean;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface MenuData {
  categories: Array<{
    category: MenuCategory;
    items: MenuItem[];
  }>;
}

interface Discount {
  discount_id: string;
  restaurant_id: string;
  discount_type: string;
  discount_value: number;
  coupon_code: string | null;
  qr_code_data: string | null;
  description: string;
  terms_conditions: string | null;
  minimum_order_amount: number | null;
  excluded_items: string[];
  valid_days: number[];
  is_one_time_use: boolean;
  max_redemptions_per_user: number | null;
  total_redemption_limit: number | null;
  current_redemption_count: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  is_local_picks_exclusive: boolean;
  created_at: string;
  updated_at: string;
}

interface Review {
  review_id: string;
  user_id: string;
  restaurant_id: string;
  order_id: string | null;
  star_rating: number;
  review_title: string | null;
  review_text: string;
  is_verified_visit: boolean;
  helpful_count: number;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewWithUser {
  review: Review;
  user: {
    user_id: string;
    full_name: string;
    profile_picture_url: string | null;
  };
  photos: Array<{
    photo_id: string;
    photo_url: string;
    display_order: number;
  }>;
  is_helpful_by_current_user: boolean;
}

interface ReviewsData {
  reviews: ReviewWithUser[];
  total_count: number;
  average_rating: number;
  rating_distribution: {
    five_star: number;
    four_star: number;
    three_star: number;
    two_star: number;
    one_star: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 3959; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (miles: number): string => {
  if (miles < 0.1) return 'Less than 0.1 mi';
  return `${miles.toFixed(1)} mi`;
};

const getDayName = (dayIndex: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
};

const isRestaurantOpen = (hours: RestaurantHours[]): { isOpen: boolean; message: string } => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const todayHours = hours.find(h => h.day_of_week === currentDay);
  
  if (!todayHours || todayHours.is_closed || !todayHours.open_time || !todayHours.close_time) {
    return { isOpen: false, message: 'Closed today' };
  }
  
  const isOpen = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
  
  if (isOpen) {
    return { isOpen: true, message: `Closes at ${formatTime(todayHours.close_time)}` };
  } else if (currentTime < todayHours.open_time) {
    return { isOpen: false, message: `Opens at ${formatTime(todayHours.open_time)}` };
  } else {
    const tomorrow = hours.find(h => h.day_of_week === (currentDay + 1) % 7);
    if (tomorrow && !tomorrow.is_closed && tomorrow.open_time) {
      return { isOpen: false, message: `Opens tomorrow at ${formatTime(tomorrow.open_time)}` };
    }
    return { isOpen: false, message: 'Closed' };
  }
};

const getPriceSymbols = (priceRange: number): string => {
  return '$'.repeat(priceRange);
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_RestaurantDetail: React.FC = () => {
  const { restaurant_id } = useParams<{ restaurant_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const section = searchParams.get('section');
  
  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userLatitude = useAppStore(state => state.user_location.latitude);
  const userLongitude = useAppStore(state => state.user_location.longitude);
  const locationPermissionGranted = useAppStore(state => state.user_location.permission_granted);
  const favoriteRestaurantIds = useAppStore(state => state.favorites_list.restaurant_ids);
  const toggleFavorite = useAppStore(state => state.toggle_favorite);
  const addToCart = useAppStore(state => state.add_to_cart);
  const cartItems = useAppStore(state => state.cart_state.items);
  const cartRestaurantId = useAppStore(state => state.cart_state.restaurant_id);
  
  // Local state
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [showHoursExpanded, setShowHoursExpanded] = useState(false);
  const [activeMenuCategory] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [reviewSortOption, setReviewSortOption] = useState('created_at');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null);
  const [reviewsPaginationOffset, setReviewsPaginationOffset] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [expandedDiscountTerms, setExpandedDiscountTerms] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [addedItemName, setAddedItemName] = useState('');
  
  // Refs for scrolling
  const menuSectionRef = useRef<HTMLDivElement>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const discountsSectionRef = useRef<HTMLDivElement>(null);
  
  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // ============================================================================
  // API QUERIES
  // ============================================================================
  
  // Fetch restaurant details
  const { data: restaurant, isLoading: isLoadingRestaurant, error: restaurantError } = useQuery<Restaurant>({
    queryKey: ['restaurant', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}`);
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  // Fetch restaurant hours
  const { data: hoursData } = useQuery<{ hours: RestaurantHours[] }>({
    queryKey: ['restaurant-hours', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}/hours`);
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch restaurant photos
  const { data: photosData } = useQuery<{ photos: RestaurantPhoto[] }>({
    queryKey: ['restaurant-photos', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}/photos`);
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch restaurant menu
  const { data: menuData, isLoading: isLoadingMenu } = useQuery<MenuData>({
    queryKey: ['restaurant-menu', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}/menu`);
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch active discounts
  const { data: discountsData } = useQuery<{ discounts: Discount[] }>({
    queryKey: ['restaurant-discounts', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}/discounts`);
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch reviews
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery<ReviewsData>({
    queryKey: ['restaurant-reviews', restaurant_id, reviewSortOption, reviewRatingFilter, reviewsPaginationOffset],
    queryFn: async () => {
      const params: any = {
        sort_by: reviewSortOption,
        sort_order: 'desc',
        limit: 20,
        offset: reviewsPaginationOffset,
      };
      
      if (reviewRatingFilter !== null) {
        params.min_rating = reviewRatingFilter;
        params.max_rating = reviewRatingFilter;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/restaurants/${restaurant_id}/reviews`, { params });
      return response.data;
    },
    enabled: !!restaurant_id,
    staleTime: 2 * 60 * 1000,
  });
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Scroll to section on mount if URL param present
  useEffect(() => {
    if (section && !isLoadingRestaurant) {
      setTimeout(() => {
        if (section === 'menu' && menuSectionRef.current) {
          menuSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        } else if (section === 'reviews' && reviewsSectionRef.current) {
          reviewsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        } else if (section === 'discounts' && discountsSectionRef.current) {
          discountsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }
  }, [section, isLoadingRestaurant]);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isFavorited = restaurant_id ? favoriteRestaurantIds.includes(restaurant_id) : false;
  
  const distance = restaurant && userLatitude && userLongitude && locationPermissionGranted
    ? calculateDistance(userLatitude, userLongitude, restaurant.latitude, restaurant.longitude)
    : null;
  
  const openStatus = hoursData?.hours ? isRestaurantOpen(hoursData.hours) : null;
  
  const photos = photosData?.photos || [];
  const allPhotos = restaurant?.primary_hero_image_url 
    ? [{ photo_url: restaurant.primary_hero_image_url, photo_id: 'primary', display_order: -1, caption: null }, ...photos]
    : photos;
  
  const filteredMenuItems = menuData?.categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      menuSearchQuery === '' || 
      item.item_name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(menuSearchQuery.toLowerCase()))
    )
  })).filter(cat => cat.items.length > 0) || [];
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    if (restaurant_id) {
      toggleFavorite(restaurant_id);
    }
  };
  
  const handleShareClick = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant?.restaurant_name || 'Restaurant',
          url: url,
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };
  
  const handleGetDirections = () => {
    if (!restaurant) return;
    
    const address = `${restaurant.street_address}, ${restaurant.city}, ${restaurant.state} ${restaurant.zip_code}`;
    const encodedAddress = encodeURIComponent(address);
    
    // Try to detect if user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };
  
  const handleCallRestaurant = () => {
    if (restaurant?.phone_number) {
      window.location.href = `tel:${restaurant.phone_number}`;
    }
  };
  
  const handleRedeemQRCode = (discount: Discount) => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    
    setSelectedDiscount(discount);
    setShowQRModal(true);
  };
  
  const handleRedeemCoupon = (discount: Discount) => {
    setSelectedDiscount(discount);
    setShowCouponModal(true);
  };
  
  const handleCopyCode = () => {
    if (selectedDiscount?.coupon_code) {
      navigator.clipboard.writeText(selectedDiscount.coupon_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };
  
  const handleReviewSortChange = (sortBy: string) => {
    setReviewSortOption(sortBy);
    setReviewsPaginationOffset(0);
  };
  
  const handleReviewRatingFilter = (rating: number | null) => {
    setReviewRatingFilter(rating);
    setReviewsPaginationOffset(0);
  };
  
  const handleLoadMoreReviews = () => {
    setReviewsPaginationOffset(prev => prev + 20);
  };
  
  const toggleReviewExpanded = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };
  
  const toggleDiscountTerms = (discountId: string) => {
    setExpandedDiscountTerms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(discountId)) {
        newSet.delete(discountId);
      } else {
        newSet.add(discountId);
      }
      return newSet;
    });
  };
  
  const handleWriteReview = () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }
    navigate(`/restaurant/${restaurant_id}/review`);
  };
  
  const handleAddToCart = async (item: MenuItem) => {
    if (!restaurant || !restaurant_id) return;
    
    // Check if cart has items from a different restaurant
    if (cartRestaurantId && cartRestaurantId !== restaurant_id) {
      const confirmed = window.confirm(
        `Your cart contains items from ${cartItems.length > 0 ? 'another restaurant' : ''}. Adding items from ${restaurant.restaurant_name} will clear your current cart. Continue?`
      );
      
      if (!confirmed) return;
    }
    
    const quantity = itemQuantities[item.menu_item_id] || 1;
    
    // Add item to cart
    await addToCart(
      {
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        base_price: parseFloat(String(item.base_price)),
        customizations: {
          size: null,
          add_ons: [],
          modifications: [],
          special_instructions: null,
        },
        quantity: quantity,
      },
      restaurant_id,
      restaurant.restaurant_name
    );
    
    // Reset quantity for this item
    setItemQuantities(prev => ({ ...prev, [item.menu_item_id]: 1 }));
    
    // Show toast notification
    setAddedItemName(`${quantity} x ${item.item_name}`);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 4000);
  };
  
  const handleQuantityChange = (itemId: string, delta: number) => {
    setItemQuantities(prev => {
      const currentQty = prev[itemId] || 1;
      const newQty = Math.max(1, Math.min(99, currentQty + delta));
      return { ...prev, [itemId]: newQty };
    });
  };
  
  const getItemQuantity = (itemId: string): number => {
    return itemQuantities[itemId] || 1;
  };
  
  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  
  if (restaurantError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
            <p className="text-gray-600 mb-8">
              The restaurant you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoadingRestaurant) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          {/* Hero skeleton */}
          <div className="w-full h-64 md:h-96 bg-gray-200 animate-pulse"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main content skeleton */}
              <div className="lg:col-span-2 space-y-8">
                <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* Sidebar skeleton */}
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (!restaurant) {
    return null;
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Hero Image Gallery */}
      <div className="relative w-full h-64 md:h-96 bg-gray-900">
        {allPhotos.length > 0 ? (
          <>
            <img
              src={allPhotos[selectedPhotoIndex]?.photo_url || ''}
              alt={restaurant.restaurant_name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
            
            {/* Image counter */}
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
              {selectedPhotoIndex + 1} / {allPhotos.length}
            </div>
            
            {/* Navigation arrows for desktop */}
            {allPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedPhotoIndex(prev => (prev === 0 ? allPhotos.length - 1 : prev - 1))}
                  className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-900" />
                </button>
                <button
                  onClick={() => setSelectedPhotoIndex(prev => (prev === allPhotos.length - 1 ? 0 : prev + 1))}
                  className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 p-2 rounded-full transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6 text-gray-900" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <p className="text-gray-500">No photos available</p>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Restaurant Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-3">
                    {restaurant.restaurant_name}
                  </h1>
                  
                  {/* Cuisine tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {restaurant.cuisine_types.map((cuisine, index) => (
                      <Link
                        key={index}
                        to={`/search?cuisine_types=${encodeURIComponent(cuisine)}`}
                        className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-orange-200 transition-colors"
                      >
                        {cuisine}
                      </Link>
                    ))}
                  </div>
                  
                  {/* Rating and stats */}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <button
                      onClick={() => reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="flex items-center gap-1 hover:underline"
                    >
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(restaurant.average_rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : i < restaurant.average_rating
                                ? 'fill-yellow-200 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-gray-900 ml-1">
                        {Number(restaurant.average_rating).toFixed(1)}
                      </span>
                      <span className="text-gray-600">({restaurant.total_review_count} reviews)</span>
                    </button>
                    
                    <span className="text-gray-900 font-medium">{getPriceSymbols(restaurant.price_range)}</span>
                    
                    {distance !== null && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {formatDistance(distance)}
                      </span>
                    )}
                  </div>
                  
                  {/* Description */}
                  {restaurant.description && (
                    <p className="mt-4 text-gray-600 leading-relaxed">
                      {restaurant.description}
                    </p>
                  )}
                </div>
                
                {/* Action buttons - desktop */}
                <div className="hidden lg:flex flex-col gap-2 ml-6">
                  <button
                    onClick={handleFavoriteToggle}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isFavorited
                        ? 'bg-red-50 border-red-500 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={handleShareClick}
                    className="p-3 rounded-lg border-2 border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-all"
                    aria-label="Share restaurant"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Action buttons - mobile */}
              <div className="lg:hidden grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={handleFavoriteToggle}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    isFavorited
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  {isFavorited ? 'Favorited' : 'Favorite'}
                </button>
                
                <button
                  onClick={handleShareClick}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
            
            {/* Discounts Section */}
            {discountsData && discountsData.discounts.length > 0 && (
              <div ref={discountsSectionRef} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900">Exclusive Discounts</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discountsData.discounts.map(discount => (
                    <div
                      key={discount.discount_id}
                      className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-2xl font-bold text-orange-700">
                            {discount.discount_type === 'percentage'
                              ? `${Number(discount.discount_value)}% OFF`
                              : `$${Number(discount.discount_value).toFixed(2)} OFF`}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1">{discount.description}</p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-3">
                        Valid until {new Date(discount.end_date).toLocaleDateString()}
                      </p>
                      
                      {/* Terms toggle */}
                      {discount.terms_conditions && (
                        <button
                          onClick={() => toggleDiscountTerms(discount.discount_id)}
                          className="flex items-center gap-1 text-sm text-orange-700 hover:text-orange-800 font-medium mb-3"
                        >
                          {expandedDiscountTerms.has(discount.discount_id) ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide Terms
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              View Terms
                            </>
                          )}
                        </button>
                      )}
                      
                      {expandedDiscountTerms.has(discount.discount_id) && discount.terms_conditions && (
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-3 text-xs text-gray-700">
                          {discount.terms_conditions}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {discount.qr_code_data && (
                          <button
                            onClick={() => handleRedeemQRCode(discount)}
                            className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                          >
                            Redeem with QR
                          </button>
                        )}
                        
                        {discount.coupon_code && (
                          <button
                            onClick={() => handleRedeemCoupon(discount)}
                            className="flex-1 bg-white border-2 border-orange-600 text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                          >
                            Get Code
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Menu Section */}
            <div ref={menuSectionRef} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
                
                {/* Menu search */}
                {menuData && menuData.categories.length > 0 && (
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search menu..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {menuSearchQuery && (
                      <button
                        onClick={() => setMenuSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {isLoadingMenu ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : filteredMenuItems.length > 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Category tabs - sticky */}
                  {menuData && menuData.categories.length > 1 && (
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                      <div className="flex overflow-x-auto scrollbar-hide">
                        {menuData.categories.map(cat => (
                          <button
                            key={cat.category.category_id}
                            onClick={() => {
                              const element = document.getElementById(`category-${cat.category.category_id}`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                              activeMenuCategory === cat.category.category_id
                                ? 'border-orange-600 text-orange-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {cat.category.category_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Menu items */}
                  <div className="p-6 space-y-8">
                    {filteredMenuItems.map(cat => (
                      <div key={cat.category.category_id} id={`category-${cat.category.category_id}`}>
                        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                          {cat.category.category_name}
                        </h3>
                        
                        <div className="space-y-6">
                          {cat.items.map(item => (
                            <div key={item.menu_item_id} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0">
                              {/* Item photo */}
                              {item.item_photo_url && (
                                <img
                                  src={item.item_photo_url}
                                  alt={item.item_name}
                                  className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              
                              {/* Item details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-semibold text-gray-900">{item.item_name}</h4>
                                      {item.is_popular && (
                                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                          Popular
                                        </span>
                                      )}
                                    </div>
                                    
                                    {item.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {item.description}
                                      </p>
                                    )}
                                    
                                    {/* Dietary tags */}
                                    {item.dietary_preferences.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {item.dietary_preferences.map((pref, idx) => (
                                          <span
                                            key={idx}
                                            className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full"
                                          >
                                            {pref}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Spice level */}
                                    {item.spice_level !== null && item.spice_level > 0 && (
                                      <div className="flex items-center gap-1 mt-2">
                                        <span className="text-xs text-gray-600">Spice:</span>
                                        <span className="text-red-500">
                                          {'🌶️'.repeat(item.spice_level)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <span className="font-bold text-gray-900 flex-shrink-0">
                                    ${parseFloat(String(item.base_price)).toFixed(2)}
                                  </span>
                                </div>
                                
                                {/* Allergen info */}
                                {item.allergen_info.length > 0 && (
                                  <p className="text-xs text-gray-500 mb-3">
                                    Contains: {item.allergen_info.join(', ')}
                                  </p>
                                )}
                                
                                {/* Add to Cart Controls */}
                                {item.is_available && (
                                  <div className="flex items-center gap-3">
                                    {/* Quantity selector */}
                                    <div className="flex items-center border border-gray-300 rounded-lg">
                                      <button
                                        onClick={() => handleQuantityChange(item.menu_item_id, -1)}
                                        className="p-2 hover:bg-gray-100 transition-colors"
                                        aria-label="Decrease quantity"
                                      >
                                        <Minus className="w-4 h-4 text-gray-600" />
                                      </button>
                                      <span className="px-4 py-2 min-w-[3rem] text-center font-medium text-gray-900">
                                        {getItemQuantity(item.menu_item_id)}
                                      </span>
                                      <button
                                        onClick={() => handleQuantityChange(item.menu_item_id, 1)}
                                        className="p-2 hover:bg-gray-100 transition-colors"
                                        aria-label="Increase quantity"
                                      >
                                        <Plus className="w-4 h-4 text-gray-600" />
                                      </button>
                                    </div>
                                    
                                    {/* Add to Cart button */}
                                    <button
                                      onClick={() => handleAddToCart(item)}
                                      className="flex-1 flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                                    >
                                      <ShoppingCart className="w-4 h-4" />
                                      Add to Cart
                                    </button>
                                  </div>
                                )}
                                
                                {!item.is_available && (
                                  <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium text-center">
                                    Currently Unavailable
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : menuData && menuData.categories.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <p className="text-gray-600 mb-4">Menu coming soon</p>
                  <button
                    onClick={handleCallRestaurant}
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Call restaurant for current menu
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
                  <p className="text-gray-600">No menu items match your search.</p>
                  <button
                    onClick={() => setMenuSearchQuery('')}
                    className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
            
            {/* Reviews Section */}
            <div ref={reviewsSectionRef} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
              
              {/* Review summary */}
              {reviewsData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Overall rating */}
                    <div className="text-center">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        {Number(reviewsData.average_rating).toFixed(1)}
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-6 h-6 ${
                              i < Math.floor(reviewsData.average_rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">
                        Based on {reviewsData.total_count} reviews
                      </p>
                    </div>
                    
                    {/* Rating distribution */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(stars => {
                        const count = reviewsData.rating_distribution[`${['one', 'two', 'three', 'four', 'five'][stars - 1]}_star` as keyof typeof reviewsData.rating_distribution];
                        const percentage = reviewsData.total_count > 0 ? (count / reviewsData.total_count) * 100 : 0;
                        
                        return (
                          <button
                            key={stars}
                            onClick={() => handleReviewRatingFilter(reviewRatingFilter === stars ? null : stars)}
                            className={`w-full flex items-center gap-3 hover:bg-gray-50 p-2 rounded transition-colors ${
                              reviewRatingFilter === stars ? 'bg-orange-50' : ''
                            }`}
                          >
                            <span className="text-sm font-medium text-gray-700 w-12">{stars} ★</span>
                            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Write review button */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleWriteReview}
                      className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      Write a Review
                    </button>
                  </div>
                </div>
              )}
              
              {/* Sort and filter controls */}
              {reviewsData && reviewsData.reviews.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={reviewSortOption}
                    onChange={(e) => handleReviewSortChange(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="created_at">Most Recent</option>
                    <option value="star_rating">Highest Rated</option>
                    <option value="helpful_count">Most Helpful</option>
                  </select>
                  
                  {reviewRatingFilter !== null && (
                    <button
                      onClick={() => handleReviewRatingFilter(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                    >
                      {reviewRatingFilter} stars
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              
              {/* Reviews list */}
              {isLoadingReviews ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviewsData && reviewsData.reviews.length > 0 ? (
                <>
                  <div className="space-y-6">
                    {reviewsData.reviews.map(({ review, user, photos }) => {
                      const isExpanded = expandedReviews.has(review.review_id);
                      const needsExpansion = review.review_text.length > 200;
                      
                      return (
                        <div key={review.review_id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                          {/* Reviewer info */}
                          <div className="flex items-start gap-4 mb-4">
                            {user.profile_picture_url ? (
                              <img
                                src={user.profile_picture_url}
                                alt={user.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {user.full_name.charAt(0)}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{user.full_name}</span>
                                {review.is_verified_visit && (
                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.star_rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatRelativeTime(review.created_at)}
                                </span>
                                {review.is_edited && (
                                  <span className="text-xs text-gray-400 italic">(edited)</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Review title */}
                          {review.review_title && (
                            <h4 className="font-semibold text-gray-900 mb-2">
                              {review.review_title}
                            </h4>
                          )}
                          
                          {/* Review text */}
                          <p className="text-gray-700 leading-relaxed">
                            {needsExpansion && !isExpanded
                              ? `${review.review_text.substring(0, 200)}...`
                              : review.review_text}
                          </p>
                          
                          {needsExpansion && (
                            <button
                              onClick={() => toggleReviewExpanded(review.review_id)}
                              className="text-orange-600 hover:text-orange-700 text-sm font-medium mt-2"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                          
                          {/* Review photos */}
                          {photos.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                              {photos.map(photo => (
                                <img
                                  key={photo.photo_id}
                                  src={photo.photo_url}
                                  alt="Review photo"
                                  className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    // Could implement photo lightbox here
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Review actions */}
                          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
                            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                              <ThumbsUp className="w-4 h-4" />
                              Helpful ({review.helpful_count})
                            </button>
                            
                            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                              <Flag className="w-4 h-4" />
                              Report
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Load more button */}
                  {reviewsData.total_count > reviewsData.reviews.length && (
                    <div className="text-center">
                      <button
                        onClick={handleLoadMoreReviews}
                        className="bg-white border-2 border-gray-300 text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Load More Reviews
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <p className="text-gray-600 mb-4">No reviews yet. Be the first to review!</p>
                  <button
                    onClick={handleWriteReview}
                    className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Write a Review
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact & Hours</h3>
              
              {/* Address */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{restaurant.street_address}</p>
                    {restaurant.apartment_suite && (
                      <p className="text-gray-900">{restaurant.apartment_suite}</p>
                    )}
                    <p className="text-gray-900">
                      {restaurant.city}, {restaurant.state} {restaurant.zip_code}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleGetDirections}
                  className="w-full bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-medium hover:bg-orange-200 transition-colors"
                >
                  Get Directions
                </button>
              </div>
              
              {/* Phone */}
              <div className="mb-6">
                <button
                  onClick={handleCallRestaurant}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  {restaurant.phone_number}
                </button>
              </div>
              
              {/* Hours */}
              {hoursData && hoursData.hours.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">Hours</span>
                    </div>
                    
                    {openStatus && (
                      <span
                        className={`text-sm font-medium ${
                          openStatus.isOpen ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {openStatus.isOpen ? 'Open' : 'Closed'}
                      </span>
                    )}
                  </div>
                  
                  {openStatus && (
                    <p className="text-sm text-gray-600 mb-3">{openStatus.message}</p>
                  )}
                  
                  {/* Current day hours */}
                  {(() => {
                    const today = new Date().getDay();
                    const todayHours = hoursData.hours.find(h => h.day_of_week === today);
                    
                    return (
                      <div className="text-sm text-gray-900 mb-2">
                        <span className="font-medium">{getDayName(today)}: </span>
                        {todayHours?.is_closed || !todayHours?.open_time || !todayHours?.close_time
                          ? 'Closed'
                          : `${formatTime(todayHours.open_time)} - ${formatTime(todayHours.close_time)}`}
                      </div>
                    );
                  })()}
                  
                  {/* Toggle full week */}
                  <button
                    onClick={() => setShowHoursExpanded(!showHoursExpanded)}
                    className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {showHoursExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide weekly hours
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View weekly hours
                      </>
                    )}
                  </button>
                  
                  {showHoursExpanded && (
                    <div className="mt-3 space-y-2 text-sm">
                      {[0, 1, 2, 3, 4, 5, 6].map(day => {
                        const dayHours = hoursData.hours.find(h => h.day_of_week === day);
                        const isToday = day === new Date().getDay();
                        
                        return (
                          <div
                            key={day}
                            className={`flex justify-between ${isToday ? 'font-semibold' : ''}`}
                          >
                            <span className={isToday ? 'text-orange-600' : 'text-gray-700'}>
                              {getDayName(day)}
                            </span>
                            <span className={isToday ? 'text-orange-600' : 'text-gray-600'}>
                              {dayHours?.is_closed || !dayHours?.open_time || !dayHours?.close_time
                                ? 'Closed'
                                : `${formatTime(dayHours.open_time)} - ${formatTime(dayHours.close_time)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                disabled={!openStatus?.isOpen}
                className={`w-full px-6 py-4 rounded-lg font-medium text-lg transition-all ${
                  openStatus?.isOpen
                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {openStatus?.isOpen ? 'Start Order' : 'Closed'}
              </button>
              
              {cartItems.length > 0 && cartRestaurantId === restaurant_id && (
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  View Cart ({cartItems.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>
          
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={() => setSelectedPhotoIndex(prev => (prev === 0 ? allPhotos.length - 1 : prev - 1))}
                className="absolute left-4 text-white hover:text-gray-300 p-2"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              
              <button
                onClick={() => setSelectedPhotoIndex(prev => (prev === allPhotos.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 text-white hover:text-gray-300 p-2"
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          
          <img
            src={allPhotos[selectedPhotoIndex]?.photo_url || ''}
            alt="Restaurant"
            className="max-w-full max-h-full object-contain"
          />
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black bg-opacity-60 px-4 py-2 rounded-full">
            {selectedPhotoIndex + 1} / {allPhotos.length}
          </div>
        </div>
      )}
      
      {/* QR Code Modal */}
      {showQRModal && selectedDiscount && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => {
                setShowQRModal(false);
                setSelectedDiscount(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Scan to Redeem
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              {selectedDiscount.description}
            </p>
            
            {/* QR Code placeholder - in real app, generate actual QR */}
            <div className="bg-white border-4 border-gray-200 p-6 rounded-xl mb-6">
              <div className="w-64 h-64 mx-auto bg-gray-100 flex items-center justify-center">
                <p className="text-gray-400 text-sm text-center">
                  QR Code<br />
                  {selectedDiscount.qr_code_data}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Show this code to restaurant staff at checkout
            </p>
            
            {/* Alphanumeric backup code */}
            <div className="bg-gray-50 rounded-lg p-4 text-center mb-6">
              <p className="text-xs text-gray-600 mb-2">Backup Code</p>
              <p className="text-xl font-mono font-bold text-gray-900">
                {selectedDiscount.qr_code_data || 'DISCOUNT123'}
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowQRModal(false);
                setSelectedDiscount(null);
              }}
              className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
      
      {/* Coupon Code Modal */}
      {showCouponModal && selectedDiscount && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => {
                setShowCouponModal(false);
                setSelectedDiscount(null);
                setCopiedCode(false);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Your Coupon Code
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              {selectedDiscount.description}
            </p>
            
            {/* Coupon code display */}
            <div className="border-2 border-dashed border-orange-400 rounded-xl p-6 mb-6 bg-orange-50">
              <p className="text-3xl font-mono font-bold text-orange-700 text-center mb-4">
                {selectedDiscount.coupon_code}
              </p>
              
              <button
                onClick={handleCopyCode}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-5 h-5" />
                    Code Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              Apply this code at checkout when ordering online
            </p>
            
            <button
              onClick={() => {
                setShowCouponModal(false);
                setSelectedDiscount(null);
                setCopiedCode(false);
              }}
              className="w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={() => setShowSignUpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Join Local Eats
            </h3>
            
            <p className="text-gray-600 text-center mb-6">
              Sign up to save favorites, write reviews, and unlock exclusive discounts!
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                Save favorite restaurants
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                Place orders in seconds
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                Write reviews and earn badges
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                Get personalized recommendations
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                Access exclusive discounts
              </li>
            </ul>
            
            <div className="space-y-3">
              <Link
                to="/signup"
                className="block w-full bg-orange-600 text-white text-center px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Sign Up
              </Link>
              
              <Link
                to="/login"
                className="block w-full bg-gray-100 text-gray-900 text-center px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Log In
              </Link>
              
              <button
                onClick={() => setShowSignUpModal(false)}
                className="block w-full text-gray-600 text-center py-2 hover:text-gray-900 transition-colors text-sm"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification for Added Items */}
      {showAddedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[90vw]">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Added to cart!</p>
              <p className="text-sm text-green-100">{addedItemName}</p>
            </div>
            <button
              onClick={() => setShowAddedToast(false)}
              className="text-white hover:text-green-100 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Floating Cart Button - Mobile Only */}
      {cartItems.length > 0 && cartRestaurantId === restaurant_id && (
        <div className="fixed bottom-20 right-4 z-40 md:hidden">
          <button
            onClick={() => navigate('/cart')}
            className="bg-green-600 text-white p-4 rounded-full shadow-2xl hover:bg-green-700 transition-all hover:scale-110 flex items-center gap-3 pr-6"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-white text-green-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cartItems.length}
              </span>
            </div>
            <span className="font-semibold">View Cart</span>
          </button>
        </div>
      )}
    </>
  );
};

export default UV_RestaurantDetail;