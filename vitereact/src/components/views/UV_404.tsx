import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchX, Home, Search, ArrowLeft, MapPin, Star } from 'lucide-react';
import { useAppStore } from '@/store/main';

const UV_404: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(
    (state) => state.authentication_state.authentication_status.is_authenticated
  );

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute top-20 -right-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-20 left-10 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-2xl w-full relative z-10">
          {/* Main Error Content - Centered Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden p-8 lg:p-12 text-center">
            
            {/* 404 Icon & Illustration */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-orange-100 to-red-100 rounded-full p-8">
                  <SearchX className="w-24 h-24 text-orange-500" strokeWidth={1.5} />
                </div>
                {/* Floating food icons */}
                <div className="absolute -top-3 -right-3 text-4xl animate-bounce">🍕</div>
                <div className="absolute -bottom-3 -left-3 text-3xl animate-bounce animation-delay-2000">❓</div>
              </div>
            </div>

            {/* 404 Heading */}
            <h1 className="text-6xl lg:text-8xl font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4 tracking-tight">
              404
            </h1>

            {/* Primary Error Message */}
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              Oops! This plate is empty
            </h2>

            {/* Secondary Message */}
            <p className="text-base text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
              The page you're looking for doesn't exist or may have been moved. But don't worry—let's get you back to delicious discoveries!
            </p>

            {/* Helpful Suggestions */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Here's what you can do:
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Check the URL for typos or errors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Use the navigation above to browse restaurants</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Visit our home page to explore local eats</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Search for restaurants to find what you're looking for</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              {/* Primary CTA: Go to Home */}
              <Link
                to="/"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-700 hover:to-red-700 hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Home className="w-5 h-5" />
                <span>Go to Home</span>
              </Link>

              {/* Secondary: Browse Restaurants */}
              <Link
                to="/search"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 font-semibold rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition-all duration-200"
              >
                <Search className="w-5 h-5" />
                <span>Search Menu</span>
              </Link>
            </div>

            {/* Additional Actions Row */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {/* Search Restaurants */}
              <Link
                to="/search"
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm text-orange-700 font-medium hover:text-orange-800 transition-colors duration-200"
              >
                <Search className="w-4 h-4" />
                <span>Search Restaurants</span>
              </Link>

              {/* Divider */}
              <span className="hidden sm:inline text-gray-300">|</span>

              {/* Go Back */}
              <button
                onClick={handleGoBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </div>
          </div>

          {/* Optional: Popular Links Section (only if authenticated) */}
          {isAuthenticated && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-4">Or explore these popular pages:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200"
                >
                  <Home className="w-4 h-4" />
                  <span>Restaurants</span>
                </Link>
                <Link
                  to="/local-picks"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200"
                >
                  <Star className="w-4 h-4" />
                  <span>Local Picks</span>
                </Link>
                <Link
                  to="/favorites"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Favorites</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_404;