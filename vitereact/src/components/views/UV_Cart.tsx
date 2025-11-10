import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { ShoppingCart, Plus, Minus, Edit2, Trash2, X, Tag, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CartItem {
  cart_item_id: string;
  menu_item_id: string;
  item_name: string;
  base_price: number;
  selected_size: string | null;
  size_price_adjustment: number;
  selected_addons: Array<{ name: string; price: number }>;
  selected_modifications: Array<{ name: string; price: number }>;
  special_instructions: string | null;
  quantity: number;
  item_total_price: number;
}

interface AppliedDiscount {
  discount_id: string;
  code: string;
  discount_amount: number;
  discount_type: string;
}

interface CartData {
  restaurant_id: string | null;
  restaurant_name: string | null;
  items: CartItem[];
  applied_discount: AppliedDiscount | null;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  tip: number;
  grand_total: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchCart = async (authToken: string): Promise<CartData> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const updateCartItemQuantity = async (
  cartItemId: string,
  quantity: number,
  authToken: string
): Promise<CartData> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/items/${cartItemId}`,
    { quantity },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const removeCartItem = async (
  cartItemId: string,
  authToken: string
): Promise<CartData> => {
  const response = await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/items/${cartItemId}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const applyCouponCode = async (
  couponCode: string,
  authToken: string
): Promise<CartData> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/discount`,
    { coupon_code: couponCode },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

const removeCouponCode = async (authToken: string): Promise<CartData> => {
  const response = await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/discount`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
  return response.data;
};

const clearCart = async (authToken: string): Promise<void> => {
  await axios.delete(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );
};



// ============================================================================
// TOAST COMPONENT
// ============================================================================

const ToastNotification: React.FC<{
  toast: Toast;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast.action) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.action, onClose]);

  const bgColor = toast.type === 'success' ? 'bg-green-50 border-green-200' :
    toast.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  
  const textColor = toast.type === 'success' ? 'text-green-800' :
    toast.type === 'error' ? 'text-red-800' : 'text-blue-800';

  return (
    <div className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4 min-w-[300px] max-w-md animate-in slide-in-from-bottom-5 duration-300`}>
      <div className="flex items-center gap-3 flex-1">
        {toast.type === 'success' && <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="size-5 text-red-600 flex-shrink-0" />}
        <p className={`${textColor} text-sm font-medium`}>{toast.message}</p>
      </div>
      <div className="flex items-center gap-2">
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CART COMPONENT
// ============================================================================

const UV_Cart: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ========================================================================
  // ZUSTAND STORE - INDIVIDUAL SELECTORS (CRITICAL)
  // ========================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ========================================================================
  // LOCAL STATE
  // ========================================================================
  const [couponInput, setCouponInput] = useState('');
  const [orderInstructions, setOrderInstructions] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ========================================================================
  // TOAST MANAGEMENT
  // ========================================================================
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info', action?: { label: string; onClick: () => void }) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, action }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ========================================================================
  // REACT QUERY - FETCH CART
  // ========================================================================
  const {
    data: cartData,
    isLoading: isLoadingCart,
    error: cartError,
    refetch: refetchCart,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: () => fetchCart(authToken!),
    enabled: !!authToken && isAuthenticated,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data) => ({
      ...data,
      subtotal: Number(data.subtotal || 0),
      delivery_fee: Number(data.delivery_fee || 0),
      tax: Number(data.tax || 0),
      tip: Number(data.tip || 0),
      grand_total: Number(data.grand_total || 0),
      items: data.items.map(item => ({
        cart_item_id: item.cart_item_id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        base_price: Number(item.base_price || 0),
        selected_size: item.selected_size,
        size_price_adjustment: Number(item.size_price_adjustment || 0),
        selected_addons: item.selected_addons.map(addon => ({
          ...addon,
          price: Number(addon.price || 0),
        })),
        selected_modifications: item.selected_modifications.map(mod => ({
          ...mod,
          price: Number(mod.price || 0),
        })),
        special_instructions: item.special_instructions,
        quantity: item.quantity,
        item_total_price: Number(item.item_total_price || 0),
      })),
    }),
  });

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      updateCartItemQuantity(cartItemId, quantity, authToken!),
    onMutate: async ({ cartItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData(['cart']);

      queryClient.setQueryData(['cart'], (old: CartData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map(item =>
            item.cart_item_id === cartItemId
              ? { ...item, quantity, item_total_price: (item.base_price + item.size_price_adjustment + item.selected_addons.reduce((sum, a) => sum + a.price, 0)) * quantity }
              : item
          ),
        };
      });

      return { previousCart };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
      showToast('Failed to update quantity', 'error');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (cartItemId: string) => removeCartItem(cartItemId, authToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
    },
    onError: () => {
      showToast('Failed to remove item', 'error');
      refetchCart();
    },
  });

  // Apply coupon mutation
  const applyCouponMutation = useMutation({
    mutationFn: (couponCode: string) => applyCouponCode(couponCode, authToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      setCouponInput('');
      showToast('Discount code applied!', 'success');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Invalid or expired coupon code';
      showToast(message, 'error');
    },
  });

  // Remove coupon mutation
  const removeCouponMutation = useMutation({
    mutationFn: () => removeCouponCode(authToken!),
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      showToast('Discount code removed', 'info');
    },
    onError: () => {
      showToast('Failed to remove discount', 'error');
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: () => clearCart(authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('Cart cleared successfully', 'success');
    },
    onError: () => {
      showToast('Failed to clear cart', 'error');
      refetchCart();
    },
  });

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  const handleQuantityChange = (cartItemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity <= 0) {
      const item = cartData?.items.find(i => i.cart_item_id === cartItemId);
      if (item && window.confirm(`Remove ${item.item_name} from your cart?`)) {
        removeItemMutation.mutate(cartItemId);
      }
    } else {
      updateQuantityMutation.mutate({ cartItemId, quantity: newQuantity });
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    if (window.confirm('Remove this item from your cart?')) {
      removeItemMutation.mutate(item.cart_item_id);
    }
  };

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) {
      showToast('Please enter a coupon code', 'error');
      return;
    }
    applyCouponMutation.mutate(couponInput.trim());
  };

  const handleRemoveCoupon = () => {
    removeCouponMutation.mutate();
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      clearCartMutation.mutate();
    }
  };

  const handleProceedToCheckout = () => {
    if (!cartData || cartData.items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    // Check minimum order requirement (assuming $15 minimum for demo)
    const minimumOrder = 15;
    if (cartData.subtotal < minimumOrder) {
      showToast(`Add $${(minimumOrder - cartData.subtotal).toFixed(2)} more to meet minimum order`, 'error');
      return;
    }

    navigate('/checkout');
  };

  // ========================================================================
  // AUTH CHECK - REDIRECT TO LOGIN IF NOT AUTHENTICATED
  // ========================================================================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/cart' } });
    }
  }, [isAuthenticated, navigate]);

  // ========================================================================
  // LOADING STATE
  // ========================================================================
  if (isLoadingCart) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl p-6 h-32"></div>
                  ))}
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl p-6 h-96"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // ERROR STATE
  // ========================================================================
  if (cartError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="size-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to load cart</h2>
              <p className="text-gray-600 mb-6">We couldn't load your shopping cart. Please try again.</p>
              <button
                onClick={() => refetchCart()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========================================================================
  // EMPTY CART STATE
  // ========================================================================
  if (!cartData || cartData.items.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <ShoppingCart className="size-24 text-gray-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-8 text-lg">Start adding items to create your order</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="size-5" />
                Browse Restaurants
              </Link>
            </div>
          </div>
        </div>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onClose={() => closeToast(toast.id)}
            />
          ))}
        </div>
      </>
    );
  }

  // ========================================================================
  // CART WITH ITEMS - MAIN RENDER
  // ========================================================================
  const minimumOrder = 15; // This should come from restaurant data
  const isMinimumMet = cartData.subtotal >= minimumOrder;
  const amountToMinimum = minimumOrder - cartData.subtotal;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <span>/</span>
              {cartData.restaurant_name && (
                <>
                  <Link to={`/restaurant/${cartData.restaurant_id}`} className="hover:text-blue-600 transition-colors">
                    {cartData.restaurant_name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900 font-medium">Cart</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
                {cartData.restaurant_name && (
                  <p className="text-lg text-gray-600">
                    Ordering from <span className="font-semibold text-gray-900">{cartData.restaurant_name}</span>
                  </p>
                )}
              </div>
              {cartData.restaurant_id && (
                <Link
                  to={`/restaurant/${cartData.restaurant_id}`}
                  className="hidden md:flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <ArrowLeft className="size-5" />
                  Continue Shopping
                </Link>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Items List */}
              <div className="space-y-4">
                {cartData.items.map(item => (
                  <div
                    key={item.cart_item_id}
                    className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200"
                  >
                    <div className="flex gap-4">
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.item_name}</h3>
                        
                        {/* Customizations */}
                        {(item.selected_size || item.selected_addons.length > 0 || item.selected_modifications.length > 0) && (
                          <div className="text-sm text-gray-600 mb-2 space-y-1">
                            {item.selected_size && (
                              <p><span className="font-medium">Size:</span> {item.selected_size}</p>
                            )}
                            {item.selected_addons.length > 0 && (
                              <p><span className="font-medium">Add-ons:</span> {item.selected_addons.map(a => a.name).join(', ')}</p>
                            )}
                            {item.selected_modifications.length > 0 && (
                              <p><span className="font-medium">Modifications:</span> {item.selected_modifications.map(m => m.name).join(', ')}</p>
                            )}
                          </div>
                        )}
                        
                        {/* Special Instructions */}
                        {item.special_instructions && (
                          <p className="text-sm text-gray-500 italic mb-3">"{item.special_instructions}"</p>
                        )}

                        {/* Quantity Controls - Mobile */}
                        <div className="flex items-center gap-4 md:hidden mt-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuantityChange(item.cart_item_id, item.quantity, -1)}
                              disabled={item.quantity <= 1}
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4 text-gray-700" />
                            </button>
                            <span className="text-lg font-semibold text-gray-900 w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.cart_item_id, item.quantity, 1)}
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-all"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4 text-gray-700" />
                            </button>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">${item.item_total_price.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Controls - Desktop */}
                      <div className="hidden md:flex flex-col items-end gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.cart_item_id, item.quantity, -1)}
                            disabled={item.quantity <= 1}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4 text-gray-700" />
                          </button>
                          <span className="text-lg font-semibold text-gray-900 w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleQuantityChange(item.cart_item_id, item.quantity, 1)}
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-all"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4 text-gray-700" />
                          </button>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">${item.item_total_price.toFixed(2)}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => showToast('Edit functionality coming soon', 'info')}
                            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all"
                            aria-label="Edit item"
                          >
                            <Edit2 className="size-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="p-2 rounded-lg border border-red-300 hover:bg-red-50 transition-all"
                            aria-label="Remove item"
                          >
                            <Trash2 className="size-5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Edit/Remove Buttons - Mobile */}
                    <div className="flex gap-2 mt-4 md:hidden">
                      <button
                        onClick={() => showToast('Edit functionality coming soon', 'info')}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Edit2 className="size-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Edit</span>
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="flex-1 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="size-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="size-5 text-blue-600" />
                  Apply Discount Code
                </h3>
                
                {cartData.applied_discount ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">{cartData.applied_discount.code}</p>
                        <p className="text-sm text-green-700">
                          ${cartData.applied_discount.discount_amount.toFixed(2)} discount applied
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      disabled={removeCouponMutation.isPending}
                      className="p-2 hover:bg-green-100 rounded-lg transition-all"
                      aria-label="Remove discount"
                    >
                      <X className="size-5 text-green-700" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={applyCouponMutation.isPending || !couponInput.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {applyCouponMutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Instructions (Optional)</h3>
                <textarea
                  value={orderInstructions}
                  onChange={(e) => setOrderInstructions(e.target.value)}
                  placeholder="Any special requests for the restaurant?"
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none"
                />
                <p className="text-sm text-gray-500 mt-2 text-right">{orderInstructions.length}/200</p>
              </div>

              {/* Clear Cart Button */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <button
                  onClick={handleClearCart}
                  disabled={clearCartMutation.isPending}
                  className="w-full px-6 py-3 bg-red-50 text-red-600 border-2 border-red-200 rounded-lg font-semibold hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {clearCartMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="size-5" />
                      Clear Cart
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Cart Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 lg:sticky lg:top-4 space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Order Summary</h3>

                {/* Pricing Breakdown */}
                <div className="space-y-3 border-b border-gray-200 pb-4">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">${cartData.subtotal.toFixed(2)}</span>
                  </div>
                  {cartData.applied_discount && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">-${cartData.applied_discount.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>Delivery Fee</span>
                    <span className="font-semibold">${cartData.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax</span>
                    <span className="font-semibold">${cartData.tax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between text-2xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${cartData.grand_total.toFixed(2)}</span>
                </div>

                {/* Minimum Order Indicator */}
                {!isMinimumMet && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-orange-900 mb-2">Minimum order: ${minimumOrder.toFixed(2)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(cartData.subtotal / minimumOrder) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-orange-700">Add ${amountToMinimum.toFixed(2)} more to checkout</p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleProceedToCheckout}
                  disabled={!isMinimumMet}
                  className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Proceed to Checkout
                </button>

                {/* Continue Shopping - Mobile */}
                {cartData.restaurant_id && (
                  <Link
                    to={`/restaurant/${cartData.restaurant_id}`}
                    className="block md:hidden text-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Continue Shopping
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

export default UV_Cart;