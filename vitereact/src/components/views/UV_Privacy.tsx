import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Download, FileText, Lock, Eye, UserCheck, Globe, Mail, ChevronRight, CheckCircle } from 'lucide-react';

const UV_Privacy: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('');

  // Smooth scroll to section on anchor click
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track active section for scrollspy (optional enhancement)
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'information-we-collect',
        'how-we-use',
        'information-sharing',
        'data-storage',
        'your-rights',
        'cookies-tracking',
        'children-privacy',
        'changes-policy',
        'contact-us',
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Table of contents items
  const tableOfContents = [
    { id: 'information-we-collect', title: '1. Information We Collect', icon: <FileText className="w-4 h-4" /> },
    { id: 'how-we-use', title: '2. How We Use Your Information', icon: <Eye className="w-4 h-4" /> },
    { id: 'information-sharing', title: '3. Information Sharing and Disclosure', icon: <Globe className="w-4 h-4" /> },
    { id: 'data-storage', title: '4. Data Storage and Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'your-rights', title: '5. Your Rights and Choices', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'cookies-tracking', title: '6. Cookies and Tracking', icon: <Shield className="w-4 h-4" /> },
    { id: 'children-privacy', title: "7. Children's Privacy", icon: <Shield className="w-4 h-4" /> },
    { id: 'changes-policy', title: '8. Changes to Privacy Policy', icon: <FileText className="w-4 h-4" /> },
    { id: 'contact-us', title: '9. Contact Us', icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Main Container */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Last updated: December 1, 2024
                </p>
              </div>
              {/* Optional Download PDF Button */}
              <button
                className="hidden md:flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={() => alert('PDF download feature coming soon!')}
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-8">
            {/* Sidebar - Table of Contents (Desktop Only) */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <nav className="sticky top-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                  Table of Contents
                </h2>
                <ul className="space-y-2">
                  {tableOfContents.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          activeSection === item.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1 text-left">{item.title}</span>
                        {activeSection === item.id && (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-8 lg:p-12">
              {/* Introduction */}
              <div className="mb-12">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  At Local Eats, we are committed to protecting your privacy and being transparent about how we collect, use, and share your personal information. This Privacy Policy explains our data practices in detail and outlines your rights regarding your personal data.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">What this means:</h3>
                      <p className="text-blue-800 text-sm leading-relaxed">
                        We use your information to provide you with the best restaurant discovery and ordering experience possible. We protect your data with industry-standard security measures and never sell your personal information to third parties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Information We Collect */}
              <section id="information-we-collect" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">1</span>
                  Information We Collect
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      When you create an account or place an order, we collect personal information including:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Full name</li>
                      <li>Email address</li>
                      <li>Phone number</li>
                      <li>Delivery addresses</li>
                      <li>Payment information (card type, last 4 digits, expiration date)</li>
                      <li>Profile picture (optional)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage Information</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We automatically collect information about how you use our platform:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Pages viewed and restaurants browsed</li>
                      <li>Search queries and filters applied</li>
                      <li>Orders placed and order history</li>
                      <li>Reviews written and restaurants favorited</li>
                      <li>Time, date, and duration of your visits</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Location Data</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      With your permission, we collect location information to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Show nearby restaurants and calculate delivery distances</li>
                      <li>Provide accurate delivery estimates</li>
                      <li>Improve local search results</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      We collect precise location data only when you grant permission. We also collect approximate location based on your IP address for general service delivery.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Device Information</h3>
                    <p className="text-gray-700 leading-relaxed">
                      We collect information about your device including browser type, operating system, device type, and unique device identifiers to optimize your experience and ensure platform security.
                    </p>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">What this means:</h3>
                        <p className="text-green-800 text-sm leading-relaxed">
                          We collect this information to personalize your experience, show you relevant nearby restaurants, process your orders, and improve our service. You have control over what information you share, especially regarding location data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: How We Use Your Information */}
              <section id="how-we-use" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">2</span>
                  How We Use Your Information
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Delivery</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Create and manage your account</li>
                      <li>Process and fulfill your orders</li>
                      <li>Communicate order status and delivery updates</li>
                      <li>Provide customer support</li>
                      <li>Send important service notifications</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Personalization</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Recommend restaurants based on your preferences and order history</li>
                      <li>Customize your homepage and search results</li>
                      <li>Remember your favorites and saved addresses</li>
                      <li>Provide location-based restaurant suggestions</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Analytics and Improvement</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Analyze usage patterns to improve our platform</li>
                      <li>Monitor performance and fix technical issues</li>
                      <li>Understand user preferences and trends</li>
                      <li>Test new features and optimize user experience</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Marketing and Communication</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      With your consent, we may use your information to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Send promotional emails about new restaurants and special offers</li>
                      <li>Notify you about weekly local picks and discounts</li>
                      <li>Send push notifications about relevant updates (if enabled)</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      You can opt out of marketing communications at any time through your account settings or by clicking unsubscribe in any email.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-2">What this means:</h3>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          We use your information primarily to deliver the service you've signed up for - helping you discover great local restaurants and enjoy delicious food. Everything else (like recommendations and promotions) is designed to enhance your experience, and you can control these preferences.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Information Sharing and Disclosure */}
              <section id="information-sharing" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">3</span>
                  Information Sharing and Disclosure
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">Important: We Never Sell Your Personal Data</h3>
                    <p className="text-yellow-800 text-sm leading-relaxed">
                      Local Eats does not and will not sell your personal information to third parties. We only share your data in the specific circumstances outlined below.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Restaurants (Order Fulfillment)</h3>
                    <p className="text-gray-700 leading-relaxed">
                      When you place an order, we share necessary information with the restaurant including your name, phone number, delivery address, and order details. This is essential for order fulfillment and delivery.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Payment Processors</h3>
                    <p className="text-gray-700 leading-relaxed">
                      We use PCI-compliant third-party payment processors to handle payment transactions securely. We do not store your full credit card information on our servers. Payment processors receive the information necessary to process your payment and are prohibited from using it for other purposes.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Providers</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We share information with trusted service providers who help us operate our platform:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Cloud hosting and data storage providers</li>
                      <li>Email delivery services</li>
                      <li>Analytics and performance monitoring tools</li>
                      <li>Customer support platforms</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      These providers are contractually obligated to protect your data and use it only for the services they provide to us.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Legal Compliance</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We may disclose your information if required by law or in response to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Valid legal requests (court orders, subpoenas)</li>
                      <li>Protection of our rights and property</li>
                      <li>Investigation of fraud or security issues</li>
                      <li>Emergency situations to protect personal safety</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Business Transfers</h3>
                    <p className="text-gray-700 leading-relaxed">
                      In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity. We will notify you of any such change and provide options regarding your data.
                    </p>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">What this means:</h3>
                        <p className="text-green-800 text-sm leading-relaxed">
                          We only share your information when absolutely necessary to deliver our service (like sharing your address with a restaurant for delivery) or when required by law. Your data is never sold to advertisers or marketers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Data Storage and Security */}
              <section id="data-storage" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">4</span>
                  Data Storage and Security
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Security Measures</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We implement industry-standard security measures to protect your personal information:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li><strong>Encryption in Transit:</strong> All data transmitted between your device and our servers is encrypted using HTTPS/TLS protocols</li>
                      <li><strong>Encryption at Rest:</strong> Sensitive data (passwords, payment information) is encrypted in our databases</li>
                      <li><strong>Secure Payment Processing:</strong> PCI DSS compliant payment handling through certified processors</li>
                      <li><strong>Access Controls:</strong> Strict internal access controls limit who can view your data</li>
                      <li><strong>Regular Security Audits:</strong> Ongoing security assessments and penetration testing</li>
                      <li><strong>Monitoring:</strong> 24/7 system monitoring for suspicious activity</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Data Retention</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We retain your information for different periods depending on the type of data:
                    </p>
                    <ul className="space-y-3 ml-4">
                      <li className="text-gray-700">
                        <strong className="text-gray-900">Account Data:</strong> Retained while your account is active and for 30 days after deletion (excluding legal holds)
                      </li>
                      <li className="text-gray-700">
                        <strong className="text-gray-900">Order History:</strong> Retained for 7 years for accounting and legal compliance purposes
                      </li>
                      <li className="text-gray-700">
                        <strong className="text-gray-900">Payment Information:</strong> Card data never stored; tokens retained as long as you keep the payment method saved
                      </li>
                      <li className="text-gray-700">
                        <strong className="text-gray-900">Analytics Data:</strong> Anonymized usage data may be retained indefinitely for statistical analysis
                      </li>
                      <li className="text-gray-700">
                        <strong className="text-gray-900">Communications:</strong> Customer service interactions retained for quality and training purposes
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Data Storage Location</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Your data is stored on secure servers located in the United States. We use reputable cloud service providers with robust security and compliance certifications.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-2">What this means:</h3>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          We take data security seriously and use the same encryption and security standards as banks and financial institutions. Your sensitive information is protected both during transmission and storage. We keep your data only as long as necessary and delete it when you close your account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Your Rights and Choices */}
              <section id="your-rights" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">5</span>
                  Your Rights and Choices
                </h2>
                
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    You have significant control over your personal information. Here are your rights:
                  </p>

                  <div className="grid gap-4">
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Access</h3>
                      <p className="text-gray-700 text-sm">
                        View all personal data we have about you through your account settings or request a complete data export by contacting us.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Correct</h3>
                      <p className="text-gray-700 text-sm">
                        Update your profile information, addresses, and preferences at any time in your account settings.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Delete</h3>
                      <p className="text-gray-700 text-sm">
                        Delete your account and request removal of all personal data (subject to legal retention requirements) through settings or by contacting us.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Opt-Out</h3>
                      <p className="text-gray-700 text-sm">
                        Unsubscribe from marketing emails, disable push notifications, or adjust communication preferences in your settings.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Data Portability</h3>
                      <p className="text-gray-700 text-sm">
                        Request an export of your data in a commonly used, machine-readable format.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Object</h3>
                      <p className="text-gray-700 text-sm">
                        Object to certain types of data processing, such as marketing or profiling activities.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">How to Exercise Your Rights</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Visit your <Link to="/settings" className="text-blue-600 hover:text-blue-700 underline">Account Settings</Link> for most data management options</li>
                      <li>Use the "Delete Account" option in settings to permanently remove your data</li>
                      <li>Click "Unsubscribe" in any marketing email</li>
                      <li>Manage notification preferences in your account settings</li>
                      <li>Control location permissions in your browser or device settings</li>
                      <li>Contact us at <a href="mailto:privacy@localeats.com" className="text-blue-600 hover:text-blue-700 underline">privacy@localeats.com</a> for data export or deletion requests</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-green-900 mb-2">What this means:</h3>
                        <p className="text-green-800 text-sm leading-relaxed">
                          You're in control of your data. You can view it, change it, download it, or delete it at any time. We respond to all requests within 30 days and make it easy to manage your privacy preferences.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 6: Cookies and Tracking */}
              <section id="cookies-tracking" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">6</span>
                  Cookies and Tracking Technologies
                </h2>
                
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    We use cookies and similar tracking technologies to improve your experience, analyze usage, and deliver personalized content.
                  </p>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Types of Cookies We Use</h3>
                    <div className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Essential Cookies (Required)</h4>
                        <p className="text-gray-700 text-sm">
                          Necessary for the website to function. These include session cookies that remember your login, cart contents, and preferences during your visit.
                        </p>
                      </div>

                      <div className="border-l-4 border-purple-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Analytics Cookies (Optional)</h4>
                        <p className="text-gray-700 text-sm">
                          Help us understand how visitors use our site. We use Google Analytics to track page views, session duration, and user behavior patterns to improve our platform.
                        </p>
                      </div>

                      <div className="border-l-4 border-orange-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Preference Cookies (Optional)</h4>
                        <p className="text-gray-700 text-sm">
                          Remember your settings like language preferences, filter selections, and display options to personalize your experience.
                        </p>
                      </div>

                      <div className="border-l-4 border-red-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Advertising Cookies (Optional)</h4>
                        <p className="text-gray-700 text-sm">
                          May be used to deliver relevant advertisements. We do not currently use third-party advertising cookies but may in the future with your consent.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Managing Cookie Preferences</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      You can control cookies through:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                      <li>Our cookie consent banner (appears on first visit)</li>
                      <li>Your browser settings (most browsers allow you to refuse cookies)</li>
                      <li>Privacy settings in your account (for logged-in users)</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4 text-sm italic">
                      Note: Blocking essential cookies may prevent certain features from working properly.
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg mt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-2">What this means:</h3>
                        <p className="text-blue-800 text-sm leading-relaxed">
                          Cookies are small files that help our website remember your preferences and improve your experience. You can choose which cookies to accept, except for essential ones needed for the site to work properly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 7: Children's Privacy */}
              <section id="children-privacy" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">7</span>
                  Children's Privacy
                </h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Local Eats is designed for users aged 18 and older. We do not knowingly collect personal information from children under 13 years of age, in compliance with the Children's Online Privacy Protection Act (COPPA).
                  </p>

                  <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">Age Requirement</h3>
                    <p className="text-red-800 text-sm leading-relaxed">
                      By using Local Eats, you confirm that you are at least 18 years old. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <a href="mailto:privacy@localeats.com" className="underline">privacy@localeats.com</a> and we will delete such information from our systems.
                    </p>
                  </div>

                  <p className="text-gray-700 leading-relaxed text-sm">
                    If we discover that we have inadvertently collected information from a child under 13, we will take immediate steps to delete that information from our servers and terminate the account.
                  </p>
                </div>
              </section>

              {/* Section 8: Changes to Privacy Policy */}
              <section id="changes-policy" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">8</span>
                  Changes to This Privacy Policy
                </h2>
                
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform features. When we make material changes, we will:
                  </p>

                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Update the "Last Updated" date at the top of this policy</li>
                    <li>Notify you via email if you have an account</li>
                    <li>Display a notification banner on our platform</li>
                    <li>Provide a summary of key changes</li>
                  </ul>

                  <p className="text-gray-700 leading-relaxed">
                    Your continued use of Local Eats after changes become effective constitutes acceptance of the updated policy. If you disagree with any changes, you may close your account.
                  </p>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Policy Version History</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Version 1.0</span>
                        <span className="text-gray-500">December 1, 2024 (Current)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 9: Contact Us */}
              <section id="contact-us" className="mb-12 scroll-mt-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg font-bold text-lg">9</span>
                  Contact Us
                </h2>
                
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
                  </p>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 border border-blue-200">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Privacy Inquiries</h3>
                          <a href="mailto:privacy@localeats.com" className="text-blue-600 hover:text-blue-700 underline text-lg">
                            privacy@localeats.com
                          </a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Response Time</h3>
                          <p className="text-gray-700">We will respond to all requests within 30 days</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Globe className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Mailing Address</h3>
                          <p className="text-gray-700">
                            Local Eats Privacy Team<br />
                            123 Main Street, Suite 100<br />
                            Portland, OR 97201<br />
                            United States
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">We're Here to Help</h3>
                    <p className="text-green-800 text-sm leading-relaxed">
                      Your privacy is important to us. Don't hesitate to reach out with any questions or concerns about how we handle your data. We're committed to transparency and protecting your rights.
                    </p>
                  </div>
                </div>
              </section>

              {/* GDPR Section */}
              <section className="mb-12 scroll-mt-8 border-t-2 border-gray-200 pt-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <Globe className="w-8 h-8 text-blue-600" />
                  Additional Information for EU Users (GDPR)
                </h2>
                
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    If you are located in the European Union, you have additional rights under the General Data Protection Regulation (GDPR):
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Legal Basis for Processing</h3>
                      <p className="text-gray-700 text-sm">
                        We process your data based on consent, contract fulfillment, legal obligations, and legitimate interests.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Data Controller</h3>
                      <p className="text-gray-700 text-sm">
                        Local Eats is the data controller responsible for your personal information.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Right to Lodge Complaint</h3>
                      <p className="text-gray-700 text-sm">
                        You may file a complaint with your local data protection authority if you believe we've violated GDPR.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Data Transfers</h3>
                      <p className="text-gray-700 text-sm">
                        Your data may be transferred to the US. We use standard contractual clauses for protection.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* CCPA Section */}
              <section className="mb-12 scroll-mt-8 border-t-2 border-gray-200 pt-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <Globe className="w-8 h-8 text-blue-600" />
                  Additional Information for California Users (CCPA)
                </h2>
                
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    If you are a California resident, the California Consumer Privacy Act (CCPA) provides you with specific rights:
                  </p>

                  <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-3">Your California Privacy Rights</h3>
                    <ul className="space-y-2 text-purple-800 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span><strong>Right to Know:</strong> Request information about personal data we've collected about you</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span><strong>Right to Delete:</strong> Request deletion of your personal information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span><strong>Right to Opt-Out:</strong> We do not sell your personal information</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Categories of Information Collected (Past 12 Months)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Examples</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Purpose</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Identifiers</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Name, email, phone number</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Account creation, order processing</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Commercial Data</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Order history, favorites</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Service delivery, recommendations</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Geolocation</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Device location</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Show nearby restaurants</td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">Internet Activity</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Browsing history, searches</td>
                            <td className="px-6 py-4 text-sm text-gray-700">Platform improvement, analytics</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      We Do Not Sell Your Personal Information
                    </h3>
                    <p className="text-gray-700 text-sm">
                      Local Eats has not sold and will not sell your personal information to third parties in the past 12 months or in the future. There is no need to opt-out of sales because we don't engage in this practice.
                    </p>
                  </div>
                </div>
              </section>

              {/* Footer Navigation */}
              <div className="border-t-2 border-gray-200 pt-8 mt-12">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Have questions? Contact us at{' '}
                    <a href="mailto:privacy@localeats.com" className="text-blue-600 hover:text-blue-700 underline font-medium">
                      privacy@localeats.com
                    </a>
                  </p>
                  <div className="flex gap-4">
                    <Link to="/terms" className="text-sm text-blue-600 hover:text-blue-700 underline font-medium">
                      Terms of Service
                    </Link>
                    <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 underline font-medium">
                      Back to Home
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Privacy;