import { z } from 'zod';
export declare const userSchema: z.ZodObject<{
    user_id: z.ZodString;
    email: z.ZodString;
    password_hash: z.ZodString;
    full_name: z.ZodString;
    phone_number: z.ZodNullable<z.ZodString>;
    profile_picture_url: z.ZodNullable<z.ZodString>;
    is_verified: z.ZodBoolean;
    member_since: z.ZodString;
    notification_preferences: z.ZodObject<{
        order_updates_email: z.ZodBoolean;
        order_updates_push: z.ZodBoolean;
        promotions_email: z.ZodBoolean;
        promotions_push: z.ZodBoolean;
        weekly_picks_email: z.ZodBoolean;
        weekly_picks_push: z.ZodBoolean;
        new_restaurants_email: z.ZodBoolean;
        new_restaurants_push: z.ZodBoolean;
        review_responses_email: z.ZodBoolean;
        review_responses_push: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }>;
    location_permission_granted: z.ZodBoolean;
    profile_public: z.ZodBoolean;
    reviews_public: z.ZodBoolean;
    last_login: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
    password_hash?: string;
    full_name?: string;
    phone_number?: string;
    profile_picture_url?: string;
    is_verified?: boolean;
    member_since?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
    last_login?: string;
    created_at?: string;
    updated_at?: string;
}, {
    user_id?: string;
    email?: string;
    password_hash?: string;
    full_name?: string;
    phone_number?: string;
    profile_picture_url?: string;
    is_verified?: boolean;
    member_since?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
    last_login?: string;
    created_at?: string;
    updated_at?: string;
}>;
export declare const createUserInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    full_name: z.ZodString;
    phone_number: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>>;
    profile_picture_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notification_preferences: z.ZodOptional<z.ZodObject<{
        order_updates_email: z.ZodBoolean;
        order_updates_push: z.ZodBoolean;
        promotions_email: z.ZodBoolean;
        promotions_push: z.ZodBoolean;
        weekly_picks_email: z.ZodBoolean;
        weekly_picks_push: z.ZodBoolean;
        new_restaurants_email: z.ZodBoolean;
        new_restaurants_push: z.ZodBoolean;
        review_responses_email: z.ZodBoolean;
        review_responses_push: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }>>;
    location_permission_granted: z.ZodOptional<z.ZodBoolean>;
    profile_public: z.ZodOptional<z.ZodBoolean>;
    reviews_public: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    full_name?: string;
    phone_number?: string;
    profile_picture_url?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
    password?: string;
}, {
    email?: string;
    full_name?: string;
    phone_number?: unknown;
    profile_picture_url?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
    password?: string;
}>;
export declare const updateUserInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    full_name: z.ZodOptional<z.ZodString>;
    phone_number: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, string, unknown>>;
    profile_picture_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notification_preferences: z.ZodOptional<z.ZodObject<{
        order_updates_email: z.ZodBoolean;
        order_updates_push: z.ZodBoolean;
        promotions_email: z.ZodBoolean;
        promotions_push: z.ZodBoolean;
        weekly_picks_email: z.ZodBoolean;
        weekly_picks_push: z.ZodBoolean;
        new_restaurants_email: z.ZodBoolean;
        new_restaurants_push: z.ZodBoolean;
        review_responses_email: z.ZodBoolean;
        review_responses_push: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }, {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    }>>;
    location_permission_granted: z.ZodOptional<z.ZodBoolean>;
    profile_public: z.ZodOptional<z.ZodBoolean>;
    reviews_public: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    email?: string;
    full_name?: string;
    phone_number?: string;
    profile_picture_url?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
}, {
    user_id?: string;
    email?: string;
    full_name?: string;
    phone_number?: unknown;
    profile_picture_url?: string;
    notification_preferences?: {
        order_updates_email?: boolean;
        order_updates_push?: boolean;
        promotions_email?: boolean;
        promotions_push?: boolean;
        weekly_picks_email?: boolean;
        weekly_picks_push?: boolean;
        new_restaurants_email?: boolean;
        new_restaurants_push?: boolean;
        review_responses_email?: boolean;
        review_responses_push?: boolean;
    };
    location_permission_granted?: boolean;
    profile_public?: boolean;
    reviews_public?: boolean;
}>;
export declare const searchUserInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    is_verified: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["full_name", "email", "created_at", "member_since"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    is_verified?: boolean;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "email" | "full_name" | "member_since" | "created_at";
    sort_order?: "asc" | "desc";
}, {
    email?: string;
    is_verified?: boolean;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "email" | "full_name" | "member_since" | "created_at";
    sort_order?: "asc" | "desc";
}>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUserInput = z.infer<typeof searchUserInputSchema>;
export declare const restaurantSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    restaurant_name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    cuisine_types: z.ZodArray<z.ZodString, "many">;
    price_range: z.ZodNumber;
    street_address: z.ZodString;
    apartment_suite: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    phone_number: z.ZodString;
    primary_hero_image_url: z.ZodNullable<z.ZodString>;
    average_rating: z.ZodNumber;
    total_review_count: z.ZodNumber;
    total_order_count: z.ZodNumber;
    is_currently_open: z.ZodBoolean;
    accepts_delivery: z.ZodBoolean;
    accepts_pickup: z.ZodBoolean;
    delivery_fee: z.ZodNumber;
    minimum_order_amount: z.ZodNumber;
    delivery_radius_miles: z.ZodNumber;
    estimated_prep_time_minutes: z.ZodNumber;
    estimated_delivery_time_minutes: z.ZodNumber;
    is_featured: z.ZodBoolean;
    featured_week_start: z.ZodNullable<z.ZodString>;
    featured_description: z.ZodNullable<z.ZodString>;
    is_active: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone_number?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
    primary_hero_image_url?: string;
    average_rating?: number;
    total_review_count?: number;
    total_order_count?: number;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    delivery_radius_miles?: number;
    estimated_prep_time_minutes?: number;
    estimated_delivery_time_minutes?: number;
    is_featured?: boolean;
    featured_week_start?: string;
    featured_description?: string;
    is_active?: boolean;
}, {
    phone_number?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
    primary_hero_image_url?: string;
    average_rating?: number;
    total_review_count?: number;
    total_order_count?: number;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    delivery_radius_miles?: number;
    estimated_prep_time_minutes?: number;
    estimated_delivery_time_minutes?: number;
    is_featured?: boolean;
    featured_week_start?: string;
    featured_description?: string;
    is_active?: boolean;
}>;
export declare const createRestaurantInputSchema: z.ZodObject<{
    restaurant_name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    cuisine_types: z.ZodArray<z.ZodString, "many">;
    price_range: z.ZodNumber;
    street_address: z.ZodString;
    apartment_suite: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    phone_number: z.ZodString;
    primary_hero_image_url: z.ZodNullable<z.ZodString>;
    accepts_delivery: z.ZodOptional<z.ZodBoolean>;
    accepts_pickup: z.ZodOptional<z.ZodBoolean>;
    delivery_fee: z.ZodOptional<z.ZodNumber>;
    minimum_order_amount: z.ZodOptional<z.ZodNumber>;
    delivery_radius_miles: z.ZodOptional<z.ZodNumber>;
    estimated_prep_time_minutes: z.ZodOptional<z.ZodNumber>;
    estimated_delivery_time_minutes: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    phone_number?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
    primary_hero_image_url?: string;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    delivery_radius_miles?: number;
    estimated_prep_time_minutes?: number;
    estimated_delivery_time_minutes?: number;
}, {
    phone_number?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
    primary_hero_image_url?: string;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    delivery_radius_miles?: number;
    estimated_prep_time_minutes?: number;
    estimated_delivery_time_minutes?: number;
}>;
export declare const updateRestaurantInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    restaurant_name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cuisine_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    price_range: z.ZodOptional<z.ZodNumber>;
    street_address: z.ZodOptional<z.ZodString>;
    apartment_suite: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zip_code: z.ZodOptional<z.ZodString>;
    phone_number: z.ZodOptional<z.ZodString>;
    primary_hero_image_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_currently_open: z.ZodOptional<z.ZodBoolean>;
    accepts_delivery: z.ZodOptional<z.ZodBoolean>;
    accepts_pickup: z.ZodOptional<z.ZodBoolean>;
    delivery_fee: z.ZodOptional<z.ZodNumber>;
    minimum_order_amount: z.ZodOptional<z.ZodNumber>;
    is_featured: z.ZodOptional<z.ZodBoolean>;
    featured_description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    phone_number?: string;
    restaurant_id?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    primary_hero_image_url?: string;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    is_featured?: boolean;
    featured_description?: string;
    is_active?: boolean;
}, {
    phone_number?: string;
    restaurant_id?: string;
    restaurant_name?: string;
    description?: string;
    cuisine_types?: string[];
    price_range?: number;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    primary_hero_image_url?: string;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    delivery_fee?: number;
    minimum_order_amount?: number;
    is_featured?: boolean;
    featured_description?: string;
    is_active?: boolean;
}>;
export declare const searchRestaurantInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    cuisine_types: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    price_range: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    city: z.ZodOptional<z.ZodString>;
    accepts_delivery: z.ZodOptional<z.ZodBoolean>;
    accepts_pickup: z.ZodOptional<z.ZodBoolean>;
    is_currently_open: z.ZodOptional<z.ZodBoolean>;
    is_featured: z.ZodOptional<z.ZodBoolean>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    min_rating: z.ZodOptional<z.ZodNumber>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    radius_miles: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["restaurant_name", "average_rating", "total_review_count", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "restaurant_name" | "average_rating" | "total_review_count";
    sort_order?: "asc" | "desc";
    cuisine_types?: string[];
    price_range?: number[];
    city?: string;
    latitude?: number;
    longitude?: number;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
    min_rating?: number;
    radius_miles?: number;
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "restaurant_name" | "average_rating" | "total_review_count";
    sort_order?: "asc" | "desc";
    cuisine_types?: string[];
    price_range?: number[];
    city?: string;
    latitude?: number;
    longitude?: number;
    is_currently_open?: boolean;
    accepts_delivery?: boolean;
    accepts_pickup?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
    min_rating?: number;
    radius_miles?: number;
}>;
export type Restaurant = z.infer<typeof restaurantSchema>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantInputSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantInputSchema>;
export type SearchRestaurantInput = z.infer<typeof searchRestaurantInputSchema>;
export declare const restaurantHoursSchema: z.ZodObject<{
    hours_id: z.ZodString;
    restaurant_id: z.ZodString;
    day_of_week: z.ZodNumber;
    open_time: z.ZodNullable<z.ZodString>;
    close_time: z.ZodNullable<z.ZodString>;
    is_closed: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    hours_id?: string;
    day_of_week?: number;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    hours_id?: string;
    day_of_week?: number;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}>;
