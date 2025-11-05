import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PasswordStrength {
  level: number;
  label: string;
  color: string;
  bgColor: string;
  width: string;
}

interface ValidationErrors {
  new_password: string | null;
  confirm_password: string | null;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (password.length === 0) {
    return { level: 0, label: '', color: '', bgColor: '', width: '0%' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(password);
  const length = password.length;

  // Level 0 (Weak): < 8 chars OR missing letter OR missing number
  if (length < 8 || !hasLetter || !hasNumber) {
    return {
      level: 0,
      label: 'Weak',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      width: '25%'
    };
  }

  // Level 1 (Weak): Exactly 8 chars with letter and number
  if (length === 8) {
    return {
      level: 1,
      label: 'Weak',
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      width: '25%'
    };
  }

  // Level 2 (Medium): 8-12 chars with letter, number, and (special char OR uppercase)
  if (length <= 12 && (hasSpecialChar || hasUpperCase)) {
    return {
      level: 2,
      label: 'Medium',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      width: '66%'
    };
  }

  // Level 3 (Strong): 12+ chars with letter, number, uppercase, and special char
  if (length >= 12 && hasUpperCase && hasSpecialChar) {
    return {
      level: 3,
      label: 'Strong',
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      width: '100%'
    };
  }

  // Default to Medium for anything 8+ with basic requirements
  return {
    level: 2,
    label: 'Medium',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    width: '66%'
  };
};

const validatePassword = (password: string): string | null => {
  if (password.length === 0) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must include at least one letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must include at least one number';
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ResetPassword: React.FC = () => {
  const { reset_token } = useParams<{ reset_token: string }>();
  const navigate = useNavigate();

  // State variables
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    level: 0,
    label: '',
    color: '',
    bgColor: '',
    width: '0%'
  });
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenValidationLoading, setTokenValidationLoading] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    new_password: null,
    confirm_password: null
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Extract token from URL on mount
  useEffect(() => {
    if (reset_token) {
      setResetToken(reset_token);
      // Since backend lacks token validation endpoint, optimistically assume valid
      // Actual validation happens on submission
      setTokenValid(true);
      setTokenValidationLoading(false);
    } else {
      // No token in URL - invalid state
      setTokenValid(false);
      setTokenValidationLoading(false);
    }
  }, [reset_token]);

  // Password strength calculation on password change
  useEffect(() => {
    const strength = calculatePasswordStrength(newPassword);
    setPasswordStrength(strength);
  }, [newPassword]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (resetSuccess && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resetSuccess && redirectCountdown === 0) {
      navigate('/login');
    }
  }, [resetSuccess, redirectCountdown, navigate]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    
    // Clear errors when user types
    setValidationErrors(prev => ({ ...prev, new_password: null }));
    setGeneralError(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    // Real-time matching validation
    if (value && value !== newPassword) {
      setValidationErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
    } else {
      setValidationErrors(prev => ({ ...prev, confirm_password: null }));
    }
    
    setGeneralError(null);
  };

