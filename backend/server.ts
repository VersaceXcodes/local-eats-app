import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import crypto from 'crypto';
import {
  createUserInputSchema,
  updateUserInputSchema,
  searchRestaurantInputSchema,
  createOrderInputSchema,
  updateOrderInputSchema,
  searchOrderInputSchema,
  createReviewInputSchema,
  updateReviewInputSchema,
  searchReviewInputSchema,
  createFavoriteInputSchema,
  createSavedAddressInputSchema,
  updateSavedAddressInputSchema,
  createSavedPaymentMethodInputSchema,
  createVerificationInputSchema,
  createSearchHistoryInputSchema,
  updateNotificationInputSchema
} from './schema.ts';

dotenv.config();

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Error response utility
interface ErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: any;
  timestamp: string;
}

function createErrorResponse(
  message: string,
  error?: any,
  errorCode?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error_code = errorCode;
  }

  if (error) {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return response;
}

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'local-eats-secret-key-dev-only' } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan('combined'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory cart storage (session-based)
// Maps user_id to cart object
const carts = new Map();

/*
 * Auth middleware for protected routes
 * Extracts user_id from JWT token and attaches to req.user
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_MISSING'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT user_id, email, full_name, profile_picture_url, is_verified, member_since, created_at FROM users WHERE user_id = $1', [decoded.user_id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
  }
};

/*
 * Helper function to generate unique IDs
 * Format: {prefix}_{random}
 */
function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/*
 * Helper function to calculate distance using Haversine formula
 * Returns distance in miles between two lat/long coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/*
 * Mock email service
 * In production, would use SendGrid/Mailgun/AWS SES
 */
async function sendEmail(to, subject, body) {
  console.log('📧 Mock Email Sent:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Body:', body);
  return { success: true };
}

/*
 * Mock payment processing
 * In production, would use Stripe/Square/PayPal
 * @@need:external-api: Payment gateway API (e.g., Stripe) to process payment with payment_method_id and amount. Should return transaction_id and success/failure status.
 */
async function processPayment(payment_method_id, amount, order_details) {
  console.log('💳 Mock Payment Processing:');
  console.log('Payment Method ID:', payment_method_id);
  console.log('Amount:', amount);
  console.log('Order:', order_details);
  
  // Return mock successful payment response
  return {
    success: true,
    transaction_id: `txn_${crypto.randomBytes(8).toString('hex')}`,
    status: 'completed'
  };
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/*
 * POST /api/auth/signup
 * Registers new user account
 * Creates user record and user_statistics record
 * Returns user object and JWT token for immediate login
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const validationResult = createUserInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse('Validation failed', validationResult.error, 'VALIDATION_ERROR'));
    }

    const { email, password, full_name, phone_number, profile_picture_url } = validationResult.data;

    // Check if email already exists
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Email already registered', null, 'EMAIL_EXISTS'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user_id = generateId('user');
      const now = new Date().toISOString();
      const default_notification_prefs = {
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
      };

      // Insert user (NO PASSWORD HASHING - development mode)
      const userResult = await client.query(
        `INSERT INTO users (user_id, email, password_hash, full_name, phone_number, profile_picture_url, is_verified, member_since, notification_preferences, location_permission_granted, profile_public, reviews_public, last_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING user_id, email, full_name, phone_number, profile_picture_url, is_verified, member_since, notification_preferences, location_permission_granted, profile_public, reviews_public, last_login, created_at, updated_at`,
        [user_id, email.toLowerCase(), password, full_name, phone_number, profile_picture_url, false, now, JSON.stringify(default_notification_prefs), false, true, true, now, now, now]
      );

      // Create user_statistics record
      const stat_id = generateId('stat');
      await client.query(
        `INSERT INTO user_statistics (stat_id, user_id, total_reviews_written, total_restaurants_visited, total_favorites_saved, total_orders_placed, total_badges_earned, total_discounts_redeemed, unique_cuisines_tried, updated_at)
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0, $3, $4)`,
        [stat_id, user_id, JSON.stringify([]), now]
      );

      await client.query('COMMIT');

      const user = userResult.rows[0];
      user.notification_preferences = JSON.parse(user.notification_preferences);

      // Generate JWT token
      const auth_token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({ user, auth_token });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/auth/login
 * Authenticates user and returns JWT token
 * NO PASSWORD HASHING - direct comparison for development
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, remember_me } = req.body;

    if (!email || !password) {
      return res.status(400).json(createErrorResponse('Email and password required', null, 'MISSING_CREDENTIALS'));
    }

    // Find user and check password (direct comparison for development)
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];
    if (password !== user.password_hash) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    // Update last login
    const now = new Date().toISOString();
    await pool.query('UPDATE users SET last_login = $1, updated_at = $2 WHERE user_id = $3', [now, now, user.user_id]);

    // Generate JWT token
    const expiresIn = remember_me ? '30d' : '7d';
    const auth_token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn });

    // Parse JSON fields
    user.notification_preferences = JSON.parse(user.notification_preferences);
    user.last_login = now;
    user.updated_at = now;
    delete user.password_hash; // Don't return password

    res.json({ user, auth_token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/auth/logout
 * Logs out user (client-side token disposal for JWT)
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Successfully logged out' });
});

/*
 * POST /api/auth/password-reset/request
 * Creates password reset token and sends email
 * Always returns success (security: don't reveal email existence)
 */
app.post('/api/auth/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(createErrorResponse('Email required', null, 'MISSING_EMAIL'));
    }

    // Check if user exists
    const userResult = await pool.query('SELECT user_id, full_name FROM users WHERE email = $1', [email.toLowerCase()]);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const token_id = generateId('token');
      const reset_token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      const now = new Date().toISOString();

      // Create reset token
      await pool.query(
        'INSERT INTO password_reset_tokens (token_id, user_id, reset_token, expires_at, is_used, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [token_id, user.user_id, reset_token, expires_at, false, now]
      );

      // Send email with reset link
      const reset_link = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${reset_token}`;
      await sendEmail(
        email,
        'Reset Your Password - Local Eats',
        `Hi ${user.full_name},\n\nClick the link below to reset your password:\n${reset_link}\n\nThis link expires in 24 hours.`
      );
    }

    // Always return success (security measure)
    res.json({ message: 'If an account exists with that email, a password reset link has been sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/auth/password-reset/complete
 * Validates reset token and updates password
 * NO PASSWORD HASHING - stores password directly
 */
app.post('/api/auth/password-reset/complete', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return res.status(400).json(createErrorResponse('Reset token and new password required', null, 'MISSING_FIELDS'));
    }

    if (new_password.length < 8) {
      return res.status(400).json(createErrorResponse('Password must be at least 8 characters', null, 'PASSWORD_TOO_SHORT'));
    }

    // Find valid token
    const tokenResult = await pool.query(
      'SELECT token_id, user_id, expires_at, is_used FROM password_reset_tokens WHERE reset_token = $1',
      [reset_token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json(createErrorResponse('Invalid or expired token', null, 'INVALID_TOKEN'));
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.is_used) {
      return res.status(400).json(createErrorResponse('Token already used', null, 'TOKEN_USED'));
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json(createErrorResponse('Token expired', null, 'TOKEN_EXPIRED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update password (NO HASHING)
      const now = new Date().toISOString();
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = $2 WHERE user_id = $3',
        [new_password, now, tokenData.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET is_used = true WHERE token_id = $1',
        [tokenData.token_id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Password successfully reset. Please login with your new password.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Password reset complete error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// USER MANAGEMENT ENDPOINTS
// ============================================

/*
 * GET /api/users/me
 * Returns current authenticated user profile
 * Excludes password_hash for security
 */
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, email, full_name, phone_number, profile_picture_url, is_verified, member_since, notification_preferences, location_permission_granted, profile_public, reviews_public, last_login, created_at, updated_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    const user = result.rows[0];
    user.notification_preferences = JSON.parse(user.notification_preferences);

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/users/me
 * Updates current user profile
 * Validates email uniqueness if changed
 */
app.patch('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const validationResult = updateUserInputSchema.safeParse({ ...req.body, user_id: req.user.user_id });
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse('Validation failed', validationResult.error, 'VALIDATION_ERROR'));
    }

    const updates = validationResult.data;
    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    // Build dynamic UPDATE query
    if (updates.email && updates.email !== req.user.email) {
      // Check email uniqueness
      const existingEmail = await pool.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [updates.email.toLowerCase(), req.user.user_id]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json(createErrorResponse('Email already in use', null, 'EMAIL_EXISTS'));
      }
      updateFields.push(`email = $${paramCounter++}`);
      updateValues.push(updates.email.toLowerCase());
    }

    if (updates.full_name !== undefined) {
      updateFields.push(`full_name = $${paramCounter++}`);
      updateValues.push(updates.full_name);
    }

    if (updates.phone_number !== undefined) {
      updateFields.push(`phone_number = $${paramCounter++}`);
      updateValues.push(updates.phone_number);
    }

    if (updates.profile_picture_url !== undefined) {
      updateFields.push(`profile_picture_url = $${paramCounter++}`);
      updateValues.push(updates.profile_picture_url);
    }

    if (updates.notification_preferences) {
      updateFields.push(`notification_preferences = $${paramCounter++}`);
      updateValues.push(JSON.stringify(updates.notification_preferences));
    }

    if (updates.location_permission_granted !== undefined) {
      updateFields.push(`location_permission_granted = $${paramCounter++}`);
      updateValues.push(updates.location_permission_granted);
    }

    if (updates.profile_public !== undefined) {
      updateFields.push(`profile_public = $${paramCounter++}`);
      updateValues.push(updates.profile_public);
    }

    if (updates.reviews_public !== undefined) {
      updateFields.push(`reviews_public = $${paramCounter++}`);
      updateValues.push(updates.reviews_public);
    }

    if (updateFields.length === 0) {
      return res.status(400).json(createErrorResponse('No fields to update', null, 'NO_UPDATES'));
    }

    // Always update updated_at
    const now = new Date().toISOString();
    updateFields.push(`updated_at = $${paramCounter++}`);
    updateValues.push(now);
    updateValues.push(req.user.user_id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramCounter} RETURNING user_id, email, full_name, phone_number, profile_picture_url, is_verified, member_since, notification_preferences, location_permission_granted, profile_public, reviews_public, last_login, created_at, updated_at`;

    const result = await pool.query(query, updateValues);
    const user = result.rows[0];
    user.notification_preferences = JSON.parse(user.notification_preferences);

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/users/me/statistics
 * Returns user activity statistics for profile display
 */
app.get('/api/users/me/statistics', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT stat_id, user_id, total_reviews_written, total_restaurants_visited, total_favorites_saved, total_orders_placed, total_badges_earned, total_discounts_redeemed, unique_cuisines_tried, updated_at FROM user_statistics WHERE user_id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Statistics not found', null, 'STATS_NOT_FOUND'));
    }

    const stats = result.rows[0];
    stats.unique_cuisines_tried = JSON.parse(stats.unique_cuisines_tried);

    res.json(stats);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/users/me/reviews
 * Returns all reviews written by current user with restaurant info and photos
 */
app.get('/api/users/me/reviews', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const reviewsResult = await pool.query(
      `SELECT r.*, rest.restaurant_name, rest.primary_hero_image_url
       FROM reviews r
       JOIN restaurants rest ON r.restaurant_id = rest.restaurant_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );

    const reviews = [];
    for (const row of reviewsResult.rows) {
      // Get review photos
      const photosResult = await pool.query(
        'SELECT photo_id, photo_url, display_order FROM review_photos WHERE review_id = $1 ORDER BY display_order ASC',
        [row.review_id]
      );

      reviews.push({
        review: {
          review_id: row.review_id,
          user_id: row.user_id,
          restaurant_id: row.restaurant_id,
          order_id: row.order_id,
          star_rating: row.star_rating,
          review_title: row.review_title,
          review_text: row.review_text,
          is_verified_visit: row.is_verified_visit,
          helpful_count: row.helpful_count,
          is_edited: row.is_edited,
          edited_at: row.edited_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        user: {
          user_id: req.user.user_id,
          full_name: req.user.full_name,
          profile_picture_url: req.user.profile_picture_url
        },
        restaurant: {
          restaurant_id: row.restaurant_id,
          restaurant_name: row.restaurant_name,
          primary_hero_image_url: row.primary_hero_image_url
        },
        photos: photosResult.rows,
        is_helpful_by_current_user: false
      });
    }

    const countResult = await pool.query('SELECT COUNT(*) FROM reviews WHERE user_id = $1', [req.user.user_id]);
    const total_count = parseInt(countResult.rows[0].count);

    res.json({ reviews, total_count });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// RESTAURANT ENDPOINTS
// ============================================

/*
 * GET /api/restaurants
 * Main search and browse endpoint with comprehensive filtering
 * Supports: query search, cuisine filter, price range, distance, rating, dietary, open_now, discounts
 * Includes distance calculation using Haversine formula if lat/long provided
 */
app.get('/api/restaurants', async (req, res) => {
  try {
    const { query, cuisine_types, price_min, price_max, distance_max, rating_min, dietary_preferences, open_now, has_discount, is_featured, sort_by = 'recommended', latitude, longitude, limit = 20, offset = 0 } = req.query;

    let whereConditions = ['r.is_active = true'];
    let queryParams = [];
    let paramCounter = 1;

    // Text search on restaurant name or cuisine
    if (query) {
      whereConditions.push(`(r.restaurant_name ILIKE $${paramCounter} OR r.cuisine_types::text ILIKE $${paramCounter})`);
      queryParams.push(`%${query}%`);
      paramCounter++;
    }

    // Cuisine types filter
    if (cuisine_types) {
      const cuisines = cuisine_types.split(',').map(c => c.trim());
      const cuisineConditions = cuisines.map(() => {
        const cond = `r.cuisine_types::jsonb @> $${paramCounter}::jsonb`;
        paramCounter++;
        return cond;
      });
      whereConditions.push(`(${cuisineConditions.join(' OR ')})`);
      cuisines.forEach(c => queryParams.push(JSON.stringify([c])));
    }

    // Price range filter
    if (price_min) {
      whereConditions.push(`r.price_range >= $${paramCounter}`);
      queryParams.push(parseInt(price_min));
      paramCounter++;
    }
    if (price_max) {
      whereConditions.push(`r.price_range <= $${paramCounter}`);
      queryParams.push(parseInt(price_max));
      paramCounter++;
    }

    // Rating filter
    if (rating_min) {
      whereConditions.push(`r.average_rating >= $${paramCounter}`);
      queryParams.push(parseFloat(rating_min));
      paramCounter++;
    }

    // Open now filter
    if (open_now === 'true') {
      whereConditions.push('r.is_currently_open = true');
    }

    // Featured filter
    if (is_featured === 'true') {
      whereConditions.push('r.is_featured = true');
    }

    // Build SELECT with optional distance calculation
    let selectFields = 'r.*';
    let orderByClause = '';

    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      selectFields = `r.*, (3959 * acos(cos(radians(${userLat})) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(${userLon})) + sin(radians(${userLat})) * sin(radians(r.latitude)))) AS distance`;
      
      if (distance_max) {
        whereConditions.push(`(3959 * acos(cos(radians(${userLat})) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(${userLon})) + sin(radians(${userLat})) * sin(radians(r.latitude)))) <= ${parseFloat(distance_max)}`);
      }
    }

    // Sorting
    switch (sort_by) {
      case 'distance':
        orderByClause = latitude && longitude ? 'ORDER BY distance ASC' : 'ORDER BY r.restaurant_name ASC';
        break;
      case 'rating':
        orderByClause = 'ORDER BY r.average_rating DESC';
        break;
      case 'price_low':
        orderByClause = 'ORDER BY r.price_range ASC';
        break;
      case 'price_high':
        orderByClause = 'ORDER BY r.price_range DESC';
        break;
      case 'newest':
        orderByClause = 'ORDER BY r.created_at DESC';
        break;
      case 'popular':
        orderByClause = 'ORDER BY r.total_order_count DESC';
        break;
      default: // recommended
        orderByClause = 'ORDER BY r.is_featured DESC, r.average_rating DESC, r.total_order_count DESC';
    }

    const mainQuery = `
      SELECT ${selectFields}
      FROM restaurants r
      WHERE ${whereConditions.join(' AND ')}
      ${orderByClause}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(mainQuery, queryParams);

    // Parse JSON fields
    const restaurants = result.rows.map(r => ({
      ...r,
      cuisine_types: JSON.parse(r.cuisine_types)
    }));

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM restaurants r WHERE ${whereConditions.join(' AND ')}`;
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total_count = parseInt(countResult.rows[0].count);

    res.json({ restaurants, total_count, page: Math.floor(offset / limit) + 1, limit: parseInt(limit) });
  } catch (error) {
    console.error('Search restaurants error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id
 * Returns detailed restaurant information
 */
app.get('/api/restaurants/:restaurant_id', async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM restaurants WHERE restaurant_id = $1 AND is_active = true',
      [restaurant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Restaurant not found', null, 'RESTAURANT_NOT_FOUND'));
    }

    const restaurant = result.rows[0];
    restaurant.cuisine_types = JSON.parse(restaurant.cuisine_types);

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/hours
 * Returns weekly operating hours (7 records)
 */
app.get('/api/restaurants/:restaurant_id/hours', async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const result = await pool.query(
      'SELECT hours_id, restaurant_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at FROM restaurant_hours WHERE restaurant_id = $1 ORDER BY day_of_week ASC',
      [restaurant_id]
    );

    res.json({ hours: result.rows });
  } catch (error) {
    console.error('Get hours error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/photos
 * Returns photo gallery for restaurant
 */
app.get('/api/restaurants/:restaurant_id/photos', async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const result = await pool.query(
      'SELECT photo_id, restaurant_id, photo_url, caption, display_order, uploaded_by_user_id, created_at FROM restaurant_photos WHERE restaurant_id = $1 ORDER BY display_order ASC',
      [restaurant_id]
    );

    res.json({ photos: result.rows });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/menu
 * Returns complete menu with categories and items
 */
app.get('/api/restaurants/:restaurant_id/menu', async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    // Get categories
    const categoriesResult = await pool.query(
      'SELECT category_id, restaurant_id, category_name, display_order, created_at, updated_at FROM menu_categories WHERE restaurant_id = $1 ORDER BY display_order ASC',
      [restaurant_id]
    );

    const categories = [];
    for (const cat of categoriesResult.rows) {
      // Get items for this category
      const itemsResult = await pool.query(
        `SELECT menu_item_id, restaurant_id, category_id, item_name, description, base_price, item_photo_url, dietary_preferences, allergen_info, spice_level, is_popular, is_available, display_order, created_at, updated_at
         FROM menu_items
         WHERE category_id = $1 AND is_available = true
         ORDER BY display_order ASC`,
        [cat.category_id]
      );

      const items = itemsResult.rows.map(item => ({
        ...item,
        dietary_preferences: JSON.parse(item.dietary_preferences),
        allergen_info: JSON.parse(item.allergen_info)
      }));

      categories.push({
        category: cat,
        items
      });
    }

    res.json({ categories });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/menu/items/:menu_item_id
 * Returns detailed menu item with sizes and addons for customization
 */
app.get('/api/restaurants/:restaurant_id/menu/items/:menu_item_id', async (req, res) => {
  try {
    const { restaurant_id, menu_item_id } = req.params;

    // Get menu item
    const itemResult = await pool.query(
      'SELECT * FROM menu_items WHERE menu_item_id = $1 AND restaurant_id = $2',
      [menu_item_id, restaurant_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Menu item not found', null, 'ITEM_NOT_FOUND'));
    }

    const menu_item = itemResult.rows[0];
    menu_item.dietary_preferences = JSON.parse(menu_item.dietary_preferences);
    menu_item.allergen_info = JSON.parse(menu_item.allergen_info);

    // Get sizes
    const sizesResult = await pool.query(
      'SELECT size_id, menu_item_id, size_name, price_adjustment, display_order, created_at FROM menu_item_sizes WHERE menu_item_id = $1 ORDER BY display_order ASC',
      [menu_item_id]
    );

    // Get addons
    const addonsResult = await pool.query(
      'SELECT addon_id, menu_item_id, addon_name, addon_price, display_order, created_at FROM menu_item_addons WHERE menu_item_id = $1 ORDER BY display_order ASC',
      [menu_item_id]
    );

    res.json({
      menu_item,
      sizes: sizesResult.rows,
      addons: addonsResult.rows
    });
  } catch (error) {
    console.error('Get menu item detail error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/discounts
 * Returns active discounts for restaurant
 */
app.get('/api/restaurants/:restaurant_id/discounts', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const now = new Date().toISOString();

    const result = await pool.query(
      `SELECT discount_id, restaurant_id, discount_type, discount_value, coupon_code, qr_code_data, description, terms_conditions, minimum_order_amount, excluded_items, valid_days, is_one_time_use, max_redemptions_per_user, total_redemption_limit, current_redemption_count, is_active, start_date, end_date, is_local_picks_exclusive, created_at, updated_at
       FROM discounts
       WHERE restaurant_id = $1 AND is_active = true AND start_date <= $2 AND end_date >= $2
       ORDER BY discount_value DESC`,
      [restaurant_id, now]
    );

    const discounts = result.rows.map(d => ({
      ...d,
      excluded_items: JSON.parse(d.excluded_items),
      valid_days: JSON.parse(d.valid_days)
    }));

    res.json({ discounts });
  } catch (error) {
    console.error('Get discounts error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/restaurants/:restaurant_id/reviews
 * Returns reviews for restaurant with filtering and sorting
 */
app.get('/api/restaurants/:restaurant_id/reviews', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const { min_rating, max_rating, is_verified_visit, sort_by = 'created_at', sort_order = 'desc', limit = 20, offset = 0 } = req.query;

    let whereConditions = ['r.restaurant_id = $1'];
    let queryParams = [restaurant_id];
    let paramCounter = 2;

    if (min_rating) {
      whereConditions.push(`r.star_rating >= $${paramCounter}`);
      queryParams.push(parseInt(min_rating));
      paramCounter++;
    }

    if (max_rating) {
      whereConditions.push(`r.star_rating <= $${paramCounter}`);
      queryParams.push(parseInt(max_rating));
      paramCounter++;
    }

    if (is_verified_visit === 'true') {
      whereConditions.push('r.is_verified_visit = true');
    }

    const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    const orderByClause = `ORDER BY r.${sort_by} ${orderDirection}`;

    const reviewsQuery = `
      SELECT r.*, u.full_name, u.profile_picture_url
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE ${whereConditions.join(' AND ')}
      ${orderByClause}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const reviewsResult = await pool.query(reviewsQuery, queryParams);

    // Get current user ID if authenticated
    let current_user_id = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        current_user_id = decoded.user_id;
      } catch {}
    }

    const reviews = [];
    for (const row of reviewsResult.rows) {
      // Get photos
      const photosResult = await pool.query(
        'SELECT photo_id, photo_url, display_order FROM review_photos WHERE review_id = $1 ORDER BY display_order ASC',
        [row.review_id]
      );

      // Check if helpful by current user
      let is_helpful_by_current_user = false;
      if (current_user_id) {
        const helpfulResult = await pool.query(
          'SELECT helpful_mark_id FROM review_helpful_marks WHERE review_id = $1 AND user_id = $2',
          [row.review_id, current_user_id]
        );
        is_helpful_by_current_user = helpfulResult.rows.length > 0;
      }

      reviews.push({
        review: {
          review_id: row.review_id,
          user_id: row.user_id,
          restaurant_id: row.restaurant_id,
          order_id: row.order_id,
          star_rating: row.star_rating,
          review_title: row.review_title,
          review_text: row.review_text,
          is_verified_visit: row.is_verified_visit,
          helpful_count: row.helpful_count,
          is_edited: row.is_edited,
          edited_at: row.edited_at,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        user: {
          user_id: row.user_id,
          full_name: row.full_name,
          profile_picture_url: row.profile_picture_url
        },
        photos: photosResult.rows,
        is_helpful_by_current_user
      });
    }

    // Calculate statistics
    const statsResult = await pool.query(
      'SELECT AVG(star_rating) as average_rating, COUNT(*) as total_count FROM reviews WHERE restaurant_id = $1',
      [restaurant_id]
    );

    const distributionResult = await pool.query(
      `SELECT 
        SUM(CASE WHEN star_rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN star_rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN star_rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN star_rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN star_rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM reviews WHERE restaurant_id = $1`,
      [restaurant_id]
    );

    res.json({
      reviews,
      total_count: parseInt(statsResult.rows[0].total_count),
      average_rating: parseFloat(statsResult.rows[0].average_rating) || 0,
      rating_distribution: {
        five_star: parseInt(distributionResult.rows[0].five_star) || 0,
        four_star: parseInt(distributionResult.rows[0].four_star) || 0,
        three_star: parseInt(distributionResult.rows[0].three_star) || 0,
        two_star: parseInt(distributionResult.rows[0].two_star) || 0,
        one_star: parseInt(distributionResult.rows[0].one_star) || 0
      }
    });
  } catch (error) {
    console.error('Get restaurant reviews error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// DISCOUNT ENDPOINTS
// ============================================

/*
 * GET /api/discounts/:discount_id
 * Returns specific discount details
 */
app.get('/api/discounts/:discount_id', async (req, res) => {
  try {
    const { discount_id } = req.params;

    const result = await pool.query(
      'SELECT * FROM discounts WHERE discount_id = $1',
      [discount_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Discount not found', null, 'DISCOUNT_NOT_FOUND'));
    }

    const discount = result.rows[0];
    discount.excluded_items = JSON.parse(discount.excluded_items);
    discount.valid_days = JSON.parse(discount.valid_days);

    res.json(discount);
  } catch (error) {
    console.error('Get discount error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/discounts/:discount_id/redeem
 * Records discount redemption
 */
app.post('/api/discounts/:discount_id/redeem', authenticateToken, async (req, res) => {
  try {
    const { discount_id } = req.params;
    const { redemption_method } = req.body;

    // Get discount
    const discountResult = await pool.query('SELECT * FROM discounts WHERE discount_id = $1', [discount_id]);
    if (discountResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Discount not found', null, 'DISCOUNT_NOT_FOUND'));
    }

    const discount = discountResult.rows[0];

    // Validate active and valid dates
    const now = new Date();
    if (!discount.is_active || new Date(discount.start_date) > now || new Date(discount.end_date) < now) {
      return res.status(400).json(createErrorResponse('Discount is not active or expired', null, 'DISCOUNT_INVALID'));
    }

    // Check user redemption count
    if (discount.max_redemptions_per_user) {
      const userRedemptionsResult = await pool.query(
        'SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2',
        [discount_id, req.user.user_id]
      );
      const user_redemption_count = parseInt(userRedemptionsResult.rows[0].count);
      
      if (user_redemption_count >= discount.max_redemptions_per_user) {
        return res.status(400).json(createErrorResponse('You have already redeemed this discount', null, 'MAX_REDEMPTIONS_REACHED'));
      }
    }

    res.json({ message: `Discount successfully redeemed! Apply coupon code ${discount.coupon_code || 'at checkout'}.` });
  } catch (error) {
    console.error('Redeem discount error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/discounts/:discount_id/qr-code
 * Generates QR code data for discount
 */
app.get('/api/discounts/:discount_id/qr-code', authenticateToken, async (req, res) => {
  try {
    const { discount_id } = req.params;

    const result = await pool.query(
      'SELECT discount_id, restaurant_id, discount_type, discount_value, coupon_code, qr_code_data, description, terms_conditions, minimum_order_amount, start_date, end_date FROM discounts WHERE discount_id = $1',
      [discount_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Discount not found', null, 'DISCOUNT_NOT_FOUND'));
    }

    const discount = result.rows[0];
    
    // Generate QR code data if not exists
    const qr_code_data = discount.qr_code_data || `QR_${discount_id}_${req.user.user_id}_${Date.now()}`;
    const alphanumeric_code = discount.coupon_code || discount_id.substring(0, 8).toUpperCase();

    res.json({
      qr_code_data,
      alphanumeric_code,
      discount: {
        discount_id: discount.discount_id,
        restaurant_id: discount.restaurant_id,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        description: discount.description,
        terms_conditions: discount.terms_conditions,
        minimum_order_amount: discount.minimum_order_amount,
        start_date: discount.start_date,
        end_date: discount.end_date
      }
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// FAVORITES ENDPOINTS
// ============================================

/*
 * GET /api/favorites
 * Returns user's favorite restaurants with filtering and sorting
 */
app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { cuisine_types, price_min, price_max, open_now, sort_by = 'recently_added' } = req.query;

    let whereConditions = ['f.user_id = $1', 'r.is_active = true'];
    let queryParams = [req.user.user_id];
    let paramCounter = 2;

    if (cuisine_types) {
      const cuisines = cuisine_types.split(',').map(c => c.trim());
      const cuisineConditions = cuisines.map(() => {
        const cond = `r.cuisine_types::jsonb @> $${paramCounter}::jsonb`;
        paramCounter++;
        return cond;
      });
      whereConditions.push(`(${cuisineConditions.join(' OR ')})`);
      cuisines.forEach(c => queryParams.push(JSON.stringify([c])));
    }

    if (price_min) {
      whereConditions.push(`r.price_range >= $${paramCounter}`);
      queryParams.push(parseInt(price_min));
      paramCounter++;
    }

    if (price_max) {
      whereConditions.push(`r.price_range <= $${paramCounter}`);
      queryParams.push(parseInt(price_max));
      paramCounter++;
    }

    if (open_now === 'true') {
      whereConditions.push('r.is_currently_open = true');
    }

    let orderByClause = '';
    switch (sort_by) {
      case 'alphabetical':
        orderByClause = 'ORDER BY r.restaurant_name ASC';
        break;
      case 'rating':
        orderByClause = 'ORDER BY r.average_rating DESC';
        break;
      default:
        orderByClause = 'ORDER BY f.created_at DESC';
    }

    const query = `
      SELECT f.favorite_id, f.user_id, f.restaurant_id, f.created_at as favorite_created_at, r.*
      FROM favorites f
      JOIN restaurants r ON f.restaurant_id = r.restaurant_id
      WHERE ${whereConditions.join(' AND ')}
      ${orderByClause}
    `;

    const result = await pool.query(query, queryParams);

    const favorites = result.rows.map(row => ({
      favorite: {
        favorite_id: row.favorite_id,
        user_id: row.user_id,
        restaurant_id: row.restaurant_id,
        created_at: row.favorite_created_at
      },
      restaurant: {
        restaurant_id: row.restaurant_id,
        restaurant_name: row.restaurant_name,
        description: row.description,
        cuisine_types: JSON.parse(row.cuisine_types),
        price_range: row.price_range,
        street_address: row.street_address,
        apartment_suite: row.apartment_suite,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        phone_number: row.phone_number,
        primary_hero_image_url: row.primary_hero_image_url,
        average_rating: parseFloat(row.average_rating),
        total_review_count: row.total_review_count,
        total_order_count: row.total_order_count,
        is_currently_open: row.is_currently_open,
        accepts_delivery: row.accepts_delivery,
        accepts_pickup: row.accepts_pickup,
        delivery_fee: parseFloat(row.delivery_fee),
        minimum_order_amount: parseFloat(row.minimum_order_amount),
        delivery_radius_miles: parseFloat(row.delivery_radius_miles),
        estimated_prep_time_minutes: row.estimated_prep_time_minutes,
        estimated_delivery_time_minutes: row.estimated_delivery_time_minutes,
        is_featured: row.is_featured,
        featured_week_start: row.featured_week_start,
        featured_description: row.featured_description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }));

    res.json({ favorites, total_count: favorites.length });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/favorites
 * Adds restaurant to favorites
 */
app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id } = req.body;

    if (!restaurant_id) {
      return res.status(400).json(createErrorResponse('Restaurant ID required', null, 'MISSING_RESTAURANT_ID'));
    }

    // Check if already favorited
    const existing = await pool.query(
      'SELECT favorite_id FROM favorites WHERE user_id = $1 AND restaurant_id = $2',
      [req.user.user_id, restaurant_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Restaurant already in favorites', null, 'ALREADY_FAVORITED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const favorite_id = generateId('fav');
      const now = new Date().toISOString();

      const result = await client.query(
        'INSERT INTO favorites (favorite_id, user_id, restaurant_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [favorite_id, req.user.user_id, restaurant_id, now]
      );

      // Update user statistics
      await client.query(
        'UPDATE user_statistics SET total_favorites_saved = total_favorites_saved + 1, updated_at = $1 WHERE user_id = $2',
        [now, req.user.user_id]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/favorites/:restaurant_id
 * Removes restaurant from favorites
 */
app.delete('/api/favorites/:restaurant_id', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deleteResult = await client.query(
        'DELETE FROM favorites WHERE user_id = $1 AND restaurant_id = $2 RETURNING favorite_id',
        [req.user.user_id, restaurant_id]
      );

      if (deleteResult.rows.length > 0) {
        const now = new Date().toISOString();
        await client.query(
          'UPDATE user_statistics SET total_favorites_saved = GREATEST(total_favorites_saved - 1, 0), updated_at = $1 WHERE user_id = $2',
          [now, req.user.user_id]
        );
      }

      await client.query('COMMIT');

      res.json({ message: 'Restaurant removed from favorites' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/favorites (batch)
 * Removes multiple restaurants from favorites
 */
app.delete('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { restaurant_ids } = req.body;

    if (!Array.isArray(restaurant_ids) || restaurant_ids.length === 0) {
      return res.status(400).json(createErrorResponse('Restaurant IDs array required', null, 'INVALID_INPUT'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const placeholders = restaurant_ids.map((_, i) => `$${i + 2}`).join(',');
      const deleteResult = await client.query(
        `DELETE FROM favorites WHERE user_id = $1 AND restaurant_id IN (${placeholders}) RETURNING favorite_id`,
        [req.user.user_id, ...restaurant_ids]
      );

      const deleted_count = deleteResult.rows.length;

      if (deleted_count > 0) {
        const now = new Date().toISOString();
        await client.query(
          'UPDATE user_statistics SET total_favorites_saved = GREATEST(total_favorites_saved - $1, 0), updated_at = $2 WHERE user_id = $3',
          [deleted_count, now, req.user.user_id]
        );
      }

      await client.query('COMMIT');

      res.json({ message: `${deleted_count} restaurants removed from favorites` });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Batch delete favorites error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// CART ENDPOINTS (Session-Based In-Memory)
// ============================================

/*
 * Helper function to calculate cart totals
 * Applies discount, calculates tax, adds delivery fee and tip
 */
function calculateCartTotals(cart, restaurant) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.item_total_price, 0);
  
  let discount_amount = 0;
  if (cart.applied_discount) {
    if (cart.applied_discount.discount_type === 'percentage') {
      discount_amount = subtotal * (cart.applied_discount.discount_value / 100);
    } else if (cart.applied_discount.discount_type === 'fixed_amount') {
      discount_amount = cart.applied_discount.discount_value;
    }
    discount_amount = Math.min(discount_amount, subtotal);
  }

  const delivery_fee = restaurant?.delivery_fee || 0;
  const tax_rate = 0.085; // 8.5% mock tax rate
  const tax = (subtotal - discount_amount + delivery_fee) * tax_rate;
  const tip = cart.tip || 0;
  const grand_total = subtotal - discount_amount + delivery_fee + tax + tip;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount_amount: parseFloat(discount_amount.toFixed(2)),
    delivery_fee: parseFloat(delivery_fee.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    tip: parseFloat(tip.toFixed(2)),
    grand_total: parseFloat(grand_total.toFixed(2))
  };
}

/*
 * GET /api/cart
 * Returns current shopping cart for authenticated user
 */
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const cart = carts.get(req.user.user_id) || {
      restaurant_id: null,
      restaurant_name: null,
      items: [],
      applied_discount: null,
      tip: 0
    };

    let restaurant = null;
    if (cart.restaurant_id) {
      const restaurantResult = await pool.query(
        'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
        [cart.restaurant_id]
      );
      restaurant = restaurantResult.rows[0];
    }

    const totals = calculateCartTotals(cart, restaurant);

    res.json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: restaurant?.restaurant_name || null,
      items: cart.items,
      applied_discount: cart.applied_discount,
      ...totals
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/cart/items
 * Adds item to cart with customizations
 * Clears cart if switching restaurants
 */
app.post('/api/cart/items', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id, selected_size, selected_addons = [], selected_modifications = [], special_instructions, quantity } = req.body;

    if (!menu_item_id || !quantity || quantity < 1) {
      return res.status(400).json(createErrorResponse('Menu item ID and quantity required', null, 'INVALID_INPUT'));
    }

    // Get menu item details
    const itemResult = await pool.query(
      'SELECT * FROM menu_items WHERE menu_item_id = $1',
      [menu_item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Menu item not found', null, 'ITEM_NOT_FOUND'));
    }

    const menu_item = itemResult.rows[0];

    if (!menu_item.is_available) {
      return res.status(400).json(createErrorResponse('Menu item is not available', null, 'ITEM_UNAVAILABLE'));
    }

    // Get restaurant
    const restaurantResult = await pool.query(
      'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
      [menu_item.restaurant_id]
    );
    const restaurant = restaurantResult.rows[0];

    let cart = carts.get(req.user.user_id) || {
      restaurant_id: null,
      restaurant_name: null,
      items: [],
      applied_discount: null,
      tip: 0
    };

    // If switching restaurants, clear cart
    if (cart.restaurant_id && cart.restaurant_id !== restaurant.restaurant_id) {
      cart = {
        restaurant_id: null,
        restaurant_name: null,
        items: [],
        applied_discount: null,
        tip: 0
      };
    }

    cart.restaurant_id = restaurant.restaurant_id;
    cart.restaurant_name = restaurant.restaurant_name;

    // Calculate item total price
    let item_total = parseFloat(menu_item.base_price);
    let size_price_adjustment = 0;

    if (selected_size) {
      const sizeResult = await pool.query(
        'SELECT price_adjustment FROM menu_item_sizes WHERE menu_item_id = $1 AND size_name = $2',
        [menu_item_id, selected_size]
      );
      if (sizeResult.rows.length > 0) {
        size_price_adjustment = parseFloat(sizeResult.rows[0].price_adjustment);
        item_total += size_price_adjustment;
      }
    }

    for (const addon of selected_addons) {
      item_total += addon.price;
    }

    for (const mod of selected_modifications) {
      item_total += mod.price;
    }

    item_total *= quantity;

    // Add item to cart
    cart.items.push({
      menu_item_id,
      item_name: menu_item.item_name,
      base_price: parseFloat(menu_item.base_price),
      selected_size,
      size_price_adjustment,
      selected_addons,
      selected_modifications,
      special_instructions,
      quantity,
      item_total_price: parseFloat(item_total.toFixed(2))
    });

    carts.set(req.user.user_id, cart);

    const totals = calculateCartTotals(cart, restaurant);

    res.status(201).json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant_name,
      items: cart.items,
      applied_discount: cart.applied_discount,
      ...totals
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/cart/items/:menu_item_id
 * Updates cart item quantity or customizations
 */
app.patch('/api/cart/items/:menu_item_id', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id } = req.params;
    const updates = req.body;

    const cart = carts.get(req.user.user_id);
    if (!cart || cart.items.length === 0) {
      return res.status(404).json(createErrorResponse('Cart is empty', null, 'CART_EMPTY'));
    }

    const itemIndex = cart.items.findIndex(item => item.menu_item_id === menu_item_id);
    if (itemIndex === -1) {
      return res.status(404).json(createErrorResponse('Item not in cart', null, 'ITEM_NOT_IN_CART'));
    }

    const item = cart.items[itemIndex];

    // Update fields if provided
    if (updates.quantity !== undefined) {
      item.quantity = updates.quantity;
    }
    if (updates.selected_size !== undefined) {
      item.selected_size = updates.selected_size;
    }
    if (updates.selected_addons !== undefined) {
      item.selected_addons = updates.selected_addons;
    }
    if (updates.selected_modifications !== undefined) {
      item.selected_modifications = updates.selected_modifications;
    }
    if (updates.special_instructions !== undefined) {
      item.special_instructions = updates.special_instructions;
    }

    // Recalculate item total
    let item_total = item.base_price + (item.size_price_adjustment || 0);
    for (const addon of item.selected_addons) {
      item_total += addon.price;
    }
    for (const mod of item.selected_modifications) {
      item_total += mod.price;
    }
    item_total *= item.quantity;
    item.item_total_price = parseFloat(item_total.toFixed(2));

    carts.set(req.user.user_id, cart);

    const restaurantResult = await pool.query(
      'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
      [cart.restaurant_id]
    );
    const restaurant = restaurantResult.rows[0];

    const totals = calculateCartTotals(cart, restaurant);

    res.json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant_name,
      items: cart.items,
      applied_discount: cart.applied_discount,
      ...totals
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/cart/items/:menu_item_id
 * Removes item from cart
 */
app.delete('/api/cart/items/:menu_item_id', authenticateToken, async (req, res) => {
  try {
    const { menu_item_id } = req.params;

    const cart = carts.get(req.user.user_id);
    if (!cart) {
      return res.json({ message: 'Item removed from cart' });
    }

    cart.items = cart.items.filter(item => item.menu_item_id !== menu_item_id);
    carts.set(req.user.user_id, cart);

    let restaurant = null;
    if (cart.restaurant_id) {
      const restaurantResult = await pool.query(
        'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
        [cart.restaurant_id]
      );
      restaurant = restaurantResult.rows[0];
    }

    const totals = calculateCartTotals(cart, restaurant);

    res.json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant_name,
      items: cart.items,
      applied_discount: cart.applied_discount,
      ...totals
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/cart
 * Clears entire cart
 */
app.delete('/api/cart', authenticateToken, async (req, res) => {
  try {
    carts.delete(req.user.user_id);
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/cart/discount
 * Applies discount code to cart
 */
app.post('/api/cart/discount', authenticateToken, async (req, res) => {
  try {
    const { coupon_code } = req.body;

    if (!coupon_code) {
      return res.status(400).json(createErrorResponse('Coupon code required', null, 'MISSING_COUPON'));
    }

    const cart = carts.get(req.user.user_id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json(createErrorResponse('Cart is empty', null, 'CART_EMPTY'));
    }

    // Find discount
    const now = new Date().toISOString();
    const discountResult = await pool.query(
      `SELECT * FROM discounts WHERE coupon_code = $1 AND restaurant_id = $2 AND is_active = true AND start_date <= $3 AND end_date >= $3`,
      [coupon_code.toUpperCase(), cart.restaurant_id, now]
    );

    if (discountResult.rows.length === 0) {
      return res.status(400).json(createErrorResponse('Invalid or expired coupon code', null, 'INVALID_COUPON'));
    }

    const discount = discountResult.rows[0];
    discount.excluded_items = JSON.parse(discount.excluded_items);
    discount.valid_days = JSON.parse(discount.valid_days);

    // Validate minimum order
    const subtotal = cart.items.reduce((sum, item) => sum + item.item_total_price, 0);
    if (discount.minimum_order_amount && subtotal < discount.minimum_order_amount) {
      return res.status(400).json(createErrorResponse(
        `Minimum order of $${discount.minimum_order_amount} required for this coupon`,
        null,
        'MINIMUM_NOT_MET'
      ));
    }

    // Apply discount to cart
    cart.applied_discount = {
      discount_id: discount.discount_id,
      code: discount.coupon_code,
      discount_value: parseFloat(discount.discount_value),
      discount_type: discount.discount_type
    };

    carts.set(req.user.user_id, cart);

    const restaurantResult = await pool.query(
      'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
      [cart.restaurant_id]
    );
    const restaurant = restaurantResult.rows[0];

    const totals = calculateCartTotals(cart, restaurant);

    res.json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant_name,
      items: cart.items,
      applied_discount: cart.applied_discount,
      ...totals
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/cart/discount
 * Removes applied discount from cart
 */
app.delete('/api/cart/discount', authenticateToken, async (req, res) => {
  try {
    const cart = carts.get(req.user.user_id);
    if (cart) {
      cart.applied_discount = null;
      carts.set(req.user.user_id, cart);
    }

    let restaurant = null;
    if (cart?.restaurant_id) {
      const restaurantResult = await pool.query(
        'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
        [cart.restaurant_id]
      );
      restaurant = restaurantResult.rows[0];
    }

    const totals = calculateCartTotals(cart || { items: [], tip: 0 }, restaurant);

    res.json({
      restaurant_id: cart?.restaurant_id || null,
      restaurant_name: cart?.restaurant_name || null,
      items: cart?.items || [],
      applied_discount: null,
      ...totals
    });
  } catch (error) {
    console.error('Remove discount error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// ORDER ENDPOINTS
// ============================================

/*
 * POST /api/orders
 * Creates new order from cart
 * Processes payment, creates order and order_items records
 * Clears cart on success
 */
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, order_type, delivery_street_address, delivery_apartment_suite, delivery_city, delivery_state, delivery_zip_code, special_instructions, discount_id, payment_method_id, tip = 0 } = req.body;

    // Validate cart
    const cart = carts.get(req.user.user_id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json(createErrorResponse('Cart is empty', null, 'CART_EMPTY'));
    }

    if (cart.restaurant_id !== restaurant_id) {
      return res.status(400).json(createErrorResponse('Cart restaurant mismatch', null, 'RESTAURANT_MISMATCH'));
    }

    // Get restaurant details
    const restaurantResult = await pool.query('SELECT * FROM restaurants WHERE restaurant_id = $1', [restaurant_id]);
    if (restaurantResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Restaurant not found', null, 'RESTAURANT_NOT_FOUND'));
    }
    const restaurant = restaurantResult.rows[0];

    // Validate order type
    if (order_type === 'delivery' && !restaurant.accepts_delivery) {
      return res.status(400).json(createErrorResponse('Restaurant does not accept delivery', null, 'DELIVERY_NOT_ACCEPTED'));
    }
    if (order_type === 'pickup' && !restaurant.accepts_pickup) {
      return res.status(400).json(createErrorResponse('Restaurant does not accept pickup', null, 'PICKUP_NOT_ACCEPTED'));
    }

    // Validate delivery address for delivery orders
    if (order_type === 'delivery') {
      if (!delivery_street_address || !delivery_city || !delivery_state || !delivery_zip_code) {
        return res.status(400).json(createErrorResponse('Delivery address required for delivery orders', null, 'MISSING_ADDRESS'));
      }
    }

    // Calculate totals
    cart.tip = tip;
    const totals = calculateCartTotals(cart, restaurant);

    // Check minimum order
    if (totals.subtotal < restaurant.minimum_order_amount) {
      return res.status(400).json(createErrorResponse(
        `Minimum order amount is $${restaurant.minimum_order_amount}`,
        null,
        'MINIMUM_ORDER_NOT_MET'
      ));
    }

    // Process payment (mock)
    const paymentResult = await processPayment(payment_method_id, totals.grand_total, {
      user_id: req.user.user_id,
      restaurant_id,
      order_type
    });

    if (!paymentResult.success) {
      return res.status(400).json(createErrorResponse('Payment processing failed', null, 'PAYMENT_FAILED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const order_id = generateId('order');
      const now = new Date().toISOString();
      const estimated_time = new Date(Date.now() + (restaurant.estimated_delivery_time_minutes || 45) * 60 * 1000).toISOString();

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (order_id, user_id, restaurant_id, order_type, order_status, delivery_street_address, delivery_apartment_suite, delivery_city, delivery_state, delivery_zip_code, special_instructions, subtotal, discount_amount, discount_id, delivery_fee, tax, tip, grand_total, payment_method_id, payment_status, estimated_delivery_time, estimated_pickup_time, order_received_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
         RETURNING *`,
        [
          order_id, req.user.user_id, restaurant_id, order_type, 'order_received',
          delivery_street_address, delivery_apartment_suite, delivery_city, delivery_state, delivery_zip_code,
          special_instructions, totals.subtotal, totals.discount_amount, cart.applied_discount?.discount_id || null,
          totals.delivery_fee, totals.tax, totals.tip, totals.grand_total,
          payment_method_id, 'completed',
          order_type === 'delivery' ? estimated_time : null,
          order_type === 'pickup' ? estimated_time : null,
          now, now, now
        ]
      );

      // Create order items
      for (const item of cart.items) {
        const order_item_id = generateId('oitem');
        await client.query(
          `INSERT INTO order_items (order_item_id, order_id, menu_item_id, item_name, base_price, selected_size, size_price_adjustment, selected_addons, selected_modifications, special_instructions, quantity, item_total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            order_item_id, order_id, item.menu_item_id, item.item_name, item.base_price,
            item.selected_size, item.size_price_adjustment,
            JSON.stringify(item.selected_addons), JSON.stringify(item.selected_modifications),
            item.special_instructions, item.quantity, item.item_total_price, now
          ]
        );
      }

      // Update statistics
      const cuisines = JSON.parse(restaurant.cuisine_types);
      await client.query(
        `UPDATE user_statistics 
         SET total_orders_placed = total_orders_placed + 1,
             total_restaurants_visited = total_restaurants_visited + 1,
             unique_cuisines_tried = (
               SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
               FROM (
                 SELECT jsonb_array_elements_text(unique_cuisines_tried) as elem
                 UNION
                 SELECT unnest($2::text[])
               ) combined
             ),
             updated_at = $3
         WHERE user_id = $1`,
        [req.user.user_id, cuisines, now]
      );

      // Update restaurant order count
      await client.query(
        'UPDATE restaurants SET total_order_count = total_order_count + 1, updated_at = $1 WHERE restaurant_id = $2',
        [now, restaurant_id]
      );

      // Record discount redemption if used
      if (cart.applied_discount) {
        const redemption_id = generateId('redeem');
        await client.query(
          'INSERT INTO discount_redemptions (redemption_id, discount_id, user_id, order_id, redemption_method, discount_amount_applied, redeemed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [redemption_id, cart.applied_discount.discount_id, req.user.user_id, order_id, 'in_app', totals.discount_amount, now]
        );

        await client.query(
          'UPDATE discounts SET current_redemption_count = current_redemption_count + 1 WHERE discount_id = $1',
          [cart.applied_discount.discount_id]
        );

        await client.query(
          'UPDATE user_statistics SET total_discounts_redeemed = total_discounts_redeemed + 1, updated_at = $1 WHERE user_id = $2',
          [now, req.user.user_id]
        );
      }

      await client.query('COMMIT');

      // Clear cart
      carts.delete(req.user.user_id);

      // Send confirmation email
      await sendEmail(
        req.user.email,
        `Order Confirmation - Order #${order_id}`,
        `Your order from ${restaurant.restaurant_name} has been confirmed. Total: $${totals.grand_total}`
      );

      // Get order items for response
      const itemsResult = await client.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order_id]
      );

      const items = itemsResult.rows.map(item => ({
        ...item,
        selected_addons: JSON.parse(item.selected_addons),
        selected_modifications: JSON.parse(item.selected_modifications)
      }));

      res.status(201).json({
        order: orderResult.rows[0],
        items,
        restaurant: {
          restaurant_id: restaurant.restaurant_id,
          restaurant_name: restaurant.restaurant_name,
          phone_number: restaurant.phone_number,
          street_address: restaurant.street_address,
          city: restaurant.city,
          state: restaurant.state,
          zip_code: restaurant.zip_code
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/orders
 * Returns user's order history with filtering
 */
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { order_type, order_status, restaurant_id, start_date, end_date, limit = 20, offset = 0 } = req.query;

    let whereConditions = ['o.user_id = $1'];
    let queryParams = [req.user.user_id];
    let paramCounter = 2;

    if (order_type) {
      whereConditions.push(`o.order_type = $${paramCounter}`);
      queryParams.push(order_type);
      paramCounter++;
    }

    if (order_status) {
      whereConditions.push(`o.order_status = $${paramCounter}`);
      queryParams.push(order_status);
      paramCounter++;
    }

    if (restaurant_id) {
      whereConditions.push(`o.restaurant_id = $${paramCounter}`);
      queryParams.push(restaurant_id);
      paramCounter++;
    }

    if (start_date) {
      whereConditions.push(`o.created_at >= $${paramCounter}`);
      queryParams.push(start_date);
      paramCounter++;
    }

    if (end_date) {
      whereConditions.push(`o.created_at <= $${paramCounter}`);
      queryParams.push(end_date);
      paramCounter++;
    }

    const ordersQuery = `
      SELECT o.*, r.restaurant_name, r.phone_number, r.street_address, r.city, r.state, r.zip_code
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.restaurant_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const ordersResult = await pool.query(ordersQuery, queryParams);

    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.order_id]
      );

      const items = itemsResult.rows.map(item => ({
        ...item,
        selected_addons: JSON.parse(item.selected_addons),
        selected_modifications: JSON.parse(item.selected_modifications)
      }));

      orders.push({
        order: {
          order_id: order.order_id,
          user_id: order.user_id,
          restaurant_id: order.restaurant_id,
          order_type: order.order_type,
          order_status: order.order_status,
          delivery_street_address: order.delivery_street_address,
          delivery_apartment_suite: order.delivery_apartment_suite,
          delivery_city: order.delivery_city,
          delivery_state: order.delivery_state,
          delivery_zip_code: order.delivery_zip_code,
          special_instructions: order.special_instructions,
          subtotal: parseFloat(order.subtotal),
          discount_amount: parseFloat(order.discount_amount),
          discount_id: order.discount_id,
          delivery_fee: parseFloat(order.delivery_fee),
          tax: parseFloat(order.tax),
          tip: parseFloat(order.tip),
          grand_total: parseFloat(order.grand_total),
          payment_method_id: order.payment_method_id,
          payment_status: order.payment_status,
          estimated_delivery_time: order.estimated_delivery_time,
          estimated_pickup_time: order.estimated_pickup_time,
          order_received_at: order.order_received_at,
          preparing_started_at: order.preparing_started_at,
          ready_at: order.ready_at,
          out_for_delivery_at: order.out_for_delivery_at,
          delivered_at: order.delivered_at,
          cancelled_at: order.cancelled_at,
          cancellation_reason: order.cancellation_reason,
          created_at: order.created_at,
          updated_at: order.updated_at
        },
        items,
        restaurant: {
          restaurant_id: order.restaurant_id,
          restaurant_name: order.restaurant_name,
          phone_number: order.phone_number,
          street_address: order.street_address,
          city: order.city,
          state: order.state,
          zip_code: order.zip_code
        }
      });
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2)
    );

    res.json({ orders, total_count: parseInt(countResult.rows[0].count) });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/orders/:order_id
 * Returns specific order details
 */
app.get('/api/orders/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;

    const orderResult = await pool.query(
      `SELECT o.*, r.restaurant_name, r.phone_number, r.street_address, r.city, r.state, r.zip_code
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.restaurant_id
       WHERE o.order_id = $1 AND o.user_id = $2`,
      [order_id, req.user.user_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Order not found', null, 'ORDER_NOT_FOUND'));
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order_id]
    );

    const items = itemsResult.rows.map(item => ({
      ...item,
      selected_addons: JSON.parse(item.selected_addons),
      selected_modifications: JSON.parse(item.selected_modifications)
    }));

    res.json({
      order: {
        order_id: order.order_id,
        user_id: order.user_id,
        restaurant_id: order.restaurant_id,
        order_type: order.order_type,
        order_status: order.order_status,
        delivery_street_address: order.delivery_street_address,
        delivery_apartment_suite: order.delivery_apartment_suite,
        delivery_city: order.delivery_city,
        delivery_state: order.delivery_state,
        delivery_zip_code: order.delivery_zip_code,
        special_instructions: order.special_instructions,
        subtotal: parseFloat(order.subtotal),
        discount_amount: parseFloat(order.discount_amount),
        discount_id: order.discount_id,
        delivery_fee: parseFloat(order.delivery_fee),
        tax: parseFloat(order.tax),
        tip: parseFloat(order.tip),
        grand_total: parseFloat(order.grand_total),
        payment_method_id: order.payment_method_id,
        payment_status: order.payment_status,
        estimated_delivery_time: order.estimated_delivery_time,
        estimated_pickup_time: order.estimated_pickup_time,
        order_received_at: order.order_received_at,
        preparing_started_at: order.preparing_started_at,
        ready_at: order.ready_at,
        out_for_delivery_at: order.out_for_delivery_at,
        delivered_at: order.delivered_at,
        cancelled_at: order.cancelled_at,
        cancellation_reason: order.cancellation_reason,
        created_at: order.created_at,
        updated_at: order.updated_at
      },
      items,
      restaurant: {
        restaurant_id: order.restaurant_id,
        restaurant_name: order.restaurant_name,
        phone_number: order.phone_number,
        street_address: order.street_address,
        city: order.city,
        state: order.state,
        zip_code: order.zip_code
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/orders/:order_id
 * Updates order (status, tip, special instructions)
 */
app.patch('/api/orders/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const updates = req.body;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2',
      [order_id, req.user.user_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Order not found', null, 'ORDER_NOT_FOUND'));
    }

    const order = orderResult.rows[0];

    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    if (updates.tip !== undefined) {
      if (order.order_status === 'delivered') {
        return res.status(400).json(createErrorResponse('Cannot update tip after delivery', null, 'ORDER_DELIVERED'));
      }
      updateFields.push(`tip = $${paramCounter}`);
      updateValues.push(updates.tip);
      paramCounter++;

      // Recalculate grand total
      const new_grand_total = parseFloat(order.subtotal) - parseFloat(order.discount_amount) + parseFloat(order.delivery_fee) + parseFloat(order.tax) + updates.tip;
      updateFields.push(`grand_total = $${paramCounter}`);
      updateValues.push(new_grand_total);
      paramCounter++;
    }

    if (updates.special_instructions !== undefined) {
      updateFields.push(`special_instructions = $${paramCounter}`);
      updateValues.push(updates.special_instructions);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json(createErrorResponse('No valid updates provided', null, 'NO_UPDATES'));
    }

    const now = new Date().toISOString();
    updateFields.push(`updated_at = $${paramCounter}`);
    updateValues.push(now);
    paramCounter++;

    updateValues.push(order_id);
    updateValues.push(req.user.user_id);

    await pool.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = $${paramCounter} AND user_id = $${paramCounter + 1}`,
      updateValues
    );

    // Re-fetch order
    const updatedOrderResult = await pool.query(
      `SELECT o.*, r.restaurant_name, r.phone_number, r.street_address, r.city, r.state, r.zip_code
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.restaurant_id
       WHERE o.order_id = $1`,
      [order_id]
    );

    const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order_id]);
    const items = itemsResult.rows.map(item => ({
      ...item,
      selected_addons: JSON.parse(item.selected_addons),
      selected_modifications: JSON.parse(item.selected_modifications)
    }));

    const updated = updatedOrderResult.rows[0];
    res.json({
      order: {
        order_id: updated.order_id,
        user_id: updated.user_id,
        restaurant_id: updated.restaurant_id,
        order_type: updated.order_type,
        order_status: updated.order_status,
        delivery_street_address: updated.delivery_street_address,
        delivery_apartment_suite: updated.delivery_apartment_suite,
        delivery_city: updated.delivery_city,
        delivery_state: updated.delivery_state,
        delivery_zip_code: updated.delivery_zip_code,
        special_instructions: updated.special_instructions,
        subtotal: parseFloat(updated.subtotal),
        discount_amount: parseFloat(updated.discount_amount),
        discount_id: updated.discount_id,
        delivery_fee: parseFloat(updated.delivery_fee),
        tax: parseFloat(updated.tax),
        tip: parseFloat(updated.tip),
        grand_total: parseFloat(updated.grand_total),
        payment_method_id: updated.payment_method_id,
        payment_status: updated.payment_status,
        estimated_delivery_time: updated.estimated_delivery_time,
        estimated_pickup_time: updated.estimated_pickup_time,
        order_received_at: updated.order_received_at,
        preparing_started_at: updated.preparing_started_at,
        ready_at: updated.ready_at,
        out_for_delivery_at: updated.out_for_delivery_at,
        delivered_at: updated.delivered_at,
        cancelled_at: updated.cancelled_at,
        cancellation_reason: updated.cancellation_reason,
        created_at: updated.created_at,
        updated_at: updated.updated_at
      },
      items,
      restaurant: {
        restaurant_id: updated.restaurant_id,
        restaurant_name: updated.restaurant_name,
        phone_number: updated.phone_number,
        street_address: updated.street_address,
        city: updated.city,
        state: updated.state,
        zip_code: updated.zip_code
      }
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/orders/:order_id
 * Cancels an order
 */
app.delete('/api/orders/:order_id', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;
    const { cancellation_reason } = req.body;

    const orderResult = await pool.query(
      'SELECT order_id, order_status FROM orders WHERE order_id = $1 AND user_id = $2',
      [order_id, req.user.user_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Order not found', null, 'ORDER_NOT_FOUND'));
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.order_status)) {
      return res.status(400).json(createErrorResponse('Order cannot be cancelled', null, 'CANNOT_CANCEL'));
    }

    if (['ready', 'out_for_delivery'].includes(order.order_status)) {
      return res.status(400).json(createErrorResponse(
        'Order cannot be cancelled - already prepared or in transit',
        null,
        'TOO_LATE_TO_CANCEL'
      ));
    }

    const now = new Date().toISOString();
    await pool.query(
      'UPDATE orders SET order_status = $1, cancelled_at = $2, cancellation_reason = $3, updated_at = $4 WHERE order_id = $5',
      ['cancelled', now, cancellation_reason || 'User cancelled', now, order_id]
    );

    res.json({ message: 'Order cancelled successfully. Refund will be processed within 3-5 business days.' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/orders/:order_id/reorder
 * Adds items from previous order to cart
 */
app.post('/api/orders/:order_id/reorder', authenticateToken, async (req, res) => {
  try {
    const { order_id } = req.params;

    const orderResult = await pool.query(
      'SELECT restaurant_id FROM orders WHERE order_id = $1 AND user_id = $2',
      [order_id, req.user.user_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Order not found', null, 'ORDER_NOT_FOUND'));
    }

    const restaurant_id = orderResult.rows[0].restaurant_id;

    // Get order items
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order_id]
    );

    // Get restaurant
    const restaurantResult = await pool.query(
      'SELECT restaurant_id, restaurant_name, delivery_fee FROM restaurants WHERE restaurant_id = $1',
      [restaurant_id]
    );
    const restaurant = restaurantResult.rows[0];

    // Clear existing cart and create new one
    const cart = {
      restaurant_id,
      restaurant_name: restaurant.restaurant_name,
      items: [],
      applied_discount: null,
      tip: 0
    };

    for (const orderItem of itemsResult.rows) {
      cart.items.push({
        menu_item_id: orderItem.menu_item_id,
        item_name: orderItem.item_name,
        base_price: parseFloat(orderItem.base_price),
        selected_size: orderItem.selected_size,
        size_price_adjustment: parseFloat(orderItem.size_price_adjustment),
        selected_addons: JSON.parse(orderItem.selected_addons),
        selected_modifications: JSON.parse(orderItem.selected_modifications),
        special_instructions: orderItem.special_instructions,
        quantity: orderItem.quantity,
        item_total_price: parseFloat(orderItem.item_total_price)
      });
    }

    carts.set(req.user.user_id, cart);

    const totals = calculateCartTotals(cart, restaurant);

    res.json({
      restaurant_id: cart.restaurant_id,
      restaurant_name: cart.restaurant_name,
      items: cart.items,
      applied_discount: null,
      ...totals
    });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// REVIEW ENDPOINTS
// ============================================

/*
 * POST /api/reviews
 * Creates new review for restaurant
 */
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const validationResult = createReviewInputSchema.safeParse({ ...req.body, user_id: req.user.user_id });
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse('Validation failed', validationResult.error, 'VALIDATION_ERROR'));
    }

    const { restaurant_id, order_id, star_rating, review_title, review_text, is_verified_visit } = validationResult.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const review_id = generateId('review');
      const now = new Date().toISOString();

      const reviewResult = await client.query(
        `INSERT INTO reviews (review_id, user_id, restaurant_id, order_id, star_rating, review_title, review_text, is_verified_visit, helpful_count, is_edited, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, false, $9, $10)
         RETURNING *`,
        [review_id, req.user.user_id, restaurant_id, order_id, star_rating, review_title, review_text, is_verified_visit || false, now, now]
      );

      // Update restaurant rating
      await client.query(
        `UPDATE restaurants SET
         average_rating = (SELECT AVG(star_rating) FROM reviews WHERE restaurant_id = $1),
         total_review_count = total_review_count + 1,
         updated_at = $2
         WHERE restaurant_id = $1`,
        [restaurant_id, now]
      );

      // Update user statistics
      await client.query(
        'UPDATE user_statistics SET total_reviews_written = total_reviews_written + 1, updated_at = $1 WHERE user_id = $2',
        [now, req.user.user_id]
      );

      await client.query('COMMIT');

      res.status(201).json(reviewResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/reviews/:review_id
 * Returns specific review with user and photos
 */
app.get('/api/reviews/:review_id', async (req, res) => {
  try {
    const { review_id } = req.params;

    const reviewResult = await pool.query(
      `SELECT r.*, u.full_name, u.profile_picture_url
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.review_id = $1`,
      [review_id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
    }

    const row = reviewResult.rows[0];

    const photosResult = await pool.query(
      'SELECT photo_id, photo_url, display_order FROM review_photos WHERE review_id = $1 ORDER BY display_order ASC',
      [review_id]
    );

    let is_helpful_by_current_user = false;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const helpfulResult = await pool.query(
          'SELECT helpful_mark_id FROM review_helpful_marks WHERE review_id = $1 AND user_id = $2',
          [review_id, decoded.user_id]
        );
        is_helpful_by_current_user = helpfulResult.rows.length > 0;
      } catch {}
    }

    res.json({
      review: {
        review_id: row.review_id,
        user_id: row.user_id,
        restaurant_id: row.restaurant_id,
        order_id: row.order_id,
        star_rating: row.star_rating,
        review_title: row.review_title,
        review_text: row.review_text,
        is_verified_visit: row.is_verified_visit,
        helpful_count: row.helpful_count,
        is_edited: row.is_edited,
        edited_at: row.edited_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      user: {
        user_id: row.user_id,
        full_name: row.full_name,
        profile_picture_url: row.profile_picture_url
      },
      photos: photosResult.rows,
      is_helpful_by_current_user
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/reviews/:review_id
 * Updates review (within 30 days)
 */
app.patch('/api/reviews/:review_id', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;
    const updates = req.body;

    const reviewResult = await pool.query(
      'SELECT review_id, user_id, restaurant_id, created_at FROM reviews WHERE review_id = $1',
      [review_id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
    }

    const review = reviewResult.rows[0];

    if (review.user_id !== req.user.user_id) {
      return res.status(403).json(createErrorResponse('Not authorized to edit this review', null, 'UNAUTHORIZED'));
    }

    // Check 30-day edit window
    const daysSinceCreation = (Date.now() - new Date(review.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation > 30) {
      return res.status(400).json(createErrorResponse('Reviews can only be edited within 30 days', null, 'EDIT_WINDOW_EXPIRED'));
    }

    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    if (updates.star_rating !== undefined) {
      updateFields.push(`star_rating = $${paramCounter}`);
      updateValues.push(updates.star_rating);
      paramCounter++;
    }

    if (updates.review_title !== undefined) {
      updateFields.push(`review_title = $${paramCounter}`);
      updateValues.push(updates.review_title);
      paramCounter++;
    }

    if (updates.review_text !== undefined) {
      updateFields.push(`review_text = $${paramCounter}`);
      updateValues.push(updates.review_text);
      paramCounter++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json(createErrorResponse('No updates provided', null, 'NO_UPDATES'));
    }

    const now = new Date().toISOString();
    updateFields.push(`is_edited = true`);
    updateFields.push(`edited_at = $${paramCounter}`);
    updateValues.push(now);
    paramCounter++;
    updateFields.push(`updated_at = $${paramCounter}`);
    updateValues.push(now);
    paramCounter++;

    updateValues.push(review_id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE reviews SET ${updateFields.join(', ')} WHERE review_id = $${paramCounter} RETURNING *`,
        updateValues
      );

      // Recalculate restaurant rating if star_rating changed
      if (updates.star_rating !== undefined) {
        await client.query(
          `UPDATE restaurants SET average_rating = (SELECT AVG(star_rating) FROM reviews WHERE restaurant_id = $1), updated_at = $2 WHERE restaurant_id = $1`,
          [review.restaurant_id, now]
        );
      }

      await client.query('COMMIT');

      const updatedReview = await pool.query('SELECT * FROM reviews WHERE review_id = $1', [review_id]);
      res.json(updatedReview.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/reviews/:review_id
 * Deletes a review
 */
app.delete('/api/reviews/:review_id', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;

    const reviewResult = await pool.query(
      'SELECT review_id, user_id, restaurant_id FROM reviews WHERE review_id = $1',
      [review_id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
    }

    const review = reviewResult.rows[0];

    if (review.user_id !== req.user.user_id) {
      return res.status(403).json(createErrorResponse('Not authorized to delete this review', null, 'UNAUTHORIZED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM review_photos WHERE review_id = $1', [review_id]);
      await client.query('DELETE FROM review_helpful_marks WHERE review_id = $1', [review_id]);
      await client.query('DELETE FROM review_reports WHERE review_id = $1', [review_id]);
      await client.query('DELETE FROM reviews WHERE review_id = $1', [review_id]);

      const now = new Date().toISOString();
      await client.query(
        `UPDATE restaurants SET
         average_rating = COALESCE((SELECT AVG(star_rating) FROM reviews WHERE restaurant_id = $1), 0),
         total_review_count = GREATEST(total_review_count - 1, 0),
         updated_at = $2
         WHERE restaurant_id = $1`,
        [review.restaurant_id, now]
      );

      await client.query(
        'UPDATE user_statistics SET total_reviews_written = GREATEST(total_reviews_written - 1, 0), updated_at = $1 WHERE user_id = $2',
        [now, req.user.user_id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Review deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/reviews/:review_id/photos
 * Uploads photos for review
 */
app.post('/api/reviews/:review_id/photos', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;
    const { photo_urls } = req.body;

    if (!Array.isArray(photo_urls) || photo_urls.length === 0) {
      return res.status(400).json(createErrorResponse('Photo URLs array required', null, 'INVALID_INPUT'));
    }

    if (photo_urls.length > 10) {
      return res.status(400).json(createErrorResponse('Maximum 10 photos allowed', null, 'TOO_MANY_PHOTOS'));
    }

    const reviewResult = await pool.query(
      'SELECT review_id, user_id FROM reviews WHERE review_id = $1',
      [review_id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
    }

    if (reviewResult.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json(createErrorResponse('Not authorized', null, 'UNAUTHORIZED'));
    }

    const now = new Date().toISOString();
    for (let i = 0; i < photo_urls.length; i++) {
      const photo_id = generateId('rphoto');
      await pool.query(
        'INSERT INTO review_photos (photo_id, review_id, photo_url, display_order, created_at) VALUES ($1, $2, $3, $4, $5)',
        [photo_id, review_id, photo_urls[i], i, now]
      );
    }

    res.status(201).json({ message: 'Photos uploaded successfully' });
  } catch (error) {
    console.error('Upload review photos error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/reviews/:review_id/helpful
 * Marks review as helpful
 */
app.post('/api/reviews/:review_id/helpful', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;

    const existing = await pool.query(
      'SELECT helpful_mark_id FROM review_helpful_marks WHERE review_id = $1 AND user_id = $2',
      [review_id, req.user.user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Already marked as helpful', null, 'ALREADY_MARKED'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const helpful_mark_id = generateId('helpful');
      const now = new Date().toISOString();
      await client.query(
        'INSERT INTO review_helpful_marks (helpful_mark_id, review_id, user_id, created_at) VALUES ($1, $2, $3, $4)',
        [helpful_mark_id, review_id, req.user.user_id, now]
      );

      await client.query(
        'UPDATE reviews SET helpful_count = helpful_count + 1, updated_at = $1 WHERE review_id = $2',
        [now, review_id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Review marked as helpful' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/reviews/:review_id/helpful
 * Removes helpful mark from review
 */
app.delete('/api/reviews/:review_id/helpful', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const deleteResult = await client.query(
        'DELETE FROM review_helpful_marks WHERE review_id = $1 AND user_id = $2 RETURNING helpful_mark_id',
        [review_id, req.user.user_id]
      );

      if (deleteResult.rows.length > 0) {
        const now = new Date().toISOString();
        await client.query(
          'UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0), updated_at = $1 WHERE review_id = $2',
          [now, review_id]
        );
      }

      await client.query('COMMIT');

      res.json({ message: 'Helpful mark removed' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Remove helpful error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/reviews/:review_id/report
 * Reports review for moderation
 */
app.post('/api/reviews/:review_id/report', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;
    const { reason, additional_details } = req.body;

    if (!reason) {
      return res.status(400).json(createErrorResponse('Reason required', null, 'MISSING_REASON'));
    }

    const existing = await pool.query(
      'SELECT report_id FROM review_reports WHERE review_id = $1 AND reported_by_user_id = $2',
      [review_id, req.user.user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Already reported', null, 'ALREADY_REPORTED'));
    }

    const report_id = generateId('report');
    const now = new Date().toISOString();

    await pool.query(
      'INSERT INTO review_reports (report_id, review_id, reported_by_user_id, reason, additional_details, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [report_id, review_id, req.user.user_id, reason, additional_details, 'pending', now]
    );

    res.json({ message: 'Report submitted. Thank you for helping maintain quality.' });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// BADGES & VERIFICATION ENDPOINTS
// ============================================

/*
 * GET /api/badges
 * Returns all available badges
 */
app.get('/api/badges', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT badge_id, badge_name, badge_description, badge_icon_url, criteria_type, criteria_value, created_at FROM badges ORDER BY criteria_value ASC'
    );

    res.json({ badges: result.rows });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/users/me/badges
 * Returns user's earned and locked badges with progress
 */
app.get('/api/users/me/badges', authenticateToken, async (req, res) => {
  try {
    // Get all badges
    const allBadgesResult = await pool.query(
      'SELECT badge_id, badge_name, badge_description, badge_icon_url, criteria_type, criteria_value, created_at FROM badges'
    );

    // Get user's earned badges
    const earnedResult = await pool.query(
      'SELECT user_badge_id, user_id, badge_id, is_showcased, showcase_order, earned_at FROM user_badges WHERE user_id = $1',
      [req.user.user_id]
    );

    // Get user statistics for progress
    const statsResult = await pool.query(
      'SELECT * FROM user_statistics WHERE user_id = $1',
      [req.user.user_id]
    );
    const stats = statsResult.rows[0];
    if (stats) {
      stats.unique_cuisines_tried = JSON.parse(stats.unique_cuisines_tried);
    }

    const earnedBadgeIds = new Set(earnedResult.rows.map(ub => ub.badge_id));
    const earned_badges = [];
    const locked_badges = [];

    for (const badge of allBadgesResult.rows) {
      const userBadge = earnedResult.rows.find(ub => ub.badge_id === badge.badge_id);
      
      let current_value = 0;
      if (stats) {
        switch (badge.criteria_type) {
          case 'reviews_written':
            current_value = stats.total_reviews_written;
            break;
          case 'restaurants_visited':
            current_value = stats.total_restaurants_visited;
            break;
          case 'orders_placed':
            current_value = stats.total_orders_placed;
            break;
          case 'discounts_redeemed':
            current_value = stats.total_discounts_redeemed;
            break;
          case 'unique_cuisines':
            current_value = stats.unique_cuisines_tried.length;
            break;
        }
      }

      const badgeData = {
        user_badge: userBadge || null,
        badge,
        progress: {
          current_value,
          target_value: badge.criteria_value,
          percentage: Math.min(100, (current_value / badge.criteria_value) * 100)
        }
      };

      if (earnedBadgeIds.has(badge.badge_id)) {
        earned_badges.push(badgeData);
      } else {
        locked_badges.push(badgeData);
      }
    }

    res.json({ earned_badges, locked_badges });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/users/me/badges/:badge_id/showcase
 * Updates badge showcase settings
 */
app.patch('/api/users/me/badges/:badge_id/showcase', authenticateToken, async (req, res) => {
  try {
    const { badge_id } = req.params;
    const { is_showcased, showcase_order } = req.body;

    const userBadgeResult = await pool.query(
      'SELECT user_badge_id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
      [req.user.user_id, badge_id]
    );

    if (userBadgeResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Badge not earned', null, 'BADGE_NOT_EARNED'));
    }

    await pool.query(
      'UPDATE user_badges SET is_showcased = $1, showcase_order = $2 WHERE user_id = $3 AND badge_id = $4',
      [is_showcased, showcase_order, req.user.user_id, badge_id]
    );

    res.json({ message: 'Badge showcase updated' });
  } catch (error) {
    console.error('Update badge showcase error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/verifications
 * Verifies restaurant visit
 */
app.post('/api/verifications', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id, verification_method, order_id } = req.body;

    if (!restaurant_id || !verification_method) {
      return res.status(400).json(createErrorResponse('Restaurant ID and verification method required', null, 'INVALID_INPUT'));
    }

    const existing = await pool.query(
      'SELECT verification_id FROM verifications WHERE user_id = $1 AND restaurant_id = $2',
      [req.user.user_id, restaurant_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json(createErrorResponse('Visit already verified', null, 'ALREADY_VERIFIED'));
    }

    const verification_id = generateId('verify');
    const now = new Date().toISOString();

    await pool.query(
      'INSERT INTO verifications (verification_id, user_id, restaurant_id, verification_method, order_id, verified_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [verification_id, req.user.user_id, restaurant_id, verification_method, order_id, now]
    );

    res.status(201).json({
      verification_id,
      user_id: req.user.user_id,
      restaurant_id,
      verification_method,
      order_id,
      verified_at: now
    });
  } catch (error) {
    console.error('Create verification error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// ADDRESS & PAYMENT ENDPOINTS
// ============================================

/*
 * GET /api/addresses
 * Returns user's saved addresses
 */
app.get('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT address_id, user_id, address_label, street_address, apartment_suite, city, state, zip_code, is_default, created_at, updated_at FROM saved_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.user_id]
    );

    res.json({ addresses: result.rows });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/addresses
 * Creates new saved address
 */
app.post('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const validationResult = createSavedAddressInputSchema.safeParse({ ...req.body, user_id: req.user.user_id });
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse('Validation failed', validationResult.error, 'VALIDATION_ERROR'));
    }

    const { address_label, street_address, apartment_suite, city, state, zip_code, is_default } = validationResult.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (is_default) {
        await client.query(
          'UPDATE saved_addresses SET is_default = false WHERE user_id = $1',
          [req.user.user_id]
        );
      }

      const address_id = generateId('addr');
      const now = new Date().toISOString();

      const result = await client.query(
        'INSERT INTO saved_addresses (address_id, user_id, address_label, street_address, apartment_suite, city, state, zip_code, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [address_id, req.user.user_id, address_label, street_address, apartment_suite, city, state, zip_code, is_default || false, now, now]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/addresses/:address_id
 * Updates saved address
 */
app.patch('/api/addresses/:address_id', authenticateToken, async (req, res) => {
  try {
    const { address_id } = req.params;
    const updates = req.body;

    const existingResult = await pool.query(
      'SELECT address_id FROM saved_addresses WHERE address_id = $1 AND user_id = $2',
      [address_id, req.user.user_id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Address not found', null, 'ADDRESS_NOT_FOUND'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (updates.is_default === true) {
        await client.query(
          'UPDATE saved_addresses SET is_default = false WHERE user_id = $1',
          [req.user.user_id]
        );
      }

      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;

      if (updates.address_label !== undefined) {
        updateFields.push(`address_label = $${paramCounter}`);
        updateValues.push(updates.address_label);
        paramCounter++;
      }
      if (updates.street_address !== undefined) {
        updateFields.push(`street_address = $${paramCounter}`);
        updateValues.push(updates.street_address);
        paramCounter++;
      }
      if (updates.apartment_suite !== undefined) {
        updateFields.push(`apartment_suite = $${paramCounter}`);
        updateValues.push(updates.apartment_suite);
        paramCounter++;
      }
      if (updates.city !== undefined) {
        updateFields.push(`city = $${paramCounter}`);
        updateValues.push(updates.city);
        paramCounter++;
      }
      if (updates.state !== undefined) {
        updateFields.push(`state = $${paramCounter}`);
        updateValues.push(updates.state);
        paramCounter++;
      }
      if (updates.zip_code !== undefined) {
        updateFields.push(`zip_code = $${paramCounter}`);
        updateValues.push(updates.zip_code);
        paramCounter++;
      }
      if (updates.is_default !== undefined) {
        updateFields.push(`is_default = $${paramCounter}`);
        updateValues.push(updates.is_default);
        paramCounter++;
      }

      const now = new Date().toISOString();
      updateFields.push(`updated_at = $${paramCounter}`);
      updateValues.push(now);
      paramCounter++;

      updateValues.push(address_id);
      updateValues.push(req.user.user_id);

      await client.query(
        `UPDATE saved_addresses SET ${updateFields.join(', ')} WHERE address_id = $${paramCounter} AND user_id = $${paramCounter + 1}`,
        updateValues
      );

      await client.query('COMMIT');

      const updatedResult = await pool.query(
        'SELECT * FROM saved_addresses WHERE address_id = $1',
        [address_id]
      );

      res.json(updatedResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/addresses/:address_id
 * Deletes saved address
 */
app.delete('/api/addresses/:address_id', authenticateToken, async (req, res) => {
  try {
    const { address_id } = req.params;

    await pool.query(
      'DELETE FROM saved_addresses WHERE address_id = $1 AND user_id = $2',
      [address_id, req.user.user_id]
    );

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/payment-methods
 * Returns user's saved payment methods (display data only)
 */
app.get('/api/payment-methods', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT payment_method_id, user_id, payment_label, card_type, last_four_digits, expiration_month, expiration_year, billing_zip_code, is_default, created_at, updated_at FROM saved_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.user_id]
    );

    res.json({ payment_methods: result.rows });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/payment-methods
 * Saves new payment method (display data only)
 */
app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  try {
    const validationResult = createSavedPaymentMethodInputSchema.safeParse({ ...req.body, user_id: req.user.user_id });
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse('Validation failed', validationResult.error, 'VALIDATION_ERROR'));
    }

    const { payment_label, card_type, last_four_digits, expiration_month, expiration_year, billing_zip_code, is_default } = validationResult.data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (is_default) {
        await client.query(
          'UPDATE saved_payment_methods SET is_default = false WHERE user_id = $1',
          [req.user.user_id]
        );
      }

      const payment_method_id = generateId('pm');
      const now = new Date().toISOString();

      const result = await client.query(
        'INSERT INTO saved_payment_methods (payment_method_id, user_id, payment_label, card_type, last_four_digits, expiration_month, expiration_year, billing_zip_code, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [payment_method_id, req.user.user_id, payment_label, card_type, last_four_digits, expiration_month, expiration_year, billing_zip_code, is_default || false, now, now]
      );

      await client.query('COMMIT');

      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/payment-methods/:payment_method_id
 * Deletes saved payment method
 */
app.delete('/api/payment-methods/:payment_method_id', authenticateToken, async (req, res) => {
  try {
    const { payment_method_id } = req.params;

    await pool.query(
      'DELETE FROM saved_payment_methods WHERE payment_method_id = $1 AND user_id = $2',
      [payment_method_id, req.user.user_id]
    );

    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

/*
 * GET /api/notifications
 * Returns user notifications with filtering
 */
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { notification_type, is_read, limit = 50, offset = 0 } = req.query;

    let whereConditions = ['user_id = $1'];
    let queryParams = [req.user.user_id];
    let paramCounter = 2;

    if (notification_type) {
      whereConditions.push(`notification_type = $${paramCounter}`);
      queryParams.push(notification_type);
      paramCounter++;
    }

    if (is_read !== undefined) {
      whereConditions.push(`is_read = $${paramCounter}`);
      queryParams.push(is_read === 'true');
      paramCounter++;
    }

    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT notification_id, user_id, notification_type, message, action_url, is_read, created_at, read_at
       FROM notifications
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
      queryParams
    );

    const unreadResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.user_id]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/notifications/:notification_id/read
 * Marks notification as read
 */
app.patch('/api/notifications/:notification_id/read', authenticateToken, async (req, res) => {
  try {
    const { notification_id } = req.params;
    const now = new Date().toISOString();

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = $1 WHERE notification_id = $2 AND user_id = $3',
      [now, notification_id, req.user.user_id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * PATCH /api/notifications/read-all
 * Marks all notifications as read
 */
app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const now = new Date().toISOString();

    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = $1 WHERE user_id = $2 AND is_read = false',
      [now, req.user.user_id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/notifications/:notification_id
 * Deletes single notification
 */
app.delete('/api/notifications/:notification_id', authenticateToken, async (req, res) => {
  try {
    const { notification_id } = req.params;

    await pool.query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2',
      [notification_id, req.user.user_id]
    );

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/notifications
 * Clears all notifications
 */
app.delete('/api/notifications', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [req.user.user_id]
    );

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// RECOMMENDATIONS & WEEKLY PICKS
// ============================================

/*
 * GET /api/recommendations
 * Returns personalized restaurant recommendations
 * Based on order history, favorites, and user preferences
 */
app.get('/api/recommendations', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get user's order history to find preferred cuisines
    const orderHistoryResult = await pool.query(
      `SELECT DISTINCT r.cuisine_types
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.restaurant_id
       WHERE o.user_id = $1
       LIMIT 50`,
      [req.user.user_id]
    );

    const preferredCuisines = new Set();
    orderHistoryResult.rows.forEach(row => {
      const cuisines = JSON.parse(row.cuisine_types);
      cuisines.forEach(c => preferredCuisines.add(c));
    });

    // Get restaurants user hasn't ordered from
    const orderedRestaurantsResult = await pool.query(
      'SELECT DISTINCT restaurant_id FROM orders WHERE user_id = $1',
      [req.user.user_id]
    );
    const orderedRestaurantIds = orderedRestaurantsResult.rows.map(r => r.restaurant_id);

    // Get dismissed recommendations
    const dismissedResult = await pool.query(
      'SELECT restaurant_id FROM dismissed_recommendations WHERE user_id = $1 AND dismissed_until > $2',
      [req.user.user_id, new Date().toISOString()]
    );
    const dismissedIds = dismissedResult.rows.map(r => r.restaurant_id);

    // Build recommendations query
    let recommendationsQuery = `
      SELECT r.*, 0 as relevance_score
      FROM restaurants r
      WHERE r.is_active = true
    `;

    const excludedIds = [...orderedRestaurantIds, ...dismissedIds];
    if (excludedIds.length > 0) {
      recommendationsQuery += ` AND r.restaurant_id NOT IN (${excludedIds.map((_, i) => `$${i + 1}`).join(',')})`;
    }

    recommendationsQuery += ` ORDER BY r.average_rating DESC, r.total_order_count DESC LIMIT $${excludedIds.length + 1}`;

    const recommendationsResult = await pool.query(
      recommendationsQuery,
      [...excludedIds, limit]
    );

    const recommendations = recommendationsResult.rows.map(r => {
      const cuisines = JSON.parse(r.cuisine_types);
      let reason = 'New restaurant you might like';
      
      const hasPreferredCuisine = cuisines.some(c => preferredCuisines.has(c));
      if (hasPreferredCuisine) {
        reason = `Based on your love for ${cuisines[0]} cuisine`;
      } else if (r.is_featured) {
        reason = 'Featured restaurant this week';
      } else if (r.total_order_count > 1000) {
        reason = 'Popular in your area';
      }

      return {
        restaurant: {
          ...r,
          cuisine_types: cuisines
        },
        reason
      };
    });

    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * POST /api/recommendations/dismiss
 * Dismisses recommendation for 30 days
 */
app.post('/api/recommendations/dismiss', authenticateToken, async (req, res) => {
  try {
    const { restaurant_id } = req.body;

    if (!restaurant_id) {
      return res.status(400).json(createErrorResponse('Restaurant ID required', null, 'MISSING_RESTAURANT_ID'));
    }

    const dismissal_id = generateId('dismiss');
    const now = new Date().toISOString();
    const dismissed_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      'INSERT INTO dismissed_recommendations (dismissal_id, user_id, restaurant_id, dismissed_until, created_at) VALUES ($1, $2, $3, $4, $5)',
      [dismissal_id, req.user.user_id, restaurant_id, dismissed_until, now]
    );

    res.json({ message: 'Recommendation dismissed' });
  } catch (error) {
    console.error('Dismiss recommendation error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/weekly-picks
 * Returns weekly local picks
 */
app.get('/api/weekly-picks', async (req, res) => {
  try {
    const week_of = req.query.week_of || new Date().toISOString().split('T')[0];

    const picksResult = await pool.query(
      `SELECT p.pick_id, p.restaurant_id, p.week_start_date, p.week_end_date, p.featured_description, p.display_order, p.selection_criteria, p.created_at, r.*
       FROM weekly_local_picks p
       JOIN restaurants r ON p.restaurant_id = r.restaurant_id
       WHERE p.week_start_date <= $1 AND p.week_end_date >= $1
       ORDER BY p.display_order ASC`,
      [week_of]
    );

    const picks = picksResult.rows.map(row => ({
      pick: {
        pick_id: row.pick_id,
        restaurant_id: row.restaurant_id,
        week_start_date: row.week_start_date,
        week_end_date: row.week_end_date,
        featured_description: row.featured_description,
        display_order: row.display_order,
        selection_criteria: row.selection_criteria,
        created_at: row.created_at
      },
      restaurant: {
        restaurant_id: row.restaurant_id,
        restaurant_name: row.restaurant_name,
        description: row.description,
        cuisine_types: JSON.parse(row.cuisine_types),
        price_range: row.price_range,
        street_address: row.street_address,
        apartment_suite: row.apartment_suite,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        phone_number: row.phone_number,
        primary_hero_image_url: row.primary_hero_image_url,
        average_rating: parseFloat(row.average_rating),
        total_review_count: row.total_review_count,
        total_order_count: row.total_order_count,
        is_currently_open: row.is_currently_open,
        accepts_delivery: row.accepts_delivery,
        accepts_pickup: row.accepts_pickup,
        delivery_fee: parseFloat(row.delivery_fee),
        minimum_order_amount: parseFloat(row.minimum_order_amount),
        delivery_radius_miles: parseFloat(row.delivery_radius_miles),
        estimated_prep_time_minutes: row.estimated_prep_time_minutes,
        estimated_delivery_time_minutes: row.estimated_delivery_time_minutes,
        is_featured: row.is_featured,
        featured_week_start: row.featured_week_start,
        featured_description: row.featured_description,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }));

    const week_start_date = picks.length > 0 ? picks[0].pick.week_start_date : week_of;
    const week_end_date = picks.length > 0 ? picks[0].pick.week_end_date : week_of;

    res.json({ picks, week_start_date, week_end_date });
  } catch (error) {
    console.error('Get weekly picks error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// SEARCH ENDPOINTS
// ============================================

/*
 * GET /api/search/suggestions
 * Returns autocomplete suggestions for search
 */
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = [];

    // Restaurant name suggestions
    const restaurantResult = await pool.query(
      'SELECT restaurant_id, restaurant_name FROM restaurants WHERE restaurant_name ILIKE $1 AND is_active = true LIMIT $2',
      [`%${query}%`, Math.floor(limit / 2)]
    );

    restaurantResult.rows.forEach(r => {
      suggestions.push({
        type: 'restaurant',
        value: r.restaurant_name,
        restaurant_id: r.restaurant_id
      });
    });

    // Cuisine suggestions (unique from restaurants)
    const cuisineResult = await pool.query(
      `SELECT DISTINCT jsonb_array_elements_text(cuisine_types) as cuisine
       FROM restaurants
       WHERE is_active = true
       LIMIT ${Math.floor(limit / 2)}`
    );

    const uniqueCuisines = new Set();
    cuisineResult.rows.forEach(r => {
      const cuisine = r.cuisine;
      if (cuisine.toLowerCase().includes(query.toLowerCase()) && !uniqueCuisines.has(cuisine)) {
        uniqueCuisines.add(cuisine);
        suggestions.push({
          type: 'cuisine',
          value: cuisine,
          restaurant_id: null
        });
      }
    });

    res.json({ suggestions: suggestions.slice(0, parseInt(limit)) });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * GET /api/search/recent
 * Returns user's recent searches
 */
app.get('/api/search/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await pool.query(
      'SELECT search_id, user_id, search_query, search_type, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user.user_id, limit]
    );

    res.json({ searches: result.rows });
  } catch (error) {
    console.error('Get recent searches error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

/*
 * DELETE /api/search/recent
 * Clears search history
 */
app.delete('/api/search/recent', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM search_history WHERE user_id = $1',
      [req.user.user_id]
    );

    res.json({ message: 'Search history cleared' });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_ERROR'));
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// SPA ROUTING
// ============================================

// Catch-all route for SPA routing (excludes /api)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app, pool };

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Local Eats API server running on port ${port}`);
  console.log(`📍 API endpoints: http://localhost:${port}/api`);
  console.log(`🌐 Frontend: http://localhost:${port}`);
});