export declare const createRestaurantHoursInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    day_of_week: z.ZodNumber;
    open_time: z.ZodNullable<z.ZodString>;
    close_time: z.ZodNullable<z.ZodString>;
    is_closed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    day_of_week?: number;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}, {
    restaurant_id?: string;
    day_of_week?: number;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}>;
export declare const updateRestaurantHoursInputSchema: z.ZodObject<{
    hours_id: z.ZodString;
    open_time: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    close_time: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_closed: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    hours_id?: string;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}, {
    hours_id?: string;
    open_time?: string;
    close_time?: string;
    is_closed?: boolean;
}>;
export type RestaurantHours = z.infer<typeof restaurantHoursSchema>;
export type CreateRestaurantHoursInput = z.infer<typeof createRestaurantHoursInputSchema>;
export type UpdateRestaurantHoursInput = z.infer<typeof updateRestaurantHoursInputSchema>;
export declare const menuItemSchema: z.ZodObject<{
    menu_item_id: z.ZodString;
    restaurant_id: z.ZodString;
    category_id: z.ZodString;
    item_name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    base_price: z.ZodNumber;
    item_photo_url: z.ZodNullable<z.ZodString>;
    dietary_preferences: z.ZodArray<z.ZodString, "many">;
    allergen_info: z.ZodArray<z.ZodString, "many">;
    spice_level: z.ZodNullable<z.ZodNumber>;
    is_popular: z.ZodBoolean;
    is_available: z.ZodBoolean;
    display_order: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    description?: string;
    menu_item_id?: string;
    category_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    description?: string;
    menu_item_id?: string;
    category_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}>;
