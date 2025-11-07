import { z } from 'zod';

// ============================================
// USER SCHEMAS
// ============================================

// Notification preferences schema
const notificationPreferencesSchema = z.object({
  order_updates_email: z.boolean(),
  order_updates_push: z.boolean(),
  promotions_email: z.boolean(),
  promotions_push: z.boolean(),
  weekly_picks_email: z.boolean(),
  weekly_picks_push: z.boolean(),
  new_restaurants_email: z.boolean(),
  new_restaurants_push: z.boolean(),
  review_responses_email: z.boolean(),
  review_responses_push: z.boolean()
});

// User entity schema
export const userSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  password_hash: z.string(),
  full_name: z.string(),
  phone_number: z.string().nullable(),
  profile_picture_url: z.string().nullable(),
  is_verified: z.boolean(),
  member_since: z.string(),
  notification_preferences: notificationPreferencesSchema,
  location_permission_granted: z.boolean(),
  profile_public: z.boolean(),
  reviews_public: z.boolean(),
  last_login: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

// User creation input schema
export const createUserInputSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(8).max(255),
  full_name: z.string().min(1).max(255),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).nullable().optional(),
  profile_picture_url: z.string().url().nullable().optional(),
  notification_preferences: notificationPreferencesSchema.optional(),
  location_permission_granted: z.boolean().optional(),
  profile_public: z.boolean().optional(),
  reviews_public: z.boolean().optional()
});

// User update input schema
export const updateUserInputSchema = z.object({
  user_id: z.string(),
  email: z.string().email().min(1).max(255).optional(),
  full_name: z.string().min(1).max(255).optional(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).nullable().optional(),
  profile_picture_url: z.string().url().nullable().optional(),
  notification_preferences: notificationPreferencesSchema.optional(),
  location_permission_granted: z.boolean().optional(),
  profile_public: z.boolean().optional(),
  reviews_public: z.boolean().optional()
});

