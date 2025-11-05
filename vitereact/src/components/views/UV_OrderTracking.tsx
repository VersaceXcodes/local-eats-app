import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ChefHat, 
  ShoppingBag, 
  Car, 
  CheckCircle, 
  Phone, 
  MessageCircle, 
  Flag, 
  X,
  AlertCircle,
  Clock,
  Utensils
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface OrderData {
  order_id: string;
  user_id: string;
  restaurant_id: string;
  order_type: 'delivery' | 'pickup';
  order_status: 'order_received' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  delivery_street_address: string | null;
  delivery_apartment_suite: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_zip_code: string | null;
  special_instructions: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  tax: number;
  tip: number;
  grand_total: number;
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

interface OrderItem {
  order_item_id: string;
  item_name: string;
  quantity: number;
  item_total_price: number;
}

interface RestaurantData {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
  phone_number: string;
  street_address: string;
  city: string;
  state: string;
}

interface OrderWithItems {
  order: OrderData;
  items: OrderItem[];
  restaurant: RestaurantData;
}

interface StatusNode {
  status: string;
  timestamp: string | null;
  label: string;
  icon: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatAbsoluteTime = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatEstimatedTime = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
};

const estimateRemainingTime = (currentStatus: string, estimatedTime: string | null): string => {
  if (!estimatedTime) return '';
  const now = new Date();
  const estimated = new Date(estimatedTime);
  const diffMs = estimated.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins <= 0) return 'Any minute now';
  if (diffMins < 60) return `~${diffMins} minutes`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `~${hours}h ${mins}m`;
};

const buildStatusHistory = (order: OrderData): StatusNode[] => {
  const history: StatusNode[] = [
    {
      status: 'order_received',
      timestamp: order.order_received_at,
      label: 'Order Placed',
      icon: 'restaurant'
    },
    {
      status: 'preparing',
      timestamp: order.preparing_started_at,
      label: 'Preparing',
      icon: 'chef'
    }
  ];

  if (order.order_type === 'pickup') {
    history.push({
      status: 'ready',
      timestamp: order.ready_at,
      label: 'Ready for Pickup',
      icon: 'bag'
    });
    history.push({
      status: 'delivered',
      timestamp: order.delivered_at || order.ready_at,
      label: 'Picked Up',
      icon: 'checkmark'
    });
  } else {
    history.push({
      status: 'out_for_delivery',
      timestamp: order.out_for_delivery_at,
      label: 'Out for Delivery',
      icon: 'car'
    });
    history.push({
      status: 'delivered',
      timestamp: order.delivered_at,
      label: 'Delivered',
      icon: 'checkmark'
    });
  }

  return history;
};

