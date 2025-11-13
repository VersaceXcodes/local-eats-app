import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface OrderListItem {
  order_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_logo: string | null;
  order_date: string;
  order_status: string;
  total_amount: number;
  items_summary: string;
  item_count: number;
  has_review: boolean;
}

interface OrderItem {
  order_item_id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  item_total_price: number;
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  primary_hero_image_url: string | null;
}

interface OrderWithItems {
  order: {
    order_id: string;
    restaurant_id: string;
    order_status: string;
    grand_total: number;
    created_at: string;
  };
  items: OrderItem[];
  restaurant: Restaurant;
}

interface OrdersResponse {
  orders: OrderWithItems[];
  total_count: number;
}

interface RestaurantFilterOption {
  restaurant_id: string;
  restaurant_name: string;
  order_count: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // CRITICAL: Individual selectors only - no object destructuring
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const cartRestaurantId = useAppStore(state => state.cart_state.restaurant_id);

  // Local state - synced with URL params
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>(
    searchParams.get('status_filter') || 'all'
  );
  const [activeDateRange, setActiveDateRange] = useState<string>(
    searchParams.get('date_range') || 'all'
  );
  const [activeRestaurantFilter, setActiveRestaurantFilter] = useState<string | null>(
    searchParams.get('restaurant_id') || null
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('search_query') || ''
  );

  // Pagination state
  const [allOrders, setAllOrders] = useState<OrderListItem[]>([]);
  const [paginationOffset, setPaginationOffset] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // UI state
  const [showCartClearModal, setShowCartClearModal] = useState(false);
  const [pendingReorder, setPendingReorder] = useState<{
    order_id: string;
    restaurant_id: string;
  } | null>(null);