// User search/query schema
export const searchUserInputSchema = z.object({
  query: z.string().optional(),
  email: z.string().email().optional(),
  is_verified: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['full_name', 'email', 'created_at', 'member_since']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUserInput = z.infer<typeof searchUserInputSchema>;

// ============================================
// RESTAURANT SCHEMAS
// ============================================

// Restaurant entity schema
export const restaurantSchema = z.object({
  restaurant_id: z.string(),
  restaurant_name: z.string(),
  description: z.string().nullable(),
  cuisine_types: z.array(z.string()),
  price_range: z.number().int(),
  street_address: z.string(),
  apartment_suite: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  phone_number: z.string(),
  primary_hero_image_url: z.string().nullable(),
  average_rating: z.number(),
  total_review_count: z.number().int(),
  total_order_count: z.number().int(),
  is_currently_open: z.boolean(),
  accepts_delivery: z.boolean(),
  accepts_pickup: z.boolean(),
  delivery_fee: z.number(),
  minimum_order_amount: z.number(),
  delivery_radius_miles: z.number(),
  estimated_prep_time_minutes: z.number().int(),
  estimated_delivery_time_minutes: z.number().int(),
  is_featured: z.boolean(),
  featured_week_start: z.string().nullable(),
  featured_description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

// Restaurant creation input schema
export const createRestaurantInputSchema = z.object({
  restaurant_name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  cuisine_types: z.array(z.string()).min(1),
  price_range: z.number().int().min(1).max(4),
  street_address: z.string().min(1).max(255),
  apartment_suite: z.string().max(100).nullable(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  primary_hero_image_url: z.string().url().nullable(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  delivery_fee: z.number().nonnegative().optional(),
  minimum_order_amount: z.number().nonnegative().optional(),
  delivery_radius_miles: z.number().positive().optional(),
  estimated_prep_time_minutes: z.number().int().positive().optional(),
  estimated_delivery_time_minutes: z.number().int().positive().optional()
});

// Restaurant update input schema
export const updateRestaurantInputSchema = z.object({
  restaurant_id: z.string(),
  restaurant_name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  cuisine_types: z.array(z.string()).min(1).optional(),
  price_range: z.number().int().min(1).max(4).optional(),
  street_address: z.string().min(1).max(255).optional(),
  apartment_suite: z.string().max(100).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  primary_hero_image_url: z.string().url().nullable().optional(),
  is_currently_open: z.boolean().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  delivery_fee: z.number().nonnegative().optional(),
  minimum_order_amount: z.number().nonnegative().optional(),
  is_featured: z.boolean().optional(),
  featured_description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional()
});

// Restaurant search schema
export const searchRestaurantInputSchema = z.object({
  query: z.string().optional(),
  cuisine_types: z.array(z.string()).optional(),
  price_range: z.array(z.number().int().min(1).max(4)).optional(),
  city: z.string().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  is_currently_open: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  min_rating: z.number().min(0).max(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius_miles: z.number().positive().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['restaurant_name', 'average_rating', 'total_review_count', 'created_at']).default('average_rating'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Restaurant = z.infer<typeof restaurantSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantInputSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantInputSchema>;
export type SearchRestaurantInput = z.infer<typeof searchRestaurantInputSchema>;

// ============================================
// RESTAURANT HOURS SCHEMAS
// ============================================

export const restaurantHoursSchema = z.object({
  hours_id: z.string(),
  restaurant_id: z.string(),
  day_of_week: z.number().int(),
  open_time: z.string().nullable(),
  close_time: z.string().nullable(),
  is_closed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createRestaurantHoursInputSchema = z.object({
  restaurant_id: z.string(),
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable(),
  close_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable(),
  is_closed: z.boolean().optional()
});

export const updateRestaurantHoursInputSchema = z.object({
  hours_id: z.string(),
  open_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  close_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable().optional(),
  is_closed: z.boolean().optional()
});

export type RestaurantHours = z.infer<typeof restaurantHoursSchema>;
export type CreateRestaurantHoursInput = z.infer<typeof createRestaurantHoursInputSchema>;
export type UpdateRestaurantHoursInput = z.infer<typeof updateRestaurantHoursInputSchema>;

// ============================================
// MENU ITEM SCHEMAS
// ============================================

export const menuItemSchema = z.object({
  menu_item_id: z.string(),
  restaurant_id: z.string(),
  category_id: z.string(),
  item_name: z.string(),
  description: z.string().nullable(),
  base_price: z.number(),
  item_photo_url: z.string().nullable(),
  dietary_preferences: z.array(z.string()),
  allergen_info: z.array(z.string()),
  spice_level: z.number().int().nullable(),
  is_popular: z.boolean(),
  is_available: z.boolean(),
  display_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createMenuItemInputSchema = z.object({
  restaurant_id: z.string(),
  category_id: z.string(),
  item_name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  base_price: z.number().positive(),
  item_photo_url: z.string().url().nullable(),
  dietary_preferences: z.array(z.string()).optional(),
  allergen_info: z.array(z.string()).optional(),
  spice_level: z.number().int().min(0).max(5).nullable(),
  is_popular: z.boolean().optional(),
  is_available: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional()
});

export const updateMenuItemInputSchema = z.object({
  menu_item_id: z.string(),
  item_name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  base_price: z.number().positive().optional(),
  item_photo_url: z.string().url().nullable().optional(),
  dietary_preferences: z.array(z.string()).optional(),
  allergen_info: z.array(z.string()).optional(),
  spice_level: z.number().int().min(0).max(5).nullable().optional(),
  is_popular: z.boolean().optional(),
  is_available: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional()
});

export const searchMenuItemInputSchema = z.object({
  restaurant_id: z.string().optional(),
  category_id: z.string().optional(),
  query: z.string().optional(),
  dietary_preferences: z.array(z.string()).optional(),
  max_spice_level: z.number().int().min(0).max(5).optional(),
  is_popular: z.boolean().optional(),
  is_available: z.boolean().optional(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().positive().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['item_name', 'base_price', 'display_order']).default('display_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;
export type SearchMenuItemInput = z.infer<typeof searchMenuItemInputSchema>;

// ============================================
// MENU ITEM SIZE SCHEMAS
// ============================================

export const menuItemSizeSchema = z.object({
  size_id: z.string(),
  menu_item_id: z.string(),
  size_name: z.string(),
  price_adjustment: z.number(),
  display_order: z.number().int(),
  created_at: z.string()
});

export const createMenuItemSizeInputSchema = z.object({
  menu_item_id: z.string(),
  size_name: z.string().min(1).max(100),
  price_adjustment: z.number(),
  display_order: z.number().int().nonnegative().optional()
});

export type MenuItemSize = z.infer<typeof menuItemSizeSchema>;
export type CreateMenuItemSizeInput = z.infer<typeof createMenuItemSizeInputSchema>;

// ============================================
// MENU ITEM ADDON SCHEMAS
// ============================================

export const menuItemAddonSchema = z.object({
  addon_id: z.string(),
  menu_item_id: z.string(),
  addon_name: z.string(),
  addon_price: z.number(),
  display_order: z.number().int(),
  created_at: z.string()
});

export const createMenuItemAddonInputSchema = z.object({
  menu_item_id: z.string(),
  addon_name: z.string().min(1).max(255),
  addon_price: z.number().nonnegative(),
  display_order: z.number().int().nonnegative().optional()
});

export type MenuItemAddon = z.infer<typeof menuItemAddonSchema>;
export type CreateMenuItemAddonInput = z.infer<typeof createMenuItemAddonInputSchema>;

// ============================================
// ORDER SCHEMAS
// ============================================

export const orderSchema = z.object({
  order_id: z.string(),
  user_id: z.string(),
  restaurant_id: z.string(),
  order_type: z.string(),
  order_status: z.string(),
  delivery_street_address: z.string().nullable(),
  delivery_apartment_suite: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_state: z.string().nullable(),
  delivery_zip_code: z.string().nullable(),
  special_instructions: z.string().nullable(),
  subtotal: z.number(),
  discount_amount: z.number(),
  discount_id: z.string().nullable(),
  delivery_fee: z.number(),
  tax: z.number(),
  tip: z.number(),
  grand_total: z.number(),
  payment_method_id: z.string().nullable(),
  payment_status: z.string(),
  estimated_delivery_time: z.string().nullable(),
  estimated_pickup_time: z.string().nullable(),
  order_received_at: z.string().nullable(),
  preparing_started_at: z.string().nullable(),
  ready_at: z.string().nullable(),
  out_for_delivery_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createOrderInputSchema = z.object({
  user_id: z.string(),
  restaurant_id: z.string(),
  order_type: z.enum(['delivery', 'pickup']),
  delivery_street_address: z.string().min(1).max(255).nullable(),
  delivery_apartment_suite: z.string().max(100).nullable(),
  delivery_city: z.string().min(1).max(100).nullable(),
  delivery_state: z.string().length(2).nullable(),
  delivery_zip_code: z.string().regex(/^\d{5}(-\d{4})?$/).nullable(),
  special_instructions: z.string().max(500).nullable(),
  discount_id: z.string().nullable(),
  payment_method_id: z.string().nullable(),
  tip: z.number().nonnegative().optional()
});

export const updateOrderInputSchema = z.object({
  order_id: z.string(),
  order_status: z.enum(['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']).optional(),
  special_instructions: z.string().max(500).nullable().optional(),
  tip: z.number().nonnegative().optional(),
  cancellation_reason: z.string().max(500).nullable().optional()
});

export const searchOrderInputSchema = z.object({
  user_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  order_type: z.enum(['delivery', 'pickup']).optional(),
  order_status: z.enum(['order_received', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']).optional(),
  payment_status: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'grand_total', 'order_status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type SearchOrderInput = z.infer<typeof searchOrderInputSchema>;

// ============================================
// ORDER ITEM SCHEMAS
// ============================================

const selectedAddonSchema = z.object({
  name: z.string(),
  price: z.number()
});

const selectedModificationSchema = z.object({
  name: z.string(),
  price: z.number()
});

export const orderItemSchema = z.object({
  order_item_id: z.string(),
  order_id: z.string(),
  menu_item_id: z.string(),
  item_name: z.string(),
  base_price: z.number(),
  selected_size: z.string().nullable(),
  size_price_adjustment: z.number(),
  selected_addons: z.array(selectedAddonSchema),
  selected_modifications: z.array(selectedModificationSchema),
  special_instructions: z.string().nullable(),
  quantity: z.number().int(),
  item_total_price: z.number(),
  created_at: z.string()
});

export const createOrderItemInputSchema = z.object({
  order_id: z.string(),
  menu_item_id: z.string(),
  selected_size: z.string().max(100).nullable(),
  selected_addons: z.array(selectedAddonSchema).optional(),
  selected_modifications: z.array(selectedModificationSchema).optional(),
  special_instructions: z.string().max(500).nullable(),
  quantity: z.number().int().positive()
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;

// ============================================
// REVIEW SCHEMAS
// ============================================

export const reviewSchema = z.object({
  review_id: z.string(),
  user_id: z.string(),
  restaurant_id: z.string(),
  order_id: z.string().nullable(),
  star_rating: z.number().int(),
  review_title: z.string().nullable(),
  review_text: z.string(),
  is_verified_visit: z.boolean(),
  helpful_count: z.number().int(),
  is_edited: z.boolean(),
  edited_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createReviewInputSchema = z.object({
  user_id: z.string(),
  restaurant_id: z.string(),
  order_id: z.string().nullable(),
  star_rating: z.number().int().min(1).max(5),
  review_title: z.string().min(1).max(255).nullable(),
  review_text: z.string().min(10).max(2000),
  is_verified_visit: z.boolean().optional()
});

export const updateReviewInputSchema = z.object({
  review_id: z.string(),
  star_rating: z.number().int().min(1).max(5).optional(),
  review_title: z.string().min(1).max(255).nullable().optional(),
  review_text: z.string().min(10).max(2000).optional()
});

export const searchReviewInputSchema = z.object({
  user_id: z.string().optional(),
  restaurant_id: z.string().optional(),
  min_rating: z.number().int().min(1).max(5).optional(),
  max_rating: z.number().int().min(1).max(5).optional(),
  is_verified_visit: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at', 'star_rating', 'helpful_count']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type SearchReviewInput = z.infer<typeof searchReviewInputSchema>;

// ============================================
// DISCOUNT SCHEMAS
// ============================================

export const discountSchema = z.object({
  discount_id: z.string(),
  restaurant_id: z.string(),
  discount_type: z.string(),
  discount_value: z.number(),
  coupon_code: z.string().nullable(),
  qr_code_data: z.string().nullable(),
  description: z.string(),
  terms_conditions: z.string().nullable(),
  minimum_order_amount: z.number().nullable(),
  excluded_items: z.array(z.string()),
  valid_days: z.array(z.number().int()),
  is_one_time_use: z.boolean(),
  max_redemptions_per_user: z.number().int().nullable(),
  total_redemption_limit: z.number().int().nullable(),
  current_redemption_count: z.number().int(),
  is_active: z.boolean(),
  start_date: z.string(),
  end_date: z.string(),
  is_local_picks_exclusive: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createDiscountInputSchema = z.object({
  restaurant_id: z.string(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'qr_discount', 'first_order']),
  discount_value: z.number().positive(),
  coupon_code: z.string().min(3).max(50).toUpperCase().nullable(),
  qr_code_data: z.string().max(255).nullable(),
  description: z.string().min(1).max(500),
  terms_conditions: z.string().max(1000).nullable(),
  minimum_order_amount: z.number().nonnegative().nullable(),
  excluded_items: z.array(z.string()).optional(),
  valid_days: z.array(z.number().int().min(0).max(6)).optional(),
  is_one_time_use: z.boolean().optional(),
  max_redemptions_per_user: z.number().int().positive().nullable(),
  total_redemption_limit: z.number().int().positive().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  is_local_picks_exclusive: z.boolean().optional()
});

export const updateDiscountInputSchema = z.object({
  discount_id: z.string(),
  description: z.string().min(1).max(500).optional(),
  terms_conditions: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
  end_date: z.string().optional()
});

export const searchDiscountInputSchema = z.object({
  restaurant_id: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed_amount', 'qr_discount', 'first_order']).optional(),
  is_active: z.boolean().optional(),
  is_local_picks_exclusive: z.boolean().optional(),
  coupon_code: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0)
});

export type Discount = z.infer<typeof discountSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountInputSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountInputSchema>;
export type SearchDiscountInput = z.infer<typeof searchDiscountInputSchema>;

// ============================================
// SAVED ADDRESS SCHEMAS
// ============================================

export const savedAddressSchema = z.object({
  address_id: z.string(),
  user_id: z.string(),
  address_label: z.string(),
  street_address: z.string(),
  apartment_suite: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createSavedAddressInputSchema = z.object({
  user_id: z.string(),
  address_label: z.string().min(1).max(100),
  street_address: z.string().min(1).max(255),
  apartment_suite: z.string().max(100).nullable(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  is_default: z.boolean().optional()
});

export const updateSavedAddressInputSchema = z.object({
  address_id: z.string(),
  address_label: z.string().min(1).max(100).optional(),
  street_address: z.string().min(1).max(255).optional(),
  apartment_suite: z.string().max(100).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  is_default: z.boolean().optional()
});

export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type CreateSavedAddressInput = z.infer<typeof createSavedAddressInputSchema>;
export type UpdateSavedAddressInput = z.infer<typeof updateSavedAddressInputSchema>;

// ============================================
// SAVED PAYMENT METHOD SCHEMAS
// ============================================

export const savedPaymentMethodSchema = z.object({
  payment_method_id: z.string(),
  user_id: z.string(),
  payment_label: z.string(),
  card_type: z.string(),
  last_four_digits: z.string(),
  expiration_month: z.string(),
  expiration_year: z.string(),
  billing_zip_code: z.string(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createSavedPaymentMethodInputSchema = z.object({
  user_id: z.string(),
  payment_label: z.string().min(1).max(100),
  card_type: z.enum(['Visa', 'Mastercard', 'Amex', 'Discover']),
  last_four_digits: z.string().length(4).regex(/^\d{4}$/),
  expiration_month: z.string().length(2).regex(/^(0[1-9]|1[0-2])$/),
  expiration_year: z.string().length(4).regex(/^\d{4}$/),
  billing_zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  is_default: z.boolean().optional()
});

export type SavedPaymentMethod = z.infer<typeof savedPaymentMethodSchema>;
export type CreateSavedPaymentMethodInput = z.infer<typeof createSavedPaymentMethodInputSchema>;

// ============================================
// FAVORITE SCHEMAS
// ============================================

export const favoriteSchema = z.object({
  favorite_id: z.string(),
  user_id: z.string(),
  restaurant_id: z.string(),
  created_at: z.string()
});

export const createFavoriteInputSchema = z.object({
  user_id: z.string(),
  restaurant_id: z.string()
});

export type Favorite = z.infer<typeof favoriteSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteInputSchema>;

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const notificationSchema = z.object({
  notification_id: z.string(),
  user_id: z.string(),
  notification_type: z.string(),
  message: z.string(),
  action_url: z.string().nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
  read_at: z.string().nullable()
});

export const createNotificationInputSchema = z.object({
  user_id: z.string(),
  notification_type: z.enum(['order_update', 'promotion', 'new_restaurant', 'badge_earned', 'review_response', 'weekly_picks', 'discount']),
  message: z.string().min(1).max(500),
  action_url: z.string().max(500).nullable()
});

export const updateNotificationInputSchema = z.object({
  notification_id: z.string(),
  is_read: z.boolean()
});

export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationInputSchema>;

// ============================================
// BADGE SCHEMAS
// ============================================

export const badgeSchema = z.object({
  badge_id: z.string(),
  badge_name: z.string(),
  badge_description: z.string(),
  badge_icon_url: z.string().nullable(),
  criteria_type: z.string(),
  criteria_value: z.number().int(),
  created_at: z.string()
});

export const createBadgeInputSchema = z.object({
  badge_name: z.string().min(1).max(100),
  badge_description: z.string().min(1).max(500),
  badge_icon_url: z.string().url().nullable(),
  criteria_type: z.enum(['reviews_written', 'restaurants_visited', 'orders_placed', 'discounts_redeemed', 'unique_cuisines']),
  criteria_value: z.number().int().positive()
});

export type Badge = z.infer<typeof badgeSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeInputSchema>;

// ============================================
// USER BADGE SCHEMAS
// ============================================

export const userBadgeSchema = z.object({
  user_badge_id: z.string(),
  user_id: z.string(),
  badge_id: z.string(),
  is_showcased: z.boolean(),
  showcase_order: z.number().int().nullable(),
  earned_at: z.string()
});

export const createUserBadgeInputSchema = z.object({
  user_id: z.string(),
  badge_id: z.string(),
  is_showcased: z.boolean().optional(),
  showcase_order: z.number().int().positive().nullable()
});

export type UserBadge = z.infer<typeof userBadgeSchema>;
export type CreateUserBadgeInput = z.infer<typeof createUserBadgeInputSchema>;

// ============================================
// MENU CATEGORY SCHEMAS
// ============================================

export const menuCategorySchema = z.object({
  category_id: z.string(),
  restaurant_id: z.string(),
  category_name: z.string(),
  display_order: z.number().int(),
  created_at: z.string(),
  updated_at: z.string()
});

export const createMenuCategoryInputSchema = z.object({
  restaurant_id: z.string(),
  category_name: z.string().min(1).max(100),
  display_order: z.number().int().nonnegative().optional()
});

export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategoryInputSchema>;

// ============================================
// RESTAURANT PHOTO SCHEMAS
// ============================================

export const restaurantPhotoSchema = z.object({
  photo_id: z.string(),
  restaurant_id: z.string(),
  photo_url: z.string(),
  caption: z.string().nullable(),
  display_order: z.number().int(),
  uploaded_by_user_id: z.string().nullable(),
  created_at: z.string()
});

export const createRestaurantPhotoInputSchema = z.object({
  restaurant_id: z.string(),
  photo_url: z.string().url(),
  caption: z.string().max(255).nullable(),
  display_order: z.number().int().nonnegative().optional(),
  uploaded_by_user_id: z.string().nullable()
});

export type RestaurantPhoto = z.infer<typeof restaurantPhotoSchema>;
export type CreateRestaurantPhotoInput = z.infer<typeof createRestaurantPhotoInputSchema>;

// ============================================
// USER STATISTICS SCHEMAS
// ============================================

export const userStatisticsSchema = z.object({
  stat_id: z.string(),
  user_id: z.string(),
  total_reviews_written: z.number().int(),
  total_restaurants_visited: z.number().int(),
  total_favorites_saved: z.number().int(),
  total_orders_placed: z.number().int(),
  total_badges_earned: z.number().int(),
  total_discounts_redeemed: z.number().int(),
  unique_cuisines_tried: z.array(z.string()),
  updated_at: z.string()
});

export type UserStatistics = z.infer<typeof userStatisticsSchema>;

// ============================================
// SEARCH HISTORY SCHEMAS
// ============================================

export const searchHistorySchema = z.object({
  search_id: z.string(),
  user_id: z.string(),
  search_query: z.string(),
  search_type: z.string(),
  created_at: z.string()
});

export const createSearchHistoryInputSchema = z.object({
  user_id: z.string(),
  search_query: z.string().min(1).max(255),
  search_type: z.enum(['cuisine', 'general', 'dietary', 'dish', 'restaurant'])
});

export type SearchHistory = z.infer<typeof searchHistorySchema>;
export type CreateSearchHistoryInput = z.infer<typeof createSearchHistoryInputSchema>;

// ============================================
// WEEKLY LOCAL PICKS SCHEMAS
// ============================================

export const weeklyLocalPickSchema = z.object({
  pick_id: z.string(),
  restaurant_id: z.string(),
  week_start_date: z.string(),
  week_end_date: z.string(),
  featured_description: z.string().nullable(),
  display_order: z.number().int(),
  selection_criteria: z.string().nullable(),
  created_at: z.string()
});

export const createWeeklyLocalPickInputSchema = z.object({
  restaurant_id: z.string(),
  week_start_date: z.string(),
  week_end_date: z.string(),
  featured_description: z.string().max(500).nullable(),
  display_order: z.number().int().nonnegative().optional(),
  selection_criteria: z.string().max(255).nullable()
});

export type WeeklyLocalPick = z.infer<typeof weeklyLocalPickSchema>;
export type CreateWeeklyLocalPickInput = z.infer<typeof createWeeklyLocalPickInputSchema>;

// ============================================
// VERIFICATION SCHEMAS
// ============================================

export const verificationSchema = z.object({
  verification_id: z.string(),
  user_id: z.string(),
  restaurant_id: z.string(),
  verification_method: z.string(),
  order_id: z.string().nullable(),
  verified_at: z.string()
});

export const createVerificationInputSchema = z.object({
  user_id: z.string(),
  restaurant_id: z.string(),
  verification_method: z.enum(['order', 'qr_code', 'location', 'manual']),
  order_id: z.string().nullable()
});

export type Verification = z.infer<typeof verificationSchema>;
export type CreateVerificationInput = z.infer<typeof createVerificationInputSchema>;

// ============================================
// PASSWORD RESET TOKEN SCHEMAS
// ============================================

export const passwordResetTokenSchema = z.object({
  token_id: z.string(),
  user_id: z.string(),
  reset_token: z.string(),
  expires_at: z.string(),
  is_used: z.boolean(),
  created_at: z.string()
});

export const createPasswordResetTokenInputSchema = z.object({
  user_id: z.string(),
  reset_token: z.string().min(32),
  expires_at: z.string()
});

export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type CreatePasswordResetTokenInput = z.infer<typeof createPasswordResetTokenInputSchema>;