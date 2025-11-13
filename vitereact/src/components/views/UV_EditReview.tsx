import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Star, X, Upload, Trash2, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
}

interface ReviewResponse {
  review: Review;
  user: {
    user_id: string;
    full_name: string;
    profile_picture_url: string | null;
  };
  photos: ReviewPhoto[];
  is_helpful_by_current_user?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_EditReview: React.FC = () => {
  const { review_id } = useParams<{ review_id: string }>();
  const navigate = useNavigate();

  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================

  const [currentStarRating, setCurrentStarRating] = useState(0);
  const [currentReviewTitle, setCurrentReviewTitle] = useState('');
  const [currentReviewText, setCurrentReviewText] = useState('');
  const [existingPhotos, setExistingPhotos] = useState<ReviewPhoto[]>([]);
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([]);
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([]);
  const [restaurantContext, setRestaurantContext] = useState<Restaurant | null>(null);
  const [isWithinEditWindow, setIsWithinEditWindow] = useState(true);
  const [daysUntilEditExpires, setDaysUntilEditExpires] = useState(30);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Store original values for dirty checking
  const [originalReview, setOriginalReview] = useState<Review | null>(null);

  // ========================================================================
  // DATA FETCHING - REVIEW
  // ========================================================================

  const { data: reviewData, isLoading: isLoadingReview, error: reviewError } = useQuery({
    queryKey: ['review', review_id],
    queryFn: async () => {
      if (!review_id) throw new Error('No review ID provided');
      
      const response = await axios.get<ReviewResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );
      return response.data;
    },
    enabled: !!review_id,
    staleTime: 60000,
    retry: 1,
  });

  // ========================================================================
  // DATA FETCHING - RESTAURANT CONTEXT
  // ========================================================================

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', reviewData?.review.restaurant_id],
    queryFn: async () => {
      if (!reviewData?.review.restaurant_id) throw new Error('No restaurant ID');
      
      const response = await axios.get<Restaurant>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/restaurants/${reviewData.review.restaurant_id}`
      );
      return response.data;
    },
    enabled: !!reviewData?.review.restaurant_id,
    staleTime: 60000,
    retry: 1,
  });

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  // Update Review Mutation
  const updateReviewMutation = useMutation({
    mutationFn: async () => {
      if (!review_id || !authToken) throw new Error('Missing review ID or auth token');

      // Update review text/rating
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}`,
        {
          star_rating: currentStarRating,
          review_title: currentReviewTitle || null,
          review_text: currentReviewText,
        },
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Upload new photos if any
      if (newPhotoUrls.length > 0) {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}/photos`,
          { photo_urls: newPhotoUrls },
          {
            headers: { 
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return response.data;
    },
    onSuccess: () => {
      // Navigate back to restaurant detail
      if (restaurantContext) {
        navigate(`/restaurant/${restaurantContext.restaurant_id}`, {
          state: { message: 'Review updated successfully' }
        });
      } else {
        navigate('/profile?tab=reviews');
      }
    },
  });

  // Delete Review Mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      if (!review_id || !authToken) throw new Error('Missing review ID or auth token');

      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
    },
    onSuccess: () => {
      if (restaurantContext) {
        navigate(`/restaurant/${restaurantContext.restaurant_id}`, {
          state: { message: 'Review deleted successfully' }
        });
      } else {
        navigate('/profile?tab=reviews');
      }
    },
  });

  // ========================================================================
  // EFFECTS - INITIALIZE FORM DATA
  // ========================================================================

  useEffect(() => {
    if (reviewData) {
      const review = reviewData.review;
      
      // Store original review for comparison
      setOriginalReview(review);
      
      // Initialize form fields
      setCurrentStarRating(review.star_rating);
      setCurrentReviewTitle(review.review_title || '');
      setCurrentReviewText(review.review_text);
      setExistingPhotos(reviewData.photos || []);

      // Calculate edit window
      const createdAt = new Date(review.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = 30 - daysSinceCreation;
      
      setIsWithinEditWindow(daysRemaining > 0);
      setDaysUntilEditExpires(Math.max(0, daysRemaining));
    }
  }, [reviewData]);

  // ========================================================================
  // EFFECTS - SET RESTAURANT CONTEXT
  // ========================================================================

  useEffect(() => {
    if (restaurantData) {
      setRestaurantContext(restaurantData);
    }
  }, [restaurantData]);

  // ========================================================================
  // EFFECTS - VERIFY OWNERSHIP
  // ========================================================================

  useEffect(() => {
    if (reviewData && currentUser) {
      if (reviewData.review.user_id !== currentUser.user_id) {
        // Not the owner - redirect to 404
        navigate('/404', { replace: true });
      }
    }
  }, [reviewData, currentUser, navigate]);

  // ========================================================================
  // EFFECTS - TRACK DIRTY STATE
  // ========================================================================

  useEffect(() => {
    if (originalReview) {
      const hasChanges =
        currentStarRating !== originalReview.star_rating ||
        currentReviewTitle !== (originalReview.review_title || '') ||
        currentReviewText !== originalReview.review_text ||
        deletedPhotoIds.length > 0 ||
        newPhotoUrls.length > 0;
      
      setHasUnsavedChanges(hasChanges);
    }
  }, [currentStarRating, currentReviewTitle, currentReviewText, deletedPhotoIds, newPhotoUrls, originalReview]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleSave = () => {
    // Validate
    if (currentStarRating === 0) {
      alert('Please select a star rating');
      return;
    }
    if (currentReviewText.length < 10) {
      alert('Review text must be at least 10 characters');
      return;
    }
    if (currentReviewText.length > 1000) {
      alert('Review text must not exceed 1000 characters');
      return;
    }

    updateReviewMutation.mutate();
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setCancelConfirmationOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleDelete = () => {
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = () => {
    deleteReviewMutation.mutate();
  };

  const handleRemovePhoto = (photoId: string) => {
    setDeletedPhotoIds([...deletedPhotoIds, photoId]);
    setExistingPhotos(existingPhotos.filter(p => p.photo_id !== photoId));
  };

  const handleAddPhotos = () => {
    const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/400/300`;
    const totalPhotos = existingPhotos.length + newPhotoUrls.length;
    
    if (totalPhotos < 10) {
      setNewPhotoUrls([...newPhotoUrls, placeholderUrl]);
    } else {
      alert('Maximum 10 photos allowed');
    }
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotoUrls(newPhotoUrls.filter((_, i) => i !== index));
  };

