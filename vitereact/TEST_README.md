# E2E Authentication Tests

This directory contains real API E2E tests for the authentication flow using Vitest.

## Prerequisites

1. **Backend server must be running** at `http://localhost:3000` (or the URL specified in `.env.test`)
2. Database must be accessible and seeded with test data
3. Backend JSONB parsing bug has been fixed (see Backend Fixes section)

## Configuration

### Files Created/Updated

- **`vitest.config.ts`** - Vitest configuration with jsdom environment, path aliases, and 30s timeout
- **`src/test/setup.ts`** - Test setup file that imports `@testing-library/jest-dom`
- **`.env.test`** - Environment variables for tests (VITE_API_BASE_URL)
- **`src/__tests__/auth.e2e.test.tsx`** - E2E auth test suite
- **`package.json`** - Added `test` and `test:ui` scripts

### Environment Variables

Create or verify `.env.test` in the root of `/app/vitereact/`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Running the Tests

### Start the Backend Server

From `/app/backend`:

```bash
npm install
npm start
```

The server should be running at `http://localhost:3000`.

### Run E2E Tests

From `/app/vitereact`:

```bash
# Run all tests
npm test

# Run specific test file
npm test src/__tests__/auth.e2e.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run tests with verbose output
npm test -- --reporter=verbose
```

## Test Flow

The E2E auth test performs the following steps:

1. **Register** a new user with a unique timestamped email
   - POST `/api/auth/signup`
   - Validates response includes `auth_token` and `user` object
   - Updates Zustand store with authenticated state

2. **Logout** the user
   - Calls `logout_user()` from Zustand store
   - Validates store is cleared (no token, not authenticated)

3. **Sign In** the same user via the login form
   - Renders `UV_Login` component
   - Fills in email and password fields
   - Clicks submit button
   - Waits for loading state
   - Validates Zustand store reflects authenticated state

## Store Architecture

The tests interact with Zustand store at `/app/vitereact/src/store/main.tsx`:

### Auth State Shape

```typescript
authentication_state: {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
  };
  error_message: string | null;
}
```

### Auth Actions

- `register_user(email, password, full_name, phone_number?)`
- `login_user(email, password)`
- `logout_user()`
- `initialize_auth()`

## Backend API Endpoints

From `/app/backend/server.ts`:

### POST `/api/auth/signup`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Test User",
  "phone_number": null,
  "profile_picture_url": null
}
```

**Note:** Both `phone_number` and `profile_picture_url` must be present (can be `null`) due to Zod schema validation.

**Response:**
```json
{
  "user": {
    "user_id": "user_...",
    "email": "user@example.com",
    "full_name": "Test User",
    "phone_number": "+1-555-1234",
    "profile_picture_url": null,
    "is_verified": false,
    "created_at": "2024-01-01T00:00:00Z",
    ...
  },
  "auth_token": "eyJhbGc..."
}
```

### POST `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "remember_me": false // optional
}
```

**Response:**
```json
{
  "user": { ... },
  "auth_token": "eyJhbGc..."
}
```

**Note:** The backend uses **NO PASSWORD HASHING** (development mode). Passwords are stored as plaintext and compared directly.

## Database Schema

From `/app/backend/db.sql`:

```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,  -- UNIQUE constraint
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    ...
);
```

**Key Constraints:**
- `email` must be unique
- `email` and `password` are required
- `full_name` is required

## Test Patterns

### Unique Email Generation

```typescript
const uniqueEmail = `user${Date.now()}@example.com`;
```

This prevents duplicate email errors when running tests multiple times.

### Store State Management

```typescript
// Reset store before each test
beforeEach(() => {
  localStorage.clear();
  useAppStore.setState((state) => ({
    authentication_state: {
      ...state.authentication_state,
      auth_token: null,
      current_user: null,
      authentication_status: {
        is_authenticated: false,
        is_loading: false,
      },
      error_message: null,
    },
  }));
});
```

### Resilient Selectors

```typescript
// Find email input with flexible regex
const emailInput = await screen.findByLabelText(/email address/i);

