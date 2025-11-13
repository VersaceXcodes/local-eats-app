import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, FileText, Printer } from 'lucide-react';

const UV_Terms: React.FC = () => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Refs for section observers
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  // ============================================================================
  // SCROLL TRACKING & SCROLLSPY
  // ============================================================================
  
  useEffect(() => {
    // Track scroll position for back to top button
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    // Scrollspy: Highlight active section in TOC
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -80% 0px',
      threshold: 0,
    };
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observe all sections
    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });
    
    return () => observer.disconnect();
  }, []);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  
  const scrollToSection = (sectionId: string) => {
    const section = sectionRefs.current[sectionId];
    if (section) {
      const offsetTop = section.offsetTop - 80; // Account for header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  // ============================================================================
  // TABLE OF CONTENTS DATA
  // ============================================================================
  
  const tableOfContents = [
    { id: 'section-1', title: '1. Acceptance of Terms' },
    { id: 'section-2', title: '2. User Accounts' },
    { id: 'section-3', title: '3. Ordering and Payment' },
    { id: 'section-4', title: '4. Cancellation and Refunds' },
    { id: 'section-5', title: '5. User Content and Reviews' },
    { id: 'section-6', title: '6. Prohibited Conduct' },
    { id: 'section-7', title: '7. Disclaimers' },
    { id: 'section-8', title: '8. Limitation of Liability' },
    { id: 'section-9', title: '9. Governing Law' },
    { id: 'section-10', title: '10. Changes to Terms' },
    { id: 'section-11', title: '11. Contact Information' },
  ];
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
        >
          Skip to content
        </a>
        
        {/* Page Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                    Terms of Service
                  </h1>
                </div>
                <p className="text-sm text-gray-600">
                  Last updated: December 1, 2024
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                  aria-label="Print terms"
                >
                  <Printer className="w-5 h-5" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Table of Contents - Sidebar (Desktop) */}
            <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-4 lg:self-start">
              <nav
                className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
                aria-label="Table of contents"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Table of Contents
                </h2>
                <ul className="space-y-2">
                  {tableOfContents.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          activeSection === item.id
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
            
            {/* Main Content */}
            <main
              id="main-content"
              className="lg:col-span-9"
              role="main"
            >
              <article className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-8 sm:px-8 lg:px-12 lg:py-12 max-w-3xl mx-auto">
                  {/* Introduction */}
                  <div className="mb-12 pb-8 border-b border-gray-200">
                    <p className="text-base leading-relaxed text-gray-700 mb-4">
                      Welcome to Local Eats. These Terms of Service ("Terms") govern your access to and use of our restaurant discovery and ordering platform, website, and mobile applications (collectively, the "Services").
                    </p>
                    <p className="text-base leading-relaxed text-gray-700">
                      By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our Services.
                    </p>
                  </div>
                  
                  {/* Section 1: Acceptance of Terms */}
                  <section
                    id="section-1"
                    ref={(el) => (sectionRefs.current['section-1'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      1. Acceptance of Terms
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          1.1 Agreement to Terms
                        </h3>
                        <p>
                          By creating an account, placing an order, or otherwise accessing our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          1.2 Eligibility
                        </h3>
                        <p>
                          You must be at least 18 years of age to use our Services. By using our Services, you represent and warrant that you meet this age requirement.
                        </p>
                      </div>
                      
                      {/* Important callout box */}
                      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg my-6">
                        <p className="text-sm font-medium text-blue-900">
                          <strong>Important:</strong> You must be 18 or older to use this service. Creating an account or placing an order constitutes acceptance of these Terms.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          1.3 Modifications to Terms
                        </h3>
                        <p>
                          We reserve the right to modify these Terms at any time. We will provide notice of material changes by email or through our Services. Your continued use of the Services after such modifications constitutes your acceptance of the updated Terms.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 2: User Accounts */}
                  <section
                    id="section-2"
                    ref={(el) => (sectionRefs.current['section-2'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      2. User Accounts
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          2.1 Account Creation
                        </h3>
                        <p>
                          To access certain features of our Services, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          2.2 Account Security
                        </h3>
                        <p>
                          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          2.3 Account Termination
                        </h3>
                        <p>
                          We reserve the right to suspend or terminate your account at any time, with or without notice, for violation of these Terms or for any other reason we deem appropriate. You may also terminate your account at any time through your account settings.
                        </p>
                      </div>
                      
                      <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded-r-lg my-6">
                        <p className="text-sm font-medium text-yellow-900">
                          <strong>Notice:</strong> We may terminate accounts that violate these Terms, including accounts engaged in fraudulent activity, abuse, or prohibited conduct.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 3: Ordering and Payment */}
                  <section
                    id="section-3"
                    ref={(el) => (sectionRefs.current['section-3'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      3. Ordering and Payment
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          3.1 Order Placement
                        </h3>
                        <p>
                          When you place an order through our Services, you are making an offer to purchase the items in your order. We reserve the right to accept or reject any order at our discretion. Your order is accepted when we send you a confirmation email or notification.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          3.2 Pricing and Fees
                        </h3>
                        <p>
                          All prices are displayed in U.S. dollars and include applicable taxes unless otherwise stated. Delivery fees, service fees, and tips (where applicable) are additional charges that will be clearly displayed before you complete your order. Prices are subject to change without notice.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          3.3 Payment Processing
                        </h3>
                        <p>
                          Payment must be made at the time of order placement using a valid payment method. You authorize us to charge your payment method for the total amount of your order, including all applicable fees and taxes. We use third-party payment processors and do not store your full payment card information.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          3.4 Order Accuracy
                        </h3>
                        <p>
                          It is your responsibility to review your order for accuracy before submitting. Once an order is placed, modifications may not be possible. Please contact the restaurant directly if you need to make changes to an accepted order.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          3.5 Delivery
                        </h3>
                        <p>
                          Delivery times are estimates and may vary based on restaurant preparation time, traffic, weather, and other factors. We are not liable for delays in delivery. You must be available to receive your order at the specified delivery address.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 4: Cancellation and Refunds */}
                  <section
                    id="section-4"
                    ref={(el) => (sectionRefs.current['section-4'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      4. Cancellation and Refunds
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          4.1 Order Cancellation
                        </h3>
                        <p>
                          You may cancel your order before the restaurant begins preparation. Once your order is being prepared, cancellation may not be possible. Cancellation requests should be made through the app or by contacting customer support immediately.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          4.2 Refund Policy
                        </h3>
                        <p>
                          Refunds are issued at our discretion and only in cases where: (1) your order was not delivered, (2) your order was significantly incorrect or defective, or (3) the restaurant cancelled your order. Refund requests must be submitted within 48 hours of order placement.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          4.3 Refund Processing
                        </h3>
                        <p>
                          Approved refunds will be processed to your original payment method within 5-10 business days. You will receive email confirmation when a refund is issued.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          4.4 Disputes
                        </h3>
                        <p>
                          If you have concerns about your order quality or accuracy, please contact the restaurant first. If the issue is not resolved, contact our customer support team for assistance. All disputes must be reported within 48 hours of order delivery or pickup.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 5: User Content and Reviews */}
                  <section
                    id="section-5"
                    ref={(el) => (sectionRefs.current['section-5'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      5. User Content and Reviews
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          5.1 Review Guidelines
                        </h3>
                        <p>
                          You may submit reviews, ratings, photos, and other content ("User Content") through our Services. All User Content must be honest, accurate, and based on your personal experience. Reviews should not contain offensive language, personal attacks, discriminatory content, or false information.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          5.2 Content Ownership
                        </h3>
                        <p>
                          You retain ownership of your User Content, but by submitting it through our Services, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, distribute, and display such content in connection with our Services.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          5.3 Content Moderation
                        </h3>
                        <p>
                          We reserve the right to remove, edit, or refuse to publish any User Content that violates these Terms or our community guidelines. We may also remove content that we determine, in our sole discretion, is inappropriate or harmful to our Services or community.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          5.4 Verified Reviews
                        </h3>
                        <p>
                          Reviews marked as "Verified" indicate that the reviewer has placed an order with the restaurant through our platform or has verified their visit through other means we deem acceptable.
                        </p>
                      </div>
                      
                      <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded-r-lg my-6">
                        <p className="text-sm font-medium text-green-900">
                          <strong>Review Best Practices:</strong> Write honest, helpful reviews based on your actual experience. Include specific details that would help other users make informed decisions. Be respectful and constructive in your feedback.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 6: Prohibited Conduct */}
                  <section
                    id="section-6"
                    ref={(el) => (sectionRefs.current['section-6'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      6. Prohibited Conduct
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>You agree not to:</p>
                      
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Use our Services for any illegal purpose or in violation of any applicable laws</li>
                        <li>Impersonate any person or entity or falsely state or misrepresent your affiliation with any person or entity</li>
                        <li>Interfere with or disrupt the Services or servers or networks connected to the Services</li>
                        <li>Attempt to gain unauthorized access to any portion of the Services or any other systems or networks</li>
                        <li>Use any automated means (including bots, scripts, or scrapers) to access the Services</li>
                        <li>Post or transmit any viruses, malware, or other harmful code</li>
                        <li>Harass, abuse, or harm other users or restaurant partners</li>
                        <li>Submit false or fraudulent orders or reviews</li>
                        <li>Use the Services to compete with us or for any commercial purpose not expressly authorized</li>
                        <li>Violate any intellectual property rights of Local Eats or third parties</li>
                        <li>Attempt to manipulate ratings, reviews, or discounts through fraudulent means</li>
                      </ul>
                      
                      <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg my-6">
                        <p className="text-sm font-medium text-red-900">
                          <strong>Warning:</strong> Violation of these prohibited conduct rules may result in immediate account termination and legal action. We actively monitor for fraudulent activity and abuse.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 7: Disclaimers */}
                  <section
                    id="section-7"
                    ref={(el) => (sectionRefs.current['section-7'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      7. Disclaimers
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          7.1 Service "As Is"
                        </h3>
                        <p className="uppercase font-semibold mb-2">
                          THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
                        </p>
                        <p>
                          We do not warrant that the Services will be uninterrupted, error-free, or secure. We make no warranties regarding the quality, accuracy, or reliability of any information obtained through the Services.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          7.2 Third-Party Restaurants
                        </h3>
                        <p>
                          Local Eats is a platform that connects users with independent third-party restaurants. We are not responsible for the quality, safety, or legality of food prepared by restaurants. We do not guarantee the accuracy of menu items, prices, or restaurant information displayed on our platform.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          7.3 User Content
                        </h3>
                        <p>
                          We do not endorse or verify the accuracy of User Content, including reviews and ratings. User Content reflects the opinions of individual users and does not represent the views of Local Eats.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          7.4 Health and Dietary Information
                        </h3>
                        <p>
                          Allergen and dietary information is provided by restaurants and is for informational purposes only. If you have severe food allergies or dietary restrictions, please verify directly with the restaurant before ordering.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 8: Limitation of Liability */}
                  <section
                    id="section-8"
                    ref={(el) => (sectionRefs.current['section-8'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      8. Limitation of Liability
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p className="uppercase font-semibold">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOCAL EATS AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                      </p>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          8.1 Maximum Liability
                        </h3>
                        <p>
                          In no event shall our total liability to you for all damages exceed the amount you paid us in the twelve (12) months preceding the event giving rise to the claim, or one hundred dollars ($100), whichever is greater.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          8.2 Excluded Damages
                        </h3>
                        <p>
                          We shall not be liable for any damages resulting from: (1) food quality, safety, or preparation by third-party restaurants; (2) delivery delays or failures; (3) errors or inaccuracies in restaurant information; (4) user content or third-party content; (5) unauthorized access to your account; or (6) interruptions or errors in the Services.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          8.3 Indemnification
                        </h3>
                        <p>
                          You agree to indemnify, defend, and hold harmless Local Eats and its affiliates from any claims, damages, losses, liabilities, and expenses (including attorneys' fees) arising from: (1) your use of the Services; (2) your violation of these Terms; (3) your User Content; or (4) your violation of any rights of another party.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 9: Governing Law */}
                  <section
                    id="section-9"
                    ref={(el) => (sectionRefs.current['section-9'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      9. Governing Law and Dispute Resolution
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          9.1 Governing Law
                        </h3>
                        <p>
                          These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          9.2 Dispute Resolution
                        </h3>
                        <p>
                          Any dispute arising from these Terms or your use of the Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You agree to waive your right to a jury trial and to participate in a class action lawsuit.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          9.3 Exceptions
                        </h3>
                        <p>
                          Either party may seek injunctive or other equitable relief in court to prevent infringement of intellectual property rights or other proprietary rights.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          9.4 Venue
                        </h3>
                        <p>
                          Any claims not subject to arbitration shall be brought exclusively in the state or federal courts located in San Francisco County, California.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 10: Changes to Terms */}
                  <section
                    id="section-10"
                    ref={(el) => (sectionRefs.current['section-10'] = el)}
                    className="mb-12 scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      10. Changes to Terms
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          10.1 Modification Rights
                        </h3>
                        <p>
                          We reserve the right to modify these Terms at any time. Material changes will be communicated to you via email or through a prominent notice on our Services at least 30 days before the changes take effect.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          10.2 Acceptance of Changes
                        </h3>
                        <p>
                          Your continued use of the Services after the effective date of any changes constitutes your acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Services and may terminate your account.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          10.3 Version History
                        </h3>
                        <p>
                          Previous versions of these Terms will be archived and available upon request. The "Last Updated" date at the top of this page indicates when the Terms were most recently revised.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Section 11: Contact Information */}
                  <section
                    id="section-11"
                    ref={(el) => (sectionRefs.current['section-11'] = el)}
                    className="scroll-mt-20"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                      11. Contact Information
                    </h2>
                    
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us:
                      </p>
                      
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-3">
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Email:</p>
                          <a
                            href="mailto:legal@localeats.com"
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            legal@localeats.com
                          </a>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Customer Support:</p>
                          <a
                            href="mailto:support@localeats.com"
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            support@localeats.com
                          </a>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Mailing Address:</p>
                          <address className="not-italic text-gray-700">
                            Local Eats, Inc.<br />
                            123 Market Street, Suite 400<br />
                            San Francisco, CA 94105<br />
                            United States
                          </address>
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          For general inquiries or support issues, please visit our{' '}
                          <Link
                            to="/faq"
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            Help Center
                          </Link>{' '}
                          or contact our{' '}
                          <a
                            href="mailto:support@localeats.com"
                            className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            customer support team
                          </a>.
                        </p>
                      </div>
                    </div>
                  </section>
                  
                  {/* Related Links */}
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Related Legal Documents
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        to="/privacy"
                        className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                      >
                        Privacy Policy
                      </Link>
                      <Link
                        to="/faq"
                        className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                      >
                        FAQ / Help Center
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </main>
          </div>
        </div>
        
        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 z-50"
            aria-label="Back to top"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        )}
      </div>
      
      {/* Print styles */}
      <style>{`
        @media print {
          .hidden-print {
            display: none !important;
          }
          
          body {
            background: white !important;
          }
          
          main {
            box-shadow: none !important;
            border: none !important;
          }
          
          a {
            text-decoration: none !important;
            color: black !important;
          }
          
          aside {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default UV_Terms;