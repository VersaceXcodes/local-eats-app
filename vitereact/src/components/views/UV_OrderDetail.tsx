import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ChevronLeft, 
  MapPin, 
  Phone, 
  
  CheckCircle, 
  XCircle, 
  Package, 
  Truck,
  Download,
  RotateCcw,
  MessageSquare,
  Star
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface StatusTimelineItem {
  status: string;
  timestamp: string | null;
  is_completed: boolean;
  label: string;
}

interface OrderItemResponse {
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

interface RestaurantResponse {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
  phone_number: string;
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
}

interface OrderResponse {
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
  order_received_at: string | null;
  preparing_started_at: string | null;
  ready_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderDetailResponse {
  order: OrderResponse;
  items: OrderItemResponse[];
  restaurant: RestaurantResponse;
  has_been_reviewed?: boolean;
}

interface PaymentMethod {
  payment_method_id: string;
  card_type: string;
  last_four_digits: string;
}

interface DiscountResponse {
  discount_id: string;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();

  // CRITICAL: Individual Zustand selectors (NO object destructuring)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const cartRestaurantId = useAppStore(state => state.cart_state.restaurant_id);
  const addToCart = useAppStore(state => state.add_to_cart);
  const clearCart = useAppStore(state => state.clear_cart);

  // Local state
  const [showCartClearModal, setShowCartClearModal] = useState(false);
  const [pendingReorderData, setPendingReorderData] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/order/${order_id}` } });
    }
  }, [isAuthenticated, navigate, order_id]);

  // ============================================================================
  // API QUERIES
  // ============================================================================

  // Fetch order details
  const {
    data: orderData,
    isLoading: isLoadingOrder,
    error: orderError,
  } = useQuery<OrderDetailResponse>({
    queryKey: ['order-detail', order_id],
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
    enabled: !!authToken && !!order_id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Check authorization
  useEffect(() => {
    if (orderData && currentUser && orderData.order.user_id !== currentUser.user_id) {
      navigate('/404');
    }
  }, [orderData, currentUser, navigate]);

  // Fetch payment details if payment_method_id exists
  const {
    data: paymentMethods,
  } = useQuery<{ payment_methods: PaymentMethod[] }>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      return response.data;
    },
    enabled: !!authToken && !!orderData?.order.payment_method_id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch discount details if discount_id exists
  const {
    data: discountData,
  } = useQuery<DiscountResponse>({
    queryKey: ['discount', orderData?.order.discount_id],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/discounts/${orderData?.order.discount_id}`,
      );
      return response.data;
    },
    enabled: !!orderData?.order.discount_id,
    staleTime: 5 * 60 * 1000,
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const statusTimeline: StatusTimelineItem[] = orderData ? [
    {
      status: 'order_received',
      timestamp: orderData.order.order_received_at,
      is_completed: !!orderData.order.order_received_at,
      label: 'Order Placed',
    },
    {
      status: 'preparing',
      timestamp: orderData.order.preparing_started_at,
      is_completed: !!orderData.order.preparing_started_at,
      label: 'Preparing',
    },
    {
      status: orderData.order.order_type === 'pickup' ? 'ready' : 'out_for_delivery',
      timestamp: orderData.order.order_type === 'pickup' ? orderData.order.ready_at : orderData.order.out_for_delivery_at,
      is_completed: orderData.order.order_type === 'pickup' ? !!orderData.order.ready_at : !!orderData.order.out_for_delivery_at,
      label: orderData.order.order_type === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery',
    },
    {
      status: 'delivered',
      timestamp: orderData.order.delivered_at,
      is_completed: !!orderData.order.delivered_at,
      label: orderData.order.order_type === 'pickup' ? 'Picked Up' : 'Delivered',
    },
  ] : [];

  // Add cancellation to timeline if applicable
  if (orderData?.order.cancelled_at) {
    statusTimeline.push({
      status: 'cancelled',
      timestamp: orderData.order.cancelled_at,
      is_completed: true,
      label: 'Cancelled',
    });
  }

