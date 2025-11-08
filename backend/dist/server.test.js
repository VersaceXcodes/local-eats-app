import { app, pool } from './server.js';
import request from 'supertest';
import jwt from 'jsonwebtoken';
// Test database setup
let testApp;
let authToken;
let testUserId;
beforeAll(async () => {
    testApp = app;
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
});
afterAll(async () => {
    // Close database pool
    await pool.end();
});
beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM review_helpful_marks');
    await pool.query('DELETE FROM review_photos');
    await pool.query('DELETE FROM review_reports');
    await pool.query('DELETE FROM reviews');
    await pool.query('DELETE FROM discount_redemptions');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM favorites');
    await pool.query('DELETE FROM user_badges');
    await pool.query('DELETE FROM verifications');
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM search_history');
    await pool.query('DELETE FROM dismissed_recommendations');
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM user_statistics');
    await pool.query('DELETE FROM saved_addresses');
    await pool.query('DELETE FROM saved_payment_methods');
    await pool.query('DELETE FROM users');
});
describe('Authentication Tests', () => {
    describe('POST /api/auth/signup', () => {
        it('should register a new user successfully', async () => {
            const response = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'test@example.com',
                password: 'password123',
                full_name: 'Test User',
                phone_number: '+1-555-0100'
            });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('auth_token');
            expect(response.body.user.email).toBe('test@example.com');
            expect(response.body.user.full_name).toBe('Test User');
            expect(response.body.user.is_verified).toBe(false);
            // Verify user was created in database
            const userResult = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
            expect(userResult.rows.length).toBe(1);
            // Verify user_statistics was created
            const statsResult = await pool.query('SELECT * FROM user_statistics WHERE user_id = $1', [response.body.user.user_id]);
            expect(statsResult.rows.length).toBe(1);
            expect(statsResult.rows[0].total_orders_placed).toBe(0);
        });
        it('should reject signup with duplicate email', async () => {
            // Create first user
            await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'duplicate@example.com',
                password: 'password123',
                full_name: 'First User'
            });
            // Try to create second user with same email
            const response = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'duplicate@example.com',
                password: 'password456',
                full_name: 'Second User'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
            expect(response.body.message).toContain('email');
        });
        it('should reject signup with invalid email format', async () => {
            const response = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'invalid-email',
                password: 'password123',
                full_name: 'Test User'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
        });
        it('should reject signup with weak password', async () => {
            const response = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'test@example.com',
                password: 'weak',
                full_name: 'Test User'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
            expect(response.body.message).toContain('password');
        });
        it('should reject signup with missing required fields', async () => {
            const response = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'test@example.com'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
        });
    });
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create test user with plain text password
            await pool.query(`INSERT INTO users (user_id, email, password_hash, full_name, phone_number, 
          is_verified, member_since, notification_preferences, location_permission_granted, 
          profile_public, reviews_public, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                'test_user_001',
                'login@example.com',
                'password123', // Plain text password for testing
                'Login Test User',
                null,
                true,
                new Date().toISOString(),
                JSON.stringify({
                    order_updates_email: true,
                    order_updates_push: true,
                    promotions_email: true,
                    promotions_push: true,
                    weekly_picks_email: true,
                    weekly_picks_push: true,
                    new_restaurants_email: false,
                    new_restaurants_push: false,
                    review_responses_email: true,
                    review_responses_push: true
                }),
                false,
                true,
                true,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            // Create user statistics
            await pool.query(`INSERT INTO user_statistics (stat_id, user_id, total_reviews_written, 
          total_restaurants_visited, total_favorites_saved, total_orders_placed, 
          total_badges_earned, total_discounts_redeemed, unique_cuisines_tried, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                'stat_test_001',
                'test_user_001',
                0,
                0,
                0,
                0,
                0,
                0,
                JSON.stringify([]),
                new Date().toISOString()
            ]);
        });
        it('should login with valid credentials', async () => {
            const response = await request(testApp)
                .post('/api/auth/login')
                .send({
                email: 'login@example.com',
                password: 'password123'
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('auth_token');
            expect(response.body.user.email).toBe('login@example.com');
            expect(response.body.auth_token).toBeTruthy();
            // Verify last_login was updated
            const userResult = await pool.query('SELECT last_login FROM users WHERE email = $1', ['login@example.com']);
            expect(userResult.rows[0].last_login).toBeTruthy();
        });
        it('should reject login with incorrect password', async () => {
            const response = await request(testApp)
                .post('/api/auth/login')
                .send({
                email: 'login@example.com',
                password: 'wrongpassword'
            });
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('AuthenticationError');
            expect(response.body.message).toContain('Invalid credentials');
        });
        it('should reject login with non-existent email', async () => {
            const response = await request(testApp)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });
            expect(response.status).toBe(401);
            expect(response.body.error).toBe('AuthenticationError');
        });
        it('should handle remember_me flag', async () => {
            const response = await request(testApp)
                .post('/api/auth/login')
                .send({
                email: 'login@example.com',
                password: 'password123',
                remember_me: true
            });
            expect(response.status).toBe(200);
            expect(response.body.auth_token).toBeTruthy();
            // Decode token to check expiration
            const decoded = jwt.decode(response.body.auth_token);
            expect(decoded).toBeTruthy();
        });
    });
    describe('POST /api/auth/logout', () => {
        beforeEach(async () => {
            // Create and login user
            const signupResponse = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'logout@example.com',
                password: 'password123',
                full_name: 'Logout Test'
            });
            authToken = signupResponse.body.auth_token;
        });
        it('should logout authenticated user', async () => {
            const response = await request(testApp)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('logged out');
        });
        it('should reject logout without token', async () => {
            const response = await request(testApp)
                .post('/api/auth/logout');
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/auth/password-reset/request', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'reset@example.com',
                password: 'password123',
                full_name: 'Reset Test'
            });
        });
        it('should send password reset request', async () => {
            const response = await request(testApp)
                .post('/api/auth/password-reset/request')
                .send({
                email: 'reset@example.com'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('reset link');
            // Verify token was created in database
            const tokenResult = await pool.query('SELECT * FROM password_reset_tokens WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', ['reset@example.com']);
            expect(tokenResult.rows.length).toBe(1);
            expect(tokenResult.rows[0].is_used).toBe(false);
        });
        it('should not reveal if email does not exist', async () => {
            const response = await request(testApp)
                .post('/api/auth/password-reset/request')
                .send({
                email: 'nonexistent@example.com'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('If an account exists');
        });
    });
    describe('POST /api/auth/password-reset/complete', () => {
        let resetToken;
        let userId;
        beforeEach(async () => {
            const signupResponse = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'resetcomplete@example.com',
                password: 'password123',
                full_name: 'Reset Complete Test'
            });
            userId = signupResponse.body.user.user_id;
            // Create reset token
            resetToken = 'test_reset_token_' + Date.now();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await pool.query(`INSERT INTO password_reset_tokens (token_id, user_id, reset_token, expires_at, is_used, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['token_test_001', userId, resetToken, expiresAt, false, new Date().toISOString()]);
        });
        it('should reset password with valid token', async () => {
            const response = await request(testApp)
                .post('/api/auth/password-reset/complete')
                .send({
                reset_token: resetToken,
                new_password: 'newpassword456'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('successfully reset');
            // Verify password was updated
            const userResult = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);
            expect(userResult.rows[0].password_hash).toBe('newpassword456');
            // Verify token was marked as used
            const tokenResult = await pool.query('SELECT is_used FROM password_reset_tokens WHERE reset_token = $1', [resetToken]);
            expect(tokenResult.rows[0].is_used).toBe(true);
        });
        it('should reject invalid token', async () => {
            const response = await request(testApp)
                .post('/api/auth/password-reset/complete')
                .send({
                reset_token: 'invalid_token',
                new_password: 'newpassword456'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('InvalidToken');
        });
        it('should reject expired token', async () => {
            // Create expired token
            const expiredToken = 'expired_token_' + Date.now();
            const expiredDate = new Date(Date.now() - 1000).toISOString();
            await pool.query(`INSERT INTO password_reset_tokens (token_id, user_id, reset_token, expires_at, is_used, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['token_expired', userId, expiredToken, expiredDate, false, new Date().toISOString()]);
            const response = await request(testApp)
                .post('/api/auth/password-reset/complete')
                .send({
                reset_token: expiredToken,
                new_password: 'newpassword456'
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('expired');
        });
        it('should reject already used token', async () => {
            // Mark token as used
            await pool.query('UPDATE password_reset_tokens SET is_used = true WHERE reset_token = $1', [resetToken]);
            const response = await request(testApp)
                .post('/api/auth/password-reset/complete')
                .send({
                reset_token: resetToken,
                new_password: 'newpassword456'
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('used');
        });
    });
});
describe('User Management Tests', () => {
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'user@example.com',
            password: 'password123',
            full_name: 'Test User'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    describe('GET /api/users/me', () => {
        it('should get current user profile', async () => {
            const response = await request(testApp)
                .get('/api/users/me')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.user_id).toBe(testUserId);
            expect(response.body.email).toBe('user@example.com');
            expect(response.body).not.toHaveProperty('password_hash');
        });
        it('should reject request without auth token', async () => {
            const response = await request(testApp)
                .get('/api/users/me');
            expect(response.status).toBe(401);
        });
        it('should reject request with invalid token', async () => {
            const response = await request(testApp)
                .get('/api/users/me')
                .set('Authorization', 'Bearer invalid_token');
            expect(response.status).toBe(401);
        });
    });
    describe('PATCH /api/users/me', () => {
        it('should update user profile successfully', async () => {
            const response = await request(testApp)
                .patch('/api/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                full_name: 'Updated Name',
                phone_number: '+1-555-9999'
            });
            expect(response.status).toBe(200);
            expect(response.body.full_name).toBe('Updated Name');
            expect(response.body.phone_number).toBe('+1-555-9999');
            // Verify database was updated
            const userResult = await pool.query('SELECT full_name, phone_number FROM users WHERE user_id = $1', [testUserId]);
            expect(userResult.rows[0].full_name).toBe('Updated Name');
        });
        it('should update notification preferences', async () => {
            const response = await request(testApp)
                .patch('/api/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                notification_preferences: {
                    order_updates_email: false,
                    order_updates_push: true,
                    promotions_email: false,
                    promotions_push: false,
                    weekly_picks_email: true,
                    weekly_picks_push: true,
                    new_restaurants_email: false,
                    new_restaurants_push: false,
                    review_responses_email: true,
                    review_responses_push: true
                }
            });
            expect(response.status).toBe(200);
            expect(response.body.notification_preferences.order_updates_email).toBe(false);
        });
        it('should reject update with duplicate email', async () => {
            // Create another user
            await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'other@example.com',
                password: 'password123',
                full_name: 'Other User'
            });
            const response = await request(testApp)
                .patch('/api/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                email: 'other@example.com'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
        });
    });
    describe('GET /api/users/me/statistics', () => {
        it('should get user statistics', async () => {
            const response = await request(testApp)
                .get('/api/users/me/statistics')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('stat_id');
            expect(response.body.user_id).toBe(testUserId);
            expect(response.body.total_reviews_written).toBe(0);
            expect(response.body.total_orders_placed).toBe(0);
            expect(response.body.unique_cuisines_tried).toEqual([]);
        });
    });
    describe('GET /api/users/me/reviews', () => {
        it('should get user reviews with pagination', async () => {
            const response = await request(testApp)
                .get('/api/users/me/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ limit: 10, offset: 0 });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('reviews');
            expect(response.body).toHaveProperty('total_count');
            expect(Array.isArray(response.body.reviews)).toBe(true);
        });
    });
});
describe('Restaurant Tests', () => {
    let restaurantId;
    beforeEach(async () => {
        // Create test restaurant
        const result = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        primary_hero_image_url, average_rating, total_review_count, total_order_count, 
        is_currently_open, accepts_delivery, accepts_pickup, delivery_fee, minimum_order_amount, 
        delivery_radius_miles, estimated_prep_time_minutes, estimated_delivery_time_minutes, 
        is_featured, is_active, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28) 
      RETURNING restaurant_id`, [
            'test_rest_001',
            'Test Restaurant',
            'A test restaurant',
            JSON.stringify(['Italian', 'Pizza']),
            2,
            '123 Test St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0001',
            'https://example.com/photo.jpg',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = result.rows[0].restaurant_id;
    });
    describe('GET /api/restaurants', () => {
        it('should get all restaurants with default pagination', async () => {
            const response = await request(testApp)
                .get('/api/restaurants');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('restaurants');
            expect(response.body).toHaveProperty('total_count');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(Array.isArray(response.body.restaurants)).toBe(true);
        });
        it('should filter restaurants by cuisine type', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ cuisine_types: 'Italian' });
            expect(response.status).toBe(200);
            expect(response.body.restaurants.length).toBeGreaterThan(0);
            response.body.restaurants.forEach((restaurant) => {
                expect(restaurant.cuisine_types).toContain('Italian');
            });
        });
        it('should filter restaurants by price range', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ price_min: 1, price_max: 2 });
            expect(response.status).toBe(200);
            response.body.restaurants.forEach((restaurant) => {
                expect(restaurant.price_range).toBeGreaterThanOrEqual(1);
                expect(restaurant.price_range).toBeLessThanOrEqual(2);
            });
        });
        it('should filter by minimum rating', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ rating_min: 4.0 });
            expect(response.status).toBe(200);
            response.body.restaurants.forEach((restaurant) => {
                expect(restaurant.average_rating).toBeGreaterThanOrEqual(4.0);
            });
        });
        it('should filter by open_now status', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ open_now: true });
            expect(response.status).toBe(200);
            response.body.restaurants.forEach((restaurant) => {
                expect(restaurant.is_currently_open).toBe(true);
            });
        });
        it('should support pagination', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ limit: 5, offset: 0 });
            expect(response.status).toBe(200);
            expect(response.body.restaurants.length).toBeLessThanOrEqual(5);
            expect(response.body.limit).toBe(5);
        });
        it('should sort by rating', async () => {
            const response = await request(testApp)
                .get('/api/restaurants')
                .query({ sort_by: 'rating' });
            expect(response.status).toBe(200);
            if (response.body.restaurants.length > 1) {
                const ratings = response.body.restaurants.map((r) => r.average_rating);
                expect(ratings[0]).toBeGreaterThanOrEqual(ratings[1]);
            }
        });
    });
    describe('GET /api/restaurants/:restaurant_id', () => {
        it('should get restaurant details', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}`);
            expect(response.status).toBe(200);
            expect(response.body.restaurant_id).toBe(restaurantId);
            expect(response.body.restaurant_name).toBe('Test Restaurant');
            expect(response.body.cuisine_types).toContain('Italian');
        });
        it('should return 404 for non-existent restaurant', async () => {
            const response = await request(testApp)
                .get('/api/restaurants/nonexistent_id');
            expect(response.status).toBe(404);
            expect(response.body.error).toBe('NotFound');
        });
    });
    describe('GET /api/restaurants/:restaurant_id/hours', () => {
        beforeEach(async () => {
            // Insert hours for test restaurant
            for (let day = 0; day < 7; day++) {
                await pool.query(`INSERT INTO restaurant_hours (hours_id, restaurant_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                    `hours_test_${day}`,
                    restaurantId,
                    day,
                    day === 1 ? null : '11:00',
                    day === 1 ? null : '22:00',
                    day === 1,
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
            }
        });
        it('should get restaurant hours for all days', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/hours`);
            expect(response.status).toBe(200);
            expect(response.body.hours).toHaveLength(7);
            expect(response.body.hours[0].day_of_week).toBe(0);
            expect(response.body.hours[1].is_closed).toBe(true);
        });
    });
    describe('GET /api/restaurants/:restaurant_id/menu', () => {
        let categoryId;
        let menuItemId;
        beforeEach(async () => {
            // Create menu category
            const catResult = await pool.query(`INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING category_id`, ['cat_test_001', restaurantId, 'Appetizers', 0, new Date().toISOString(), new Date().toISOString()]);
            categoryId = catResult.rows[0].category_id;
            // Create menu item
            const itemResult = await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
          base_price, item_photo_url, dietary_preferences, allergen_info, spice_level, is_popular, 
          is_available, display_order, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING menu_item_id`, [
                'item_test_001',
                restaurantId,
                categoryId,
                'Test Appetizer',
                'Delicious test item',
                9.99,
                'https://example.com/item.jpg',
                JSON.stringify(['Vegetarian']),
                JSON.stringify(['Gluten']),
                0,
                true,
                true,
                0,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            menuItemId = itemResult.rows[0].menu_item_id;
        });
        it('should get complete menu with categories and items', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/menu`);
            expect(response.status).toBe(200);
            expect(response.body.categories).toHaveLength(1);
            expect(response.body.categories[0].category.category_name).toBe('Appetizers');
            expect(response.body.categories[0].items).toHaveLength(1);
            expect(response.body.categories[0].items[0].item_name).toBe('Test Appetizer');
        });
    });
    describe('GET /api/restaurants/:restaurant_id/menu/items/:menu_item_id', () => {
        let categoryId;
        let menuItemId;
        beforeEach(async () => {
            const catResult = await pool.query(`INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING category_id`, ['cat_test_002', restaurantId, 'Mains', 0, new Date().toISOString(), new Date().toISOString()]);
            categoryId = catResult.rows[0].category_id;
            const itemResult = await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
          base_price, dietary_preferences, allergen_info, spice_level, is_popular, is_available, 
          display_order, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING menu_item_id`, [
                'item_test_002',
                restaurantId,
                categoryId,
                'Test Pizza',
                'Delicious pizza',
                14.99,
                JSON.stringify(['Vegetarian']),
                JSON.stringify(['Gluten', 'Dairy']),
                0,
                true,
                true,
                0,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            menuItemId = itemResult.rows[0].menu_item_id;
            // Add sizes
            await pool.query(`INSERT INTO menu_item_sizes (size_id, menu_item_id, size_name, price_adjustment, display_order, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['size_test_001', menuItemId, 'Small', 0, 0, new Date().toISOString()]);
            await pool.query(`INSERT INTO menu_item_sizes (size_id, menu_item_id, size_name, price_adjustment, display_order, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['size_test_002', menuItemId, 'Large', 5.00, 1, new Date().toISOString()]);
            // Add addons
            await pool.query(`INSERT INTO menu_item_addons (addon_id, menu_item_id, addon_name, addon_price, display_order, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['addon_test_001', menuItemId, 'Extra Cheese', 2.00, 0, new Date().toISOString()]);
        });
        it('should get menu item with sizes and addons', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/menu/items/${menuItemId}`);
            expect(response.status).toBe(200);
            expect(response.body.menu_item.menu_item_id).toBe(menuItemId);
            expect(response.body.sizes).toHaveLength(2);
            expect(response.body.addons).toHaveLength(1);
            expect(response.body.sizes[0].size_name).toBe('Small');
            expect(response.body.addons[0].addon_name).toBe('Extra Cheese');
        });
    });
});
describe('Favorites Tests', () => {
    let restaurantId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'favorites@example.com',
            password: 'password123',
            full_name: 'Favorites Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create test restaurant
        const result = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_fav_001',
            'Favorite Restaurant',
            'Test restaurant',
            JSON.stringify(['Italian']),
            2,
            '456 Fav St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0002',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = result.rows[0].restaurant_id;
    });
    describe('POST /api/favorites', () => {
        it('should add restaurant to favorites', async () => {
            const response = await request(testApp)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId
            });
            expect(response.status).toBe(201);
            expect(response.body.restaurant_id).toBe(restaurantId);
            expect(response.body.user_id).toBe(testUserId);
            // Verify in database
            const favResult = await pool.query('SELECT * FROM favorites WHERE user_id = $1 AND restaurant_id = $2', [testUserId, restaurantId]);
            expect(favResult.rows.length).toBe(1);
            // Verify statistics updated
            const statsResult = await pool.query('SELECT total_favorites_saved FROM user_statistics WHERE user_id = $1', [testUserId]);
            expect(statsResult.rows[0].total_favorites_saved).toBe(1);
        });
        it('should reject duplicate favorite', async () => {
            // Add favorite first time
            await request(testApp)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ restaurant_id: restaurantId });
            // Try to add again
            const response = await request(testApp)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ restaurant_id: restaurantId });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('DuplicateError');
        });
    });
    describe('GET /api/favorites', () => {
        beforeEach(async () => {
            // Add favorite
            await pool.query(`INSERT INTO favorites (favorite_id, user_id, restaurant_id, created_at) 
        VALUES ($1, $2, $3, $4)`, ['fav_test_001', testUserId, restaurantId, new Date().toISOString()]);
        });
        it('should get user favorites with restaurant details', async () => {
            const response = await request(testApp)
                .get('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.favorites).toHaveLength(1);
            expect(response.body.favorites[0].restaurant.restaurant_id).toBe(restaurantId);
            expect(response.body.total_count).toBe(1);
        });
    });
    describe('DELETE /api/favorites/:restaurant_id', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO favorites (favorite_id, user_id, restaurant_id, created_at) 
        VALUES ($1, $2, $3, $4)`, ['fav_test_002', testUserId, restaurantId, new Date().toISOString()]);
            await pool.query('UPDATE user_statistics SET total_favorites_saved = 1 WHERE user_id = $1', [testUserId]);
        });
        it('should remove restaurant from favorites', async () => {
            const response = await request(testApp)
                .delete(`/api/favorites/${restaurantId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('removed');
            // Verify deleted from database
            const favResult = await pool.query('SELECT * FROM favorites WHERE user_id = $1 AND restaurant_id = $2', [testUserId, restaurantId]);
            expect(favResult.rows.length).toBe(0);
            // Verify statistics updated
            const statsResult = await pool.query('SELECT total_favorites_saved FROM user_statistics WHERE user_id = $1', [testUserId]);
            expect(statsResult.rows[0].total_favorites_saved).toBe(0);
        });
    });
});
describe('Cart Tests', () => {
    let restaurantId;
    let menuItemId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'cart@example.com',
            password: 'password123',
            full_name: 'Cart Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_cart_001',
            'Cart Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '789 Cart St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0003',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create category
        const catResult = await pool.query(`INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING category_id`, ['cat_test_cart', restaurantId, 'Pizza', 0, new Date().toISOString(), new Date().toISOString()]);
        // Create menu item
        const itemResult = await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
        base_price, dietary_preferences, allergen_info, is_popular, is_available, display_order, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING menu_item_id`, [
            'item_test_cart',
            restaurantId,
            catResult.rows[0].category_id,
            'Test Pizza',
            'Delicious pizza',
            12.99,
            JSON.stringify([]),
            JSON.stringify([]),
            true,
            true,
            0,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        menuItemId = itemResult.rows[0].menu_item_id;
    });
    describe('POST /api/cart/items', () => {
        it('should add item to cart', async () => {
            const response = await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 2,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: 'Extra crispy'
            });
            expect(response.status).toBe(201);
            expect(response.body.restaurant_id).toBe(restaurantId);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.items[0].quantity).toBe(2);
            expect(response.body.items[0].special_instructions).toBe('Extra crispy');
            expect(response.body.subtotal).toBeGreaterThan(0);
        });
        it('should calculate correct totals', async () => {
            const response = await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
            expect(response.status).toBe(201);
            expect(response.body.subtotal).toBe(12.99);
            expect(response.body.tax).toBeGreaterThan(0);
            expect(response.body.grand_total).toBeGreaterThan(response.body.subtotal);
        });
    });
    describe('GET /api/cart', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
        });
        it('should get current cart', async () => {
            const response = await request(testApp)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(1);
            expect(response.body.restaurant_id).toBe(restaurantId);
        });
    });
    describe('PATCH /api/cart/items/:menu_item_id', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
        });
        it('should update cart item quantity', async () => {
            const response = await request(testApp)
                .patch(`/api/cart/items/${menuItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                quantity: 3
            });
            expect(response.status).toBe(200);
            expect(response.body.items[0].quantity).toBe(3);
        });
        it('should update cart item special instructions', async () => {
            const response = await request(testApp)
                .patch(`/api/cart/items/${menuItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                special_instructions: 'No onions please'
            });
            expect(response.status).toBe(200);
            expect(response.body.items[0].special_instructions).toBe('No onions please');
        });
    });
    describe('DELETE /api/cart/items/:menu_item_id', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
        });
        it('should remove item from cart', async () => {
            const response = await request(testApp)
                .delete(`/api/cart/items/${menuItemId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.items).toHaveLength(0);
            expect(response.body.subtotal).toBe(0);
        });
    });
    describe('DELETE /api/cart', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: menuItemId,
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
        });
        it('should clear entire cart', async () => {
            const response = await request(testApp)
                .delete('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('cleared');
        });
    });
});
describe('Order Tests', () => {
    let restaurantId;
    let menuItemId;
    let paymentMethodId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'order@example.com',
            password: 'password123',
            full_name: 'Order Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_order_001',
            'Order Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '123 Order St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0004',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create category and menu item
        const catResult = await pool.query(`INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING category_id`, ['cat_test_order', restaurantId, 'Pizza', 0, new Date().toISOString(), new Date().toISOString()]);
        const itemResult = await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
        base_price, dietary_preferences, allergen_info, is_popular, is_available, display_order, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING menu_item_id`, [
            'item_test_order',
            restaurantId,
            catResult.rows[0].category_id,
            'Test Pizza',
            'Delicious',
            15.99,
            JSON.stringify([]),
            JSON.stringify([]),
            true,
            true,
            0,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        menuItemId = itemResult.rows[0].menu_item_id;
        // Create payment method
        const pmResult = await pool.query(`INSERT INTO saved_payment_methods (payment_method_id, user_id, payment_label, card_type, 
        last_four_digits, expiration_month, expiration_year, billing_zip_code, is_default, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING payment_method_id`, [
            'pm_test_001',
            testUserId,
            'Test Card',
            'Visa',
            '4242',
            '12',
            '2025',
            '97201',
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        paymentMethodId = pmResult.rows[0].payment_method_id;
        // Add item to cart
        await request(testApp)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            menu_item_id: menuItemId,
            quantity: 2,
            selected_size: null,
            selected_addons: [],
            selected_modifications: [],
            special_instructions: null
        });
    });
    describe('POST /api/orders', () => {
        it('should create delivery order successfully', async () => {
            const response = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'delivery',
                delivery_street_address: '123 Test St',
                delivery_apartment_suite: 'Apt 1',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                special_instructions: 'Ring doorbell',
                payment_method_id: paymentMethodId,
                tip: 5.00
            });
            expect(response.status).toBe(201);
            expect(response.body.order.order_type).toBe('delivery');
            expect(response.body.order.order_status).toBe('order_received');
            expect(response.body.order.grand_total).toBeGreaterThan(0);
            expect(response.body.items).toHaveLength(1);
            // Verify order in database
            const orderResult = await pool.query('SELECT * FROM orders WHERE order_id = $1', [response.body.order.order_id]);
            expect(orderResult.rows.length).toBe(1);
            // Verify order items in database
            const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [response.body.order.order_id]);
            expect(itemsResult.rows.length).toBe(1);
            // Verify statistics updated
            const statsResult = await pool.query('SELECT total_orders_placed FROM user_statistics WHERE user_id = $1', [testUserId]);
            expect(statsResult.rows[0].total_orders_placed).toBe(1);
        });
        it('should create pickup order successfully', async () => {
            const response = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'pickup',
                payment_method_id: paymentMethodId,
                tip: 0
            });
            expect(response.status).toBe(201);
            expect(response.body.order.order_type).toBe('pickup');
            expect(response.body.order.delivery_fee).toBe(0);
            expect(response.body.order.delivery_street_address).toBeNull();
        });
        it('should reject order without cart items', async () => {
            // Clear cart first
            await request(testApp)
                .delete('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            const response = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'delivery',
                delivery_street_address: '123 Test St',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                payment_method_id: paymentMethodId,
                tip: 5.00
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('empty');
        });
    });
    describe('GET /api/orders', () => {
        let orderId;
        beforeEach(async () => {
            const orderResponse = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'delivery',
                delivery_street_address: '123 Test St',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                payment_method_id: paymentMethodId,
                tip: 5.00
            });
            orderId = orderResponse.body.order.order_id;
        });
        it('should get user order history', async () => {
            const response = await request(testApp)
                .get('/api/orders')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.orders).toHaveLength(1);
            expect(response.body.orders[0].order.order_id).toBe(orderId);
            expect(response.body.total_count).toBe(1);
        });
        it('should filter orders by order_type', async () => {
            const response = await request(testApp)
                .get('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ order_type: 'delivery' });
            expect(response.status).toBe(200);
            response.body.orders.forEach((order) => {
                expect(order.order.order_type).toBe('delivery');
            });
        });
        it('should filter orders by order_status', async () => {
            const response = await request(testApp)
                .get('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ order_status: 'order_received' });
            expect(response.status).toBe(200);
            response.body.orders.forEach((order) => {
                expect(order.order.order_status).toBe('order_received');
            });
        });
    });
    describe('GET /api/orders/:order_id', () => {
        let orderId;
        beforeEach(async () => {
            const orderResponse = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'pickup',
                payment_method_id: paymentMethodId,
                tip: 0
            });
            orderId = orderResponse.body.order.order_id;
        });
        it('should get order details', async () => {
            const response = await request(testApp)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.order.order_id).toBe(orderId);
            expect(response.body.items).toBeDefined();
            expect(response.body.restaurant).toBeDefined();
        });
        it('should reject access to other user order', async () => {
            // Create another user
            const otherUserResponse = await request(testApp)
                .post('/api/auth/signup')
                .send({
                email: 'other@example.com',
                password: 'password123',
                full_name: 'Other User'
            });
            const response = await request(testApp)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${otherUserResponse.body.auth_token}`);
            expect(response.status).toBe(404);
        });
    });
    describe('PATCH /api/orders/:order_id', () => {
        let orderId;
        beforeEach(async () => {
            const orderResponse = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'delivery',
                delivery_street_address: '123 Test St',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                payment_method_id: paymentMethodId,
                tip: 5.00
            });
            orderId = orderResponse.body.order.order_id;
        });
        it('should update order tip', async () => {
            const response = await request(testApp)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                tip: 8.00
            });
            expect(response.status).toBe(200);
            expect(response.body.order.tip).toBe(8.00);
        });
        it('should update special instructions', async () => {
            const response = await request(testApp)
                .patch(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                special_instructions: 'Updated instructions'
            });
            expect(response.status).toBe(200);
            expect(response.body.order.special_instructions).toBe('Updated instructions');
        });
    });
    describe('DELETE /api/orders/:order_id', () => {
        let orderId;
        beforeEach(async () => {
            const orderResponse = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_type: 'delivery',
                delivery_street_address: '123 Test St',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                payment_method_id: paymentMethodId,
                tip: 5.00
            });
            orderId = orderResponse.body.order.order_id;
        });
        it('should cancel order when in order_received status', async () => {
            const response = await request(testApp)
                .delete(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                cancellation_reason: 'Changed my mind'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('cancelled');
            // Verify order status updated
            const orderResult = await pool.query('SELECT order_status, cancelled_at, cancellation_reason FROM orders WHERE order_id = $1', [orderId]);
            expect(orderResult.rows[0].order_status).toBe('cancelled');
            expect(orderResult.rows[0].cancellation_reason).toBe('Changed my mind');
        });
        it('should reject cancellation of delivered order', async () => {
            // Update order to delivered
            await pool.query('UPDATE orders SET order_status = $1 WHERE order_id = $2', ['delivered', orderId]);
            const response = await request(testApp)
                .delete(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('CancellationError');
        });
    });
});
describe('Review Tests', () => {
    let restaurantId;
    let orderId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'review@example.com',
            password: 'password123',
            full_name: 'Review Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_review_001',
            'Review Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '456 Review St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0005',
            0,
            0,
            0,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create mock order
        const orderResult = await pool.query(`INSERT INTO orders (order_id, user_id, restaurant_id, order_type, order_status, 
        subtotal, discount_amount, delivery_fee, tax, tip, grand_total, payment_status, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING order_id`, [
            'order_test_review',
            testUserId,
            restaurantId,
            'delivery',
            'delivered',
            30.00,
            0,
            4.99,
            3.00,
            5.00,
            42.99,
            'completed',
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        orderId = orderResult.rows[0].order_id;
    });
    describe('POST /api/reviews', () => {
        it('should create review successfully', async () => {
            const response = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_id: orderId,
                star_rating: 5,
                review_title: 'Great food!',
                review_text: 'The food was absolutely amazing and the service was excellent.',
                is_verified_visit: true
            });
            expect(response.status).toBe(201);
            expect(response.body.star_rating).toBe(5);
            expect(response.body.review_title).toBe('Great food!');
            expect(response.body.is_verified_visit).toBe(true);
            // Verify restaurant rating updated
            const restResult = await pool.query('SELECT average_rating, total_review_count FROM restaurants WHERE restaurant_id = $1', [restaurantId]);
            expect(restResult.rows[0].total_review_count).toBe(1);
            expect(restResult.rows[0].average_rating).toBe(5);
        });
        it('should reject review with invalid star rating', async () => {
            const response = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                star_rating: 6,
                review_text: 'Test review'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
        });
        it('should reject review with short text', async () => {
            const response = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                star_rating: 5,
                review_text: 'Short'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('ValidationError');
        });
    });
    describe('PATCH /api/reviews/:review_id', () => {
        let reviewId;
        beforeEach(async () => {
            const reviewResponse = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                order_id: orderId,
                star_rating: 4,
                review_text: 'Original review text here'
            });
            reviewId = reviewResponse.body.review_id;
        });
        it('should update review successfully', async () => {
            const response = await request(testApp)
                .patch(`/api/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                star_rating: 5,
                review_text: 'Updated review text with more details'
            });
            expect(response.status).toBe(200);
            expect(response.body.star_rating).toBe(5);
            expect(response.body.review_text).toContain('Updated');
            expect(response.body.is_edited).toBe(true);
            expect(response.body.edited_at).toBeTruthy();
        });
    });
    describe('DELETE /api/reviews/:review_id', () => {
        let reviewId;
        beforeEach(async () => {
            const reviewResponse = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                star_rating: 5,
                review_text: 'Review to be deleted'
            });
            reviewId = reviewResponse.body.review_id;
        });
        it('should delete review successfully', async () => {
            const response = await request(testApp)
                .delete(`/api/reviews/${reviewId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('deleted');
            // Verify review deleted from database
            const reviewResult = await pool.query('SELECT * FROM reviews WHERE review_id = $1', [reviewId]);
            expect(reviewResult.rows.length).toBe(0);
            // Verify restaurant stats updated
            const restResult = await pool.query('SELECT total_review_count FROM restaurants WHERE restaurant_id = $1', [restaurantId]);
            expect(restResult.rows[0].total_review_count).toBe(0);
        });
    });
    describe('GET /api/restaurants/:restaurant_id/reviews', () => {
        beforeEach(async () => {
            // Create multiple reviews
            await pool.query(`INSERT INTO reviews (review_id, user_id, restaurant_id, star_rating, review_text, 
          is_verified_visit, helpful_count, is_edited, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                'review_test_001',
                testUserId,
                restaurantId,
                5,
                'Excellent food and service',
                true,
                5,
                false,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            await pool.query(`INSERT INTO reviews (review_id, user_id, restaurant_id, star_rating, review_text, 
          is_verified_visit, helpful_count, is_edited, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                'review_test_002',
                testUserId,
                restaurantId,
                3,
                'Average experience, nothing special',
                false,
                2,
                false,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
        });
        it('should get all reviews for restaurant', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/reviews`);
            expect(response.status).toBe(200);
            expect(response.body.reviews.length).toBeGreaterThanOrEqual(2);
            expect(response.body).toHaveProperty('average_rating');
            expect(response.body).toHaveProperty('rating_distribution');
        });
        it('should filter reviews by minimum rating', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/reviews`)
                .query({ min_rating: 4 });
            expect(response.status).toBe(200);
            response.body.reviews.forEach((review) => {
                expect(review.review.star_rating).toBeGreaterThanOrEqual(4);
            });
        });
        it('should sort reviews by helpful_count', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/reviews`)
                .query({ sort_by: 'helpful_count', sort_order: 'desc' });
            expect(response.status).toBe(200);
            if (response.body.reviews.length > 1) {
                expect(response.body.reviews[0].review.helpful_count)
                    .toBeGreaterThanOrEqual(response.body.reviews[1].review.helpful_count);
            }
        });
    });
    describe('POST /api/reviews/:review_id/helpful', () => {
        let reviewId;
        beforeEach(async () => {
            const reviewResult = await pool.query(`INSERT INTO reviews (review_id, user_id, restaurant_id, star_rating, review_text, 
          is_verified_visit, helpful_count, is_edited, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING review_id`, [
                'review_helpful_test',
                testUserId,
                restaurantId,
                5,
                'Great review for helpful test',
                true,
                0,
                false,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            reviewId = reviewResult.rows[0].review_id;
        });
        it('should mark review as helpful', async () => {
            const response = await request(testApp)
                .post(`/api/reviews/${reviewId}/helpful`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify helpful mark created
            const markResult = await pool.query('SELECT * FROM review_helpful_marks WHERE review_id = $1 AND user_id = $2', [reviewId, testUserId]);
            expect(markResult.rows.length).toBe(1);
            // Verify helpful_count incremented
            const reviewResult = await pool.query('SELECT helpful_count FROM reviews WHERE review_id = $1', [reviewId]);
            expect(reviewResult.rows[0].helpful_count).toBe(1);
        });
    });
    describe('POST /api/reviews/:review_id/report', () => {
        let reviewId;
        beforeEach(async () => {
            const reviewResult = await pool.query(`INSERT INTO reviews (review_id, user_id, restaurant_id, star_rating, review_text, 
          is_verified_visit, helpful_count, is_edited, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING review_id`, [
                'review_report_test',
                testUserId,
                restaurantId,
                1,
                'Inappropriate review content',
                false,
                0,
                false,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            reviewId = reviewResult.rows[0].review_id;
        });
        it('should report review successfully', async () => {
            const response = await request(testApp)
                .post(`/api/reviews/${reviewId}/report`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                reason: 'spam',
                additional_details: 'This looks like a fake review'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('reported');
            // Verify report created
            const reportResult = await pool.query('SELECT * FROM review_reports WHERE review_id = $1', [reviewId]);
            expect(reportResult.rows.length).toBe(1);
            expect(reportResult.rows[0].reason).toBe('spam');
        });
    });
});
describe('Discount Tests', () => {
    let restaurantId;
    let discountId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'discount@example.com',
            password: 'password123',
            full_name: 'Discount Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_disc_001',
            'Discount Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '789 Disc St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0006',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create discount
        const discResult = await pool.query(`INSERT INTO discounts (discount_id, restaurant_id, discount_type, discount_value, 
        coupon_code, description, terms_conditions, minimum_order_amount, excluded_items, 
        valid_days, is_one_time_use, max_redemptions_per_user, total_redemption_limit, 
        current_redemption_count, is_active, start_date, end_date, is_local_picks_exclusive, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
      RETURNING discount_id`, [
            'disc_test_001',
            restaurantId,
            'percentage',
            20,
            'TEST20',
            '20% off your order',
            'Minimum $15 order',
            15.00,
            JSON.stringify([]),
            JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
            false,
            3,
            null,
            0,
            true,
            '2024-01-01',
            '2024-12-31',
            false,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        discountId = discResult.rows[0].discount_id;
    });
    describe('GET /api/restaurants/:restaurant_id/discounts', () => {
        it('should get active discounts for restaurant', async () => {
            const response = await request(testApp)
                .get(`/api/restaurants/${restaurantId}/discounts`);
            expect(response.status).toBe(200);
            expect(response.body.discounts).toHaveLength(1);
            expect(response.body.discounts[0].coupon_code).toBe('TEST20');
            expect(response.body.discounts[0].discount_value).toBe(20);
        });
    });
    describe('POST /api/discounts/:discount_id/redeem', () => {
        it('should redeem discount successfully', async () => {
            const response = await request(testApp)
                .post(`/api/discounts/${discountId}/redeem`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                redemption_method: 'coupon_code'
            });
            expect(response.status).toBe(200);
            expect(response.body.message).toContain('redeemed');
            // Verify redemption record created
            const redemptionResult = await pool.query('SELECT * FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2', [discountId, testUserId]);
            expect(redemptionResult.rows.length).toBe(1);
            // Verify redemption count incremented
            const discResult = await pool.query('SELECT current_redemption_count FROM discounts WHERE discount_id = $1', [discountId]);
            expect(discResult.rows[0].current_redemption_count).toBe(1);
        });
        it('should enforce max redemptions per user', async () => {
            // Redeem 3 times (max_redemptions_per_user = 3)
            for (let i = 0; i < 3; i++) {
                await pool.query(`INSERT INTO discount_redemptions (redemption_id, discount_id, user_id, redemption_method, 
            discount_amount_applied, redeemed_at) 
          VALUES ($1, $2, $3, $4, $5, $6)`, [`redeem_test_${i}`, discountId, testUserId, 'coupon_code', 5.00, new Date().toISOString()]);
            }
            const response = await request(testApp)
                .post(`/api/discounts/${discountId}/redeem`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                redemption_method: 'coupon_code'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('RedemptionError');
            expect(response.body.message).toContain('already redeemed');
        });
    });
    describe('GET /api/discounts/:discount_id/qr-code', () => {
        it('should generate QR code for discount', async () => {
            const response = await request(testApp)
                .get(`/api/discounts/${discountId}/qr-code`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('qr_code_data');
            expect(response.body).toHaveProperty('alphanumeric_code');
            expect(response.body.discount.discount_id).toBe(discountId);
        });
    });
});
describe('Discount Cart Application Tests', () => {
    let restaurantId;
    let menuItemId;
    let discountId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'cartdisc@example.com',
            password: 'password123',
            full_name: 'Cart Discount Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_cartdisc',
            'Cart Disc Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '321 CartDisc St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0007',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create menu item
        const catResult = await pool.query(`INSERT INTO menu_categories (category_id, restaurant_id, category_name, display_order, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING category_id`, ['cat_cartdisc', restaurantId, 'Main', 0, new Date().toISOString(), new Date().toISOString()]);
        const itemResult = await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
        base_price, dietary_preferences, allergen_info, is_popular, is_available, display_order, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING menu_item_id`, [
            'item_cartdisc',
            restaurantId,
            catResult.rows[0].category_id,
            'Test Item',
            'Test',
            20.00,
            JSON.stringify([]),
            JSON.stringify([]),
            true,
            true,
            0,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        menuItemId = itemResult.rows[0].menu_item_id;
        // Create discount
        const discResult = await pool.query(`INSERT INTO discounts (discount_id, restaurant_id, discount_type, discount_value, 
        coupon_code, description, terms_conditions, minimum_order_amount, excluded_items, 
        valid_days, is_one_time_use, max_redemptions_per_user, total_redemption_limit, 
        current_redemption_count, is_active, start_date, end_date, is_local_picks_exclusive, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
      RETURNING discount_id`, [
            'disc_cart_test',
            restaurantId,
            'percentage',
            15,
            'CART15',
            '15% off',
            'Test',
            10.00,
            JSON.stringify([]),
            JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
            false,
            5,
            null,
            0,
            true,
            '2024-01-01',
            '2024-12-31',
            false,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        discountId = discResult.rows[0].discount_id;
        // Add item to cart
        await request(testApp)
            .post('/api/cart/items')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            menu_item_id: menuItemId,
            quantity: 1,
            selected_size: null,
            selected_addons: [],
            selected_modifications: [],
            special_instructions: null
        });
    });
    describe('POST /api/cart/discount', () => {
        it('should apply discount to cart', async () => {
            const response = await request(testApp)
                .post('/api/cart/discount')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                coupon_code: 'CART15'
            });
            expect(response.status).toBe(200);
            expect(response.body.applied_discount).toBeTruthy();
            expect(response.body.applied_discount.code).toBe('CART15');
            expect(response.body.applied_discount.discount_amount).toBeGreaterThan(0);
            expect(response.body.grand_total).toBeLessThan(response.body.subtotal + response.body.delivery_fee + response.body.tax);
        });
        it('should reject invalid coupon code', async () => {
            const response = await request(testApp)
                .post('/api/cart/discount')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                coupon_code: 'INVALID'
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('InvalidCoupon');
        });
        it('should reject coupon when minimum not met', async () => {
            // Clear cart and add cheaper item
            await request(testApp).delete('/api/cart').set('Authorization', `Bearer ${authToken}`);
            // Create cheaper item
            const catResult = await pool.query('SELECT category_id FROM menu_categories WHERE restaurant_id = $1 LIMIT 1', [restaurantId]);
            await pool.query(`INSERT INTO menu_items (menu_item_id, restaurant_id, category_id, item_name, description, 
          base_price, dietary_preferences, allergen_info, is_popular, is_available, display_order, 
          created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                'item_cheap',
                restaurantId,
                catResult.rows[0].category_id,
                'Cheap Item',
                'Test',
                5.00,
                JSON.stringify([]),
                JSON.stringify([]),
                false,
                true,
                0,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                menu_item_id: 'item_cheap',
                quantity: 1,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: null
            });
            const response = await request(testApp)
                .post('/api/cart/discount')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                coupon_code: 'CART15'
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Minimum');
        });
    });
    describe('DELETE /api/cart/discount', () => {
        beforeEach(async () => {
            await request(testApp)
                .post('/api/cart/discount')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                coupon_code: 'CART15'
            });
        });
        it('should remove discount from cart', async () => {
            const response = await request(testApp)
                .delete('/api/cart/discount')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.applied_discount).toBeNull();
        });
    });
});
describe('Badge Tests', () => {
    let badgeId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'badge@example.com',
            password: 'password123',
            full_name: 'Badge Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create badge
        const badgeResult = await pool.query(`INSERT INTO badges (badge_id, badge_name, badge_description, badge_icon_url, 
        criteria_type, criteria_value, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING badge_id`, [
            'badge_test_001',
            'Test Badge',
            'Badge for testing',
            'https://example.com/badge.png',
            'reviews_written',
            5,
            new Date().toISOString()
        ]);
        badgeId = badgeResult.rows[0].badge_id;
    });
    describe('GET /api/badges', () => {
        it('should get all available badges', async () => {
            const response = await request(testApp)
                .get('/api/badges');
            expect(response.status).toBe(200);
            expect(response.body.badges.length).toBeGreaterThan(0);
            expect(response.body.badges[0]).toHaveProperty('badge_name');
            expect(response.body.badges[0]).toHaveProperty('criteria_type');
        });
    });
    describe('GET /api/users/me/badges', () => {
        it('should get user badges with progress', async () => {
            const response = await request(testApp)
                .get('/api/users/me/badges')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('earned_badges');
            expect(response.body).toHaveProperty('locked_badges');
            expect(Array.isArray(response.body.earned_badges)).toBe(true);
            expect(Array.isArray(response.body.locked_badges)).toBe(true);
        });
    });
});
describe('Notification Tests', () => {
    let notificationId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'notif@example.com',
            password: 'password123',
            full_name: 'Notification Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create notification
        const notifResult = await pool.query(`INSERT INTO notifications (notification_id, user_id, notification_type, message, 
        action_url, is_read, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING notification_id`, [
            'notif_test_001',
            testUserId,
            'order_update',
            'Your order is ready',
            '/orders/123',
            false,
            new Date().toISOString()
        ]);
        notificationId = notifResult.rows[0].notification_id;
    });
    describe('GET /api/notifications', () => {
        it('should get user notifications', async () => {
            const response = await request(testApp)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.notifications).toHaveLength(1);
            expect(response.body.unread_count).toBe(1);
        });
        it('should filter notifications by type', async () => {
            const response = await request(testApp)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ notification_type: 'order_update' });
            expect(response.status).toBe(200);
            response.body.notifications.forEach((notif) => {
                expect(notif.notification_type).toBe('order_update');
            });
        });
        it('should filter by read status', async () => {
            const response = await request(testApp)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ is_read: false });
            expect(response.status).toBe(200);
            response.body.notifications.forEach((notif) => {
                expect(notif.is_read).toBe(false);
            });
        });
    });
    describe('PATCH /api/notifications/:notification_id/read', () => {
        it('should mark notification as read', async () => {
            const response = await request(testApp)
                .patch(`/api/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify in database
            const notifResult = await pool.query('SELECT is_read, read_at FROM notifications WHERE notification_id = $1', [notificationId]);
            expect(notifResult.rows[0].is_read).toBe(true);
            expect(notifResult.rows[0].read_at).toBeTruthy();
        });
    });
    describe('PATCH /api/notifications/read-all', () => {
        beforeEach(async () => {
            // Create more unread notifications
            await pool.query(`INSERT INTO notifications (notification_id, user_id, notification_type, message, 
          is_read, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6)`, ['notif_test_002', testUserId, 'promotion', 'New deal!', false, new Date().toISOString()]);
        });
        it('should mark all notifications as read', async () => {
            const response = await request(testApp)
                .patch('/api/notifications/read-all')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify all marked as read
            const notifResult = await pool.query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false', [testUserId]);
            expect(parseInt(notifResult.rows[0].unread_count)).toBe(0);
        });
    });
    describe('DELETE /api/notifications/:notification_id', () => {
        it('should delete notification', async () => {
            const response = await request(testApp)
                .delete(`/api/notifications/${notificationId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify deleted
            const notifResult = await pool.query('SELECT * FROM notifications WHERE notification_id = $1', [notificationId]);
            expect(notifResult.rows.length).toBe(0);
        });
    });
});
describe('Address Management Tests', () => {
    let addressId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'address@example.com',
            password: 'password123',
            full_name: 'Address Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    describe('POST /api/addresses', () => {
        it('should create new address', async () => {
            const response = await request(testApp)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                address_label: 'Home',
                street_address: '123 Main St',
                apartment_suite: 'Apt 1',
                city: 'Portland',
                state: 'OR',
                zip_code: '97201',
                is_default: true
            });
            expect(response.status).toBe(201);
            expect(response.body.address_label).toBe('Home');
            expect(response.body.is_default).toBe(true);
            expect(response.body.user_id).toBe(testUserId);
        });
        it('should unset other defaults when creating default address', async () => {
            // Create first default address
            await request(testApp)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                address_label: 'Home',
                street_address: '123 First St',
                city: 'Portland',
                state: 'OR',
                zip_code: '97201',
                is_default: true
            });
            // Create second default address
            const response = await request(testApp)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                address_label: 'Work',
                street_address: '456 Second St',
                city: 'Portland',
                state: 'OR',
                zip_code: '97202',
                is_default: true
            });
            expect(response.status).toBe(201);
            // Verify only one default
            const addressResult = await pool.query('SELECT COUNT(*) as count FROM saved_addresses WHERE user_id = $1 AND is_default = true', [testUserId]);
            expect(parseInt(addressResult.rows[0].count)).toBe(1);
        });
    });
    describe('GET /api/addresses', () => {
        beforeEach(async () => {
            const addrResult = await pool.query(`INSERT INTO saved_addresses (address_id, user_id, address_label, street_address, 
          city, state, zip_code, is_default, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING address_id`, [
                'addr_test_001',
                testUserId,
                'Home',
                '123 Test St',
                'Portland',
                'OR',
                '97201',
                true,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            addressId = addrResult.rows[0].address_id;
        });
        it('should get all user addresses', async () => {
            const response = await request(testApp)
                .get('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.addresses).toHaveLength(1);
            expect(response.body.addresses[0].address_id).toBe(addressId);
        });
    });
    describe('DELETE /api/addresses/:address_id', () => {
        beforeEach(async () => {
            const addrResult = await pool.query(`INSERT INTO saved_addresses (address_id, user_id, address_label, street_address, 
          city, state, zip_code, is_default, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING address_id`, [
                'addr_test_del',
                testUserId,
                'Home',
                '123 Test St',
                'Portland',
                'OR',
                '97201',
                false,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            addressId = addrResult.rows[0].address_id;
        });
        it('should delete address', async () => {
            const response = await request(testApp)
                .delete(`/api/addresses/${addressId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify deleted
            const addrResult = await pool.query('SELECT * FROM saved_addresses WHERE address_id = $1', [addressId]);
            expect(addrResult.rows.length).toBe(0);
        });
    });
});
describe('Payment Method Tests', () => {
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'payment@example.com',
            password: 'password123',
            full_name: 'Payment Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    describe('POST /api/payment-methods', () => {
        it('should create new payment method', async () => {
            const response = await request(testApp)
                .post('/api/payment-methods')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                payment_label: 'Test Visa',
                card_type: 'Visa',
                last_four_digits: '4242',
                expiration_month: '12',
                expiration_year: '2025',
                billing_zip_code: '97201',
                is_default: true
            });
            expect(response.status).toBe(201);
            expect(response.body.payment_label).toBe('Test Visa');
            expect(response.body.card_type).toBe('Visa');
            expect(response.body.is_default).toBe(true);
        });
        it('should reject invalid card data', async () => {
            const response = await request(testApp)
                .post('/api/payment-methods')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                payment_label: 'Test Card',
                card_type: 'InvalidType',
                last_four_digits: '123', // Too short
                expiration_month: '13', // Invalid month
                expiration_year: '2025',
                billing_zip_code: '97201'
            });
            expect(response.status).toBe(400);
        });
    });
    describe('GET /api/payment-methods', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO saved_payment_methods (payment_method_id, user_id, payment_label, 
          card_type, last_four_digits, expiration_month, expiration_year, billing_zip_code, 
          is_default, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                'pm_test_get',
                testUserId,
                'Test Card',
                'Visa',
                '4242',
                '12',
                '2025',
                '97201',
                true,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
        });
        it('should get all payment methods', async () => {
            const response = await request(testApp)
                .get('/api/payment-methods')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.payment_methods).toHaveLength(1);
            expect(response.body.payment_methods[0].last_four_digits).toBe('4242');
        });
    });
});
describe('Search Tests', () => {
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'search@example.com',
            password: 'password123',
            full_name: 'Search Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    describe('GET /api/search/suggestions', () => {
        it('should get search suggestions', async () => {
            const response = await request(testApp)
                .get('/api/search/suggestions')
                .query({ query: 'ita', limit: 10 });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('suggestions');
            expect(Array.isArray(response.body.suggestions)).toBe(true);
        });
    });
    describe('GET /api/search/recent', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO search_history (search_id, user_id, search_query, search_type, created_at) 
        VALUES ($1, $2, $3, $4, $5)`, ['search_test_001', testUserId, 'italian', 'cuisine', new Date().toISOString()]);
        });
        it('should get recent searches', async () => {
            const response = await request(testApp)
                .get('/api/search/recent')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ limit: 10 });
            expect(response.status).toBe(200);
            expect(response.body.searches).toHaveLength(1);
            expect(response.body.searches[0].search_query).toBe('italian');
        });
    });
    describe('DELETE /api/search/recent', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO search_history (search_id, user_id, search_query, search_type, created_at) 
        VALUES ($1, $2, $3, $4, $5)`, ['search_test_del', testUserId, 'pizza', 'general', new Date().toISOString()]);
        });
        it('should clear search history', async () => {
            const response = await request(testApp)
                .delete('/api/search/recent')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            // Verify deleted
            const searchResult = await pool.query('SELECT * FROM search_history WHERE user_id = $1', [testUserId]);
            expect(searchResult.rows.length).toBe(0);
        });
    });
});
describe('Weekly Picks Tests', () => {
    let restaurantId;
    beforeEach(async () => {
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_weekly',
            'Weekly Pick Restaurant',
            'Test',
            JSON.stringify(['French']),
            3,
            '999 Pick St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0008',
            4.8,
            100,
            500,
            true,
            true,
            true,
            6.99,
            25.00,
            4,
            40,
            55,
            true,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create weekly pick
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // End of week
        await pool.query(`INSERT INTO weekly_local_picks (pick_id, restaurant_id, week_start_date, week_end_date, 
        featured_description, display_order, selection_criteria, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            'pick_test_001',
            restaurantId,
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0],
            'Featured for amazing cuisine',
            0,
            'High ratings',
            new Date().toISOString()
        ]);
    });
    describe('GET /api/weekly-picks', () => {
        it('should get current week picks', async () => {
            const response = await request(testApp)
                .get('/api/weekly-picks');
            expect(response.status).toBe(200);
            expect(response.body.picks.length).toBeGreaterThan(0);
            expect(response.body).toHaveProperty('week_start_date');
            expect(response.body).toHaveProperty('week_end_date');
            expect(response.body.picks[0].restaurant.restaurant_id).toBe(restaurantId);
        });
    });
});
describe('Recommendations Tests', () => {
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'recommend@example.com',
            password: 'password123',
            full_name: 'Recommend Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    describe('GET /api/recommendations', () => {
        it('should get personalized recommendations', async () => {
            const response = await request(testApp)
                .get('/api/recommendations')
                .set('Authorization', `Bearer ${authToken}`)
                .query({ limit: 10 });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('recommendations');
            expect(Array.isArray(response.body.recommendations)).toBe(true);
        });
    });
    describe('POST /api/recommendations/dismiss', () => {
        let restaurantId;
        beforeEach(async () => {
            const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
          price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
          average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
          accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
          estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
          created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
        RETURNING restaurant_id`, [
                'test_rest_dismiss',
                'Dismiss Restaurant',
                'Test',
                JSON.stringify(['Italian']),
                2,
                '111 Dismiss St',
                'Portland',
                'OR',
                '97201',
                45.5231,
                -122.6765,
                '+1-555-0009',
                4.5,
                10,
                50,
                true,
                true,
                true,
                4.99,
                15.00,
                5,
                25,
                40,
                false,
                true,
                new Date().toISOString(),
                new Date().toISOString()
            ]);
            restaurantId = restResult.rows[0].restaurant_id;
        });
        it('should dismiss recommendation', async () => {
            const response = await request(testApp)
                .post('/api/recommendations/dismiss')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId
            });
            expect(response.status).toBe(200);
            // Verify dismissal created
            const dismissResult = await pool.query('SELECT * FROM dismissed_recommendations WHERE user_id = $1 AND restaurant_id = $2', [testUserId, restaurantId]);
            expect(dismissResult.rows.length).toBe(1);
        });
    });
});
describe('Verification Tests', () => {
    let restaurantId;
    let orderId;
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'verify@example.com',
            password: 'password123',
            full_name: 'Verify Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_verify',
            'Verify Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '222 Verify St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0010',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        restaurantId = restResult.rows[0].restaurant_id;
        // Create order
        const orderResult = await pool.query(`INSERT INTO orders (order_id, user_id, restaurant_id, order_type, order_status, 
        subtotal, discount_amount, delivery_fee, tax, tip, grand_total, payment_status, 
        delivered_at, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING order_id`, [
            'order_verify_test',
            testUserId,
            restaurantId,
            'delivery',
            'delivered',
            25.00,
            0,
            4.99,
            2.50,
            5.00,
            37.49,
            'completed',
            new Date().toISOString(),
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        orderId = orderResult.rows[0].order_id;
    });
    describe('POST /api/verifications', () => {
        it('should create order-based verification', async () => {
            const response = await request(testApp)
                .post('/api/verifications')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                verification_method: 'order',
                order_id: orderId
            });
            expect(response.status).toBe(201);
            expect(response.body.restaurant_id).toBe(restaurantId);
            expect(response.body.verification_method).toBe('order');
            // Verify statistics updated
            const statsResult = await pool.query('SELECT total_restaurants_visited FROM user_statistics WHERE user_id = $1', [testUserId]);
            expect(statsResult.rows[0].total_restaurants_visited).toBe(1);
        });
        it('should prevent duplicate verifications', async () => {
            // Create first verification
            await request(testApp)
                .post('/api/verifications')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                verification_method: 'order',
                order_id: orderId
            });
            // Try to create duplicate
            const response = await request(testApp)
                .post('/api/verifications')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                restaurant_id: restaurantId,
                verification_method: 'qr_code',
                order_id: null
            });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('already verified');
        });
    });
});
describe('Error Handling Tests', () => {
    it('should handle 404 for non-existent routes', async () => {
        const response = await request(testApp)
            .get('/api/nonexistent');
        expect(response.status).toBe(404);
    });
    it('should validate request body schemas', async () => {
        const response = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'invalid-email-format'
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('ValidationError');
    });
    it('should handle database errors gracefully', async () => {
        // Close pool temporarily to simulate DB error
        const originalQuery = pool.query.bind(pool);
        pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));
        const response = await request(testApp)
            .get('/api/restaurants');
        expect(response.status).toBe(500);
        // Restore pool.query
        pool.query = originalQuery;
    });
});
describe('Integration: Complete User Journey', () => {
    it('should complete full user journey from signup to order', async () => {
        // 1. Signup
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'journey@example.com',
            password: 'password123',
            full_name: 'Journey Test'
        });
        expect(signupResponse.status).toBe(201);
        const token = signupResponse.body.auth_token;
        const userId = signupResponse.body.user.user_id;
        // 2. Browse restaurants
        const restaurantsResponse = await request(testApp)
            .get('/api/restaurants')
            .query({ limit: 10 });
        expect(restaurantsResponse.status).toBe(200);
        expect(restaurantsResponse.body.restaurants.length).toBeGreaterThan(0);
        const restaurant = restaurantsResponse.body.restaurants[0];
        // 3. Add to favorites
        const favoriteResponse = await request(testApp)
            .post('/api/favorites')
            .set('Authorization', `Bearer ${token}`)
            .send({ restaurant_id: restaurant.restaurant_id });
        expect(favoriteResponse.status).toBe(201);
        // 4. View menu
        const menuResponse = await request(testApp)
            .get(`/api/restaurants/${restaurant.restaurant_id}/menu`);
        expect(menuResponse.status).toBe(200);
        if (menuResponse.body.categories.length > 0 && menuResponse.body.categories[0].items.length > 0) {
            const menuItem = menuResponse.body.categories[0].items[0];
            // 5. Add to cart
            const cartResponse = await request(testApp)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${token}`)
                .send({
                menu_item_id: menuItem.menu_item_id,
                quantity: 2,
                selected_size: null,
                selected_addons: [],
                selected_modifications: [],
                special_instructions: 'Extra napkins'
            });
            expect(cartResponse.status).toBe(201);
            // 6. Create payment method
            const paymentResponse = await request(testApp)
                .post('/api/payment-methods')
                .set('Authorization', `Bearer ${token}`)
                .send({
                payment_label: 'Journey Card',
                card_type: 'Visa',
                last_four_digits: '1234',
                expiration_month: '12',
                expiration_year: '2025',
                billing_zip_code: '97201',
                is_default: true
            });
            expect(paymentResponse.status).toBe(201);
            // 7. Place order
            const orderResponse = await request(testApp)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                restaurant_id: restaurant.restaurant_id,
                order_type: 'delivery',
                delivery_street_address: '123 Journey St',
                delivery_city: 'Portland',
                delivery_state: 'OR',
                delivery_zip_code: '97201',
                payment_method_id: paymentResponse.body.payment_method_id,
                tip: 5.00
            });
            expect(orderResponse.status).toBe(201);
            expect(orderResponse.body.order.user_id).toBe(userId);
            // 8. Write review
            const reviewResponse = await request(testApp)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${token}`)
                .send({
                restaurant_id: restaurant.restaurant_id,
                order_id: orderResponse.body.order.order_id,
                star_rating: 5,
                review_text: 'Excellent food and great service throughout the journey!',
                is_verified_visit: true
            });
            expect(reviewResponse.status).toBe(201);
            // 9. Check updated statistics
            const statsResponse = await request(testApp)
                .get('/api/users/me/statistics')
                .set('Authorization', `Bearer ${token}`);
            expect(statsResponse.status).toBe(200);
            expect(statsResponse.body.total_orders_placed).toBe(1);
            expect(statsResponse.body.total_reviews_written).toBe(1);
            expect(statsResponse.body.total_favorites_saved).toBe(1);
        }
    });
});
describe('Edge Cases and Error Scenarios', () => {
    beforeEach(async () => {
        const signupResponse = await request(testApp)
            .post('/api/auth/signup')
            .send({
            email: 'edge@example.com',
            password: 'password123',
            full_name: 'Edge Case Test'
        });
        authToken = signupResponse.body.auth_token;
        testUserId = signupResponse.body.user.user_id;
    });
    it('should handle empty cart on order creation', async () => {
        const response = await request(testApp)
            .post('/api/orders')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            restaurant_id: 'any_restaurant',
            order_type: 'delivery',
            delivery_street_address: '123 Test St',
            delivery_city: 'Portland',
            delivery_state: 'OR',
            delivery_zip_code: '97201',
            tip: 5.00
        });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('empty');
    });
    it('should handle concurrent favorite operations', async () => {
        // Create restaurant
        const restResult = await pool.query(`INSERT INTO restaurants (restaurant_id, restaurant_name, description, cuisine_types, 
        price_range, street_address, city, state, zip_code, latitude, longitude, phone_number, 
        average_rating, total_review_count, total_order_count, is_currently_open, accepts_delivery, 
        accepts_pickup, delivery_fee, minimum_order_amount, delivery_radius_miles, 
        estimated_prep_time_minutes, estimated_delivery_time_minutes, is_featured, is_active, 
        created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING restaurant_id`, [
            'test_rest_concurrent',
            'Concurrent Restaurant',
            'Test',
            JSON.stringify(['Italian']),
            2,
            '444 Concurrent St',
            'Portland',
            'OR',
            '97201',
            45.5231,
            -122.6765,
            '+1-555-0011',
            4.5,
            10,
            50,
            true,
            true,
            true,
            4.99,
            15.00,
            5,
            25,
            40,
            false,
            true,
            new Date().toISOString(),
            new Date().toISOString()
        ]);
        const restaurantId = restResult.rows[0].restaurant_id;
        // Try to add same favorite twice simultaneously
        const promises = [
            request(testApp)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ restaurant_id: restaurantId }),
            request(testApp)
                .post('/api/favorites')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ restaurant_id: restaurantId })
        ];
        const responses = await Promise.allSettled(promises);
        // One should succeed, one should fail with duplicate error
        const statuses = responses.map(r => r.status === 'fulfilled' ? r.value.status : null);
        expect(statuses.filter(s => s === 201).length).toBe(1);
        expect(statuses.filter(s => s === 400).length).toBe(1);
    });
    it('should handle missing authorization header', async () => {
        const response = await request(testApp)
            .get('/api/users/me');
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Unauthorized');
    });
    it('should handle malformed JSON in request body', async () => {
        const response = await request(testApp)
            .post('/api/auth/signup')
            .set('Content-Type', 'application/json')
            .send('{ invalid json }');
        expect(response.status).toBe(400);
    });
});
//# sourceMappingURL=server.test.js.map