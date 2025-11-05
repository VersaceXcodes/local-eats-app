import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface RestaurantContext {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
  street_address: string;
  city: string;
  state: string;
}

interface CreateReviewPayload {
  user_id: string;
  restaurant_id: string;
  order_id: string | null;
  star_rating: number;
  review_title: string | null;
  review_text: string;
  is_verified_visit: boolean;
}

interface CreateReviewResponse {
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_WriteReview: React.FC = () => {
  const { restaurant_id } = useParams<{ restaurant_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const order_id = searchParams.get('order_id');
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );
  const isAuthLoading = useAppStore(
    (state) => state.authentication_state.authentication_status.is_loading
  );
  const currentUser = useAppStore(
    (state) => state.authentication_state.current_user
  );
  const authToken = useAppStore(
    (state) => state.authentication_state.auth_token
  );

  // Form state
  const [starRating, setStarRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewText, setReviewText] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);
  
  const [formErrors, setFormErrors] = useState<{
    star_rating: string | null;
    review_text: string | null;
    photos: string | null;
  }>({
    star_rating: null,
    review_text: null,
    photos: null,
  });

  const characterCount = reviewText.length;
  const maxCharacters = 1000;

  const ratingLabels: { [key: number]: string } = {
    1: 'Terrible',
    2: 'Poor',
    3: 'Average',
    4: 'Good',
    5: 'Excellent',
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(`/login?redirect_url=/restaurant/${restaurant_id}/review`);
    }
  }, [isAuthLoading, isAuthenticated, navigate, restaurant_id]);

  // Load draft from localStorage
  useEffect(() => {
    if (restaurant_id) {
      const draftKey = `review_draft_${restaurant_id}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setStarRating(draft.star_rating || 0);
          setReviewTitle(draft.review_title || '');
          setReviewText(draft.review_text || '');
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    }
  }, [restaurant_id]);

  // Auto-save draft
  useEffect(() => {
    if (!restaurant_id) return;

    const draftKey = `review_draft_${restaurant_id}`;
    const saveInterval = setInterval(() => {
      if (starRating > 0 || reviewTitle || reviewText) {
        const draft = {
          star_rating: starRating,
          review_title: reviewTitle,
          review_text: reviewText,
          last_saved: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      }
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [restaurant_id, starRating, reviewTitle, reviewText]);

  const clearDraft = () => {
    if (restaurant_id) {
      const draftKey = `review_draft_${restaurant_id}`;
      localStorage.removeItem(draftKey);
    }
  };

  // Warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (starRating > 0 || reviewTitle || reviewText || selectedFiles.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [starRating, reviewTitle, reviewText, selectedFiles]);

  // Fetch restaurant context
  const {
    data: restaurantContext,
    isLoading: isLoadingRestaurant,
    error: restaurantError,
  } = useQuery<RestaurantContext>({
    queryKey: ['restaurant', restaurant_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/restaurants/${restaurant_id}`
      );
      
      return {
        restaurant_id: response.data.restaurant_id,
        restaurant_name: response.data.restaurant_name,
        primary_hero_image_url: response.data.primary_hero_image_url,
        street_address: response.data.street_address,
        city: response.data.city,
        state: response.data.state,
      };
    },
    enabled: !!restaurant_id,
    staleTime: 60000,
  });

  // Create review mutation
  const createReviewMutation = useMutation<CreateReviewResponse, Error, CreateReviewPayload>({
    mutationFn: async (payload) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
  });

  // Upload photos mutation
  const uploadPhotosMutation = useMutation<void, Error, { review_id: string; photo_urls: string[] }>({
    mutationFn: async ({ review_id, photo_urls }) => {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}/photos`,
        { photo_urls },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    },
  });

  const handleStarClick = (rating: number) => {
    setStarRating(rating);
    setFormErrors((prev) => ({ ...prev, star_rating: null }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    let photoError: string | null = null;

    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        photoError = 'Only JPG and PNG files accepted';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        photoError = 'File too large. Max 5MB per image';
        return;
      }

      if (selectedFiles.length + newFiles.length >= 10) {
        photoError = 'Maximum 10 photos allowed';
        return;
      }

      newFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    });

    if (photoError) {
      setFormErrors((prev) => ({ ...prev, photos: photoError }));
    } else {
      setFormErrors((prev) => ({ ...prev, photos: null }));
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errors = {
      star_rating: null as string | null,
      review_text: null as string | null,
      photos: null as string | null,
    };

    if (starRating === 0) {
      errors.star_rating = 'Rating required. Please select a star rating.';
    }

    if (reviewText.trim().length < 10) {
      errors.review_text = 'Review must be at least 10 characters';
    }

    if (reviewText.length > maxCharacters) {
      errors.review_text = `Review exceeds maximum ${maxCharacters} characters`;
    }

    setFormErrors(errors);
    return !errors.star_rating && !errors.review_text && !errors.photos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !restaurant_id) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const reviewPayload: CreateReviewPayload = {
        user_id: currentUser.user_id,
        restaurant_id: restaurant_id,
        order_id: order_id || null,
        star_rating: starRating,
        review_title: reviewTitle.trim() || null,
        review_text: reviewText.trim(),
        is_verified_visit: !!order_id,
      };

      const createdReview = await createReviewMutation.mutateAsync(reviewPayload);

      if (selectedFiles.length > 0) {
        const photoUrls = selectedFiles.map(
          (_file, index) => `https://cdn.example.com/reviews/${createdReview.review_id}/photo_${index}.jpg`
        );

        await uploadPhotosMutation.mutateAsync({
          review_id: createdReview.review_id,
          photo_urls: photoUrls,
        });
      }

      clearDraft();
      setShowSuccessMessage(true);

      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            navigate(`/restaurant/${restaurant_id}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error('Failed to submit review:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit review. Please try again.';
      setFormErrors((prev) => ({ ...prev, review_text: errorMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const hasContent = starRating > 0 || reviewTitle || reviewText || selectedFiles.length > 0;
    
    if (hasContent) {
      const confirmed = window.confirm('Discard your review? Your changes will be lost.');
      if (!confirmed) return;
    }

    clearDraft();
    navigate(`/restaurant/${restaurant_id}`);
  };

  const getCharacterCountColor = (): string => {
    const percentage = (characterCount / maxCharacters) * 100;
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    return 'text-gray-500';
  };

  if (isAuthLoading || isLoadingRestaurant) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (restaurantError || !restaurantContext) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <svg className="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
              <p className="text-sm text-gray-600 mb-6">We couldn't find the restaurant you're trying to review.</p>
              <button onClick={() => navigate('/')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors">
                Browse Restaurants
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (showSuccessMessage) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you for your review!</h2>
              <p className="text-gray-600 mb-6">Your review helps others discover great restaurants.</p>
              <p className="text-sm text-gray-500">Returning to restaurant in {redirectCountdown}...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <nav className="text-sm mb-4">
              <ol className="flex items-center space-x-2 text-gray-500">
                <li>
                  <button onClick={() => navigate(`/restaurant/${restaurant_id}`)} className="hover:text-orange-600 transition-colors">
                    {restaurantContext.restaurant_name}
                  </button>
                </li>
                <li>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </li>
                <li className="text-gray-900 font-medium">Write Review</li>
              </ol>
            </nav>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Write a Review</h1>

            <div className="flex items-start space-x-4 bg-white rounded-lg border border-gray-200 p-4">
              {restaurantContext.primary_hero_image_url ? (
                <img src={restaurantContext.primary_hero_image_url} alt={restaurantContext.restaurant_name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{restaurantContext.restaurant_name}</h3>
                <p className="text-sm text-gray-600">{restaurantContext.street_address}, {restaurantContext.city}, {restaurantContext.state}</p>
              </div>
            </div>
          </div>

          {!order_id && showVerificationPrompt && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">Verify your visit to earn a Verified Visitor badge on your review</p>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => alert('Verification flow would be implemented here')} className="text-sm font-medium text-blue-700 hover:text-blue-800">
                      Verify Now
                    </button>
                    <button onClick={() => setShowVerificationPrompt(false)} className="text-sm text-blue-600 hover:text-blue-700">
                      Skip for now
                    </button>
                  </div>
                </div>
                <button onClick={() => setShowVerificationPrompt(false)} className="ml-3 flex-shrink-0 text-blue-400 hover:text-blue-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 space-y-8">
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                Rating <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleStarClick(rating)}
                    onMouseEnter={() => setHoveredRating(rating)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded transition-transform hover:scale-110"
                    style={{ minWidth: '44px', minHeight: '44px' }}
                    aria-label={`Rate ${rating} stars`}
                  >
                    <svg
                      className={`h-10 w-10 md:h-12 md:w-12 transition-colors ${
                        rating <= (hoveredRating || starRating) ? 'text-yellow-500 fill-current' : 'text-gray-300'
                      }`}
                      fill={rating <= (hoveredRating || starRating) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                ))}
              </div>
              {(hoveredRating > 0 || starRating > 0) && (
                <p className="text-sm font-medium text-gray-700">{ratingLabels[hoveredRating || starRating]}</p>
              )}
              {formErrors.star_rating && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.star_rating}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="review-title" className="block text-sm font-medium text-gray-900 mb-2">
                Review Title <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                id="review-title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value.slice(0, 60))}
                placeholder="Summarize your experience (optional)"
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">{reviewTitle.length}/60 characters</p>
            </div>

            <div>
              <label htmlFor="review-text" className="block text-sm font-medium text-gray-900 mb-2">
                Your Review <span className="text-red-600">*</span>
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => {
                  setReviewText(e.target.value);
                  if (formErrors.review_text) {
                    setFormErrors((prev) => ({ ...prev, review_text: null }));
                  }
                }}
                placeholder="Share your experience - what did you like or dislike?"
                rows={10}
                className={`block w-full px-4 py-3 border ${formErrors.review_text ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none`}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">Minimum 10 characters required</p>
                <p className={`text-xs font-medium ${getCharacterCountColor()}`}>{characterCount}/{maxCharacters} characters</p>
              </div>
              {formErrors.review_text && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.review_text}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Add Photos <span className="text-gray-500">(optional, max 10)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="photo-upload" className="cursor-pointer inline-flex flex-col items-center">
                  <svg className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</span>
                  <span className="text-xs text-gray-500">JPG or PNG, max 5MB per image</span>
                </label>
              </div>

              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formErrors.photos && (
                <p className="text-sm text-red-600 mt-2 flex items-center">
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {formErrors.photos}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 space-y-3 space-y-reverse sm:space-y-0 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || starRating === 0 || reviewText.trim().length < 10}
                className="w-full sm:w-auto px-8 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting your review...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_WriteReview;