  // ========================================================================
  // RENDER - LOADING STATE
  // ========================================================================

  if (isLoadingReview) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600"></div>
            <p className="text-gray-700 text-lg font-medium">Loading review...</p>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // RENDER - ERROR STATE
  // ========================================================================

  if (reviewError || !reviewData) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-12 max-w-md w-full text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-600 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Review Not Found</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              The review you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Link
              to="/"
              className="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // RENDER - EDIT WINDOW EXPIRED STATE
  // ========================================================================

  if (!isWithinEditWindow) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-2xl p-8 md:p-12">
              <div className="text-center">
                <AlertCircle className="mx-auto h-20 w-20 text-orange-600 mb-6" />
                <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
                  Review Can No Longer Be Edited
                </h2>
                <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                  This review was posted more than 30 days ago and can no longer be edited.
                </p>
                <p className="text-gray-600 mb-8">
                  You can delete this review if needed.
                </p>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleDelete}
                    className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <Trash2 className="h-5 w-5" />
                    Delete Review
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="px-8 py-4 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 border-2 border-gray-300"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmationOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Delete Review</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Are you sure you want to delete this review? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirmationOpen(false)}
                  disabled={deleteReviewMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 border-2 border-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteReviewMutation.isPending}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {deleteReviewMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ========================================================================
  // RENDER - MAIN EDIT FORM
  // ========================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with Breadcrumb */}
          <div className="mb-8">
            <nav className="flex items-center text-sm text-gray-600 mb-6">
              <Link
                to={restaurantContext ? `/restaurant/${restaurantContext.restaurant_id}` : '/profile?tab=reviews'}
                className="hover:text-orange-600 transition-colors font-medium"
              >
                {restaurantContext?.restaurant_name || 'My Reviews'}
              </Link>
              <span className="mx-2 text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Edit Review</span>
            </nav>
            
            <div className="flex items-center gap-6">
              {restaurantContext?.primary_hero_image_url && (
                <img
                  src={restaurantContext.primary_hero_image_url}
                  alt={restaurantContext.restaurant_name}
                  className="w-20 h-20 rounded-xl object-cover shadow-lg border-2 border-white"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 leading-tight">Edit Review</h1>
                {restaurantContext && (
                  <p className="text-lg text-gray-700 font-medium">{restaurantContext.restaurant_name}</p>
                )}
              </div>
            </div>

            {/* Edit Window Notice */}
            {daysUntilEditExpires <= 7 && (
              <div className="mt-6 bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-xl p-5 shadow-md">
                <p className="text-sm text-orange-900 font-medium flex items-center gap-2">
                  <span className="text-xl">⏰</span>
                  You can edit this review for <strong>{daysUntilEditExpires} more {daysUntilEditExpires === 1 ? 'day' : 'days'}</strong>, 
                  after which it can only be deleted.
                </p>
              </div>
            )}
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10 space-y-8">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Rating <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setCurrentStarRating(rating)}
                    onMouseEnter={() => setHoverRating(rating)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-4 focus:ring-orange-200 rounded-full p-1"
                  >
                    <Star
                      className={`h-12 w-12 transition-colors ${
                        rating <= (hoverRating || currentStarRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-3">
                Review Title <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                id="title"
                type="text"
                value={currentReviewTitle}
                onChange={(e) => setCurrentReviewTitle(e.target.value)}
                maxLength={100}
                placeholder="Summarize your experience"
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Review Text */}
            <div>
              <label htmlFor="text" className="block text-sm font-semibold text-gray-900 mb-3">
                Review <span className="text-red-600">*</span>
              </label>
              <textarea
                id="text"
                value={currentReviewText}
                onChange={(e) => setCurrentReviewText(e.target.value)}
                rows={8}
                maxLength={1000}
                placeholder="Share your experience (minimum 10 characters)"
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all resize-none text-gray-900 placeholder-gray-400 leading-relaxed"
              />
              <div className="mt-3 flex justify-between text-sm">
                <span className={currentReviewText.length < 10 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                  {currentReviewText.length < 10 ? `${10 - currentReviewText.length} more characters needed` : '✓ Minimum length met'}
                </span>
                <span className={currentReviewText.length > 950 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                  {currentReviewText.length} / 1000 characters
                </span>
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Photos
              </label>
              
              {/* Existing Photos */}
              {existingPhotos.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-700 font-medium mb-3">Existing Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {existingPhotos.map((photo) => (
                      <div key={photo.photo_id} className="relative group">
                        <img
                          src={photo.photo_url}
                          alt="Review"
                          className="w-full h-32 object-cover rounded-lg shadow-md border-2 border-gray-200"
                        />
                        <button
                          onClick={() => handleRemovePhoto(photo.photo_id)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Photos */}
              {newPhotoUrls.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-green-700 font-medium mb-3">New Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {newPhotoUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt="New"
                          className="w-full h-32 object-cover rounded-lg shadow-md border-2 border-green-500"
                        />
                        <button
                          onClick={() => handleRemoveNewPhoto(index)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Photos Button */}
              {existingPhotos.length + newPhotoUrls.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddPhotos}
                  className="flex items-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-700 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all w-full justify-center font-medium"
                >
                  <Upload className="h-5 w-5" />
                  Add More Photos ({existingPhotos.length + newPhotoUrls.length}/10)
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t-2 border-gray-200">
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || updateReviewMutation.isPending || currentStarRating === 0 || currentReviewText.length < 10}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {updateReviewMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
              
              <button
                onClick={handleCancel}
                disabled={updateReviewMutation.isPending}
                className="px-8 py-4 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-300"
              >
                Cancel
              </button>
            </div>

            {/* Delete Review */}
            <div className="pt-6 border-t-2 border-gray-200">
              <button
                onClick={handleDelete}
                disabled={updateReviewMutation.isPending}
                className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-5 w-5" />
                Delete Review
              </button>
            </div>
          </div>

          {/* Error Display */}
          {updateReviewMutation.isError && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-md">
              <p className="font-semibold text-lg mb-2">Failed to update review</p>
              <p className="text-sm mb-4">
                {(updateReviewMutation.error as any)?.response?.data?.message || 'Please try again later'}
              </p>
              <button
                onClick={() => updateReviewMutation.reset()}
                className="text-sm underline hover:no-underline font-medium"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Delete Review</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Are you sure you want to delete this review? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirmationOpen(false)}
                disabled={deleteReviewMutation.isPending}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 border-2 border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteReviewMutation.isPending}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {deleteReviewMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Discard Changes?</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setCancelConfirmationOpen(false)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors border-2 border-gray-300"
              >
                Keep Editing
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_EditReview;