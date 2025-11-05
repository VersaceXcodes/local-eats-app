import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  order_id: string;
  user_id: string;
  restaurant_id: string;
  order_type: string;
  order_status: string;
  delivery_street_address: string | null;
  delivery_apartment_suite: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_zip_code: string | null;
  special_instructions: string | null;
  subtotal: number;
  discount_amount: number;
  discount_id: string | null;
  delivery_fee: number;
  tax: number;
  tip: number;
  grand_total: number;
  payment_method_id: string | null;
  payment_status: string;
  estimated_delivery_time: string | null;
  estimated_pickup_time: string | null;
  order_received_at: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  order_item_id: string;
  menu_item_id: string;
  item_name: string;
  base_price: number;
  selected_size: string | null;
  size_price_adjustment: number;
  selected_addons: Array<{ name: string; price: number }>;
  selected_modifications: Array<{ name: string; price: number }>;
  special_instructions: string | null;
  quantity: number;
  item_total_price: number;
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface OrderDetailsResponse {
  order: Order;
  items: OrderItem[];
  restaurant: Restaurant;
}

interface CartResponse {
  restaurant_id: string;
  restaurant_name: string;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  tip: number;
  grand_total: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderConfirmation: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();

  // CRITICAL: Individual Zustand selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(true);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showItemsExpanded, setShowItemsExpanded] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    data: orderData,
    isLoading,
    error,
  } = useQuery<OrderDetailsResponse>({
    queryKey: ['order', order_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
    // CRITICAL: Transform to ensure correct number types
    select: (data) => ({
      order: {
        ...data.order,
        subtotal: Number(data.order.subtotal || 0),
        discount_amount: Number(data.order.discount_amount || 0),
        delivery_fee: Number(data.order.delivery_fee || 0),
        tax: Number(data.order.tax || 0),
        tip: Number(data.order.tip || 0),
        grand_total: Number(data.order.grand_total || 0),
      },
      items: data.items.map(item => ({
        ...item,
        base_price: Number(item.base_price || 0),
        size_price_adjustment: Number(item.size_price_adjustment || 0),
        quantity: Number(item.quantity || 0),
        item_total_price: Number(item.item_total_price || 0),
        selected_addons: item.selected_addons.map(addon => ({
          ...addon,
          price: Number(addon.price || 0),
        })),
        selected_modifications: item.selected_modifications.map(mod => ({
          ...mod,
          price: Number(mod.price || 0),
        })),
      })),
      restaurant: data.restaurant,
    }),
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post<CartResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/reorder`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      navigate('/cart');
    },
    onError: (error: any) => {
      console.error('Reorder failed:', error);
      alert('Failed to reorder. Please try again.');
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessAnimation]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/order/${order_id}/track`;
    const shareText = `Track my order from ${orderData?.restaurant.restaurant_name}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Order Tracking',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const formatEstimatedTime = () => {
    if (!orderData) return '';
    
    if (orderData.order.order_type === 'delivery' && orderData.order.estimated_delivery_time) {
      const estimatedTime = new Date(orderData.order.estimated_delivery_time);
      const now = new Date();
      const diffMinutes = Math.round((estimatedTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (diffMinutes > 60) {
        const hours = Math.floor(diffMinutes / 60);
        return `${hours}-${hours + 1} hours`;
      } else {
        return `${diffMinutes}-${diffMinutes + 10} minutes`;
      }
    } else if (orderData.order.order_type === 'pickup' && orderData.order.estimated_pickup_time) {
      const pickupTime = new Date(orderData.order.estimated_pickup_time);
      return pickupTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    
    return '30-40 minutes';
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600"></div>
            <p className="text-gray-600 text-lg font-medium">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error || !orderData) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't load your order details. Please try again or contact support.
            </p>
            <Link
              to="/"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { order, items, restaurant } = orderData;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* ================================================================ */}
          {/* SUCCESS ANIMATION */}
          {/* ================================================================ */}
          {showSuccessAnimation && (
            <div className="mb-8 text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4 animate-bounce">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-6xl animate-pulse">🎉</div>
            </div>
          )}

          {/* ================================================================ */}
          {/* SUCCESS MESSAGE */}
          {/* ================================================================ */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 leading-tight">
              Order Placed Successfully!
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6">Thank you for your order!</p>
            <div className="inline-block bg-white px-6 py-3 rounded-lg shadow-md">
              <p className="text-sm text-gray-500 mb-1">Order Number</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                #{order.order_id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* CONFIRMATION TEXT */}
          {/* ================================================================ */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <p className="text-center text-base sm:text-lg text-gray-700 leading-relaxed">
              Your order has been received and{' '}
              <Link 
                to={`/restaurant/${restaurant.restaurant_id}`} 
                className="text-orange-600 hover:text-orange-700 font-semibold underline decoration-2 underline-offset-2"
              >
                {restaurant.restaurant_name}
              </Link>{' '}
              is preparing your food!
            </p>
          </div>

          {/* ================================================================ */}
          {/* ORDER DETAILS CARD */}
          {/* ================================================================ */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
            {/* Restaurant Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
              <div className="flex items-center gap-4">
                {restaurant.primary_hero_image_url && (
                  <img
                    src={restaurant.primary_hero_image_url}
                    alt={restaurant.restaurant_name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/restaurant/${restaurant.restaurant_id}`}
                    className="text-xl sm:text-2xl font-bold hover:underline block truncate"
                  >
                    {restaurant.restaurant_name}
                  </Link>
                  <p className="text-orange-100 text-sm mt-1">
                    {order.order_type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'}
                  </p>
                </div>
              </div>
            </div>

            {/* Estimated Time */}
            <div className="bg-orange-50 border-b border-orange-100 p-6">
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {order.order_type === 'delivery' ? 'Estimated delivery' : 'Ready for pickup at'}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{formatEstimatedTime()}</p>
                </div>
              </div>
            </div>

            {/* Address/Location */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 mb-1">
                    {order.order_type === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                  </p>
                  {order.order_type === 'delivery' ? (
                    <div className="text-gray-600 text-sm sm:text-base">
                      <p className="break-words">{order.delivery_street_address}</p>
                      {order.delivery_apartment_suite && <p>{order.delivery_apartment_suite}</p>}
                      <p>
                        {order.delivery_city}, {order.delivery_state} {order.delivery_zip_code}
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm sm:text-base">
                      <p className="break-words">{restaurant.street_address}</p>
                      <p>
                        {restaurant.city}, {restaurant.state} {restaurant.zip_code}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Restaurant Contact</p>
                  <a 
                    href={`tel:${restaurant.phone_number}`} 
                    className="text-orange-600 hover:text-orange-700 font-semibold text-base sm:text-lg"
                  >
                    {restaurant.phone_number}
                  </a>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="p-6 border-b border-gray-200">
              <button
                onClick={() => setShowItemsExpanded(!showItemsExpanded)}
                className="w-full flex items-center justify-between mb-4 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Items ({items.length})
                </h3>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    showItemsExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {!showItemsExpanded ? (
                <p className="text-gray-600 text-sm sm:text-base break-words">
                  {items.map((item, idx) => (
                    <span key={item.order_item_id}>
                      {item.quantity}x {item.item_name}
                      {idx < items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.order_item_id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                      <div className="flex justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 break-words">
                            {item.quantity}x {item.item_name}
                          </p>
                          {item.selected_size && (
                            <p className="text-sm text-gray-600">Size: {item.selected_size}</p>
                          )}
                          {item.selected_addons.length > 0 && (
                            <p className="text-sm text-gray-600 break-words">
                              Add-ons: {item.selected_addons.map(a => a.name).join(', ')}
                            </p>
                          )}
                          {item.selected_modifications.length > 0 && (
                            <p className="text-sm text-gray-600 break-words">
                              Modifications: {item.selected_modifications.map(m => m.name).join(', ')}
                            </p>
                          )}
                          {item.special_instructions && (
                            <p className="text-sm text-gray-500 italic break-words">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 flex-shrink-0">
                          ${item.item_total_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Summary */}
            <div className="p-6 bg-gray-50">
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-${order.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>${order.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                {order.tip > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tip</span>
                    <span>${order.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg sm:text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>${order.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              {order.payment_method_id && (
                <p className="text-xs sm:text-sm text-gray-500 mt-4 text-center">
                  Paid with •••• {order.payment_method_id.slice(-4)}
                </p>
              )}
            </div>

            {/* Special Instructions */}
            {order.special_instructions && (
              <div className="p-6 bg-yellow-50 border-t border-yellow-100">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 mb-1">Special Instructions</p>
                    <p className="text-gray-700 text-sm sm:text-base break-words">{order.special_instructions}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================ */}
          {/* ACTION BUTTONS */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => navigate(`/order/${order_id}/track`)}
              className="bg-orange-600 text-white px-6 py-4 rounded-xl font-semibold text-base sm:text-lg hover:bg-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Track Order
            </button>

            <button
              onClick={() => setShowReceiptModal(true)}
              className="bg-white text-gray-700 px-6 py-4 rounded-xl font-semibold text-base sm:text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Receipt
            </button>

            <button
              onClick={() => reorderMutation.mutate()}
              disabled={reorderMutation.isPending}
              className="bg-white text-gray-700 px-6 py-4 rounded-xl font-semibold text-base sm:text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reorderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                  <span className="hidden sm:inline">Reordering...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Order Again
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              className="bg-white text-gray-700 px-6 py-4 rounded-xl font-semibold text-base sm:text-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return Home
            </button>
          </div>

          {/* Share Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {shareSuccess ? 'Link copied!' : 'Share order tracking'}
            </button>
          </div>

          {/* ================================================================ */}
          {/* EMAIL CONFIRMATION NOTICE */}
          {/* ================================================================ */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 mb-1">Confirmation Email Sent</p>
                <p className="text-blue-700 text-sm sm:text-base break-words">
                  We've sent a confirmation email to{' '}
                  <span className="font-semibold">{currentUser?.email}</span>
                </p>
                <p className="text-blue-600 text-xs sm:text-sm mt-1">
                  Check your inbox and spam folder for order details, tracking link, and receipt.
                </p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* WHAT'S NEXT SECTION */}
          {/* ================================================================ */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">What's Next?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">Track Your Order</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We'll send you notifications as your order progresses. Click "Track Order" above to view live updates.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">Rate Your Experience</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  After you receive your order, we'll ask you to share your feedback and rate your experience.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">Earn Rewards</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Continue ordering to unlock badges, earn discounts, and discover exclusive deals on your favorite restaurants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RECEIPT MODAL */}
      {/* ================================================================ */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowReceiptModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Order Receipt</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                aria-label="Close receipt"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 print-area">
              {/* Receipt Header */}
              <div className="text-center mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{restaurant.restaurant_name}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {restaurant.street_address}<br />
                  {restaurant.city}, {restaurant.state} {restaurant.zip_code}<br />
                  {restaurant.phone_number}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mt-4">
                  Order #{order.order_id.slice(-8).toUpperCase()}<br />
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              {/* Receipt Items */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 text-base sm:text-lg">Items</h4>
                {items.map((item) => (
                  <div key={item.order_item_id} className="mb-4">
                    <div className="flex justify-between gap-4 mb-1">
                      <span className="font-medium text-gray-900 text-sm sm:text-base break-words flex-1">
                        {item.quantity}x {item.item_name}
                      </span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base flex-shrink-0">
                        ${item.item_total_price.toFixed(2)}
                      </span>
                    </div>
                    {item.selected_size && (
                      <p className="text-xs sm:text-sm text-gray-600 ml-4">• Size: {item.selected_size}</p>
                    )}
                    {item.selected_addons.map((addon, idx) => (
                      <p key={idx} className="text-xs sm:text-sm text-gray-600 ml-4 break-words">
                        • {addon.name} (+${addon.price.toFixed(2)})
                      </p>
                    ))}
                    {item.selected_modifications.map((mod, idx) => (
                      <p key={idx} className="text-xs sm:text-sm text-gray-600 ml-4 break-words">
                        • {mod.name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Receipt Totals */}
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-${order.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {order.delivery_fee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    <span>${order.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
                {order.tip > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tip</span>
                    <span>${order.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg sm:text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>${order.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs sm:text-sm text-gray-500">
                <p>Thank you for your order!</p>
                <p className="mt-2">Questions? Contact us at {restaurant.phone_number}</p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors text-sm sm:text-base"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CUSTOM STYLES */}
      {/* ================================================================ */}
      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default UV_OrderConfirmation;