  const isRecentOrder = orderData ? 
    (Date.now() - new Date(orderData.order.created_at).getTime()) < (24 * 60 * 60 * 1000) &&
    orderData.order.order_status !== 'delivered' &&
    orderData.order.order_status !== 'cancelled'
    : false;

  const showReviewPrompt = orderData ?
    orderData.order.order_status === 'delivered' && !orderData.has_been_reviewed
    : false;

  const paymentDisplayInfo = paymentMethods && orderData?.order.payment_method_id ?
    paymentMethods.payment_methods.find(pm => pm.payment_method_id === orderData.order.payment_method_id)
    : null;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleReorder = async () => {
    if (!orderData || !authToken) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/reorder`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const reorderData = response.data;

      // Check for cart conflict
      if (cartRestaurantId && cartRestaurantId !== reorderData.restaurant_id) {
        setPendingReorderData(reorderData);
        setShowCartClearModal(true);
      } else {
        // Add items to cart
        reorderData.items.forEach((item: any) => {
          addToCart(
            {
              menu_item_id: item.menu_item_id,
              item_name: item.item_name,
              base_price: Number(item.base_price),
              customizations: {
                size: item.selected_size,
                add_ons: item.selected_addons || [],
                modifications: item.selected_modifications?.map((m: any) => m.name) || [],
                special_instructions: item.special_instructions,
              },
              quantity: item.quantity,
            },
            reorderData.restaurant_id,
            orderData.restaurant.restaurant_name
          );
        });
        navigate('/cart');
      }
    } catch (error) {
      console.error('Reorder failed:', error);
    }
  };

  const handleConfirmCartClear = () => {
    if (!pendingReorderData || !orderData) return;

    clearCart();
    
    // Add items to cart
    pendingReorderData.items.forEach((item: any) => {
      addToCart(
        {
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          base_price: Number(item.base_price),
          customizations: {
            size: item.selected_size,
            add_ons: item.selected_addons || [],
            modifications: item.selected_modifications?.map((m: any) => m.name) || [],
            special_instructions: item.special_instructions,
          },
          quantity: item.quantity,
        },
        pendingReorderData.restaurant_id,
        orderData.restaurant.restaurant_name
      );
    });

    setShowCartClearModal(false);
    setPendingReorderData(null);
    navigate('/cart');
  };

  const handleDownloadReceipt = () => {
    // Simple print receipt functionality
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const _formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoadingOrder) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (orderError || !orderData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find this order. It may not exist or you don't have permission to view it.
              </p>
              <Link
                to="/order-history"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Back to Order History
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { order, items, restaurant } = orderData;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <Link
              to="/order-history"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium">Back to Order History</span>
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Details</h1>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="text-lg font-semibold text-gray-900">#{order.order_id}</span>
              <span className="text-sm">{formatDate(order.created_at)}</span>
            </div>
          </div>

          {/* Order Status Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Order Status</h2>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                order.order_status === 'delivered' 
                  ? 'bg-green-100 text-green-800'
                  : order.order_status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {order.order_status === 'delivered' ? 'Completed' : 
                 order.order_status === 'cancelled' ? 'Cancelled' :
                 order.order_status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>

            {/* Status Timeline */}
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-6">
                {statusTimeline.map((status, index) => (
                  <div key={index} className="relative flex items-start">
                    <div className={`absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      status.is_completed 
                        ? 'bg-green-500 border-green-500' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {status.is_completed && (
                        <CheckCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="ml-12">
                      <h3 className={`font-semibold ${status.is_completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {status.label}
                      </h3>
                      {status.timestamp && (
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(status.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancellation Info */}
            {order.cancelled_at && order.cancellation_reason && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">Cancellation Reason:</p>
                <p className="text-sm text-red-700">{order.cancellation_reason}</p>
              </div>
            )}
          </div>

          {/* Restaurant Information */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Restaurant Information</h2>
            <Link 
              to={`/restaurant/${restaurant.restaurant_id}`}
              className="flex items-center gap-4 mb-4 hover:bg-gray-50 transition-colors rounded-lg p-2 -m-2"
            >
              {restaurant.primary_hero_image_url && (
                <img
                  src={restaurant.primary_hero_image_url}
                  alt={restaurant.restaurant_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                  {restaurant.restaurant_name}
                </h3>
                <p className="text-sm text-gray-600">Click to view restaurant</p>
              </div>
            </Link>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  {restaurant.street_address}
                  {restaurant.apartment_suite && `, ${restaurant.apartment_suite}`}
                  <br />
                  {restaurant.city}, {restaurant.state} {restaurant.zip_code}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a 
                  href={`tel:${restaurant.phone_number}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {restaurant.phone_number}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900">
                  {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                </span>
              </div>

              {order.order_type === 'delivery' && order.delivery_street_address && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Delivery Address:</p>
                  <p className="text-sm text-gray-700">
                    {order.delivery_street_address}
                    {order.delivery_apartment_suite && `, ${order.delivery_apartment_suite}`}
                    <br />
                    {order.delivery_city}, {order.delivery_state} {order.delivery_zip_code}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.order_item_id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-600">{item.quantity}x</span>
                        <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
                      </div>
                      
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        {item.selected_size && (
                          <p>Size: {item.selected_size}</p>
                        )}
                        {item.selected_addons && item.selected_addons.length > 0 && (
                          <p>Add-ons: {item.selected_addons.map(a => a.name).join(', ')}</p>
                        )}
                        {item.selected_modifications && item.selected_modifications.length > 0 && (
                          <p>Modifications: {item.selected_modifications.map(m => m.name).join(', ')}</p>
                        )}
                        {item.special_instructions && (
                          <p className="italic">Note: {item.special_instructions}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">${Number(item.item_total_price).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">${Number(item.base_price).toFixed(2)} each</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          {order.special_instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-blue-900 mb-1">Special Instructions:</p>
              <p className="text-sm text-blue-700">{order.special_instructions}</p>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {discountData?.coupon_code && ` (${discountData.coupon_code})`}
                  </span>
                  <span>-${Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}

              {order.delivery_fee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  <span>${Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-700">
                <span>Tax</span>
                <span>${Number(order.tax).toFixed(2)}</span>
              </div>

              {order.tip > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Tip</span>
                  <span>${Number(order.tip).toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${Number(order.grand_total).toFixed(2)}</span>
                </div>
              </div>

              {paymentDisplayInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Paid with {paymentDisplayInfo.card_type} ending in {paymentDisplayInfo.last_four_digits}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <button
              onClick={handleReorder}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RotateCcw className="w-5 h-5" />
              Reorder
            </button>

            <button
              onClick={handleDownloadReceipt}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 border border-gray-300"
            >
              <Download className="w-5 h-5" />
              Download Receipt
            </button>

            {isRecentOrder && (
              <Link
                to={`/order/${order.order_id}/track`}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Truck className="w-5 h-5" />
                Track Order
              </Link>
            )}
          </div>

          {/* Help and Support */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Need help with this order?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={`tel:${restaurant.phone_number}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <Phone className="w-5 h-5" />
                Contact Restaurant
              </a>

              <button
                onClick={() => {/* Open support form/chat */}}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <MessageSquare className="w-5 h-5" />
                Contact Support
              </button>
            </div>
          </div>

          {/* Review Prompt */}
          {showReviewPrompt && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">How was your experience?</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Help others discover great food! Share your thoughts about {restaurant.restaurant_name}.
                  </p>
                  <Link
                    to={`/restaurant/${restaurant.restaurant_id}/review?order_id=${order.order_id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    <Star className="w-5 h-5" />
                    Write Review
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Clear Confirmation Modal */}
      {showCartClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Clear Cart?</h3>
            <p className="text-gray-700 mb-6">
              Your cart contains items from a different restaurant. Do you want to clear your cart and add items from this order?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowCartClearModal(false);
                  setPendingReorderData(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCartClear}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Clear & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_OrderDetail;