// Find password input (exact match to avoid confusion with "Confirm Password")
const passwordInput = await screen.findByLabelText(/^password$/i);

// Find submit button with flexible text matching
const submitButton = await screen.findByRole('button', { 
  name: /log in/i 
});
```

### Waiting for Async State

```typescript
await waitFor(
  () => {
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
    expect(state.authentication_state.auth_token).toBeTruthy();
  },
  { timeout: 20000 }
);
```

## Backend Fixes Required

The following bugs were fixed in `/app/backend/server.ts` to make the tests work:

### JSONB Parsing Bug

**Issue:** PostgreSQL's JSONB columns automatically return parsed JSON objects, but the code was calling `JSON.parse()` on already-parsed objects, causing:
```
SyntaxError: Unexpected token o in JSON at position 1
```

**Fixed Lines:**
- Line 287: Removed `user.notification_preferences = JSON.parse(user.notification_preferences);`
- Line 337: Removed `user.notification_preferences = JSON.parse(user.notification_preferences);` 
- Line 491: Removed `user.notification_preferences = JSON.parse(user.notification_preferences);`
- Line 576: Removed `user.notification_preferences = JSON.parse(user.notification_preferences);`
- Line 600: Removed `stats.unique_cuisines_tried = JSON.parse(stats.unique_cuisines_tried);`
- Line 3131: Removed `stats.unique_cuisines_tried = JSON.parse(stats.unique_cuisines_tried);`

**Root Cause:** When inserting data, the code correctly uses `JSON.stringify()` for JSONB columns. However, when reading, PostgreSQL's node-postgres driver automatically parses JSONB to objects. The extra `JSON.parse()` call attempted to parse an already-parsed object, converting it to string `"[object Object]"` first, causing the parse error.

## Troubleshooting

### Backend Not Running

**Error:** `Registration failed (400/500): ...`

**Solution:** Start the backend server:
```bash
cd /app/backend
npm start
```

### Database Connection Issues

**Error:** Database connection errors in backend logs

**Solution:** Verify database credentials in `/app/backend/.env`:
```env
DATABASE_URL=postgresql://...
# OR
PGHOST=...
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
```

### Email Already Exists

**Error:** `Email already registered`

**Solution:** The test generates unique emails with timestamps, but if running in rapid succession, you may encounter collisions. Wait 1 second between runs or manually increment the email.

### Alias Resolution Errors

**Error:** `Failed to resolve import "@/..."`

**Solution:** Verify `vitest.config.ts` includes resolve aliases:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### Test Timeout

**Error:** Test exceeds 35s timeout

**Solution:** Increase timeout in test or vitest config:
```typescript
it('test name', async () => {
  // test code
}, 60000); // 60 second timeout
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install backend deps
        working-directory: ./backend
        run: npm install
      
      - name: Start backend
        working-directory: ./backend
        run: npm start &
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/testdb
      
      - name: Wait for backend
        run: npx wait-on http://localhost:3000/api/restaurants --timeout 30000
      
      - name: Install frontend deps
        working-directory: ./vitereact
        run: npm install
      
      - name: Run E2E tests
        working-directory: ./vitereact
        run: npm test -- --run
        env:
          VITE_API_BASE_URL: http://localhost:3000
```

## Best Practices

1. **Always reset store state** in `beforeEach` to ensure test isolation
2. **Generate unique emails** using timestamps to avoid conflicts
3. **Use flexible selectors** (regex) for labels and buttons
4. **Wait for async updates** using `waitFor` with appropriate timeouts
5. **Never mock network calls** - these are E2E tests that hit the real API
6. **Test the store directly** - validate Zustand state changes, not just DOM
7. **Keep tests independent** - each test should be runnable in isolation

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Zustand Testing Guide](https://docs.pmnd.rs/zustand/guides/testing)