const getStatusIcon = (iconName: string, isActive: boolean, isCompleted: boolean) => {
  const className = `${isActive ? 'w-6 h-6' : 'w-5 h-5'} ${
    isCompleted ? 'text-green-600' : isActive ? 'text-orange-600' : 'text-gray-400'
  }`;

  switch (iconName) {
    case 'restaurant':
      return <Utensils className={className} />;
    case 'chef':
      return <ChefHat className={className} />;
    case 'bag':
      return <ShoppingBag className={className} />;
    case 'car':
      return <Car className={className} />;
    case 'checkmark':
      return <CheckCircle className={className} />;
    default:
      return <Clock className={className} />;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderTracking: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors, no object destructuring
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [pollingIntervalId, setPollingIntervalId] = useState<NodeJS.Timeout | null>(null);

  // ============================================================================
  // API CALLS
  // ============================================================================

  // Fetch order status
  const fetchOrderStatus = async (): Promise<OrderWithItems> => {
    const response = await axios.get<OrderWithItems>(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    return response.data;
  };

  const { 
    data: orderData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery<OrderWithItems, Error>({
    queryKey: ['order', order_id],
    queryFn: fetchOrderStatus,
    enabled: !!order_id && !!authToken,
    staleTime: 0, // Always fresh for real-time tracking
    retry: 1,
    refetchOnWindowFocus: true
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation<
    { message: string },
    Error,
    { cancellation_reason?: string }
  >({
    mutationFn: async (payload) => {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: payload.cancellation_reason ? { cancellation_reason: payload.cancellation_reason } : undefined
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      setCancellationModalOpen(false);
      setCancellationReason('');
    }
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const statusHistory = useMemo(
    () => orderData ? buildStatusHistory(orderData.order) : [],
    [orderData]
  );
  const canCancel = currentStatus === 'order_received';
  const shouldPoll = currentStatus !== 'delivered' && currentStatus !== 'cancelled';

  // ============================================================================
  // POLLING LOGIC
  // ============================================================================

  useEffect(() => {
    if (!shouldPoll || isLoading || isError) {
      // Clear polling if conditions not met
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
      return;
    }

    // Start polling every 20 seconds
    const intervalId = setInterval(() => {
      refetch();
    }, 20000);

    setPollingIntervalId(intervalId);

    // Cleanup on unmount or when polling should stop
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [shouldPoll, isLoading, isError, refetch]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCancelOrder = () => {
    cancelOrderMutation.mutate({ 
      cancellation_reason: cancellationReason || undefined 
    });
  };

  const handleContactRestaurant = () => {
    if (orderData?.restaurant.phone_number) {
      window.location.href = `tel:${orderData.restaurant.phone_number}`;
    }
  };

  const handleContactSupport = () => {
    // Future: Navigate to support form or open chat widget
    alert('Contact support feature coming soon. Please call the restaurant directly for immediate assistance.');
  };

  const handleReportIssue = () => {
    // Future: Open issue reporting form
    alert('Issue reporting feature coming soon. Please contact support or the restaurant directly.');
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatusNode = (node: StatusNode, index: number) => {
    const statusIndex = statusHistory.findIndex(s => s.status === currentStatus);
    const nodeIndex = index;
    const isCompleted = nodeIndex < statusIndex || (nodeIndex === statusIndex && !!node.timestamp);
    const isActive = nodeIndex === statusIndex && currentStatus !== 'cancelled';
    const isFuture = nodeIndex > statusIndex;

    return (
      <div key={node.status} className="flex flex-col items-center md:flex-1">
        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:flex md:flex-col md:items-center md:w-full">
          {/* Progress Line (before node, except first) */}
          {index > 0 && (
            <div className="absolute left-0 right-1/2 top-8 h-0.5 -translate-y-1/2 z-0">
              <div className={`h-full ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            </div>
          )}
          
          {/* Node Circle */}
          <div className="relative z-10 mb-4">
            <div className={`
              flex items-center justify-center rounded-full border-4 transition-all duration-300
              ${isCompleted ? 'bg-green-600 border-green-600 w-16 h-16' : ''}
              ${isActive ? 'bg-orange-600 border-orange-600 w-20 h-20 animate-pulse' : ''}
              ${isFuture ? 'bg-white border-gray-300 w-16 h-16' : ''}
            `}>
              {getStatusIcon(node.icon, isActive, isCompleted)}
            </div>
          </div>

          {/* Progress Line (after node, except last) */}
          {index < statusHistory.length - 1 && (
            <div className="absolute left-1/2 right-0 top-8 h-0.5 -translate-y-1/2 z-0">
              <div className={`h-full ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`}></div>
            </div>
          )}

          {/* Label and Time */}
          <div className="text-center">
            <p className={`font-semibold mb-1 ${
              isActive ? 'text-orange-600 text-lg' : isCompleted ? 'text-green-600' : 'text-gray-500'
            }`}>
              {node.label}
            </p>
            {isCompleted && node.timestamp && (
              <p className="text-xs text-gray-500">{formatTimestamp(node.timestamp)}</p>
            )}
            {isActive && orderData && (
              <p className="text-sm text-orange-600 font-medium mt-1">
                {estimateRemainingTime(
                  currentStatus, 
                  orderData.order.order_type === 'delivery' 
                    ? orderData.order.estimated_delivery_time 
                    : orderData.order.estimated_pickup_time
                )}
              </p>
            )}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="flex md:hidden w-full mb-6">
          <div className="flex flex-col items-center mr-4">
            {/* Node Circle */}
            <div className={`
              flex items-center justify-center rounded-full border-4 transition-all duration-300
              ${isCompleted ? 'bg-green-600 border-green-600 w-12 h-12' : ''}
              ${isActive ? 'bg-orange-600 border-orange-600 w-14 h-14 animate-pulse' : ''}
              ${isFuture ? 'bg-white border-gray-300 w-12 h-12' : ''}
            `}>
              {getStatusIcon(node.icon, isActive, isCompleted)}
            </div>
            
            {/* Progress Line (below node, except last) */}
            {index < statusHistory.length - 1 && (
              <div className="w-0.5 flex-1 mt-2 mb-2">
                <div className={`w-full h-full ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              </div>
            )}
          </div>

          {/* Label and Time */}
          <div className="flex-1 pt-2">
            <p className={`font-semibold mb-1 ${
              isActive ? 'text-orange-600 text-lg' : isCompleted ? 'text-green-600' : 'text-gray-500'
            }`}>
              {node.label}
            </p>
            {isCompleted && node.timestamp && (
              <p className="text-xs text-gray-500">{formatTimestamp(node.timestamp)}</p>
            )}
            {isActive && orderData && (
              <p className="text-sm text-orange-600 font-medium mt-1">
                {estimateRemainingTime(
                  currentStatus, 
                  orderData.order.order_type === 'delivery' 
                    ? orderData.order.estimated_delivery_time 
                    : orderData.order.estimated_pickup_time
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER CONDITIONS
  // ============================================================================

  // Loading State
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 text-sm">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (isError || !orderData) {
    const errorMessage = error?.message || 'Failed to load order';
    const is404 = errorMessage.includes('404') || errorMessage.includes('not found');

    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {is404 ? 'Order Not Found' : 'Error Loading Order'}
            </h2>
            <p className="text-gray-600 mb-6">
              {is404 
                ? 'We couldn\'t find this order. It may have been deleted or you may not have permission to view it.'
                : 'Something went wrong while loading your order details. Please try again.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/order-history"
                className="px-6 py-3 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                View Order History
              </Link>
            </div>
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
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Order Tracking
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Order #{order.order_id}
            </p>
            
            {/* Restaurant Info */}
            <Link 
              to={`/restaurant/${restaurant.restaurant_id}`}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors"
            >
              {restaurant.primary_hero_image_url ? (
                <img 
                  src={restaurant.primary_hero_image_url} 
                  alt={restaurant.restaurant_name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{restaurant.restaurant_name}</p>
                <p className="text-sm text-gray-500">
                  Placed on {formatAbsoluteTime(order.created_at)}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status</h2>
            
            {/* Cancelled Status Banner */}
            {currentStatus === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Order Cancelled</p>
                    <p className="text-sm text-red-700 mt-1">
                      {order.cancellation_reason || 'This order has been cancelled.'}
                    </p>
                    {order.cancelled_at && (
                      <p className="text-xs text-red-600 mt-1">
                        Cancelled {formatTimestamp(order.cancelled_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Container */}
            <div className="relative">
              {/* Desktop: Horizontal */}
              <div className="hidden md:flex md:relative md:items-start md:justify-between">
                {statusHistory.map((node, index) => renderStatusNode(node, index))}
              </div>

              {/* Mobile: Vertical */}
              <div className="md:hidden">
                {statusHistory.map((node, index) => renderStatusNode(node, index))}
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Details</h2>
            
            <div className="space-y-4">
              {/* Order Type */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  {order.order_type === 'delivery' ? (
                    <Car className="w-4 h-4 text-orange-600" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                  </p>
                  {order.order_type === 'delivery' ? (
                    <p className="text-sm text-gray-600 mt-1">
                      {order.delivery_street_address}
                      {order.delivery_apartment_suite && `, ${order.delivery_apartment_suite}`}
                      <br />
                      {order.delivery_city}, {order.delivery_state} {order.delivery_zip_code}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      {restaurant.street_address}
                      <br />
                      {restaurant.city}, {restaurant.state}
                    </p>
                  )}
                </div>
              </div>

              {/* Estimated Time */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Estimated Time</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.order_type === 'delivery' 
                      ? `Arrives ${order.estimated_delivery_time ? formatEstimatedTime(order.estimated_delivery_time) : 'soon'}`
                      : `Ready by ${order.estimated_pickup_time ? formatEstimatedTime(order.estimated_pickup_time) : 'soon'}`
                    }
                  </p>
                </div>
              </div>

              {/* Items Summary */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Utensils className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-2">Items ({items.length})</p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <p key={item.order_item_id} className="text-sm text-gray-600">
                        {item.quantity}x {item.item_name} - ${item.item_total_price.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-gray-900">Total Paid</p>
                  <p className="text-lg font-bold text-gray-900">${order.grand_total.toFixed(2)}</p>
                </div>
              </div>

              {/* Special Instructions */}
              {order.special_instructions && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="font-semibold text-gray-900 mb-1">Special Instructions</p>
                  <p className="text-sm text-gray-600">{order.special_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Need Help?</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Contact Restaurant */}
              <button
                onClick={handleContactRestaurant}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Phone className="w-5 h-5" />
                <span>Contact Restaurant</span>
              </button>

              {/* Contact Support */}
              <button
                onClick={handleContactSupport}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Contact Support</span>
              </button>

              {/* Report Issue */}
              <button
                onClick={handleReportIssue}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
              >
                <Flag className="w-5 h-5" />
                <span>Report Issue</span>
              </button>

              {/* Cancel Order */}
              {canCancel && (
                <button
                  onClick={() => setCancellationModalOpen(true)}
                  className="flex items-center justify-center gap-3 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <X className="w-5 h-5" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>

            {!canCancel && currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Order cannot be cancelled at this stage. Please contact the restaurant for assistance.
              </p>
            )}
          </div>
        </div>

        {/* Cancellation Modal */}
        {cancellationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Cancel Order</h3>
                <button
                  onClick={() => setCancellationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>

              <div className="mb-4">
                <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all"
                  placeholder="Let us know why you're cancelling..."
                />
              </div>

              {cancelOrderMutation.isError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">
                    {cancelOrderMutation.error?.message || 'Failed to cancel order. Please try again.'}
                  </p>
                </div>
              )}

              {cancelOrderMutation.isSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  <p className="text-sm">
                    Order cancelled successfully. Refund will be processed in 3-5 business days.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCancellationModalOpen(false)}
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 disabled:opacity-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelOrderMutation.isPending}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelOrderMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cancelling...
                    </span>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_OrderTracking;