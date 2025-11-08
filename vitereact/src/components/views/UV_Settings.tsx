import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Bell,
  Lock,
  MapPin,
  CreditCard,
  User,
  Loader2,
  AlertCircle,
  Save
} from 'lucide-react';

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

interface Address {
  address_id: string;
  user_id: string;
  address_label: string;
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentMethod {
  payment_method_id: string;
  user_id: string;
  payment_type: string;
  card_brand: string | null;
  card_last_four: string;
  card_expiry_month: string;
  card_expiry_year: string;
  billing_address_id: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const UV_Settings: React.FC = () => {
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isAuthLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<string>(searchParams.get('section') || 'account');
  const [notificationPreferences, setNotificationPreferences] = useState<any>({});
  const [privacySettings, setPrivacySettings] = useState({
    profile_public: true,
    reviews_public: true,
    location_permission_granted: true
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/settings' } });
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (sectionParam && ['account', 'notifications', 'privacy', 'addresses', 'payment'].includes(sectionParam)) {
      setActiveSection(sectionParam);
    } else if (!sectionParam) {
      setActiveSection('account');
    }
  }, [searchParams]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

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

  const {
    data: addresses,
    isLoading: addressesLoading
  } = useQuery<Address[]>({
    queryKey: ['userAddresses'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated && activeSection === 'addresses',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const {
    data: paymentMethods,
    isLoading: paymentMethodsLoading
  } = useQuery<PaymentMethod[]>({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/payment-methods`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && isAuthenticated && activeSection === 'payment',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  useEffect(() => {
    if (userProfile) {
      setNotificationPreferences(userProfile.notification_preferences);
      setPrivacySettings({
        profile_public: userProfile.profile_public,
        reviews_public: userProfile.reviews_public,
        location_permission_granted: userProfile.location_permission_granted
      });
    }
  }, [userProfile]);

  const updateNotificationsMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await axios.patch(
        `${API_BASE_URL}/api/users/me`,
        { notification_preferences: preferences },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data);
      alert('Notification preferences updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update notification preferences';
      alert(`Error: ${errorMessage}`);
    }
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await axios.patch(
        `${API_BASE_URL}/api/users/me`,
        settings,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data);
      alert('Privacy settings updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update privacy settings';
      alert(`Error: ${errorMessage}`);
    }
  });

  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate(notificationPreferences);
  };

  const handleSavePrivacy = () => {
    updatePrivacyMutation.mutate(privacySettings);
  };

  if (isAuthLoading || profileLoading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="size-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 text-sm">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }

  if (profileError) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="size-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Failed to Load Settings</h2>
              <p className="text-gray-600">
                {(profileError as any)?.response?.data?.message || 'An error occurred while loading your settings.'}
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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">Settings</h1>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto">
                <button
                  onClick={() => handleSectionChange('account')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSection === 'account'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <User className="size-4" />
                  Account
                </button>
                <button
                  onClick={() => handleSectionChange('notifications')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSection === 'notifications'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="size-4" />
                  Notifications
                </button>
                <button
                  onClick={() => handleSectionChange('privacy')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSection === 'privacy'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Lock className="size-4" />
                  Privacy
                </button>
                <button
                  onClick={() => handleSectionChange('addresses')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSection === 'addresses'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="size-4" />
                  Addresses
                </button>
                <button
                  onClick={() => handleSectionChange('payment')}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeSection === 'payment'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard className="size-4" />
                  Payment
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              {activeSection === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Full Name</div>
                      <div className="text-lg font-medium text-gray-900">{userProfile?.full_name}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Email</div>
                      <div className="text-lg font-medium text-gray-900">{userProfile?.email}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Phone Number</div>
                      <div className="text-lg font-medium text-gray-900">{userProfile?.phone_number || 'Not provided'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-1">Member Since</div>
                      <div className="text-lg font-medium text-gray-900">
                        {userProfile?.member_since ? new Date(userProfile.member_since).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                    <button
                      onClick={handleSaveNotifications}
                      disabled={updateNotificationsMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Order Updates</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Email notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.order_updates_email || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              order_updates_email: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Push notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.order_updates_push || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              order_updates_push: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Promotions</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Email notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.promotions_email || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              promotions_email: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Push notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.promotions_push || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              promotions_push: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Weekly Picks</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Email notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.weekly_picks_email || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              weekly_picks_email: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Push notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.weekly_picks_push || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              weekly_picks_push: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">New Restaurants</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Email notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.new_restaurants_email || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              new_restaurants_email: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Push notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.new_restaurants_push || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              new_restaurants_push: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Review Responses</h3>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Email notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.review_responses_email || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              review_responses_email: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-gray-700">Push notifications</span>
                          <input
                            type="checkbox"
                            checked={notificationPreferences.review_responses_push || false}
                            onChange={(e) => setNotificationPreferences({
                              ...notificationPreferences,
                              review_responses_push: e.target.checked
                            })}
                            className="size-5 text-blue-600 rounded"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Privacy Settings</h2>
                    <button
                      onClick={handleSavePrivacy}
                      disabled={updatePrivacyMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {updatePrivacyMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-gray-900">Public Profile</div>
                          <div className="text-sm text-gray-600 mt-1">Allow other users to view your profile information</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.profile_public}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            profile_public: e.target.checked
                          })}
                          className="size-5 text-blue-600 rounded mt-1"
                        />
                      </label>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-gray-900">Public Reviews</div>
                          <div className="text-sm text-gray-600 mt-1">Make your reviews visible to all users</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.reviews_public}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            reviews_public: e.target.checked
                          })}
                          className="size-5 text-blue-600 rounded mt-1"
                        />
                      </label>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-gray-900">Location Permission</div>
                          <div className="text-sm text-gray-600 mt-1">Allow the app to access your location for better recommendations</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.location_permission_granted}
                          onChange={(e) => setPrivacySettings({
                            ...privacySettings,
                            location_permission_granted: e.target.checked
                          })}
                          className="size-5 text-blue-600 rounded mt-1"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'addresses' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
                    <button
                      onClick={() => alert('Add address feature coming soon!')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                    >
                      Add Address
                    </button>
                  </div>

                  {addressesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-8 text-blue-600 animate-spin" />
                    </div>
                  ) : addresses && addresses.length > 0 ? (
                    <div className="space-y-4">
                      {addresses.map((address) => (
                        <div key={address.address_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                {address.address_label}
                                {address.is_default && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>
                                )}
                              </div>
                              <div className="text-gray-700 mt-2">
                                {address.street_address}
                                {address.apartment_suite && `, ${address.apartment_suite}`}
                              </div>
                              <div className="text-gray-700">
                                {address.city}, {address.state} {address.zip_code}
                              </div>
                              {address.delivery_instructions && (
                                <div className="text-sm text-gray-600 mt-2">
                                  Instructions: {address.delivery_instructions}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MapPin className="size-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No saved addresses yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'payment' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
                    <button
                      onClick={() => alert('Add payment method feature coming soon!')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                    >
                      Add Payment Method
                    </button>
                  </div>

                  {paymentMethodsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-8 text-blue-600 animate-spin" />
                    </div>
                  ) : paymentMethods && paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <div key={method.payment_method_id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <CreditCard className="size-6 text-gray-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                  {method.card_brand} •••• {method.card_last_four}
                                  {method.is_default && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Default</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Expires {method.card_expiry_month}/{method.card_expiry_year}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CreditCard className="size-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No payment methods saved yet</p>
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

export default UV_Settings;
