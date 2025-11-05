import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface User {
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  profile_picture_url: string | null;
  is_verified: boolean;
  created_at: string;
}

interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}

interface CartItem {
  menu_item_id: string;
  item_name: string;
  base_price: number;
  customizations: {
    size: string | null;
    add_ons: Array<{ id: string; name: string; price: number }>;
    modifications: string[];
    special_instructions: string | null;
  };
  quantity: number;
  item_total: number;
}

interface DeliveryAddress {
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
}

interface AppliedDiscount {
  discount_id: string;
  code: string;
  discount_amount: number;
  discount_type: string;
}

interface CartState {
  restaurant_id: string | null;
  restaurant_name: string | null;
  items: CartItem[];
  order_type: 'delivery' | 'pickup' | null;
  delivery_address: DeliveryAddress | null;
  applied_discount: AppliedDiscount | null;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  tip: number;
  grand_total: number;
  last_updated: string | null;
}

interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  permission_granted: boolean;
  last_updated: string | null;
}

interface ActiveFilters {
  cuisine_types: string[];
  price_min: number | null;
  price_max: number | null;
  distance_max: number | null;
  rating_min: number | null;
  dietary_preferences: string[];
  open_now: boolean;
  has_discount: boolean;
  sort_by: string;
}

interface FavoritesList {
  restaurant_ids: string[];
  last_synced: string | null;
}

interface Notification {
  notification_id: string;
  notification_type: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationState {
  unread_count: number;
  notifications: Notification[];
}

// ============================================================================
// MAIN APP STATE INTERFACE
// ============================================================================

interface AppState {
  // State
  authentication_state: AuthenticationState;
  cart_state: CartState;
  user_location: UserLocation;
  active_filters: ActiveFilters;
  favorites_list: FavoritesList;
  notification_state: NotificationState;

  // Authentication Actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => void;
  register_user: (email: string, password: string, full_name: string, phone_number?: string) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (userData: Partial<User>) => void;

  // Cart Actions
  add_to_cart: (item: Omit<CartItem, 'item_total'>, restaurant_id: string, restaurant_name: string) => void;
  remove_from_cart: (menu_item_id: string) => void;
  update_cart_item: (menu_item_id: string, updates: Partial<CartItem>) => void;
  clear_cart: () => void;
  apply_discount: (discount: AppliedDiscount) => void;
  remove_discount: () => void;
  set_order_type: (order_type: 'delivery' | 'pickup') => void;
  set_delivery_address: (address: DeliveryAddress) => void;
  update_tip: (tip_amount: number) => void;
  recalculate_totals: () => void;

  // Location Actions
  set_user_location: (latitude: number, longitude: number, city?: string, state?: string) => void;
  clear_user_location: () => void;
  grant_location_permission: () => void;
  deny_location_permission: () => void;

  // Filter Actions
  update_filters: (filters: Partial<ActiveFilters>) => void;
  clear_filters: () => void;
  set_sort: (sort_by: string) => void;

  // Favorites Actions
  add_favorite: (restaurant_id: string) => void;
  remove_favorite: (restaurant_id: string) => void;
  toggle_favorite: (restaurant_id: string) => void;
  sync_favorites: (restaurant_ids: string[]) => void;

  // Notification Actions
  set_notifications: (notifications: Notification[]) => void;
  mark_notification_read: (notification_id: string) => void;
  mark_all_read: () => void;
  add_notification: (notification: Notification) => void;
  clear_notifications: () => void;
  increment_unread_count: () => void;
  decrement_unread_count: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculate_item_total = (item: Omit<CartItem, 'item_total'>): number => {
  let total = item.base_price;
  
  // Add add-ons prices
  if (item.customizations.add_ons && item.customizations.add_ons.length > 0) {
    total += item.customizations.add_ons.reduce((sum, addon) => sum + addon.price, 0);
  }
  
  // Multiply by quantity
  total *= item.quantity;
  
  return Number(total.toFixed(2));
};

const calculate_cart_totals = (items: CartItem[], delivery_fee: number, tip: number, applied_discount: AppliedDiscount | null) => {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + item.item_total, 0);
  
  // Calculate discount amount
  let discount_amount = 0;
  if (applied_discount) {
    if (applied_discount.discount_type === 'percentage') {
      discount_amount = (subtotal * applied_discount.discount_amount) / 100;
    } else if (applied_discount.discount_type === 'fixed_amount') {
      discount_amount = applied_discount.discount_amount;
    }
  }
  
  // Calculate tax (assuming 8.5% tax rate)
  const taxable_amount = subtotal - discount_amount + delivery_fee;
  const tax = taxable_amount * 0.085;
  