export declare const createMenuItemInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    category_id: z.ZodString;
    item_name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    base_price: z.ZodNumber;
    item_photo_url: z.ZodNullable<z.ZodString>;
    dietary_preferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allergen_info: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    spice_level: z.ZodNullable<z.ZodNumber>;
    is_popular: z.ZodOptional<z.ZodBoolean>;
    is_available: z.ZodOptional<z.ZodBoolean>;
    display_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    description?: string;
    category_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}, {
    restaurant_id?: string;
    description?: string;
    category_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}>;
export declare const updateMenuItemInputSchema: z.ZodObject<{
    menu_item_id: z.ZodString;
    item_name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    base_price: z.ZodOptional<z.ZodNumber>;
    item_photo_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dietary_preferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allergen_info: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    spice_level: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    is_popular: z.ZodOptional<z.ZodBoolean>;
    is_available: z.ZodOptional<z.ZodBoolean>;
    display_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    menu_item_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}, {
    description?: string;
    menu_item_id?: string;
    item_name?: string;
    base_price?: number;
    item_photo_url?: string;
    dietary_preferences?: string[];
    allergen_info?: string[];
    spice_level?: number;
    is_popular?: boolean;
    is_available?: boolean;
    display_order?: number;
}>;
export declare const searchMenuItemInputSchema: z.ZodObject<{
    restaurant_id: z.ZodOptional<z.ZodString>;
    category_id: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    dietary_preferences: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    max_spice_level: z.ZodOptional<z.ZodNumber>;
    is_popular: z.ZodOptional<z.ZodBoolean>;
    is_available: z.ZodOptional<z.ZodBoolean>;
    min_price: z.ZodOptional<z.ZodNumber>;
    max_price: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["item_name", "base_price", "display_order"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "item_name" | "base_price" | "display_order";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    category_id?: string;
    dietary_preferences?: string[];
    is_popular?: boolean;
    is_available?: boolean;
    max_spice_level?: number;
    min_price?: number;
    max_price?: number;
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "item_name" | "base_price" | "display_order";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    category_id?: string;
    dietary_preferences?: string[];
    is_popular?: boolean;
    is_available?: boolean;
    max_spice_level?: number;
    min_price?: number;
    max_price?: number;
}>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;
export type SearchMenuItemInput = z.infer<typeof searchMenuItemInputSchema>;
export declare const menuItemSizeSchema: z.ZodObject<{
    size_id: z.ZodString;
    menu_item_id: z.ZodString;
    size_name: z.ZodString;
    price_adjustment: z.ZodNumber;
    display_order: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    menu_item_id?: string;
    display_order?: number;
    size_id?: string;
    size_name?: string;
    price_adjustment?: number;
}, {
    created_at?: string;
    menu_item_id?: string;
    display_order?: number;
    size_id?: string;
    size_name?: string;
    price_adjustment?: number;
}>;
export declare const createMenuItemSizeInputSchema: z.ZodObject<{
    menu_item_id: z.ZodString;
    size_name: z.ZodString;
    price_adjustment: z.ZodNumber;
    display_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    menu_item_id?: string;
    display_order?: number;
    size_name?: string;
    price_adjustment?: number;
}, {
    menu_item_id?: string;
    display_order?: number;
    size_name?: string;
    price_adjustment?: number;
}>;
export type MenuItemSize = z.infer<typeof menuItemSizeSchema>;
export type CreateMenuItemSizeInput = z.infer<typeof createMenuItemSizeInputSchema>;
export declare const menuItemAddonSchema: z.ZodObject<{
    addon_id: z.ZodString;
    menu_item_id: z.ZodString;
    addon_name: z.ZodString;
    addon_price: z.ZodNumber;
    display_order: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    menu_item_id?: string;
    display_order?: number;
    addon_id?: string;
    addon_name?: string;
    addon_price?: number;
}, {
    created_at?: string;
    menu_item_id?: string;
    display_order?: number;
    addon_id?: string;
    addon_name?: string;
    addon_price?: number;
}>;
export declare const createMenuItemAddonInputSchema: z.ZodObject<{
    menu_item_id: z.ZodString;
    addon_name: z.ZodString;
    addon_price: z.ZodNumber;
    display_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    menu_item_id?: string;
    display_order?: number;
    addon_name?: string;
    addon_price?: number;
}, {
    menu_item_id?: string;
    display_order?: number;
    addon_name?: string;
    addon_price?: number;
}>;
export type MenuItemAddon = z.infer<typeof menuItemAddonSchema>;
export type CreateMenuItemAddonInput = z.infer<typeof createMenuItemAddonInputSchema>;
export declare const orderSchema: z.ZodObject<{
    order_id: z.ZodString;
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    order_type: z.ZodString;
    order_status: z.ZodString;
    delivery_street_address: z.ZodNullable<z.ZodString>;
    delivery_apartment_suite: z.ZodNullable<z.ZodString>;
    delivery_city: z.ZodNullable<z.ZodString>;
    delivery_state: z.ZodNullable<z.ZodString>;
    delivery_zip_code: z.ZodNullable<z.ZodString>;
    special_instructions: z.ZodNullable<z.ZodString>;
    subtotal: z.ZodNumber;
    discount_amount: z.ZodNumber;
    discount_id: z.ZodNullable<z.ZodString>;
    delivery_fee: z.ZodNumber;
    tax: z.ZodNumber;
    tip: z.ZodNumber;
    grand_total: z.ZodNumber;
    payment_method_id: z.ZodNullable<z.ZodString>;
    payment_status: z.ZodString;
    estimated_delivery_time: z.ZodNullable<z.ZodString>;
    estimated_pickup_time: z.ZodNullable<z.ZodString>;
    order_received_at: z.ZodNullable<z.ZodString>;
    preparing_started_at: z.ZodNullable<z.ZodString>;
    ready_at: z.ZodNullable<z.ZodString>;
    out_for_delivery_at: z.ZodNullable<z.ZodString>;
    delivered_at: z.ZodNullable<z.ZodString>;
    cancelled_at: z.ZodNullable<z.ZodString>;
    cancellation_reason: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    delivery_fee?: number;
    order_id?: string;
    order_type?: string;
    order_status?: string;
    delivery_street_address?: string;
    delivery_apartment_suite?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_zip_code?: string;
    special_instructions?: string;
    subtotal?: number;
    discount_amount?: number;
    discount_id?: string;
    tax?: number;
    tip?: number;
    grand_total?: number;
    payment_method_id?: string;
    payment_status?: string;
    estimated_delivery_time?: string;
    estimated_pickup_time?: string;
    order_received_at?: string;
    preparing_started_at?: string;
    ready_at?: string;
    out_for_delivery_at?: string;
    delivered_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
}, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    delivery_fee?: number;
    order_id?: string;
    order_type?: string;
    order_status?: string;
    delivery_street_address?: string;
    delivery_apartment_suite?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_zip_code?: string;
    special_instructions?: string;
    subtotal?: number;
    discount_amount?: number;
    discount_id?: string;
    tax?: number;
    tip?: number;
    grand_total?: number;
    payment_method_id?: string;
    payment_status?: string;
    estimated_delivery_time?: string;
    estimated_pickup_time?: string;
    order_received_at?: string;
    preparing_started_at?: string;
    ready_at?: string;
    out_for_delivery_at?: string;
    delivered_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
}>;
export declare const createOrderInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    order_type: z.ZodEnum<["delivery", "pickup"]>;
    delivery_street_address: z.ZodNullable<z.ZodString>;
    delivery_apartment_suite: z.ZodNullable<z.ZodString>;
    delivery_city: z.ZodNullable<z.ZodString>;
    delivery_state: z.ZodNullable<z.ZodString>;
    delivery_zip_code: z.ZodNullable<z.ZodString>;
    special_instructions: z.ZodNullable<z.ZodString>;
    discount_id: z.ZodNullable<z.ZodString>;
    payment_method_id: z.ZodNullable<z.ZodString>;
    tip: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    restaurant_id?: string;
    order_type?: "delivery" | "pickup";
    delivery_street_address?: string;
    delivery_apartment_suite?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_zip_code?: string;
    special_instructions?: string;
    discount_id?: string;
    tip?: number;
    payment_method_id?: string;
}, {
    user_id?: string;
    restaurant_id?: string;
    order_type?: "delivery" | "pickup";
    delivery_street_address?: string;
    delivery_apartment_suite?: string;
    delivery_city?: string;
    delivery_state?: string;
    delivery_zip_code?: string;
    special_instructions?: string;
    discount_id?: string;
    tip?: number;
    payment_method_id?: string;
}>;
export declare const updateOrderInputSchema: z.ZodObject<{
    order_id: z.ZodString;
    order_status: z.ZodOptional<z.ZodEnum<["order_received", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]>>;
    special_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tip: z.ZodOptional<z.ZodNumber>;
    cancellation_reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    order_id?: string;
    order_status?: "order_received" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
    special_instructions?: string;
    tip?: number;
    cancellation_reason?: string;
}, {
    order_id?: string;
    order_status?: "order_received" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
    special_instructions?: string;
    tip?: number;
    cancellation_reason?: string;
}>;
export declare const searchOrderInputSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodString>;
    restaurant_id: z.ZodOptional<z.ZodString>;
    order_type: z.ZodOptional<z.ZodEnum<["delivery", "pickup"]>>;
    order_status: z.ZodOptional<z.ZodEnum<["order_received", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]>>;
    payment_status: z.ZodOptional<z.ZodString>;
    start_date: z.ZodOptional<z.ZodString>;
    end_date: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "grand_total", "order_status"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "order_status" | "grand_total";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    order_type?: "delivery" | "pickup";
    order_status?: "order_received" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
    payment_status?: string;
    start_date?: string;
    end_date?: string;
}, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "order_status" | "grand_total";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    order_type?: "delivery" | "pickup";
    order_status?: "order_received" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
    payment_status?: string;
    start_date?: string;
    end_date?: string;
}>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type SearchOrderInput = z.infer<typeof searchOrderInputSchema>;
export declare const orderItemSchema: z.ZodObject<{
    order_item_id: z.ZodString;
    order_id: z.ZodString;
    menu_item_id: z.ZodString;
    item_name: z.ZodString;
    base_price: z.ZodNumber;
    selected_size: z.ZodNullable<z.ZodString>;
    size_price_adjustment: z.ZodNumber;
    selected_addons: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        price?: number;
    }, {
        name?: string;
        price?: number;
    }>, "many">;
    selected_modifications: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        price?: number;
    }, {
        name?: string;
        price?: number;
    }>, "many">;
    special_instructions: z.ZodNullable<z.ZodString>;
    quantity: z.ZodNumber;
    item_total_price: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    menu_item_id?: string;
    item_name?: string;
    base_price?: number;
    order_id?: string;
    special_instructions?: string;
    order_item_id?: string;
    selected_size?: string;
    size_price_adjustment?: number;
    selected_addons?: {
        name?: string;
        price?: number;
    }[];
    selected_modifications?: {
        name?: string;
        price?: number;
    }[];
    quantity?: number;
    item_total_price?: number;
}, {
    created_at?: string;
    menu_item_id?: string;
    item_name?: string;
    base_price?: number;
    order_id?: string;
    special_instructions?: string;
    order_item_id?: string;
    selected_size?: string;
    size_price_adjustment?: number;
    selected_addons?: {
        name?: string;
        price?: number;
    }[];
    selected_modifications?: {
        name?: string;
        price?: number;
    }[];
    quantity?: number;
    item_total_price?: number;
}>;
export declare const createOrderItemInputSchema: z.ZodObject<{
    order_id: z.ZodString;
    menu_item_id: z.ZodString;
    selected_size: z.ZodNullable<z.ZodString>;
    selected_addons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        price?: number;
    }, {
        name?: string;
        price?: number;
    }>, "many">>;
    selected_modifications: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        price?: number;
    }, {
        name?: string;
        price?: number;
    }>, "many">>;
    special_instructions: z.ZodNullable<z.ZodString>;
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    menu_item_id?: string;
    order_id?: string;
    special_instructions?: string;
    selected_size?: string;
    selected_addons?: {
        name?: string;
        price?: number;
    }[];
    selected_modifications?: {
        name?: string;
        price?: number;
    }[];
    quantity?: number;
}, {
    menu_item_id?: string;
    order_id?: string;
    special_instructions?: string;
    selected_size?: string;
    selected_addons?: {
        name?: string;
        price?: number;
    }[];
    selected_modifications?: {
        name?: string;
        price?: number;
    }[];
    quantity?: number;
}>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CreateOrderItemInput = z.infer<typeof createOrderItemInputSchema>;
export declare const reviewSchema: z.ZodObject<{
    review_id: z.ZodString;
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    order_id: z.ZodNullable<z.ZodString>;
    star_rating: z.ZodNumber;
    review_title: z.ZodNullable<z.ZodString>;
    review_text: z.ZodString;
    is_verified_visit: z.ZodBoolean;
    helpful_count: z.ZodNumber;
    is_edited: z.ZodBoolean;
    edited_at: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    order_id?: string;
    review_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
    is_verified_visit?: boolean;
    helpful_count?: number;
    is_edited?: boolean;
    edited_at?: string;
}, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    order_id?: string;
    review_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
    is_verified_visit?: boolean;
    helpful_count?: number;
    is_edited?: boolean;
    edited_at?: string;
}>;
export declare const createReviewInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    order_id: z.ZodNullable<z.ZodString>;
    star_rating: z.ZodNumber;
    review_title: z.ZodNullable<z.ZodString>;
    review_text: z.ZodString;
    is_verified_visit: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
    is_verified_visit?: boolean;
}, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
    is_verified_visit?: boolean;
}>;
export declare const updateReviewInputSchema: z.ZodObject<{
    review_id: z.ZodString;
    star_rating: z.ZodOptional<z.ZodNumber>;
    review_title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    review_text: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    review_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
}, {
    review_id?: string;
    star_rating?: number;
    review_title?: string;
    review_text?: string;
}>;
export declare const searchReviewInputSchema: z.ZodObject<{
    user_id: z.ZodOptional<z.ZodString>;
    restaurant_id: z.ZodOptional<z.ZodString>;
    min_rating: z.ZodOptional<z.ZodNumber>;
    max_rating: z.ZodOptional<z.ZodNumber>;
    is_verified_visit: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at", "star_rating", "helpful_count"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "star_rating" | "helpful_count";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    min_rating?: number;
    is_verified_visit?: boolean;
    max_rating?: number;
}, {
    user_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "star_rating" | "helpful_count";
    sort_order?: "asc" | "desc";
    restaurant_id?: string;
    min_rating?: number;
    is_verified_visit?: boolean;
    max_rating?: number;
}>;
export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type SearchReviewInput = z.infer<typeof searchReviewInputSchema>;
export declare const discountSchema: z.ZodObject<{
    discount_id: z.ZodString;
    restaurant_id: z.ZodString;
    discount_type: z.ZodString;
    discount_value: z.ZodNumber;
    coupon_code: z.ZodNullable<z.ZodString>;
    qr_code_data: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    terms_conditions: z.ZodNullable<z.ZodString>;
    minimum_order_amount: z.ZodNullable<z.ZodNumber>;
    excluded_items: z.ZodArray<z.ZodString, "many">;
    valid_days: z.ZodArray<z.ZodNumber, "many">;
    is_one_time_use: z.ZodBoolean;
    max_redemptions_per_user: z.ZodNullable<z.ZodNumber>;
    total_redemption_limit: z.ZodNullable<z.ZodNumber>;
    current_redemption_count: z.ZodNumber;
    is_active: z.ZodBoolean;
    start_date: z.ZodString;
    end_date: z.ZodString;
    is_local_picks_exclusive: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    description?: string;
    minimum_order_amount?: number;
    is_active?: boolean;
    discount_id?: string;
    start_date?: string;
    end_date?: string;
    discount_type?: string;
    discount_value?: number;
    coupon_code?: string;
    qr_code_data?: string;
    terms_conditions?: string;
    excluded_items?: string[];
    valid_days?: number[];
    is_one_time_use?: boolean;
    max_redemptions_per_user?: number;
    total_redemption_limit?: number;
    current_redemption_count?: number;
    is_local_picks_exclusive?: boolean;
}, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    description?: string;
    minimum_order_amount?: number;
    is_active?: boolean;
    discount_id?: string;
    start_date?: string;
    end_date?: string;
    discount_type?: string;
    discount_value?: number;
    coupon_code?: string;
    qr_code_data?: string;
    terms_conditions?: string;
    excluded_items?: string[];
    valid_days?: number[];
    is_one_time_use?: boolean;
    max_redemptions_per_user?: number;
    total_redemption_limit?: number;
    current_redemption_count?: number;
    is_local_picks_exclusive?: boolean;
}>;
export declare const createDiscountInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    discount_type: z.ZodEnum<["percentage", "fixed_amount", "qr_discount", "first_order"]>;
    discount_value: z.ZodNumber;
    coupon_code: z.ZodNullable<z.ZodString>;
    qr_code_data: z.ZodNullable<z.ZodString>;
    description: z.ZodString;
    terms_conditions: z.ZodNullable<z.ZodString>;
    minimum_order_amount: z.ZodNullable<z.ZodNumber>;
    excluded_items: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    valid_days: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    is_one_time_use: z.ZodOptional<z.ZodBoolean>;
    max_redemptions_per_user: z.ZodNullable<z.ZodNumber>;
    total_redemption_limit: z.ZodNullable<z.ZodNumber>;
    start_date: z.ZodString;
    end_date: z.ZodString;
    is_local_picks_exclusive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    description?: string;
    minimum_order_amount?: number;
    start_date?: string;
    end_date?: string;
    discount_type?: "percentage" | "fixed_amount" | "qr_discount" | "first_order";
    discount_value?: number;
    coupon_code?: string;
    qr_code_data?: string;
    terms_conditions?: string;
    excluded_items?: string[];
    valid_days?: number[];
    is_one_time_use?: boolean;
    max_redemptions_per_user?: number;
    total_redemption_limit?: number;
    is_local_picks_exclusive?: boolean;
}, {
    restaurant_id?: string;
    description?: string;
    minimum_order_amount?: number;
    start_date?: string;
    end_date?: string;
    discount_type?: "percentage" | "fixed_amount" | "qr_discount" | "first_order";
    discount_value?: number;
    coupon_code?: string;
    qr_code_data?: string;
    terms_conditions?: string;
    excluded_items?: string[];
    valid_days?: number[];
    is_one_time_use?: boolean;
    max_redemptions_per_user?: number;
    total_redemption_limit?: number;
    is_local_picks_exclusive?: boolean;
}>;
export declare const updateDiscountInputSchema: z.ZodObject<{
    discount_id: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    terms_conditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    end_date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    is_active?: boolean;
    discount_id?: string;
    end_date?: string;
    terms_conditions?: string;
}, {
    description?: string;
    is_active?: boolean;
    discount_id?: string;
    end_date?: string;
    terms_conditions?: string;
}>;
export declare const searchDiscountInputSchema: z.ZodObject<{
    restaurant_id: z.ZodOptional<z.ZodString>;
    discount_type: z.ZodOptional<z.ZodEnum<["percentage", "fixed_amount", "qr_discount", "first_order"]>>;
    is_active: z.ZodOptional<z.ZodBoolean>;
    is_local_picks_exclusive: z.ZodOptional<z.ZodBoolean>;
    coupon_code: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    restaurant_id?: string;
    is_active?: boolean;
    discount_type?: "percentage" | "fixed_amount" | "qr_discount" | "first_order";
    coupon_code?: string;
    is_local_picks_exclusive?: boolean;
}, {
    limit?: number;
    offset?: number;
    restaurant_id?: string;
    is_active?: boolean;
    discount_type?: "percentage" | "fixed_amount" | "qr_discount" | "first_order";
    coupon_code?: string;
    is_local_picks_exclusive?: boolean;
}>;
export type Discount = z.infer<typeof discountSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountInputSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountInputSchema>;
export type SearchDiscountInput = z.infer<typeof searchDiscountInputSchema>;
export declare const savedAddressSchema: z.ZodObject<{
    address_id: z.ZodString;
    user_id: z.ZodString;
    address_label: z.ZodString;
    street_address: z.ZodString;
    apartment_suite: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    is_default: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_id?: string;
    address_label?: string;
    is_default?: boolean;
}, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_id?: string;
    address_label?: string;
    is_default?: boolean;
}>;
export declare const createSavedAddressInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    address_label: z.ZodString;
    street_address: z.ZodString;
    apartment_suite: z.ZodNullable<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    is_default: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_label?: string;
    is_default?: boolean;
}, {
    user_id?: string;
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_label?: string;
    is_default?: boolean;
}>;
export declare const updateSavedAddressInputSchema: z.ZodObject<{
    address_id: z.ZodString;
    address_label: z.ZodOptional<z.ZodString>;
    street_address: z.ZodOptional<z.ZodString>;
    apartment_suite: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    zip_code: z.ZodOptional<z.ZodString>;
    is_default: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_id?: string;
    address_label?: string;
    is_default?: boolean;
}, {
    street_address?: string;
    apartment_suite?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    address_id?: string;
    address_label?: string;
    is_default?: boolean;
}>;
export type SavedAddress = z.infer<typeof savedAddressSchema>;
export type CreateSavedAddressInput = z.infer<typeof createSavedAddressInputSchema>;
export type UpdateSavedAddressInput = z.infer<typeof updateSavedAddressInputSchema>;
export declare const savedPaymentMethodSchema: z.ZodObject<{
    payment_method_id: z.ZodString;
    user_id: z.ZodString;
    payment_label: z.ZodString;
    card_type: z.ZodString;
    last_four_digits: z.ZodString;
    expiration_month: z.ZodString;
    expiration_year: z.ZodString;
    billing_zip_code: z.ZodString;
    is_default: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    payment_method_id?: string;
    is_default?: boolean;
    payment_label?: string;
    card_type?: string;
    last_four_digits?: string;
    expiration_month?: string;
    expiration_year?: string;
    billing_zip_code?: string;
}, {
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    payment_method_id?: string;
    is_default?: boolean;
    payment_label?: string;
    card_type?: string;
    last_four_digits?: string;
    expiration_month?: string;
    expiration_year?: string;
    billing_zip_code?: string;
}>;
export declare const createSavedPaymentMethodInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    payment_label: z.ZodString;
    card_type: z.ZodEnum<["Visa", "Mastercard", "Amex", "Discover"]>;
    last_four_digits: z.ZodString;
    expiration_month: z.ZodString;
    expiration_year: z.ZodString;
    billing_zip_code: z.ZodString;
    is_default: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    is_default?: boolean;
    payment_label?: string;
    card_type?: "Visa" | "Mastercard" | "Amex" | "Discover";
    last_four_digits?: string;
    expiration_month?: string;
    expiration_year?: string;
    billing_zip_code?: string;
}, {
    user_id?: string;
    is_default?: boolean;
    payment_label?: string;
    card_type?: "Visa" | "Mastercard" | "Amex" | "Discover";
    last_four_digits?: string;
    expiration_month?: string;
    expiration_year?: string;
    billing_zip_code?: string;
}>;
export type SavedPaymentMethod = z.infer<typeof savedPaymentMethodSchema>;
export type CreateSavedPaymentMethodInput = z.infer<typeof createSavedPaymentMethodInputSchema>;
export declare const favoriteSchema: z.ZodObject<{
    favorite_id: z.ZodString;
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    restaurant_id?: string;
    favorite_id?: string;
}, {
    user_id?: string;
    created_at?: string;
    restaurant_id?: string;
    favorite_id?: string;
}>;
export declare const createFavoriteInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    restaurant_id?: string;
}, {
    user_id?: string;
    restaurant_id?: string;
}>;
export type Favorite = z.infer<typeof favoriteSchema>;
export type CreateFavoriteInput = z.infer<typeof createFavoriteInputSchema>;
export declare const notificationSchema: z.ZodObject<{
    notification_id: z.ZodString;
    user_id: z.ZodString;
    notification_type: z.ZodString;
    message: z.ZodString;
    action_url: z.ZodNullable<z.ZodString>;
    is_read: z.ZodBoolean;
    created_at: z.ZodString;
    read_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message?: string;
    user_id?: string;
    created_at?: string;
    notification_id?: string;
    notification_type?: string;
    action_url?: string;
    is_read?: boolean;
    read_at?: string;
}, {
    message?: string;
    user_id?: string;
    created_at?: string;
    notification_id?: string;
    notification_type?: string;
    action_url?: string;
    is_read?: boolean;
    read_at?: string;
}>;
export declare const createNotificationInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    notification_type: z.ZodEnum<["order_update", "promotion", "new_restaurant", "badge_earned", "review_response", "weekly_picks", "discount"]>;
    message: z.ZodString;
    action_url: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message?: string;
    user_id?: string;
    notification_type?: "order_update" | "promotion" | "new_restaurant" | "badge_earned" | "review_response" | "weekly_picks" | "discount";
    action_url?: string;
}, {
    message?: string;
    user_id?: string;
    notification_type?: "order_update" | "promotion" | "new_restaurant" | "badge_earned" | "review_response" | "weekly_picks" | "discount";
    action_url?: string;
}>;
export declare const updateNotificationInputSchema: z.ZodObject<{
    notification_id: z.ZodString;
    is_read: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    notification_id?: string;
    is_read?: boolean;
}, {
    notification_id?: string;
    is_read?: boolean;
}>;
export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationInputSchema>;
export declare const badgeSchema: z.ZodObject<{
    badge_id: z.ZodString;
    badge_name: z.ZodString;
    badge_description: z.ZodString;
    badge_icon_url: z.ZodNullable<z.ZodString>;
    criteria_type: z.ZodString;
    criteria_value: z.ZodNumber;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    badge_id?: string;
    badge_name?: string;
    badge_description?: string;
    badge_icon_url?: string;
    criteria_type?: string;
    criteria_value?: number;
}, {
    created_at?: string;
    badge_id?: string;
    badge_name?: string;
    badge_description?: string;
    badge_icon_url?: string;
    criteria_type?: string;
    criteria_value?: number;
}>;
export declare const createBadgeInputSchema: z.ZodObject<{
    badge_name: z.ZodString;
    badge_description: z.ZodString;
    badge_icon_url: z.ZodNullable<z.ZodString>;
    criteria_type: z.ZodEnum<["reviews_written", "restaurants_visited", "orders_placed", "discounts_redeemed", "unique_cuisines"]>;
    criteria_value: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    badge_name?: string;
    badge_description?: string;
    badge_icon_url?: string;
    criteria_type?: "reviews_written" | "restaurants_visited" | "orders_placed" | "discounts_redeemed" | "unique_cuisines";
    criteria_value?: number;
}, {
    badge_name?: string;
    badge_description?: string;
    badge_icon_url?: string;
    criteria_type?: "reviews_written" | "restaurants_visited" | "orders_placed" | "discounts_redeemed" | "unique_cuisines";
    criteria_value?: number;
}>;
export type Badge = z.infer<typeof badgeSchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeInputSchema>;
export declare const userBadgeSchema: z.ZodObject<{
    user_badge_id: z.ZodString;
    user_id: z.ZodString;
    badge_id: z.ZodString;
    is_showcased: z.ZodBoolean;
    showcase_order: z.ZodNullable<z.ZodNumber>;
    earned_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    badge_id?: string;
    user_badge_id?: string;
    is_showcased?: boolean;
    showcase_order?: number;
    earned_at?: string;
}, {
    user_id?: string;
    badge_id?: string;
    user_badge_id?: string;
    is_showcased?: boolean;
    showcase_order?: number;
    earned_at?: string;
}>;
export declare const createUserBadgeInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    badge_id: z.ZodString;
    is_showcased: z.ZodOptional<z.ZodBoolean>;
    showcase_order: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    badge_id?: string;
    is_showcased?: boolean;
    showcase_order?: number;
}, {
    user_id?: string;
    badge_id?: string;
    is_showcased?: boolean;
    showcase_order?: number;
}>;
export type UserBadge = z.infer<typeof userBadgeSchema>;
export type CreateUserBadgeInput = z.infer<typeof createUserBadgeInputSchema>;
export declare const menuCategorySchema: z.ZodObject<{
    category_id: z.ZodString;
    restaurant_id: z.ZodString;
    category_name: z.ZodString;
    display_order: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    category_id?: string;
    display_order?: number;
    category_name?: string;
}, {
    created_at?: string;
    updated_at?: string;
    restaurant_id?: string;
    category_id?: string;
    display_order?: number;
    category_name?: string;
}>;
export declare const createMenuCategoryInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    category_name: z.ZodString;
    display_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    display_order?: number;
    category_name?: string;
}, {
    restaurant_id?: string;
    display_order?: number;
    category_name?: string;
}>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategoryInputSchema>;
export declare const restaurantPhotoSchema: z.ZodObject<{
    photo_id: z.ZodString;
    restaurant_id: z.ZodString;
    photo_url: z.ZodString;
    caption: z.ZodNullable<z.ZodString>;
    display_order: z.ZodNumber;
    uploaded_by_user_id: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    restaurant_id?: string;
    display_order?: number;
    photo_id?: string;
    photo_url?: string;
    caption?: string;
    uploaded_by_user_id?: string;
}, {
    created_at?: string;
    restaurant_id?: string;
    display_order?: number;
    photo_id?: string;
    photo_url?: string;
    caption?: string;
    uploaded_by_user_id?: string;
}>;
export declare const createRestaurantPhotoInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    photo_url: z.ZodString;
    caption: z.ZodNullable<z.ZodString>;
    display_order: z.ZodOptional<z.ZodNumber>;
    uploaded_by_user_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    display_order?: number;
    photo_url?: string;
    caption?: string;
    uploaded_by_user_id?: string;
}, {
    restaurant_id?: string;
    display_order?: number;
    photo_url?: string;
    caption?: string;
    uploaded_by_user_id?: string;
}>;
export type RestaurantPhoto = z.infer<typeof restaurantPhotoSchema>;
export type CreateRestaurantPhotoInput = z.infer<typeof createRestaurantPhotoInputSchema>;
export declare const userStatisticsSchema: z.ZodObject<{
    stat_id: z.ZodString;
    user_id: z.ZodString;
    total_reviews_written: z.ZodNumber;
    total_restaurants_visited: z.ZodNumber;
    total_favorites_saved: z.ZodNumber;
    total_orders_placed: z.ZodNumber;
    total_badges_earned: z.ZodNumber;
    total_discounts_redeemed: z.ZodNumber;
    unique_cuisines_tried: z.ZodArray<z.ZodString, "many">;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    updated_at?: string;
    stat_id?: string;
    total_reviews_written?: number;
    total_restaurants_visited?: number;
    total_favorites_saved?: number;
    total_orders_placed?: number;
    total_badges_earned?: number;
    total_discounts_redeemed?: number;
    unique_cuisines_tried?: string[];
}, {
    user_id?: string;
    updated_at?: string;
    stat_id?: string;
    total_reviews_written?: number;
    total_restaurants_visited?: number;
    total_favorites_saved?: number;
    total_orders_placed?: number;
    total_badges_earned?: number;
    total_discounts_redeemed?: number;
    unique_cuisines_tried?: string[];
}>;
export type UserStatistics = z.infer<typeof userStatisticsSchema>;
export declare const searchHistorySchema: z.ZodObject<{
    search_id: z.ZodString;
    user_id: z.ZodString;
    search_query: z.ZodString;
    search_type: z.ZodString;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    search_id?: string;
    search_query?: string;
    search_type?: string;
}, {
    user_id?: string;
    created_at?: string;
    search_id?: string;
    search_query?: string;
    search_type?: string;
}>;
export declare const createSearchHistoryInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    search_query: z.ZodString;
    search_type: z.ZodEnum<["cuisine", "general", "dietary", "dish", "restaurant"]>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    search_query?: string;
    search_type?: "cuisine" | "general" | "dietary" | "dish" | "restaurant";
}, {
    user_id?: string;
    search_query?: string;
    search_type?: "cuisine" | "general" | "dietary" | "dish" | "restaurant";
}>;
export type SearchHistory = z.infer<typeof searchHistorySchema>;
export type CreateSearchHistoryInput = z.infer<typeof createSearchHistoryInputSchema>;
export declare const weeklyLocalPickSchema: z.ZodObject<{
    pick_id: z.ZodString;
    restaurant_id: z.ZodString;
    week_start_date: z.ZodString;
    week_end_date: z.ZodString;
    featured_description: z.ZodNullable<z.ZodString>;
    display_order: z.ZodNumber;
    selection_criteria: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at?: string;
    restaurant_id?: string;
    featured_description?: string;
    display_order?: number;
    pick_id?: string;
    week_start_date?: string;
    week_end_date?: string;
    selection_criteria?: string;
}, {
    created_at?: string;
    restaurant_id?: string;
    featured_description?: string;
    display_order?: number;
    pick_id?: string;
    week_start_date?: string;
    week_end_date?: string;
    selection_criteria?: string;
}>;
export declare const createWeeklyLocalPickInputSchema: z.ZodObject<{
    restaurant_id: z.ZodString;
    week_start_date: z.ZodString;
    week_end_date: z.ZodString;
    featured_description: z.ZodNullable<z.ZodString>;
    display_order: z.ZodOptional<z.ZodNumber>;
    selection_criteria: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    restaurant_id?: string;
    featured_description?: string;
    display_order?: number;
    week_start_date?: string;
    week_end_date?: string;
    selection_criteria?: string;
}, {
    restaurant_id?: string;
    featured_description?: string;
    display_order?: number;
    week_start_date?: string;
    week_end_date?: string;
    selection_criteria?: string;
}>;
export type WeeklyLocalPick = z.infer<typeof weeklyLocalPickSchema>;
export type CreateWeeklyLocalPickInput = z.infer<typeof createWeeklyLocalPickInputSchema>;
export declare const verificationSchema: z.ZodObject<{
    verification_id: z.ZodString;
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    verification_method: z.ZodString;
    order_id: z.ZodNullable<z.ZodString>;
    verified_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    verification_id?: string;
    verification_method?: string;
    verified_at?: string;
}, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    verification_id?: string;
    verification_method?: string;
    verified_at?: string;
}>;
export declare const createVerificationInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    restaurant_id: z.ZodString;
    verification_method: z.ZodEnum<["order", "qr_code", "location", "manual"]>;
    order_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    verification_method?: "order" | "qr_code" | "location" | "manual";
}, {
    user_id?: string;
    restaurant_id?: string;
    order_id?: string;
    verification_method?: "order" | "qr_code" | "location" | "manual";
}>;
export type Verification = z.infer<typeof verificationSchema>;
export type CreateVerificationInput = z.infer<typeof createVerificationInputSchema>;
export declare const passwordResetTokenSchema: z.ZodObject<{
    token_id: z.ZodString;
    user_id: z.ZodString;
    reset_token: z.ZodString;
    expires_at: z.ZodString;
    is_used: z.ZodBoolean;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    created_at?: string;
    token_id?: string;
    reset_token?: string;
    expires_at?: string;
    is_used?: boolean;
}, {
    user_id?: string;
    created_at?: string;
    token_id?: string;
    reset_token?: string;
    expires_at?: string;
    is_used?: boolean;
}>;
export declare const createPasswordResetTokenInputSchema: z.ZodObject<{
    user_id: z.ZodString;
    reset_token: z.ZodString;
    expires_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id?: string;
    reset_token?: string;
    expires_at?: string;
}, {
    user_id?: string;
    reset_token?: string;
    expires_at?: string;
}>;
export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type CreatePasswordResetTokenInput = z.infer<typeof createPasswordResetTokenInputSchema>;
//# sourceMappingURL=schema.d.ts.map