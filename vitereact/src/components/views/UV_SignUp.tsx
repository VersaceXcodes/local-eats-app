import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ValidationErrors {
  full_name: string | null;
  email: string | null;
  password: string | null;
  confirm_password: string | null;
  phone_number: string | null;
  terms_accepted: string | null;
}

interface PasswordStrength {
  level: number; // 0 = none, 1 = weak, 2 = medium, 3 = strong
  label: string;
  color: string;
}

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

const validateFullName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.length > 50) {
    return 'Name must not exceed 50 characters';
  }
  // Allow letters, spaces, hyphens, apostrophes
  const namePattern = /^[a-zA-Z\s'-]+$/;
  if (!namePattern.test(name)) {
    return 'Name contains invalid characters';
  }
  return null;
};

const validateEmailFormat = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return 'Please enter a valid email address';
  }
  if (email.length > 255) {
    return 'Email must not exceed 255 characters';
  }
  return null;
};

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { level: 0, label: '', color: '' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { level: 1, label: 'Weak', color: 'bg-red-500' };
  } else if (score <= 4) {
    return { level: 2, label: 'Medium', color: 'bg-orange-500' };
  } else {
    return { level: 3, label: 'Strong', color: 'bg-green-500' };
  }
};

const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must include at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }
  return null;
};

