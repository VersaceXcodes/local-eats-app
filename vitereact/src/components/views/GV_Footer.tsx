import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  Facebook, 
  Instagram, 
  Twitter,
  Mail
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
    <div className="border-b border-gray-700">
      <button
        onClick={() => toggleAccordion(sectionKey)}
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
        aria-expanded={mobileAccordionStates[sectionKey]}
        aria-controls={`footer-section-${sectionKey}`}
      >
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            mobileAccordionStates[sectionKey] ? 'transform rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        id={`footer-section-${sectionKey}`}
        className={`overflow-hidden transition-all duration-200 ${
          mobileAccordionStates[sectionKey] ? 'max-h-96 pb-4' : 'max-h-0'
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
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white hover:underline transition-colors duration-200 text-sm block py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
        >
          {label}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      );
    }

    return (
      <Link
        to={href}
        className="text-gray-400 hover:text-white hover:underline transition-colors duration-200 text-sm block py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
      >
        {label}
      </Link>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <footer className="bg-gray-900 pt-12 pb-8 lg:pt-20 lg:pb-12 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ================================================================ */}
          {/* DESKTOP/TABLET LAYOUT (hidden on mobile) */}
          {/* ================================================================ */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Company Info Column */}
            <div className="md:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">LE</span>
                </div>
                <span className="text-white font-bold text-xl">Local Eats</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Discover authentic local restaurants and hidden culinary gems in your neighborhood. 
                Supporting local businesses, one meal at a time.
              </p>
              <p className="text-gray-500 text-xs">
                © {currentYear} Local Eats. All rights reserved.
              </p>
            </div>

            {/* Quick Links Column */}
            <div>
              <h3 className="text-white font-semibold text-base mb-4">Quick Links</h3>
              <nav className="space-y-2" aria-label="Quick links">
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
              <h3 className="text-white font-semibold text-base mb-4">Support</h3>
              <nav className="space-y-2" aria-label="Support links">
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
              <h3 className="text-white font-semibold text-base mb-4">Legal</h3>
              <nav className="space-y-2" aria-label="Legal links">
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

            {/* Social Media & App Info Column */}
            <div>
              <h3 className="text-white font-semibold text-base mb-4">Connect With Us</h3>
              <div className="flex gap-4 mb-6">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  );
                })}
              </div>
              <div className="text-gray-500 text-xs">
                <p>App Version {appVersion}</p>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* MOBILE LAYOUT (accordion sections) */}
          {/* ================================================================ */}
          <div className="md:hidden space-y-0">
            {/* Company Info - Always Expanded on Mobile */}
            <AccordionSection title="About Local Eats" sectionKey="company">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">LE</span>
                </div>
                <span className="text-white font-bold text-xl">Local Eats</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Discover authentic local restaurants and hidden culinary gems in your neighborhood. 
                Supporting local businesses, one meal at a time.
              </p>
              <p className="text-gray-500 text-xs">
                © {currentYear} Local Eats. All rights reserved.
              </p>
            </AccordionSection>

            {/* Quick Links */}
            <AccordionSection title="Quick Links" sectionKey="links">
              <nav className="space-y-2" aria-label="Quick links">
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
              <nav className="space-y-2" aria-label="Support links">
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
              <nav className="space-y-2" aria-label="Legal links">
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
              <div className="flex gap-4 mb-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-orange-600 transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  );
                })}
              </div>
              <div className="text-gray-500 text-xs">
                <p>App Version {appVersion}</p>
              </div>
            </AccordionSection>
          </div>

          {/* ================================================================ */}
          {/* BOTTOM BAR (all screen sizes) */}
          {/* ================================================================ */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-gray-500 text-xs text-center md:text-left">
                <p>Made with ❤️ for local food lovers everywhere</p>
              </div>
              <div className="flex items-center justify-center md:justify-end gap-4 text-gray-500 text-xs">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  <a 
                    href="mailto:support@localeats.com" 
                    className="hover:text-white transition-colors"
                    aria-label="Email us at support@localeats.com"
                  >
                    support@localeats.com
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;