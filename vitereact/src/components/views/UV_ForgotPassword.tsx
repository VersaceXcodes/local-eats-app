import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PasswordResetResponse {
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ForgotPassword: React.FC = () => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{ email: string | null }>({ 
    email: null 
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  // ==========================================================================
  // API MUTATION
  // ==========================================================================

  const resetMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await axios.post<PasswordResetResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/password-reset/request`,
        { email: emailAddress },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setCountdownSeconds(60);
      setGeneralError(null);
    },
    onError: (error: any) => {
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Unable to send reset email. Please try again.';
      setGeneralError(errorMessage);
    }
  });

  // ==========================================================================
  // COUNTDOWN TIMER EFFECT
  // ==========================================================================

  useEffect(() => {
    if (countdownSeconds > 0) {
      const timer = setTimeout(() => {
        setCountdownSeconds(countdownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdownSeconds]);

  // ==========================================================================
  // VALIDATION FUNCTIONS
  // ==========================================================================

  const validateEmailFormat = (emailValue: string): boolean => {
    // Check if email is empty
    if (!emailValue || emailValue.trim() === '') {
      setValidationErrors({ email: 'Email is required' });
      return false;
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setValidationErrors({ email: 'Please enter a valid email address' });
      return false;
    }
    
    // Valid email
    setValidationErrors({ email: null });
    return true;
  };

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleEmailBlur = () => {
    if (email) {
      validateEmailFormat(email);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear validation errors on change
    if (validationErrors.email) {
      setValidationErrors({ email: null });
    }
    // Clear general errors on change
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate before submission
    if (!validateEmailFormat(email)) {
      return;
    }

    // Submit via mutation
    resetMutation.mutate(email);
  };

  const handleResend = () => {
    if (countdownSeconds === 0) {
      resetMutation.mutate(email);
    }
  };

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const isLoading = resetMutation.isPending;
  const isFormValid = email.trim() !== '' && !validationErrors.email;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-8 py-10 sm:px-10">
              
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  <span className="text-white text-2xl font-bold">LE</span>
                </div>
              </div>

              {/* Conditional Content Based on Submission State */}
              {!isSubmitted ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Forgot Password?
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  {/* General Error Message */}
                  {generalError && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm text-red-700 font-medium">
                            {generalError}
                          </p>
                          {generalError.includes('Unable to send') && (
                            <button
                              onClick={() => resetMutation.mutate(email)}
                              className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Email Input Field */}
                    <div>
                      <label 
                        htmlFor="email" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email Address
                      </label>
                      <div className="relative">
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
                          className={`block w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.email
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 focus:outline-none`}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className={`h-5 w-5 ${
                            validationErrors.email ? 'text-red-400' : 'text-gray-400'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      {validationErrors.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!isFormValid || isLoading}
                      className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>

                    {/* Back to Login Link */}
                    <div className="text-center pt-4">
                      <Link
                        to="/login"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Login
                      </Link>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* Success State */}
                  <div className="text-center">
                    
                    {/* Success Icon */}
                    <div className="flex justify-center mb-6">
                      <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                        <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    {/* Success Message */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      Check Your Email
                    </h2>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-700 leading-relaxed text-left">
                          If an account exists with <strong className="text-gray-900">{email}</strong>, you'll receive a reset link shortly. Check your inbox and spam folder.
                        </p>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <strong className="text-gray-700">Note:</strong> Link valid for 24 hours. For security, if you didn't request this, you can safely ignore this message.
                      </p>
                    </div>

                    {/* Resend Section */}
                    <div className="space-y-4">
                      {countdownSeconds > 0 ? (
                        <p className="text-sm text-gray-600">
                          Resend in <span className="font-semibold text-blue-600">{countdownSeconds}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleResend}
                          disabled={isLoading}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Sending...' : "Didn't receive it? Resend"}
                        </button>
                      )}

                      {/* Back to Login */}
                      <div className="pt-4 border-t border-gray-200">
                        <Link
                          to="/login"
                          className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Back to Login
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Support Contact */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a 
                href="mailto:support@localeats.com" 
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;