  const handleConfirmPasswordBlur = () => {
    // Validate on blur
    if (confirmPassword && confirmPassword !== newPassword) {
      setValidationErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setGeneralError(null);
    setValidationErrors({ new_password: null, confirm_password: null });

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setValidationErrors(prev => ({ ...prev, new_password: passwordError }));
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirm_password: 'Passwords do not match' }));
      return;
    }

    // Submit password reset
    setIsLoading(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/password-reset/complete`,
        {
          reset_token: resetToken,
          new_password: newPassword
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Success
      setResetSuccess(true);
      setRedirectCountdown(3);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unable to reset password. Please try again.';
      
      // Check if it's a token error
      if (error.response?.status === 400 && 
          (errorMessage.toLowerCase().includes('token') || 
           errorMessage.toLowerCase().includes('expired') ||
           errorMessage.toLowerCase().includes('invalid'))) {
        setTokenValid(false);
        setGeneralError('Your reset link has expired or is invalid.');
      } else {
        setGeneralError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const handleLoginNow = () => {
    navigate('/login');
  };

  // ============================================================================
  // FORM VALIDATION
  // ============================================================================

  const isFormValid = useCallback(() => {
    return (
      newPassword.length >= 8 &&
      /[a-zA-Z]/.test(newPassword) &&
      /\d/.test(newPassword) &&
      confirmPassword === newPassword &&
      !validationErrors.new_password &&
      !validationErrors.confirm_password
    );
  }, [newPassword, confirmPassword, validationErrors]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          
          {/* Loading State */}
          {tokenValidationLoading && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <p className="text-gray-600 text-sm">Validating reset link...</p>
              </div>
            </div>
          )}

          {/* Token Invalid State */}
          {!tokenValidationLoading && tokenValid === false && (
            <div className="space-y-6">
              {/* Logo/Brand */}
              <div className="text-center">
                <h1 className="text-4xl font-bold text-orange-600">Local Eats</h1>
              </div>

              {/* Error Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex flex-col items-center space-y-6">
                  <div className="bg-red-100 rounded-full p-4">
                    <XCircle className="h-12 w-12 text-red-600" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Reset Link Expired</h2>
                    <p className="text-gray-600">
                      Your reset link has expired or is invalid.
                    </p>
                  </div>

                  <div className="w-full space-y-3">
                    <Link
                      to="/password-reset"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                    >
                      Request a new reset link
                    </Link>
                    
                    <Link
                      to="/login"
                      className="block text-center text-orange-600 hover:text-orange-500 text-sm font-medium transition-colors"
                    >
                      Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {!tokenValidationLoading && resetSuccess && (
            <div className="space-y-6">
              {/* Logo/Brand */}
              <div className="text-center">
                <h1 className="text-4xl font-bold text-orange-600">Local Eats</h1>
              </div>

              {/* Success Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex flex-col items-center space-y-6">
                  <div className="bg-green-100 rounded-full p-4">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Password Reset Successful!</h2>
                    <p className="text-gray-600">
                      Your password has been successfully reset.
                    </p>
                    <p className="text-gray-600">
                      You can now log in with your new password.
                    </p>
                  </div>

                  {redirectCountdown > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
                      <p className="text-blue-700 text-sm text-center">
                        Redirecting to login in <span className="font-bold">{redirectCountdown}</span>...
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleLoginNow}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    Login Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reset Form State */}
          {!tokenValidationLoading && tokenValid === true && !resetSuccess && (
            <div className="space-y-6">
              {/* Logo/Brand */}
              <div className="text-center">
                <h1 className="text-4xl font-bold text-orange-600">Local Eats</h1>
              </div>

              {/* Form Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
                    <p className="text-gray-600 text-sm">
                      Enter your new password below
                    </p>
                  </div>

                  {/* General Error */}
                  {generalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-700">{generalError}</p>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password Field */}
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="new-password"
                          name="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={newPassword}
                          onChange={handleNewPasswordChange}
                          placeholder="Create a strong password"
                          className={`block w-full px-4 py-3 pr-12 border ${
                            validationErrors.new_password
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
                          } rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-4 transition-colors text-sm`}
                        />
                        <button
                          type="button"
                          onClick={toggleNewPasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Validation Error */}
                      {validationErrors.new_password && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.new_password}</p>
                      )}

                      {/* Password Strength Indicator */}
                      {newPassword.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Password strength:</span>
                            <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.bgColor} transition-all duration-300 ease-out`}
                              style={{ width: passwordStrength.width }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="confirm-password"
                          name="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          onBlur={handleConfirmPasswordBlur}
                          placeholder="Re-enter your password"
                          className={`block w-full px-4 py-3 pr-12 border ${
                            validationErrors.confirm_password
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-300 focus:border-orange-500 focus:ring-orange-100'
                          } rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-4 transition-colors text-sm`}
                        />
                        <button
                          type="button"
                          onClick={toggleConfirmPasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      
                      {/* Validation Error */}
                      {validationErrors.confirm_password && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.confirm_password}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={!isFormValid() || isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Resetting password...
                          </span>
                        ) : (
                          'Reset Password'
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Back to Login Link */}
                  <div className="text-center pt-2">
                    <Link
                      to="/login"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Back to Login
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ResetPassword;