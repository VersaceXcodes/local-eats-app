import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import axios from 'axios';

const UV_Login: React.FC = () => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email: string | null;
    password: string | null;
  }>({ email: null, password: null });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================================================
  // ROUTER HOOKS
  // ============================================================================
  
  const navigate = useNavigate();
  const location = useLocation();

  // Extract redirect URL from query params or location state
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect') || ((location.state as any)?.from) || '/';

  // ============================================================================
  // STORE SELECTORS (CRITICAL: Individual selectors to avoid infinite loops)
  // ============================================================================
  
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  const validateEmail = (value: string): string | null => {
    if (!value) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (!value) {
      return 'Password is required';
    }
    return null;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setValidationErrors((prev) => ({ ...prev, email: error }));
  };

  const handlePasswordBlur = () => {
    const error = validatePassword(password);
    setValidationErrors((prev) => ({ ...prev, password: error }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear errors when user types
    if (validationErrors.email) {
      setValidationErrors((prev) => ({ ...prev, email: null }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPassword(newValue);
    // Clear errors when user types
    if (validationErrors.password) {
      setValidationErrors((prev) => ({ ...prev, password: null }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submission
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setValidationErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }

    setIsLoading(true);
    setGeneralError(null);

    try {
      // Make API call with remember_me parameter
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/login`,
        {
          email,
          password,
          remember_me: rememberMe,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { user, auth_token } = response.data;

      // Manually update Zustand store with authenticated user data
      useAppStore.setState(() => ({
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

      // Navigate to intended destination or home
      navigate(redirectUrl, { replace: true });
    } catch (error: any) {
      setIsLoading(false);

      // Handle authentication errors
      if (error.response?.status === 401) {
        // Generic error message for security (prevent email enumeration)
        setGeneralError('Invalid email or password');
      } else if (!error.response) {
        // Network error
        setGeneralError('Unable to connect. Please check your network and try again.');
      } else if (error.response?.data?.message) {
        // Server error message
        setGeneralError(error.response.data.message);
      } else {
        // Generic fallback
        setGeneralError('An error occurred. Please try again.');
      }

      // Clear password field on error (security best practice)
      setPassword('');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10 animate-slow-zoom"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80')",
              filter: 'blur(2px)'
            }}
          ></div>
          <div className="absolute top-0 -right-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-20 left-10 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden transform transition-all duration-300 hover:shadow-3xl relative z-10">
          {/* Header Section with Food Image */}
          <div className="relative">
            <div 
              className="h-40 bg-cover bg-center"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80')"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-orange-600/90 via-red-500/85 to-red-600/90"></div>
              {/* Decorative food icons */}
              <div className="absolute top-4 left-4 text-white/30 text-4xl">🍕</div>
              <div className="absolute top-6 right-8 text-white/20 text-3xl">🍔</div>
              <div className="absolute bottom-4 right-4 text-white/25 text-3xl">🌮</div>
            </div>
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl border-4 border-white ring-4 ring-orange-100">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="px-8 pt-14 pb-6 text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">Welcome Back</h1>
            <p className="text-gray-600 leading-relaxed">Sign in to continue your culinary journey</p>
          </div>

          {/* Form Section */}
          <form className="px-8 pb-8" onSubmit={handleSubmit} noValidate>
            {/* General Error Message */}
            {generalError && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
                <p className="text-sm">{generalError}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="you@example.com"
                data-testid="login-email-input"
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  validationErrors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                    : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                } focus:outline-none text-gray-900 placeholder-gray-500 bg-white`}
                aria-invalid={validationErrors.email ? 'true' : 'false'}
                aria-describedby={validationErrors.email ? 'email-error' : undefined}
              />
              {validationErrors.email && (
                <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <Link
                  to="/password-reset"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter your password"
                  data-testid="login-password-input"
                  className={`w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all duration-200 ${
                    validationErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                  } focus:outline-none text-gray-900 placeholder-gray-500 bg-white`}
                  aria-invalid={validationErrors.password ? 'true' : 'false'}
                  aria-describedby={validationErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {validationErrors.password && (
                <p id="password-error" className="mt-2 text-sm text-red-600" role="alert">
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2 transition-colors duration-200"
                />
                <span className="ml-2 text-sm text-gray-700">Remember me for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit-button"
              aria-label="Log In"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing you in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Log In
                </span>
              )}
            </button>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 underline decoration-2 underline-offset-2"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
            
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Quick access</span>
              </div>
            </div>
            
            {/* Additional Help Links */}
            <div className="flex justify-center gap-6 text-xs text-gray-500">
              <Link to="/terms" className="hover:text-gray-700 transition-colors">Terms</Link>
              <span className="text-gray-300">•</span>
              <Link to="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
              <span className="text-gray-300">•</span>
              <a href="mailto:support@localeats.com" className="hover:text-gray-700 transition-colors">Support</a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_Login;