  // Calculate grand total
  const grand_total = subtotal - discount_amount + delivery_fee + tax + tip;
  
  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    grand_total: Number(grand_total.toFixed(2))
  };
};

// ============================================================================
// ZUSTAND STORE CREATION
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },

      cart_state: {
        restaurant_id: null,
        restaurant_name: null,
        items: [],
        order_type: null,
        delivery_address: null,
        applied_discount: null,
        subtotal: 0,
        delivery_fee: 0,
        tax: 0,
        tip: 0,
        grand_total: 0,
        last_updated: null,
      },

      user_location: {
        latitude: null,
        longitude: null,
        city: null,
        state: null,
        permission_granted: false,
        last_updated: null,
      },

      active_filters: {
        cuisine_types: [],
        price_min: null,
        price_max: null,
        distance_max: null,
        rating_min: null,
        dietary_preferences: [],
        open_now: false,
        has_discount: false,
        sort_by: 'recommended',
      },

      favorites_list: {
        restaurant_ids: [],
        last_synced: null,
      },

      notification_state: {
        unread_count: 0,
        notifications: [],
      },

      // ========================================================================
      // AUTHENTICATION ACTIONS
      // ========================================================================

      login_user: async (email: string, password: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, auth_token } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                phone_number: user.phone_number,
                profile_picture_url: user.profile_picture_url,
                is_verified: user.is_verified,
                created_at: user.created_at,
              },
              auth_token: auth_token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';

          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      logout_user: () => {
        set((state) => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
          // Also clear user-specific data on logout
          cart_state: {
            ...state.cart_state,
            items: [],
            restaurant_id: null,
            restaurant_name: null,
            order_type: null,
            delivery_address: null,
            applied_discount: null,
            subtotal: 0,
            delivery_fee: 0,
            tax: 0,
            tip: 0,
            grand_total: 0,
            last_updated: null,
          },
          favorites_list: {
            restaurant_ids: [],
            last_synced: null,
          },
          notification_state: {
            unread_count: 0,
            notifications: [],
          },
        }));
      },

      register_user: async (email: string, password: string, full_name: string, phone_number?: string) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            authentication_status: {
              ...state.authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/signup`,
            {
              email,
              password,
              full_name,
              phone_number: phone_number || null,
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          const { user, auth_token } = response.data;

          set((state) => ({
            authentication_state: {
              current_user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                phone_number: user.phone_number,
                profile_picture_url: user.profile_picture_url,
                is_verified: user.is_verified,
                created_at: user.created_at,
              },
              auth_token: auth_token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';

          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },

      initialize_auth: async () => {
        const { authentication_state } = get();
        const token = authentication_state.auth_token;

        if (!token) {
          set((state) => ({
            authentication_state: {
              ...state.authentication_state,
              authentication_status: {
                ...state.authentication_state.authentication_status,
                is_loading: false,
              },
            },
          }));
          return;
        }

        try {
          const response = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const user = response.data;

          set((state) => ({
            authentication_state: {
              current_user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                phone_number: user.phone_number,
                profile_picture_url: user.profile_picture_url,
                is_verified: user.is_verified,
                created_at: user.created_at,
              },
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        } catch (error) {
          // Token is invalid, clear auth state
          set((state) => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },

      clear_auth_error: () => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            error_message: null,
          },
        }));
      },

      update_user_profile: (userData: Partial<User>) => {
        set((state) => ({
          authentication_state: {
            ...state.authentication_state,
            current_user: state.authentication_state.current_user
              ? { ...state.authentication_state.current_user, ...userData }
              : null,
          },
        }));
      },

      // ========================================================================
      // CART ACTIONS
      // ========================================================================

      add_to_cart: (item: Omit<CartItem, 'item_total'>, restaurant_id: string, restaurant_name: string) => {
        const { cart_state } = get();

        // Calculate item total
        const item_with_total: CartItem = {
          ...item,
          item_total: calculate_item_total(item),
        };

        // Check if cart has items from different restaurant
        let new_items: CartItem[];
        if (cart_state.restaurant_id && cart_state.restaurant_id !== restaurant_id) {
          // Clear cart if switching restaurants
          new_items = [item_with_total];
        } else {
          // Check if item already exists
          const existing_index = cart_state.items.findIndex(
            (i) => i.menu_item_id === item.menu_item_id
          );

          if (existing_index >= 0) {
            // Update existing item quantity
            new_items = [...cart_state.items];
            new_items[existing_index] = {
              ...new_items[existing_index],
              quantity: new_items[existing_index].quantity + item.quantity,
              item_total: calculate_item_total({
                ...new_items[existing_index],
                quantity: new_items[existing_index].quantity + item.quantity,
              }),
            };
          } else {
            // Add new item
            new_items = [...cart_state.items, item_with_total];
          }
        }

        // Calculate totals
        const totals = calculate_cart_totals(
          new_items,
          cart_state.delivery_fee,
          cart_state.tip,
          cart_state.applied_discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            restaurant_id,
            restaurant_name,
            items: new_items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      remove_from_cart: (menu_item_id: string) => {
        const { cart_state } = get();
        const new_items = cart_state.items.filter((item) => item.menu_item_id !== menu_item_id);

        // If cart is empty, reset restaurant
        if (new_items.length === 0) {
          set((state) => ({
            cart_state: {
              restaurant_id: null,
              restaurant_name: null,
              items: [],
              order_type: null,
              delivery_address: null,
              applied_discount: null,
              subtotal: 0,
              delivery_fee: 0,
              tax: 0,
              tip: 0,
              grand_total: 0,
              last_updated: new Date().toISOString(),
            },
          }));
        } else {
          const totals = calculate_cart_totals(
            new_items,
            cart_state.delivery_fee,
            cart_state.tip,
            cart_state.applied_discount
          );

          set((state) => ({
            cart_state: {
              ...state.cart_state,
              items: new_items,
              subtotal: totals.subtotal,
              tax: totals.tax,
              grand_total: totals.grand_total,
              last_updated: new Date().toISOString(),
            },
          }));
        }
      },

      update_cart_item: (menu_item_id: string, updates: Partial<CartItem>) => {
        const { cart_state } = get();
        const new_items = cart_state.items.map((item) => {
          if (item.menu_item_id === menu_item_id) {
            const updated_item = { ...item, ...updates };
            return {
              ...updated_item,
              item_total: calculate_item_total(updated_item),
            };
          }
          return item;
        });

        const totals = calculate_cart_totals(
          new_items,
          cart_state.delivery_fee,
          cart_state.tip,
          cart_state.applied_discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            items: new_items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      clear_cart: () => {
        set((state) => ({
          cart_state: {
            restaurant_id: null,
            restaurant_name: null,
            items: [],
            order_type: null,
            delivery_address: null,
            applied_discount: null,
            subtotal: 0,
            delivery_fee: 0,
            tax: 0,
            tip: 0,
            grand_total: 0,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      apply_discount: (discount: AppliedDiscount) => {
        const { cart_state } = get();
        const totals = calculate_cart_totals(
          cart_state.items,
          cart_state.delivery_fee,
          cart_state.tip,
          discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            applied_discount: discount,
            subtotal: totals.subtotal,
            tax: totals.tax,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      remove_discount: () => {
        const { cart_state } = get();
        const totals = calculate_cart_totals(
          cart_state.items,
          cart_state.delivery_fee,
          cart_state.tip,
          null
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            applied_discount: null,
            subtotal: totals.subtotal,
            tax: totals.tax,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      set_order_type: (order_type: 'delivery' | 'pickup') => {
        const { cart_state } = get();
        const delivery_fee = order_type === 'delivery' ? cart_state.delivery_fee : 0;

        const totals = calculate_cart_totals(
          cart_state.items,
          delivery_fee,
          cart_state.tip,
          cart_state.applied_discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            order_type,
            delivery_fee,
            tax: totals.tax,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      set_delivery_address: (address: DeliveryAddress) => {
        set((state) => ({
          cart_state: {
            ...state.cart_state,
            delivery_address: address,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      update_tip: (tip_amount: number) => {
        const { cart_state } = get();
        const totals = calculate_cart_totals(
          cart_state.items,
          cart_state.delivery_fee,
          tip_amount,
          cart_state.applied_discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            tip: tip_amount,
            grand_total: totals.grand_total,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      recalculate_totals: () => {
        const { cart_state } = get();
        const totals = calculate_cart_totals(
          cart_state.items,
          cart_state.delivery_fee,
          cart_state.tip,
          cart_state.applied_discount
        );

        set((state) => ({
          cart_state: {
            ...state.cart_state,
            subtotal: totals.subtotal,
            tax: totals.tax,
            grand_total: totals.grand_total,
          },
        }));
      },

      // ========================================================================
      // LOCATION ACTIONS
      // ========================================================================

      set_user_location: (latitude: number, longitude: number, city?: string, state?: string) => {
        set((prevState) => ({
          user_location: {
            latitude,
            longitude,
            city: city || null,
            state: state || null,
            permission_granted: true,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      clear_user_location: () => {
        set((state) => ({
          user_location: {
            latitude: null,
            longitude: null,
            city: null,
            state: null,
            permission_granted: false,
            last_updated: null,
          },
        }));
      },

      grant_location_permission: () => {
        set((state) => ({
          user_location: {
            ...state.user_location,
            permission_granted: true,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      deny_location_permission: () => {
        set((state) => ({
          user_location: {
            latitude: null,
            longitude: null,
            city: null,
            state: null,
            permission_granted: false,
            last_updated: new Date().toISOString(),
          },
        }));
      },

      // ========================================================================
      // FILTER ACTIONS
      // ========================================================================

      update_filters: (filters: Partial<ActiveFilters>) => {
        set((state) => ({
          active_filters: {
            ...state.active_filters,
            ...filters,
          },
        }));
      },

      clear_filters: () => {
        set((state) => ({
          active_filters: {
            cuisine_types: [],
            price_min: null,
            price_max: null,
            distance_max: null,
            rating_min: null,
            dietary_preferences: [],
            open_now: false,
            has_discount: false,
            sort_by: 'recommended',
          },
        }));
      },

      set_sort: (sort_by: string) => {
        set((state) => ({
          active_filters: {
            ...state.active_filters,
            sort_by,
          },
        }));
      },

      // ========================================================================
      // FAVORITES ACTIONS
      // ========================================================================

      add_favorite: (restaurant_id: string) => {
        set((state) => ({
          favorites_list: {
            restaurant_ids: [...state.favorites_list.restaurant_ids, restaurant_id],
            last_synced: new Date().toISOString(),
          },
        }));
      },

      remove_favorite: (restaurant_id: string) => {
        set((state) => ({
          favorites_list: {
            restaurant_ids: state.favorites_list.restaurant_ids.filter(
              (id) => id !== restaurant_id
            ),
            last_synced: new Date().toISOString(),
          },
        }));
      },

      toggle_favorite: (restaurant_id: string) => {
        const { favorites_list } = get();
        const is_favorited = favorites_list.restaurant_ids.includes(restaurant_id);

        if (is_favorited) {
          get().remove_favorite(restaurant_id);
        } else {
          get().add_favorite(restaurant_id);
        }
      },

      sync_favorites: (restaurant_ids: string[]) => {
        set((state) => ({
          favorites_list: {
            restaurant_ids,
            last_synced: new Date().toISOString(),
          },
        }));
      },

      // ========================================================================
      // NOTIFICATION ACTIONS
      // ========================================================================

      set_notifications: (notifications: Notification[]) => {
        const unread_count = notifications.filter((n) => !n.is_read).length;
        set((state) => ({
          notification_state: {
            notifications,
            unread_count,
          },
        }));
      },

      mark_notification_read: (notification_id: string) => {
        set((state) => ({
          notification_state: {
            notifications: state.notification_state.notifications.map((n) =>
              n.notification_id === notification_id
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n
            ),
            unread_count: Math.max(0, state.notification_state.unread_count - 1),
          },
        }));
      },

      mark_all_read: () => {
        set((state) => ({
          notification_state: {
            notifications: state.notification_state.notifications.map((n) => ({
              ...n,
              is_read: true,
              read_at: n.read_at || new Date().toISOString(),
            })),
            unread_count: 0,
          },
        }));
      },

      add_notification: (notification: Notification) => {
        set((state) => ({
          notification_state: {
            notifications: [notification, ...state.notification_state.notifications],
            unread_count: notification.is_read
              ? state.notification_state.unread_count
              : state.notification_state.unread_count + 1,
          },
        }));
      },

      clear_notifications: () => {
        set((state) => ({
          notification_state: {
            notifications: [],
            unread_count: 0,
          },
        }));
      },

      increment_unread_count: () => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            unread_count: state.notification_state.unread_count + 1,
          },
        }));
      },

      decrement_unread_count: () => {
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            unread_count: Math.max(0, state.notification_state.unread_count - 1),
          },
        }));
      },
    }),
    {
      name: 'local-eats-storage',
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        cart_state: state.cart_state,
        user_location: state.user_location,
        favorites_list: state.favorites_list,
        notification_state: {
          unread_count: state.notification_state.unread_count,
          notifications: [], // Don't persist full notifications list
        },
        // Don't persist active_filters (session-only)
      }),
    }
  )
);

// ============================================================================
// EXPORT TYPES FOR COMPONENT USE
// ============================================================================

export type {
  User,
  AuthenticationState,
  CartItem,
  DeliveryAddress,
  AppliedDiscount,
  CartState,
  UserLocation,
  ActiveFilters,
  FavoritesList,
  Notification,
  NotificationState,
  AppState,
};