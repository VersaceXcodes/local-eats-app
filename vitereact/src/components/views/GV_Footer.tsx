import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight,
  Send
} from 'lucide-react';

const GV_Footer: React.FC = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  // Generate a random address
  const randomAddress = useMemo(() => {
    const streets = ['Oak Street', 'Main Street', 'Elm Avenue', 'Maple Drive', 'Cedar Lane', 'Pine Road', 'Birch Boulevard', 'Willow Way', 'Cherry Street', 'Ash Avenue'];
    const cities = ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford', 'Kilkenny', 'Sligo', 'Drogheda'];
    const streetNumber = Math.floor(Math.random() * 999) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    return `${streetNumber} ${street}, ${city}, Ireland`;
  }, []);

  return (
    <footer className="bg-gray-950 text-gray-300 border-t border-gray-800 font-sans">
      {/* Top Section: Newsletter & Brand */}
      <div className="bg-gray-900/50 py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-500/10 p-2 rounded-lg">
                  <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">Local Eats</h3>
              </div>
              <p className="text-gray-400 max-w-md text-lg">
                Delivering the best local food right to your doorstep. fast, fresh, and supporting your community.
              </p>
            </div>
            
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
              <h4 className="text-white font-semibold mb-2">Subscribe to our newsletter</h4>
              <p className="text-sm text-gray-400 mb-4">Get the latest offers and updates delivered to your inbox.</p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <button 
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  Subscribe <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider border-b border-gray-800 pb-2 inline-block">Discover</h4>
            <ul className="space-y-3">
              {[
                { name: 'Home', path: '/' },
                { name: 'Restaurants', path: '/search' },
                { name: 'Local Picks', path: '/local-picks' },
                { name: 'Favorites', path: '/favorites' },
                { name: 'Latest Offers', path: '/search?sort=rating' }
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-400 hover:text-orange-500 transition-colors text-sm flex items-center gap-2 group">
                    <ArrowRight size={14} className="text-gray-600 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider border-b border-gray-800 pb-2 inline-block">My Account</h4>
            <ul className="space-y-3">
              {[
                { name: 'Profile', path: '/profile' },
                { name: 'Orders', path: '/order-history' },
                { name: 'Settings', path: '/settings' },
                { name: 'Notifications', path: '/notifications' },
                { name: 'Help Center', path: '/support' }
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-gray-400 hover:text-orange-500 transition-colors text-sm flex items-center gap-2 group">
                    <ArrowRight size={14} className="text-gray-600 group-hover:text-orange-500 transition-colors" />
                    <span className="group-hover:translate-x-1 transition-transform">{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider border-b border-gray-800 pb-2 inline-block">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin size={18} className="text-orange-500 shrink-0 mt-0.5" />
                <span>{randomAddress}</span>
              </li>
              <li>
                <a href="tel:+3531234567" className="flex items-center gap-3 text-sm text-gray-400 hover:text-orange-500 transition-colors">
                  <Phone size={18} className="text-orange-500 shrink-0" />
                  <span>+353 1 234 567</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@localeats.com" className="flex items-center gap-3 text-sm text-gray-400 hover:text-orange-500 transition-colors">
                  <Mail size={18} className="text-orange-500 shrink-0" />
                  <span>support@localeats.com</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Download App */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider border-b border-gray-800 pb-2 inline-block">Get the App</h4>
            <p className="text-sm text-gray-400 mb-4">Order on the go with our top-rated app.</p>
            <div className="space-y-3">
              <button className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white p-3 rounded-xl flex items-center gap-3 transition-all group">
                 <div className="bg-white text-black p-1 rounded-full">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M17.6 10.9l1.6-1c.4-.3.5-.8.2-1.2l-2.3-3.9c-.3-.4-.8-.5-1.2-.3l-1.9 1.1c-.9-.6-2-.9-3-.9s-2.1.3-3 .9L6.1 4.5c-.4-.2-.9-.1-1.2.3L2.6 8.7c-.3.4-.2.9.2 1.2l1.6 1c-.1.3-.1.7-.1 1.1s0 .8.1 1.1l-1.6 1c-.4.3-.5.8-.2 1.2l2.3 3.9c.3.4.8.5 1.2.3l1.9-1.1c.9.6 2 .9 3 .9s2.1-.3 3-.9l1.9 1.1c.4.2.9.1 1.2-.3l2.3-3.9c.3-.4.2-.9-.2-1.2l-1.6-1c.1-.3.1-.7.1-1.1s0-.8-.1-1.1zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
                    </svg>
                 </div>
                 <div className="text-left">
                    <div className="text-[10px] uppercase text-gray-400 font-semibold leading-none">Download on the</div>
                    <div className="text-sm font-bold leading-none mt-1">App Store</div>
                 </div>
              </button>
              
              <button className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white p-3 rounded-xl flex items-center gap-3 transition-all group">
                 <div className="bg-white text-black p-1 rounded-full">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                       <path d="M3 20.5v-17c0-.8.7-1.5 1.5-1.5.2 0 .4.1.6.2l14 8.5c.5.3.8.8.8 1.3 0 .6-.3 1.1-.8 1.3l-14 8.5c-.2.1-.4.2-.6.2-.8 0-1.5-.7-1.5-1.5z"/>
                    </svg>
                 </div>
                 <div className="text-left">
                    <div className="text-[10px] uppercase text-gray-400 font-semibold leading-none">Get it on</div>
                    <div className="text-sm font-bold leading-none mt-1">Google Play</div>
                 </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <p className="text-gray-500 text-sm">
              © {currentYear} Local Eats. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
               <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy</Link>
               <span className="text-gray-700">•</span>
               <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms</Link>
               <span className="text-gray-700">•</span>
               <Link to="/cookies" className="hover:text-orange-500 transition-colors">Cookies</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Instagram, Linkedin, Youtube].map((Icon, idx) => (
                <a 
                  key={idx}
                  href="#" 
                  className="bg-gray-900 p-2 rounded-full text-gray-400 hover:text-white hover:bg-orange-500 transition-all hover:-translate-y-1"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GV_Footer;