const validatePhoneNumber = (phone: string): string | null => {
  if (!phone.trim()) {
    return null; // Phone is optional
  }
  // International phone format: ^\+?[1-9]\d{1,14}$
  const phonePattern = /^\+?[1-9]\d{1,14}$/;
  if (!phonePattern.test(phone.replace(/[\s-]/g, ''))) {
    return 'Please enter a valid phone number';
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // CRITICAL: Individual selectors to prevent infinite loops
  const registerUser = useAppStore((state) => state.register_user);
  const authError = useAppStore((state) => state.authentication_state.error_message);
  const isAuthLoading = useAppStore((state) => state.authentication_state.authentication_status.is_loading);
  const isAuthenticated = useAppStore((state) => state.authentication_state.authentication_status.is_authenticated);
  const clearAuthError = useAppStore((state) => state.clear_auth_error);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    full_name: null,
    email: null,
    password: null,
    confirm_password: null,
    phone_number: null,
    terms_accepted: null,
  });

  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    level: 0,
    label: '',
    color: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // Clear auth error on mount
  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  // Calculate password strength in real-time
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  // ============================================================================
  // VALIDATION HANDLERS
  // ============================================================================

  const handleFullNameBlur = () => {
    const error = validateFullName(fullName);
    setValidationErrors((prev) => ({ ...prev, full_name: error }));
  };

  const handleEmailBlur = () => {
    const error = validateEmailFormat(email);
    setValidationErrors((prev) => ({ ...prev, email: error }));
  };

  const handlePasswordBlur = () => {
    const error = validatePassword(password);
    setValidationErrors((prev) => ({ ...prev, password: error }));
  };

  const handleConfirmPasswordBlur = () => {
    if (!confirmPasswordTouched) {
      setConfirmPasswordTouched(true);
    }
    validateConfirmPassword();
  };

  const validateConfirmPassword = () => {
    if (confirmPasswordTouched) {
      const error = password !== confirmPassword ? 'Passwords do not match' : null;
      setValidationErrors((prev) => ({ ...prev, confirm_password: error }));
    }
  };

  const handlePhoneBlur = () => {
    const error = validatePhoneNumber(phoneNumber);
    setValidationErrors((prev) => ({ ...prev, phone_number: error }));
  };

  // Real-time confirm password validation
  useEffect(() => {
    validateConfirmPassword();
  }, [confirmPassword, password, confirmPasswordTouched]);

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  const isFormValid = (): boolean => {
    // Check all required fields are filled
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword || !termsAccepted) {
      return false;
    }

    // Validate fields programmatically (don't rely on validation errors state which may not be set yet)
    if (validateFullName(fullName)) return false;
    if (validateEmailFormat(email)) return false;
    if (validatePassword(password)) return false;
    if (password !== confirmPassword) return false;
    if (phoneNumber && validatePhoneNumber(phoneNumber)) return false;

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Clear previous errors
    clearAuthError();

    // Validate all fields
    const nameError = validateFullName(fullName);
    const emailError = validateEmailFormat(email);
    const passwordError = validatePassword(password);
    const confirmError = password !== confirmPassword ? 'Passwords do not match' : null;
    const phoneError = phoneNumber ? validatePhoneNumber(phoneNumber) : null;
    const termsError = !termsAccepted ? 'You must accept the Terms and Privacy Policy to create an account' : null;

    setValidationErrors({
      full_name: nameError,
      email: emailError,
      password: passwordError,
      confirm_password: confirmError,
      phone_number: phoneError,
      terms_accepted: termsError,
    });

    // Stop if any validation errors
    if (nameError || emailError || passwordError || confirmError || phoneError || termsError) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Call global store register action
      const phone = phoneNumber.trim();
      await registerUser(
        email.trim(),
        password,
        fullName.trim(),
        phone ? phone : undefined
      );

      // Success - store handles redirect via isAuthenticated state change
      // The useEffect above will trigger navigation
    } catch (error: any) {
      // Error is already set in store's authentication_state.error_message
      console.error('Registration failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
        e.preventDefault();
        if (isFormValid() && !isSubmitting && !isAuthLoading) {
          handleSubmit();
        }
      }
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated Background with Food Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-10 animate-slow-zoom"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1600&q=80')",
              filter: 'blur(2px)'
            }}
          ></div>
          {/* Animated gradient blobs */}
          <div className="absolute top-10 -right-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-20 left-10 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 sm:p-10 relative z-10">
          {/* Enhanced Logo with Food Icons */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-2xl transform transition-transform hover:scale-110 hover:rotate-12 duration-300 ring-4 ring-orange-100">
                <div className="text-4xl">🍽️</div>
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent leading-tight">
              Join Local Eats
            </h2>
            <p className="mt-2 text-sm text-gray-600 flex items-center justify-center gap-2">
              <span>Discover hidden gems and earn rewards</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Free forever</span>
            </p>
            {/* Quick benefits */}
            <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span>🎁</span>
                <span>Exclusive deals</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span>Earn rewards</span>
              </div>
            </div>
          </div>

          {/* General Error Message */}
          {authError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-semibold">Registration Failed</p>
                <p className="text-sm text-red-700 mt-1">{authError}</p>
              </div>
              <button 
                onClick={clearAuthError}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (validationErrors.full_name) {
                    setValidationErrors((prev) => ({ ...prev, full_name: null }));
                  }
                }}
                onBlur={handleFullNameBlur}
                placeholder="John Smith"
                data-testid="signup-fullname-input"
                className={`block w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  validationErrors.full_name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                } focus:outline-none focus:ring-4 text-gray-900 placeholder-gray-400 bg-white`}
              />
              {validationErrors.full_name && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.full_name}</p>
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: null }));
                  }
                }}
                onBlur={handleEmailBlur}
                placeholder="john@example.com"
                data-testid="signup-email-input"
                className={`block w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  validationErrors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                } focus:outline-none focus:ring-4 text-gray-900 placeholder-gray-400 bg-white`}
              />
              {validationErrors.email && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.email}</p>
                </div>
              )}
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (validationErrors.phone_number) {
                    setValidationErrors((prev) => ({ ...prev, phone_number: null }));
                  }
                }}
                onBlur={handlePhoneBlur}
                placeholder="+1 234 567 8900"
                className={`block w-full px-4 py-3 rounded-lg border-2 transition-all ${
                  validationErrors.phone_number
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                } focus:outline-none focus:ring-4 text-gray-900 placeholder-gray-400 bg-white`}
              />
              {validationErrors.phone_number && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.phone_number}</p>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: null }));
                    }
                  }}
                  onBlur={handlePasswordBlur}
                  placeholder="••••••••"
                  className={`block w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all ${
                    validationErrors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                  } focus:outline-none focus:ring-4 text-gray-900 placeholder-gray-400 bg-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password strength:</span>
                    <span
                      className={`text-xs font-medium ${
                        passwordStrength.level === 1
                          ? 'text-red-600'
                          : passwordStrength.level === 2
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {validationErrors.password && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.password}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (validationErrors.confirm_password) {
                      setValidationErrors((prev) => ({ ...prev, confirm_password: null }));
                    }
                  }}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder="••••••••"
                  className={`block w-full px-4 py-3 pr-12 rounded-lg border-2 transition-all ${
                    validationErrors.confirm_password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : confirmPasswordTouched && !validationErrors.confirm_password && confirmPassword
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-100'
                      : 'border-gray-200 focus:border-orange-500 focus:ring-orange-100'
                  } focus:outline-none focus:ring-4 text-gray-900 placeholder-gray-400 bg-white`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {validationErrors.confirm_password && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.confirm_password}</p>
                </div>
              )}

              {confirmPasswordTouched && !validationErrors.confirm_password && confirmPassword && (
                <div className="mt-1.5 flex items-center gap-1.5 text-green-600">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">Passwords match</p>
                </div>
              )}
            </div>

            {/* Terms & Privacy Checkbox */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (validationErrors.terms_accepted) {
                      setValidationErrors((prev) => ({ ...prev, terms_accepted: null }));
                    }
                  }}
                  className="mt-1 w-4 h-4 rounded border-2 border-gray-300 text-orange-600 focus:ring-4 focus:ring-orange-100 focus:outline-none cursor-pointer"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 font-medium underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>
              {validationErrors.terms_accepted && (
                <div className="mt-1.5 flex items-center gap-1.5 text-red-600">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{validationErrors.terms_accepted}</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isAuthLoading}
              id="create-account-button"
              data-testid="signup-submit-button"
              aria-label="Create Account"
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-3.5 px-6 rounded-lg shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-orange-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              {isSubmitting || isAuthLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
                  Creating your account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Create Free Account
                </span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-orange-600 hover:text-orange-700 font-bold underline decoration-2 underline-offset-2 transition-all duration-200 hover:underline-offset-4"
              >
                Log in here
              </Link>
            </p>
          </div>

          {/* Footer Links */}
          <div className="mt-6 flex justify-center gap-6 text-xs text-gray-500">
            <Link to="/terms" className="hover:text-gray-700 transition-colors hover:underline">Terms</Link>
            <span className="text-gray-300">•</span>
            <Link to="/privacy" className="hover:text-gray-700 transition-colors hover:underline">Privacy</Link>
            <span className="text-gray-300">•</span>
            <a href="mailto:support@localeats.com" className="hover:text-gray-700 transition-colors hover:underline">Support</a>
          </div>
          
          {/* Trust Badge */}
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure & encrypted
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SignUp;