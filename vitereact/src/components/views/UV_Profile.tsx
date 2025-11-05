import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  User,
  Star,
  Award,
  ShoppingBag,
  Heart,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  X,
  Check,
  Lock,
  TrendingUp,
  Mail,
  Phone,
  Camera,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  member_since: string;
  notification_preferences: {
    order_updates_email: boolean;
    order_updates_push: boolean;
    promotions_email: boolean;
    promotions_push: boolean;
    weekly_picks_email: boolean;
    weekly_picks_push: boolean;
    new_restaurants_email: boolean;
    new_restaurants_push: boolean;
    review_responses_email: boolean;
    review_responses_push: boolean;
  };
  location_permission_granted: boolean;
  profile_public: boolean;
  reviews_public: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStatistics {
  stat_id: string;
  user_id: string;
  total_reviews_written: number;
  total_restaurants_visited: number;
  total_favorites_saved: number;
  total_orders_placed: number;
  total_badges_earned: number;
  total_discounts_redeemed: number;
  unique_cuisines_tried: string[];
  updated_at: string;
}

interface Badge {
  badge_id: string;
  badge_name: string;
  badge_description: string;
  badge_icon_url: string | null;
  criteria_type: string;
  criteria_value: number;
  created_at: string;
}

interface UserBadge {
  user_badge_id: string;
  user_id: string;
  badge_id: string;
  is_showcased: boolean;
  showcase_order: number | null;
  earned_at: string;
}

interface BadgeWithProgress {
  user_badge?: UserBadge;
  badge: Badge;
  progress: {
    current_value: number;
    target_value: number;
    percentage: number;
  };
}

