import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  ShoppingBag,
  Tag,
  Trophy,
  MessageCircle,
  User,
  AlertCircle,
  ChevronRight,
  Loader2,
  X
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Notification {
  notification_id: string;
  user_id: string;
  notification_type: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

interface FilterTab {
  id: string;
  label: string;
  apiValue: string | null;
  readFilter?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All', apiValue: null },
  { id: 'unread', label: 'Unread', apiValue: null, readFilter: false },
  { id: 'order_update', label: 'Order Updates', apiValue: 'order_update' },
  { id: 'promotion', label: 'Promotions', apiValue: 'promotion' },
  { id: 'badge_earned', label: 'Badges', apiValue: 'badge_earned' },
  { id: 'review_response', label: 'Engagement', apiValue: 'review_response' },
  { id: 'account', label: 'Account', apiValue: 'weekly_picks' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order_update':
      return <ShoppingBag className="w-5 h-5 text-blue-600" />;
    case 'promotion':
    case 'discount':
      return <Tag className="w-5 h-5 text-orange-600" />;
    case 'badge_earned':
      return <Trophy className="w-5 h-5 text-yellow-600" />;
    case 'review_response':
      return <MessageCircle className="w-5 h-5 text-green-600" />;
    case 'new_restaurant':
    case 'weekly_picks':
      return <AlertCircle className="w-5 h-5 text-purple-600" />;
    default:
      return <User className="w-5 h-5 text-gray-600" />;
  }
};

const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Notifications: React.FC = () => {
  // ========================================================================
  // ZUSTAND STATE (Individual selectors)
  // ========================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const globalUnreadCount = useAppStore(state => state.notification_state.unread_count);
  const setNotifications = useAppStore(state => state.set_notifications);
  const markNotificationRead = useAppStore(state => state.mark_notification_read);
  const markAllRead = useAppStore(state => state.mark_all_read);
  const clearNotifications = useAppStore(state => state.clear_notifications);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const filterFromUrl = searchParams.get('filter_type') || 'all';
  const [activeFilter, setActiveFilter] = useState(filterFromUrl);
  const [selectModeActive, setSelectModeActive] = useState(false);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: false
  });

  // ========================================================================
  // REDIRECT IF NOT AUTHENTICATED
  // ========================================================================
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/notifications', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ========================================================================
  // SYNC FILTER WITH URL
  // ========================================================================
  
  useEffect(() => {
    setActiveFilter(filterFromUrl);
  }, [filterFromUrl]);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================
  
  const currentTab = FILTER_TABS.find(tab => tab.id === activeFilter) || FILTER_TABS[0];
  
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', activeFilter, pagination.offset],
    queryFn: async () => {
      const params: any = {
        limit: pagination.limit,
        offset: pagination.offset
      };

      if (currentTab.apiValue) {
        params.notification_type = currentTab.apiValue;
      }
      
      if (currentTab.readFilter !== undefined) {
        params.is_read = currentTab.readFilter;
      }

      const response = await axios.get<NotificationsResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications`,
        {
          params,
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      return response.data;
    },
    enabled: !!authToken && isAuthenticated,
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  // ========================================================================
  // SYNC WITH GLOBAL STATE
  // ========================================================================
  
  useEffect(() => {
    if (notificationsData?.notifications) {
      setNotifications(notificationsData.notifications);
      setPagination(prev => ({
        ...prev,
        hasMore: notificationsData.notifications.length === pagination.limit
      }));
    }
  }, [notificationsData, setNotifications, pagination.limit]);

  // ========================================================================
  // MUTATIONS
  // ========================================================================
  
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update
      markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onMutate: () => {
      // Optimistic update
      markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
    },
    onMutate: () => {
      clearNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================
  
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    setSearchParams(filterId !== 'all' ? { filter_type: filterId } : {});
    setPagination({ limit: 50, offset: 0, hasMore: false });
    setSelectModeActive(false);
    setSelectedNotificationIds([]);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.notification_id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleToggleRead = (notification: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.notification_id);
    }
  };

  const handleDelete = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this notification?')) {
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const handleToggleSelectMode = () => {
    setSelectModeActive(!selectModeActive);
    setSelectedNotificationIds([]);
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotificationIds(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotificationIds.length === notificationsData?.notifications.length) {
      setSelectedNotificationIds([]);
    } else {
      setSelectedNotificationIds(notificationsData?.notifications.map(n => n.notification_id) || []);
    }
  };

  const handleBatchMarkRead = async () => {
    for (const id of selectedNotificationIds) {
      await markAsReadMutation.mutateAsync(id);
    }
    setSelectedNotificationIds([]);
    setSelectModeActive(false);
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Delete ${selectedNotificationIds.length} notifications?`)) {
      for (const id of selectedNotificationIds) {
        await deleteNotificationMutation.mutateAsync(id);
      }
      setSelectedNotificationIds([]);
      setSelectModeActive(false);
    }
  };

  const handleLoadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const handleClearAll = () => {
    if (window.confirm('Delete all notifications? This cannot be undone.')) {
      clearAllMutation.mutate();
    }
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unread_count || globalUnreadCount || 0;

  const getEmptyStateMessage = () => {
    switch (activeFilter) {
      case 'unread':
        return {
          icon: <BellOff className="w-16 h-16 text-gray-400" />,
          title: "You're all caught up!",
          message: "No unread notifications"
        };
      case 'order_update':
        return {
          icon: <ShoppingBag className="w-16 h-16 text-gray-400" />,
          title: "No order updates",
          message: "You'll see order status updates here"
        };
      case 'promotion':
        return {
          icon: <Tag className="w-16 h-16 text-gray-400" />,
          title: "No promotions",
          message: "Check back for special offers"
        };
      case 'badge_earned':
        return {
          icon: <Trophy className="w-16 h-16 text-gray-400" />,
          title: "No badges yet",
          message: "Earn badges by exploring restaurants"
        };
      default:
        return {
          icon: <Bell className="w-16 h-16 text-gray-400" />,
          title: "You're all caught up!",
          message: "No notifications to show"
        };
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {!selectModeActive && unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={markAllAsReadMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark All Read
                    </button>
                  )}
                  
                  {notifications.length > 0 && (
                    <button
                      onClick={handleToggleSelectMode}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {selectModeActive ? 'Cancel' : 'Select'}
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleFilterChange(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                      activeFilter === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Batch Actions Toolbar */}
        {selectModeActive && (
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedNotificationIds.length === notifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedNotificationIds.length > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedNotificationIds.length} selected
                    </span>
                  )}
                </div>
                
                {selectedNotificationIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchMarkRead}
                      disabled={markAsReadMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark Read
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      disabled={deleteNotificationMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Loading State */}
          {isLoading && pagination.offset === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">
                Failed to load notifications. Please try again.
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              {getEmptyStateMessage().icon}
              <h3 className="text-xl font-semibold text-gray-900 mt-4">
                {getEmptyStateMessage().title}
              </h3>
              <p className="text-gray-600 mt-2">{getEmptyStateMessage().message}</p>
              {activeFilter !== 'all' && (
                <button
                  onClick={() => handleFilterChange('all')}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  View All Notifications
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.notification_id}
                  onClick={() => !selectModeActive && handleNotificationClick(notification)}
                  className={`bg-white rounded-xl border transition-all ${
                    notification.is_read
                      ? 'border-gray-200'
                      : 'border-blue-200 bg-blue-50/50'
                  } ${
                    !selectModeActive && notification.action_url
                      ? 'cursor-pointer hover:shadow-md'
                      : ''
                  } ${
                    selectModeActive ? 'cursor-default' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox (Select Mode) */}
                      {selectModeActive && (
                        <input
                          type="checkbox"
                          checked={selectedNotificationIds.includes(notification.notification_id)}
                          onChange={() => handleSelectNotification(notification.notification_id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      )}

                      {/* Icon */}
                      {!selectModeActive && (
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      {!selectModeActive && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => handleToggleRead(notification, e)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(notification.notification_id, e)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {notification.action_url && (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {!isLoading && pagination.hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {/* Clear All Button */}
          {!isLoading && notifications.length > 0 && !selectModeActive && (
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <button
                onClick={handleClearAll}
                disabled={clearAllMutation.isPending}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Clear All Notifications
              </button>
            </div>
          )}

          {/* Settings Link */}
          <div className="mt-6 text-center">
            <Link
              to="/settings?section=notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Notification Settings →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Notifications;