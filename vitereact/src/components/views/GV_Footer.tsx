import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  Facebook, 
  Instagram, 
  Twitter,
  Mail,
  MapPin,
  Phone,
  ExternalLink
} from 'lucide-react';

const GV_Footer: React.FC = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [mobileAccordionStates, setMobileAccordionStates] = useState({
    company: true,
    links: false,
    support: false,
    legal: false,
    social: false,
  });

  // Dynamic year calculation
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  // Static app version
  const appVersion = '1.0.0';

  // ============================================================================
  // ACCORDION TOGGLE HANDLER
  // ============================================================================
  
  const toggleAccordion = (section: keyof typeof mobileAccordionStates) => {
    setMobileAccordionStates((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // ============================================================================
  // FOOTER SECTIONS DATA
  // ============================================================================

  const quickLinks = [
    { label: 'About Us', href: '/#about', external: false },
    { label: 'How It Works', href: '/#how-it-works', external: false },
    { label: 'For Restaurants', href: '/#for-restaurants', external: false },
    { label: 'Careers', href: '/#careers', external: false },
  ];

  const supportLinks = [
    { label: 'Help Center', href: '/#help', external: false },
    { label: 'FAQ', href: '/#faq', external: false },
    { label: 'Contact Us', href: '/#contact', external: false },
    { label: 'Report Issue', href: '/#report', external: false },
    { label: 'Safety', href: '/#safety', external: false },
  ];

  const legalLinks = [
    { label: 'Terms of Service', href: '/terms', external: false },
    { label: 'Privacy Policy', href: '/privacy', external: false },
    { label: 'Cookie Policy', href: '/#cookies', external: false },
    { label: 'Accessibility Statement', href: '/#accessibility', external: false },
  ];

  const socialLinks = [
    { 
      label: 'Facebook', 
      href: 'https://facebook.com/localeats', 
      icon: Facebook,
      ariaLabel: 'Visit our Facebook page'
    },
    { 
      label: 'Instagram', 
      href: 'https://instagram.com/localeats', 
      icon: Instagram,
      ariaLabel: 'Visit our Instagram page'
    },
    { 
      label: 'Twitter', 
      href: 'https://twitter.com/localeats', 
      icon: Twitter,
      ariaLabel: 'Visit our Twitter page'
    },
  ];

  // ============================================================================
  // RENDER HELPER COMPONENTS
  // ============================================================================

  const AccordionSection: React.FC<{
    title: string;
    sectionKey: keyof typeof mobileAccordionStates;
    children: React.ReactNode;
  }> = ({ title, sectionKey, children }) => (
    <div className="border-b border-gray-800/50 backdrop-blur-sm">
      <button
        onClick={() => toggleAccordion(sectionKey)}
        className="w-full flex items-center justify-between py-5 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded group"
        aria-expanded={mobileAccordionStates[sectionKey]}
        aria-controls={`footer-section-${sectionKey}`}
      >
        <h3 className="text-base font-bold text-white group-hover:text-orange-500 transition-colors flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
          {title}
        </h3>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-all duration-300 ${
            mobileAccordionStates[sectionKey] ? 'transform rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        id={`footer-section-${sectionKey}`}
        className={`overflow-hidden transition-all duration-300 ${
          mobileAccordionStates[sectionKey] ? 'max-h-96 pb-5' : 'max-h-0'
        }`}
      >
        {children}
      </div>
    </div>
  );

  const FooterLink: React.FC<{
    href: string;
    label: string;
    external?: boolean;
  }> = ({ href, label, external = false }) => {
    const linkClasses = "group text-gray-400 hover:text-orange-500 transition-all duration-200 text-sm flex items-center gap-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded";
    
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClasses}
        >
          <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      );
    }

    return (
      <Link
        to={href}
        className={linkClasses}
      >
        <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
      </Link>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <footer className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-16 pb-8 lg:pt-24 lg:pb-12 mt-auto overflow-hidden" role="contentinfo">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ================================================================ */}
          {/* DESKTOP/TABLET LAYOUT (hidden on mobile) */}
          {/* ================================================================ */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
            {/* Company Info Column */}
            <div className="md:col-span-3 lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                  <span className="text-white font-bold text-2xl">LE</span>
                </div>
                <span className="text-white font-bold text-2xl tracking-tight">Local Eats</span>
              </div>
              <p className="text-gray-300 text-base leading-relaxed mb-6 max-w-md">
                Discover authentic local restaurants and hidden culinary gems in your neighborhood. 
                Supporting local businesses, one meal at a time.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <a href="mailto:support@localeats.com" className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors group">
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">support@localeats.com</span>
                </a>
                <a href="tel:+15555551234" className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors group">
                  <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">1-555-555-1234</span>
                </a>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Portland, OR</span>
                </div>
              </div>
              
              <p className="text-gray-500 text-xs">
                © {currentYear} Local Eats. All rights reserved.
              </p>
            </div>

            {/* Quick Links Column */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                Quick Links
              </h3>
              <nav className="space-y-3" aria-label="Quick links">
                {quickLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </div>

            {/* Support Column */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                Support
              </h3>
              <nav className="space-y-3" aria-label="Support links">
                {supportLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                Legal
              </h3>
              <nav className="space-y-3" aria-label="Legal links">
                {legalLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </div>

          </div>
          
          {/* Social Media & Newsletter Section - Full Width */}
          <div className="hidden md:block">
            <div className="border-t border-gray-800/50 pt-8 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                {/* Social Media */}
                <div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Connect With Us</h3>
                  <div className="flex gap-3">
                    {socialLinks.map((social) => {
                      const Icon = social.icon;
                      return (
                        <a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.ariaLabel}
                          className="group relative w-11 h-11 bg-gray-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <Icon className="h-5 w-5 relative z-10" aria-hidden="true" />
                          <span className="sr-only">(opens in new tab)</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
                
                {/* Newsletter Signup */}
                <div className="flex-1 max-w-md">
                  <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Stay Updated</h3>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-2.5 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      aria-label="Email address for newsletter"
                    />
                    <button
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all transform hover:scale-105 shadow-lg shadow-orange-600/20"
                      aria-label="Subscribe to newsletter"
                    >
                      Subscribe
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">Get the latest deals and restaurant updates</p>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* MOBILE LAYOUT (accordion sections) */}
          {/* ================================================================ */}
          <div className="md:hidden space-y-0">
            {/* Company Info - Always Expanded on Mobile */}
            <AccordionSection title="About Local Eats" sectionKey="company">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
                  <span className="text-white font-bold text-xl">LE</span>
                </div>
                <span className="text-white font-bold text-xl tracking-tight">Local Eats</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">
                Discover authentic local restaurants and hidden culinary gems in your neighborhood. 
                Supporting local businesses, one meal at a time.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-2.5 mb-5">
                <a href="mailto:support@localeats.com" className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors group">
                  <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">support@localeats.com</span>
                </a>
                <a href="tel:+15555551234" className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors group">
                  <Phone className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">1-555-555-1234</span>
                </a>
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Portland, OR</span>
                </div>
              </div>
              
              <p className="text-gray-500 text-xs">
                © {currentYear} Local Eats. All rights reserved.
              </p>
            </AccordionSection>

            {/* Quick Links */}
            <AccordionSection title="Quick Links" sectionKey="links">
              <nav className="space-y-3" aria-label="Quick links">
                {quickLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </AccordionSection>

            {/* Support */}
            <AccordionSection title="Support" sectionKey="support">
              <nav className="space-y-3" aria-label="Support links">
                {supportLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </AccordionSection>

            {/* Legal */}
            <AccordionSection title="Legal" sectionKey="legal">
              <nav className="space-y-3" aria-label="Legal links">
                {legalLinks.map((link) => (
                  <FooterLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    external={link.external}
                  />
                ))}
              </nav>
            </AccordionSection>

            {/* Social Media */}
            <AccordionSection title="Connect With Us" sectionKey="social">
              <div className="flex gap-3 mb-5">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      className="group relative w-11 h-11 bg-gray-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <Icon className="h-5 w-5 relative z-10" aria-hidden="true" />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  );
                })}
              </div>
              
              {/* Newsletter Signup - Mobile */}
              <div className="mt-6">
                <h4 className="text-white text-sm font-semibold mb-3">Stay Updated</h4>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    aria-label="Email address for newsletter"
                  />
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold text-sm hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all transform hover:scale-105 shadow-lg shadow-orange-600/20"
                    aria-label="Subscribe to newsletter"
                  >
                    Subscribe
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">Get the latest deals and updates</p>
              </div>
            </AccordionSection>
          </div>

          {/* ================================================================ */}
          {/* BOTTOM BAR (all screen sizes) */}
          {/* ================================================================ */}
          <div className="mt-12 pt-8 border-t border-gray-800/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="text-gray-500 text-xs text-center md:text-left space-y-2">
                <p className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-orange-500 text-lg">❤️</span>
                  <span>Made with love for local food lovers everywhere</span>
                </p>
                <p className="text-gray-600 flex items-center justify-center md:justify-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  <span>App Version {appVersion} • All Systems Operational</span>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-4 text-gray-500 text-xs">
                <div className="flex items-center gap-6">
                  <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms</Link>
                  <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy</Link>
                  <a href="/#accessibility" className="hover:text-orange-500 transition-colors">Accessibility</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;