  const paginationLimit = 20;

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/order-history' } });
    }
  }, [isAuthenticated, navigate]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getDateRange = (range: string): { start_date?: string; end_date?: string } => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    switch (range) {
      case '7days': {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start_date: sevenDaysAgo.toISOString().split('T')[0],
          end_date: today,
        };
      }
      case '30days': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start_date: thirtyDaysAgo.toISOString().split('T')[0],
          end_date: today,
        };
      }
      case 'year': {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start_date: yearStart.toISOString().split('T')[0],
          end_date: today,
        };
      }
      case 'all':
      default:
        return {};
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    data: ordersData,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: [
      'orders',
      activeStatusFilter,
      activeDateRange,
      activeRestaurantFilter,
      paginationOffset,
    ],
    queryFn: async () => {
      if (!authToken) throw new Error('Not authenticated');

      const dateRange = getDateRange(activeDateRange);
      const params: Record<string, any> = {
        limit: paginationLimit,
        offset: paginationOffset,
        ...dateRange,
      };

      if (activeStatusFilter !== 'all') {
        params.order_status = activeStatusFilter;
      }

      if (activeRestaurantFilter) {
        params.restaurant_id = activeRestaurantFilter;
      }

      const response = await axios.get<OrdersResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params,
        }
      );

      return response.data;
    },
    enabled: !!authToken && isAuthenticated,
    staleTime: 60000,
    retry: 1,
  });

  // Update accumulated orders when data changes
  useEffect(() => {
    if (ordersData?.orders) {
      const mappedOrders: OrderListItem[] = ordersData.orders.map((orderData) => ({
        order_id: orderData.order.order_id,
        restaurant_id: orderData.order.restaurant_id,
        restaurant_name: orderData.restaurant.restaurant_name,
        restaurant_logo: orderData.restaurant.primary_hero_image_url,
        order_date: orderData.order.created_at,
        order_status: orderData.order.order_status,
        total_amount: orderData.order.grand_total,
        items_summary: orderData.items.map((item) => item.item_name).join(', '),
        item_count: orderData.items.length,
        has_review: false,
      }));

      if (paginationOffset === 0) {
        // First page - replace all orders
        setAllOrders(mappedOrders);
      } else {
        // Subsequent pages - append orders
        setAllOrders((prev) => [...prev, ...mappedOrders]);
      }

      setTotalCount(ordersData.total_count);
    }
  }, [ordersData, paginationOffset]);

  // Reset pagination when filters change
  useEffect(() => {
    setPaginationOffset(0);
    setAllOrders([]);
  }, [activeStatusFilter, activeDateRange, activeRestaurantFilter]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Restaurant filter options
  const restaurantFilterOptions = useMemo<RestaurantFilterOption[]>(() => {
    if (!allOrders.length) return [];

    const restaurantMap = new Map<string, { name: string; count: number }>();

    allOrders.forEach((order) => {
      const existing = restaurantMap.get(order.restaurant_id);
      if (existing) {
        existing.count++;
      } else {
        restaurantMap.set(order.restaurant_id, {
          name: order.restaurant_name,
          count: 1,
        });
      }
    });

    return Array.from(restaurantMap.entries()).map(([id, data]) => ({
      restaurant_id: id,
      restaurant_name: data.name,
      order_count: data.count,
    }));
  }, [allOrders]);

  // Client-side search filtering
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return allOrders;

    const query = searchQuery.toLowerCase();
    return allOrders.filter(
      (order) =>
        order.restaurant_name.toLowerCase().includes(query) ||
        order.order_id.toLowerCase().includes(query)
    );
  }, [allOrders, searchQuery]);

  // Pagination state
  const hasMoreOrders = paginationOffset + paginationLimit < totalCount;

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const reorderMutation = useMutation({
    mutationFn: async (order_id: string) => {
      if (!authToken) throw new Error('Not authenticated');

      const response = await axios.post(
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
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleStatusFilterChange = (status: string) => {
    setActiveStatusFilter(status);
    const params = new URLSearchParams(searchParams);
    if (status === 'all') {
      params.delete('status_filter');
    } else {
      params.set('status_filter', status);
    }
    setSearchParams(params);
  };

  const handleDateRangeChange = (range: string) => {
    setActiveDateRange(range);
    const params = new URLSearchParams(searchParams);
    if (range === 'all') {
      params.delete('date_range');
    } else {
      params.set('date_range', range);
    }
    setSearchParams(params);
  };

  const handleRestaurantFilterChange = (restaurantId: string) => {
    setActiveRestaurantFilter(restaurantId === 'all' ? null : restaurantId);
    const params = new URLSearchParams(searchParams);
    if (restaurantId === 'all') {
      params.delete('restaurant_id');
    } else {
      params.set('restaurant_id', restaurantId);
    }
    setSearchParams(params);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search_query', value);
    } else {
      params.delete('search_query');
    }
    setSearchParams(params);
  };

  const handleLoadMore = () => {
    setPaginationOffset((prev) => prev + paginationLimit);
  };

  const handleClearFilters = () => {
    setActiveStatusFilter('all');
    setActiveDateRange('all');
    setActiveRestaurantFilter(null);
    setSearchQuery('');
    setSearchParams({});
  };

  const handleReorder = (order_id: string, restaurant_id: string) => {
    if (cartRestaurantId && cartRestaurantId !== restaurant_id) {
      setPendingReorder({ order_id, restaurant_id });
      setShowCartClearModal(true);
    } else {
      reorderMutation.mutate(order_id);
    }
  };

  const confirmReorder = () => {
    if (pendingReorder) {
      reorderMutation.mutate(pendingReorder.order_id);
      setShowCartClearModal(false);
      setPendingReorder(null);
    }
  };

  const cancelReorder = () => {
    setShowCartClearModal(false);
    setPendingReorder(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="mt-2 text-gray-600">View and manage your past orders</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Date Range Filter */}
              <div>
                <label
                  htmlFor="date-range"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Date Range
                </label>
                <select
                  id="date-range"
                  value={activeDateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={activeStatusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                >
                  <option value="all">All</option>
                  <option value="delivered">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Restaurant Filter */}
              <div>
                <label
                  htmlFor="restaurant"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Restaurant
                </label>
                <select
                  id="restaurant"
                  value={activeRestaurantFilter || 'all'}
                  onChange={(e) => handleRestaurantFilterChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
                >
                  <option value="all">All Restaurants</option>
                  {restaurantFilterOptions.map((restaurant) => (
                    <option key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                      {restaurant.restaurant_name} ({restaurant.order_count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by restaurant name or order number"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Clear Filters Button */}
            {(activeStatusFilter !== 'all' ||
              activeDateRange !== 'all' ||
              activeRestaurantFilter ||
              searchQuery) && (
              <div className="mt-4">
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && paginationOffset === 0 && (
            <div className="flex justify-center items-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-red-700 font-medium mb-4">Failed to load order history</p>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Orders List */}
          {!isLoading && !fetchError && filteredOrders.length > 0 && (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/order/${order.order_id}`)}
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Restaurant Logo */}
                      <div className="flex-shrink-0">
                        {order.restaurant_logo ? (
                          <img
                            src={order.restaurant_logo}
                            alt={order.restaurant_name}
                            className="w-16 h-16 rounded-lg object-cover shadow-md"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shadow-md">
                            <span className="text-3xl">🍽️</span>
                          </div>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <Link
                              to={`/restaurant/${order.restaurant_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xl font-bold text-gray-900 hover:text-orange-600 transition-colors"
                            >
                              {order.restaurant_name}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(order.order_date)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(
                              order.order_status
                            )}`}
                          >
                            {formatStatus(order.order_status)}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-3 leading-relaxed">
                          <span className="font-medium text-gray-700">
                            {order.item_count} {order.item_count === 1 ? 'item' : 'items'}:
                          </span>{' '}
                          {order.items_summary}
                        </p>

                        <p className="text-3xl font-bold text-gray-900 mb-6">
                          {formatCurrency(order.total_amount)}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/order/${order.order_id}`);
                            }}
                            className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200"
                          >
                            View Details
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorder(order.order_id, order.restaurant_id);
                            }}
                            disabled={reorderMutation.isPending}
                            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reorderMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <svg
                                  className="animate-spin h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Reordering...
                              </span>
                            ) : (
                              'Reorder'
                            )}
                          </button>

                          {order.order_status === 'delivered' && !order.has_review && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/restaurant/${order.restaurant_id}/review?order_id=${order.order_id}`
                                );
                              }}
                              className="px-6 py-3 border-2 border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 font-medium transition-all duration-200"
                            >
                              Write Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMoreOrders && (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-8 py-4 bg-white border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Loading...
                      </span>
                    ) : (
                      'Load More Orders'
                    )}
                  </button>
                </div>
              )}

              {!hasMoreOrders && filteredOrders.length > 0 && (
                <p className="text-center text-gray-500 py-8 text-sm">
                  No more orders to display
                </p>
              )}
            </div>
          )}

          {/* Empty State - No Orders */}
          {!isLoading &&
            !fetchError &&
            allOrders.length === 0 &&
            !searchQuery &&
            activeStatusFilter === 'all' &&
            activeDateRange === 'all' &&
            !activeRestaurantFilter && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-16 text-center">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-7xl">🍽️</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  You haven't placed any orders yet
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                  Start exploring restaurants and place your first order!
                </p>
                <Link
                  to="/"
                  className="inline-block px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Start Ordering
                </Link>
              </div>
            )}

          {/* Empty State - No Filtered Results */}
          {!isLoading &&
            !fetchError &&
            allOrders.length > 0 &&
            filteredOrders.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-16 text-center">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">
                  No orders match your search/filters
                </h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
                  Try adjusting your filters or search terms
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleClearFilters}
                    className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Clear Filters
                  </button>
                  <Link
                    to="/"
                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    Browse Restaurants
                  </Link>
                </div>
              </div>
            )}
        </div>

        {/* Cart Clear Confirmation Modal */}
        {showCartClearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-orange-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Clear Cart?
              </h3>
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                Your cart contains items from a different restaurant. Clear your current cart to
                reorder from this restaurant?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={confirmReorder}
                  className="flex-1 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Clear Cart & Reorder
                </button>
                <button
                  onClick={cancelReorder}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_OrderHistory;