interface BadgesResponse {
  earned_badges: BadgeWithProgress[];
  locked_badges: BadgeWithProgress[];
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

interface ReviewPhoto {
  photo_id: string;
  photo_url: string;
  display_order: number;
}

interface ReviewWithContext {
  review: Review;
  restaurant: {
    restaurant_id: string;
    restaurant_name: string;
    primary_hero_image_url: string | null;
  };
  photos: ReviewPhoto[];
}

interface ReviewsResponse {
  reviews: ReviewWithContext[];
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

interface UpdateProfilePayload {
  full_name?: string;
  email?: string;
  phone_number?: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Profile: React.FC = () => {
  // ========================================================================
  // ZUSTAND STATE - INDIVIDUAL SELECTORS (CRITICAL!)
  // ========================================================================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isAuthLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const updateUserProfile = useAppStore(state => state.update_user_profile);

  // ========================================================================
  // ROUTER HOOKS
  // ========================================================================
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');
  const [editMode, setEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdateProfilePayload>({
    full_name: '',
    email: '',
    phone_number: ''
  });
  const [profilePictureUploadLoading, setProfilePictureUploadLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState({
    limit: 20,
    offset: 0,
    hasMore: false
  });
  const [showBadgeModal, setShowBadgeModal] = useState<BadgeWithProgress | null>(null);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);

  // ========================================================================
  // AUTHENTICATION REDIRECT
  // ========================================================================
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  // ========================================================================
  // SYNC ACTIVE TAB WITH URL
  // ========================================================================
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'reviews', 'badges', 'orders', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ========================================================================
  // API BASE URL
  // ========================================================================
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ========================================================================
  // REACT QUERY: FETCH USER PROFILE
  // ========================================================================
  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError
  } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // ========================================================================
  // REACT QUERY: FETCH USER STATISTICS
  // ========================================================================
  const {
    data: userStatistics,
    isLoading: statsLoading,
    error: statsError
  } = useQuery<UserStatistics>({
    queryKey: ['userStatistics'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/me/statistics`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // ========================================================================
  // REACT QUERY: FETCH USER BADGES
  // ========================================================================
  const {
    data: badgesData,
    isLoading: badgesLoading,
    error: badgesError
  } = useQuery<BadgesResponse>({
    queryKey: ['userBadges'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/me/badges`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated && (activeTab === 'badges' || activeTab === 'overview'),
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // ========================================================================
  // REACT QUERY: FETCH USER REVIEWS
  // ========================================================================
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
    refetch: refetchReviews
  } = useQuery<ReviewsResponse>({
    queryKey: ['userReviews', reviewsPagination.limit, reviewsPagination.offset],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/me/reviews`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          limit: reviewsPagination.limit,
          offset: reviewsPagination.offset
        }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated && activeTab === 'reviews',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // ========================================================================
  // MUTATION: UPDATE USER PROFILE
  // ========================================================================
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await axios.patch(`${API_BASE_URL}/api/users/me`, payload, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Update Zustand store
      updateUserProfile({
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number
      });
      // Update React Query cache
      queryClient.setQueryData(['userProfile'], data);
      // Exit edit mode
      setEditMode(false);
      // Show success toast (you can add a toast library)
      alert('Profile updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      alert(`Error: ${errorMessage}`);
    }
  });

  // ========================================================================
  // MUTATION: TOGGLE BADGE SHOWCASE
  // ========================================================================
  const toggleBadgeShowcaseMutation = useMutation({
    mutationFn: async ({ badgeId, isShowcased, showcaseOrder }: { badgeId: string; isShowcased: boolean; showcaseOrder: number | null }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/api/users/me/badges/${badgeId}/showcase`,
        { is_showcased: isShowcased, showcase_order: showcaseOrder },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Refetch badges to get updated showcase status
      queryClient.invalidateQueries({ queryKey: ['userBadges'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update badge showcase';
      alert(`Error: ${errorMessage}`);
    }
  });

  // ========================================================================
  // MUTATION: DELETE REVIEW
  // ========================================================================
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const response = await axios.delete(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    onSuccess: () => {
      // Refetch reviews
      refetchReviews();
      // Update statistics
      queryClient.invalidateQueries({ queryKey: ['userStatistics'] });
      setDeleteReviewId(null);
      alert('Review deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to delete review';
      alert(`Error: ${errorMessage}`);
    }
  });

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleEditProfile = () => {
    if (userProfile) {
      setEditFormData({
        full_name: userProfile.full_name,
        email: userProfile.email,
        phone_number: userProfile.phone_number || ''
      });
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditFormData({ full_name: '', email: '', phone_number: '' });
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editFormData);
  };

  const handleToggleBadgeShowcase = (badge: BadgeWithProgress) => {
    if (badge.user_badge) {
      const currentShowcased = badge.user_badge.is_showcased;
      const showcasedBadges = badgesData?.earned_badges.filter(b => b.user_badge?.is_showcased) || [];
      
      let showcaseOrder: number | null = null;
      if (!currentShowcased) {
        // Calculate next showcase order (max 5 badges can be showcased)
        if (showcasedBadges.length >= 5) {
          alert('You can only showcase up to 5 badges. Unpin one first.');
          return;
        }
        showcaseOrder = showcasedBadges.length + 1;
      }

      toggleBadgeShowcaseMutation.mutate({
        badgeId: badge.badge.badge_id,
        isShowcased: !currentShowcased,
        showcaseOrder
      });
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      deleteReviewMutation.mutate(reviewId);
    }
  };

  const handleLoadMoreReviews = () => {
    setReviewsPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const showcasedBadges = useMemo(() => {
    return badgesData?.earned_badges.filter(b => b.user_badge?.is_showcased).sort((a, b) => {
      const orderA = a.user_badge?.showcase_order || 999;
      const orderB = b.user_badge?.showcase_order || 999;
      return orderA - orderB;
    }) || [];
  }, [badgesData]);

  const formattedMemberSince = useMemo(() => {
    if (userProfile?.member_since) {
      const date = new Date(userProfile.member_since);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return '';
  }, [userProfile]);

  const canEditReview = (createdAt: string): boolean => {
    const reviewDate = new Date(createdAt);
    const now = new Date();
    const daysSinceReview = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReview <= 30;
  };

  // ========================================================================
  // LOADING STATE
  // ========================================================================
  if (isAuthLoading || profileLoading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 text-sm">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================
  if (profileError) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="size-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Failed to Load Profile</h2>
              <p className="text-gray-600">
                {(profileError as any)?.response?.data?.message || 'An error occurred while loading your profile.'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // MAIN RENDER
  // ========================================================================
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* ================================================================ */}
          {/* PROFILE HEADER */}
          {/* ================================================================ */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Profile Picture */}
              <div className="relative">
                <div className="size-24 md:size-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
                  {userProfile?.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt={userProfile.full_name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl md:text-4xl font-bold">
                      {userProfile?.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    alert('Profile picture upload feature coming soon!');
                    // NOTE: MISSING ENDPOINT - upload_profile_picture
                  }}
                  disabled={profilePictureUploadLoading}
                  className="absolute -bottom-2 -right-2 size-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110"
                >
                  {profilePictureUploadLoading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                </button>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                {editMode ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                      {editFormData.email !== userProfile?.email && (
                        <p className="mt-1 text-xs text-yellow-600">
                          <AlertCircle className="inline size-3 mr-1" />
                          Changing email will require verification
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={editFormData.phone_number || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateProfileMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Check className="size-4" />
                            Save Changes
                          </span>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updateProfileMutation.isPending}
                        className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-2">
                      {userProfile?.full_name}
                      {userProfile?.is_verified && (
                        <Check className="inline size-6 ml-2 text-blue-600 bg-blue-100 rounded-full p-0.5" />
                      )}
                    </h1>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-600 mb-4">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Mail className="size-4" />
                        <span className="text-sm">{userProfile?.email}</span>
                      </div>
                      {userProfile?.phone_number && (
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <Phone className="size-4" />
                          <span className="text-sm">{userProfile.phone_number}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="size-4" />
                        <span className="text-sm">Member since {formattedMemberSince}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleEditProfile}
                      className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 border border-gray-300 transition-all duration-200 hover:shadow-lg inline-flex items-center gap-2"
                    >
                      <Edit2 className="size-4" />
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* STATS DASHBOARD */}
          {/* ================================================================ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
            {/* Reviews Written */}
            <button
              onClick={() => handleTabChange('reviews')}
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="size-6 text-yellow-600" />
                </div>
                <TrendingUp className="size-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? '-' : userStatistics?.total_reviews_written || 0}
              </div>
              <div className="text-sm text-gray-600">Reviews Written</div>
            </button>

            {/* Restaurants Visited */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="size-6 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? '-' : userStatistics?.total_restaurants_visited || 0}
              </div>
              <div className="text-sm text-gray-600">Restaurants Visited</div>
            </div>

            {/* Favorites Saved */}
            <Link
              to="/favorites"
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Heart className="size-6 text-red-600" />
                </div>
                <ExternalLink className="size-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? '-' : userStatistics?.total_favorites_saved || 0}
              </div>
              <div className="text-sm text-gray-600">Favorites Saved</div>
            </Link>

            {/* Orders Placed */}
            <Link
              to="/order-history"
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="size-6 text-blue-600" />
                </div>
                <ExternalLink className="size-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {statsLoading ? '-' : userStatistics?.total_orders_placed || 0}
              </div>
              <div className="text-sm text-gray-600">Orders Placed</div>
            </Link>
          </div>

          {/* ================================================================ */}
          {/* BADGE SHOWCASE (if any showcased badges) */}
          {/* ================================================================ */}
          {showcasedBadges.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="size-6 text-yellow-600" />
                Featured Badges
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {showcasedBadges.map((badge) => (
                  <div
                    key={badge.badge.badge_id}
                    className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-200"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="size-16 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                        <Award className="size-8 text-yellow-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {badge.badge.badge_name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(badge.user_badge!.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB NAVIGATION */}
          {/* ================================================================ */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => handleTabChange('reviews')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === 'reviews'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Reviews
                  {userStatistics && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                      {userStatistics.total_reviews_written}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange('badges')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === 'badges'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Badges
                  {userStatistics && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                      {userStatistics.total_badges_earned}
                    </span>
                  )}
                </button>
                <Link
                  to="/settings"
                  className="px-6 py-4 font-medium text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 whitespace-nowrap transition-all flex items-center gap-2"
                >
                  Settings
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              {/* ============================================================ */}
              {/* OVERVIEW TAB */}
              {/* ============================================================ */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Total Badges Earned</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {statsLoading ? '-' : userStatistics?.total_badges_earned || 0}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-sm text-gray-600 mb-1">Discounts Redeemed</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {statsLoading ? '-' : userStatistics?.total_discounts_redeemed || 0}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2">
                        <div className="text-sm text-gray-600 mb-2">Unique Cuisines Tried</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          {statsLoading ? '-' : userStatistics?.unique_cuisines_tried.length || 0}
                        </div>
                        {userStatistics && userStatistics.unique_cuisines_tried.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {userStatistics.unique_cuisines_tried.map((cuisine) => (
                              <span
                                key={cuisine}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                              >
                                {cuisine}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* MY REVIEWS TAB */}
              {/* ============================================================ */}
              {activeTab === 'reviews' && (
                <div>
                  {reviewsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 text-blue-600 animate-spin" />
                    </div>
                  ) : reviewsError ? (
                    <div className="text-center py-12">
                      <AlertCircle className="size-12 text-red-600 mx-auto mb-4" />
                      <p className="text-gray-600">Failed to load reviews</p>
                    </div>
                  ) : reviewsData && reviewsData.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviewsData.reviews.map((item) => (
                        <div
                          key={item.review.review_id}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <Link
                              to={`/restaurant/${item.restaurant.restaurant_id}`}
                              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                              {item.restaurant.primary_hero_image_url ? (
                                <img
                                  src={item.restaurant.primary_hero_image_url}
                                  alt={item.restaurant.restaurant_name}
                                  className="size-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="size-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <MapPin className="size-6 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {item.restaurant.restaurant_name}
                                </h4>
                                <div className="flex items-center gap-1 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`size-4 ${
                                        i < item.review.star_rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </Link>
                            <div className="flex gap-2">
                              {canEditReview(item.review.created_at) && (
                                <Link
                                  to={`/review/${item.review.review_id}/edit`}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 className="size-4" />
                                </Link>
                              )}
                              <button
                                onClick={() => handleDeleteReview(item.review.review_id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>

                          {item.review.review_title && (
                            <h5 className="font-semibold text-gray-900 mb-2">
                              {item.review.review_title}
                            </h5>
                          )}

                          <p className="text-gray-700 mb-4 leading-relaxed">
                            {item.review.review_text}
                          </p>

                          {item.photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mb-4">
                              {item.photos.map((photo) => (
                                <img
                                  key={photo.photo_id}
                                  src={photo.photo_url}
                                  alt="Review"
                                  className="w-full aspect-square object-cover rounded-lg"
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-4">
                              <span>
                                {new Date(item.review.created_at).toLocaleDateString()}
                              </span>
                              {item.review.is_verified_visit && (
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Check className="size-3" />
                                  Verified Visit
                                </span>
                              )}
                              {item.review.is_edited && (
                                <span className="text-gray-500 italic">Edited</span>
                              )}
                            </div>
                            {item.review.helpful_count > 0 && (
                              <span className="text-gray-600">
                                {item.review.helpful_count} found helpful
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {reviewsData && reviewsData.reviews.length < reviewsData.total_count && (
                        <button
                          onClick={handleLoadMoreReviews}
                          className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-all"
                        >
                          Load More Reviews
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Star className="size-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No reviews yet
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Share your dining experiences with the community
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:shadow-lg"
                      >
                        Explore Restaurants
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* MY BADGES TAB */}
              {/* ============================================================ */}
              {activeTab === 'badges' && (
                <div className="space-y-8">
                  {/* Earned Badges */}
                  {badgesData && badgesData.earned_badges.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Badges</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {badgesData.earned_badges.map((badge) => (
                          <div
                            key={badge.badge.badge_id}
                            className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 relative"
                          >
                            <button
                              onClick={() => handleToggleBadgeShowcase(badge)}
                              disabled={toggleBadgeShowcaseMutation.isPending}
                              className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
                                badge.user_badge?.is_showcased
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={badge.user_badge?.is_showcased ? 'Unpin from profile' : 'Pin to profile'}
                            >
                              <Award className="size-5" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                              <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Award className="size-10 text-green-600" />
                              </div>
                              <h4 className="font-bold text-gray-900 mb-2">
                                {badge.badge.badge_name}
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                {badge.badge.badge_description}
                              </p>
                              <div className="text-xs text-gray-500">
                                Earned {new Date(badge.user_badge!.earned_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Locked Badges */}
                  {badgesData && badgesData.locked_badges.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Locked Badges</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {badgesData.locked_badges.map((badge) => (
                          <div
                            key={badge.badge.badge_id}
                            className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 relative opacity-75"
                          >
                            <div className="absolute top-4 right-4">
                              <Lock className="size-5 text-gray-400" />
                            </div>

                            <div className="flex flex-col items-center text-center">
                              <div className="size-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                                <Award className="size-10 text-gray-400" />
                              </div>
                              <h4 className="font-bold text-gray-700 mb-2">
                                {badge.badge.badge_name}
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                {badge.badge.badge_description}
                              </p>

                              {/* Progress Bar */}
                              <div className="w-full">
                                <div className="flex justify-between text-xs text-gray-600 mb-2">
                                  <span>Progress</span>
                                  <span>
                                    {badge.progress.current_value} / {badge.progress.target_value}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${badge.progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {badgesLoading && (
                    <div className="flex justify-center py-12">
                      <Loader2 className="size-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Profile;