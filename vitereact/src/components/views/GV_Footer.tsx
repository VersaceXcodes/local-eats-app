import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

const GV_Footer: React.FC = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="bg-gray-900 py-8 mt-auto" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Copyright */}
          <p className="text-gray-400 text-sm text-center md:text-left">
            © {currentYear} Local Eats. All rights reserved.
          </p>
          
          {/* Links */}
          <div className="flex items-center justify-center md:justify-end gap-6 text-gray-400 text-sm">
            <Link to="/terms" className="hover:text-orange-500 transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-orange-500 transition-colors">
              Privacy
            </Link>
            <a href="mailto:support@localeats.com" className="hover:text-orange-500 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GV_Footer;