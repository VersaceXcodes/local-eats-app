import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CreditCard, 
  MapPin, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  ShoppingCart,
  Edit2,
  DollarSign,
  Lock,
  Plus,
  X
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SavedAddress {
  address_id: string;
  address_label: string;
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

interface SavedPaymentMethod {
  payment_method_id: string;
  payment_label: string;
  card_type: string;
  last_four_digits: string;
  expiration_month: string;
  expiration_year: string;
  is_default: boolean;
}

interface DeliveryAddress {
  street_address: string;
  apartment_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
}

interface ValidationErrors {
  step_1?: string;
  step_2?: string;
  step_3?: string;
  step_4?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartState = useAppStore(state => state.cart_state);
  const updateTip = useAppStore(state => state.update_tip);
  const setOrderType = useAppStore(state => state.set_order_type);
  const setDeliveryAddress = useAppStore(state => state.set_delivery_address);
  const recalculateTotals = useAppStore(state => state.recalculate_totals);
  const clearCart = useAppStore(state => state.clear_cart);

  // Local state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orderType, setOrderTypeLocal] = useState<'delivery' | 'pickup' | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deliveryAddressLocal, setDeliveryAddressLocal] = useState<DeliveryAddress | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isAddingNewPayment, setIsAddingNewPayment] = useState(false);
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [customTipAmount, setCustomTipAmount] = useState<string>('');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [orderError, setOrderError] = useState<string | null>(null);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    street_address: '',
    apartment_suite: '',
    city: '',
    state: '',
    zip_code: '',
    address_label: '',
    is_default: false
  });

  // New payment form state
  const [newPayment, setNewPayment] = useState({
    card_number: '',
    cardholder_name: '',
    expiration_month: '',
    expiration_year: '',
    cvv: '',
    billing_zip_code: '',
    payment_label: '',
    is_default: false
  });

  // ============================================================================
  // INITIALIZE FROM URL PARAMS
  // ============================================================================

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= 4) {
        setCurrentStep(step);
      }
    }
  }, [searchParams]);

  // ============================================================================
  // FETCH SAVED ADDRESSES
  // ============================================================================

  const { data: addressesData, isLoading: isLoadingAddresses } = useQuery({
    queryKey: ['saved-addresses'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/addresses`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data.addresses as SavedAddress[];
    },
    enabled: !!authToken && currentStep === 2 && orderType === 'delivery',
    staleTime: 60000
  });

  // ============================================================================
  // FETCH SAVED PAYMENT METHODS
  // ============================================================================

  const { data: paymentMethodsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['saved-payment-methods'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      return response.data.payment_methods as SavedPaymentMethod[];
    },
    enabled: !!authToken && currentStep === 3,
    staleTime: 60000
  });

  // ============================================================================
  // CREATE NEW ADDRESS MUTATION
  // ============================================================================

  const createAddressMutation = useMutation({
    mutationFn: async (addressData: typeof newAddress) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/addresses`,
        addressData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data as SavedAddress;
    },
    onSuccess: (data) => {
      setSelectedAddressId(data.address_id);
      setDeliveryAddressLocal({
        street_address: data.street_address,
        apartment_suite: data.apartment_suite,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code
      });
      setDeliveryAddress({
        street_address: data.street_address,
        apartment_suite: data.apartment_suite,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code
      });
      setIsAddingNewAddress(false);
      setNewAddress({
        street_address: '',
        apartment_suite: '',
        city: '',
        state: '',
        zip_code: '',
        address_label: '',
        is_default: false
      });
    }
  });

  // ============================================================================
  // CREATE NEW PAYMENT METHOD MUTATION
  // ============================================================================

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      payment_label: string;
      card_type: string;
      last_four_digits: string;
      expiration_month: string;
      expiration_year: string;
      billing_zip_code: string;
      is_default: boolean;
    }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/payment-methods`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data as SavedPaymentMethod;
    },
    onSuccess: (data) => {
      setSelectedPaymentId(data.payment_method_id);
      setIsAddingNewPayment(false);
      setNewPayment({
        card_number: '',
        cardholder_name: '',
        expiration_month: '',
        expiration_year: '',
        cvv: '',
        billing_zip_code: '',
        payment_label: '',
        is_default: false
      });
    }
  });

  // ============================================================================
  // PLACE ORDER MUTATION
  // ============================================================================

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        user_id: currentUser?.user_id,
        restaurant_id: cartState.restaurant_id,
        order_type: orderType,
        delivery_street_address: orderType === 'delivery' ? deliveryAddressLocal?.street_address : null,
        delivery_apartment_suite: orderType === 'delivery' ? deliveryAddressLocal?.apartment_suite : null,
        delivery_city: orderType === 'delivery' ? deliveryAddressLocal?.city : null,
        delivery_state: orderType === 'delivery' ? deliveryAddressLocal?.state : null,
        delivery_zip_code: orderType === 'delivery' ? deliveryAddressLocal?.zip_code : null,
        special_instructions: specialInstructions || null,
        discount_id: cartState.applied_discount?.discount_id || null,
        payment_method_id: selectedPaymentId,
        tip: cartState.tip
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.order && data.order.order_id) {
        clearCart();
        navigate(`/order-confirmation/${data.order.order_id}`);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Order placement failed. Please try again.';
      setOrderError(errorMessage);
    }
  });

  // ============================================================================
  // STEP VALIDATION
  // ============================================================================

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    if (step === 1) {
      if (!orderType) {
        errors.step_1 = 'Please select delivery or pickup';
        setValidationErrors(errors);
        return false;
      }
    }

    if (step === 2 && orderType === 'delivery') {
      if (!deliveryAddressLocal || !deliveryAddressLocal.street_address || !deliveryAddressLocal.city || !deliveryAddressLocal.state || !deliveryAddressLocal.zip_code) {
        errors.step_2 = 'Please select or add a delivery address';
        setValidationErrors(errors);
        return false;
      }
      // Validate zip code format
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(deliveryAddressLocal.zip_code)) {
        errors.step_2 = 'Invalid zip code format';
        setValidationErrors(errors);
        return false;
      }
    }

    if (step === 3) {
      if (!selectedPaymentId) {
        errors.step_3 = 'Please select or add a payment method';
        setValidationErrors(errors);
        return false;
      }
    }

    if (step === 4) {
      if (!termsAccepted) {
        errors.step_4 = 'You must accept the terms of service';
        setValidationErrors(errors);
        return false;
      }
    }

    setValidationErrors({});
    return true;
  };

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleContinue = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 1 && orderType) {
      setOrderType(orderType);
    }

    // Skip tip step if pickup
    if (currentStep === 3 && orderType === 'pickup') {
      setCurrentStep(4);
      setSearchParams({ step: '4' });
    } else if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setSearchParams({ step: nextStep.toString() });
    }
  };

  const handleBack = () => {
    setValidationErrors({});
    // Skip tip step if pickup
    if (currentStep === 4 && orderType === 'pickup') {
      setCurrentStep(3);
      setSearchParams({ step: '3' });
    } else if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      setSearchParams({ step: prevStep.toString() });
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setSearchParams({ step: step.toString() });
    setValidationErrors({});
  };

  // ============================================================================
  // TIP CALCULATION
  // ============================================================================

  const handleTipPercentageChange = (percentage: number) => {
    setTipPercentage(percentage);
    setCustomTipAmount('');
    const tipAmount = (cartState.subtotal * percentage) / 100;
    updateTip(Number(tipAmount.toFixed(2)));
    recalculateTotals();
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTipAmount(value);
    setTipPercentage(0);
    const tipAmount = parseFloat(value) || 0;
    updateTip(Number(tipAmount.toFixed(2)));
    recalculateTotals();
  };

  // ============================================================================
  // ADDRESS SELECTION HANDLER
  // ============================================================================

  const handleAddressSelect = (addressId: string) => {
    const address = addressesData?.find(a => a.address_id === addressId);
    if (address) {
      setSelectedAddressId(addressId);
      const deliveryAddr: DeliveryAddress = {
        street_address: address.street_address,
        apartment_suite: address.apartment_suite,
        city: address.city,
        state: address.state,
        zip_code: address.zip_code
      };
      setDeliveryAddressLocal(deliveryAddr);
      setDeliveryAddress(deliveryAddr);
    }
  };

  // ============================================================================
  // NEW ADDRESS FORM HANDLERS
  // ============================================================================

  const handleAddNewAddress = () => {
    if (!newAddress.street_address || !newAddress.city || !newAddress.state || !newAddress.zip_code) {
      return;
    }
    createAddressMutation.mutate(newAddress);
  };

  // ============================================================================
  // NEW PAYMENT FORM HANDLERS
  // ============================================================================

  const detectCardType = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    if (cleaned.startsWith('6')) return 'Discover';
    return 'Visa';
  };

  const handleAddNewPayment = () => {
    if (!newPayment.card_number || !newPayment.cardholder_name || !newPayment.expiration_month || !newPayment.expiration_year || !newPayment.cvv || !newPayment.billing_zip_code) {
      return;
    }

    const cardType = detectCardType(newPayment.card_number);
    const lastFour = newPayment.card_number.replace(/\s/g, '').slice(-4);
    const label = newPayment.payment_label || `${cardType} ending in ${lastFour}`;

    createPaymentMutation.mutate({
      payment_label: label,
      card_type: cardType,
      last_four_digits: lastFour,
      expiration_month: newPayment.expiration_month,
      expiration_year: newPayment.expiration_year,
      billing_zip_code: newPayment.billing_zip_code,
      is_default: newPayment.is_default
    });
  };

  // ============================================================================
  // PLACE ORDER HANDLER
  // ============================================================================

  const handlePlaceOrder = () => {
    if (!validateStep(4)) {
      return;
    }
    setOrderError(null);
    placeOrderMutation.mutate();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: 'Order Type' },
      { number: 2, label: orderType === 'delivery' ? 'Address' : 'Pickup' },
      { number: 3, label: 'Payment' },
      ...(orderType === 'delivery' ? [{ number: 3.5, label: 'Tip' }] : []),
      { number: 4, label: 'Review' }
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, index) => {
            const stepNum = typeof step.number === 'number' && step.number < 4 ? step.number : (step.number === 3.5 ? 3 : 4);
            const isActive = currentStep === stepNum || (currentStep === 3 && step.number === 3.5 && orderType === 'delivery');
            const isCompleted = currentStep > stepNum || (currentStep === 4 && step.number === 3.5);

            return (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isActive
                        ? 'bg-orange-600 text-white ring-4 ring-orange-100'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
                  </div>
                  <span className={`mt-2 text-xs font-medium hidden sm:block ${isActive ? 'text-orange-600' : 'text-gray-600'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOrderSummary = (isMobile: boolean = false) => {
    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-100 ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Order Summary</h3>
          <Link to="/cart" className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1">
            <Edit2 className="w-4 h-4" />
            Edit cart
          </Link>
        </div>

        {cartState.restaurant_name && (
          <div className="mb-4 pb-4 border-b">
            <p className="font-semibold text-gray-900">{cartState.restaurant_name}</p>
            <p className="text-sm text-gray-600">{cartState.items.length} {cartState.items.length === 1 ? 'item' : 'items'}</p>
          </div>
        )}

        <div className="space-y-3 mb-4 pb-4 border-b">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">${cartState.subtotal.toFixed(2)}</span>
          </div>
          {cartState.applied_discount && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount ({cartState.applied_discount.code})</span>
              <span className="font-medium text-green-600">-${cartState.applied_discount.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="font-medium text-gray-900">${cartState.delivery_fee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span className="font-medium text-gray-900">${cartState.tax.toFixed(2)}</span>
          </div>
          {orderType === 'delivery' && cartState.tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span className="font-medium text-gray-900">${cartState.tip.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-orange-600">${cartState.grand_total.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER MAIN COMPONENT
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden md:block mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your order in a few simple steps</p>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Mobile Order Summary (Collapsible) */}
          <div className="md:hidden mb-6">
            {renderOrderSummary(true)}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Checkout Steps */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
                {/* Error Display */}
                {orderError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Error placing order</p>
                      <p className="text-sm text-red-700 mt-1">{orderError}</p>
                    </div>
                  </div>
                )}

                {validationErrors[`step_${currentStep}`] && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">{validationErrors[`step_${currentStep}`]}</p>
                  </div>
                )}

                {/* Step 1: Order Type */}
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Order Type</h2>
                    <p className="text-gray-600 mb-6">Choose how you'd like to receive your order</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => setOrderTypeLocal('delivery')}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          orderType === 'delivery'
                            ? 'border-orange-600 bg-orange-50 ring-4 ring-orange-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            orderType === 'delivery' ? 'bg-orange-600' : 'bg-gray-100'
                          }`}>
                            <MapPin className={`w-6 h-6 ${orderType === 'delivery' ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">Delivery</p>
                            <p className="text-sm text-gray-600">Get it delivered to your door</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setOrderTypeLocal('pickup')}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          orderType === 'pickup'
                            ? 'border-orange-600 bg-orange-50 ring-4 ring-orange-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            orderType === 'pickup' ? 'bg-orange-600' : 'bg-gray-100'
                          }`}>
                            <ShoppingCart className={`w-6 h-6 ${orderType === 'pickup' ? 'text-white' : 'text-gray-600'}`} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">Pickup</p>
                            <p className="text-sm text-gray-600">Pick it up yourself</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2a: Delivery Address */}
                {currentStep === 2 && orderType === 'delivery' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Address</h2>
                    <p className="text-gray-600 mb-6">Where should we deliver your order?</p>

                    {isLoadingAddresses ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading addresses...</p>
                      </div>
                    ) : (
                      <>
                        {/* Saved Addresses */}
                        {addressesData && addressesData.length > 0 && !isAddingNewAddress && (
                          <div className="space-y-3 mb-6">
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Select Saved Address
                            </label>
                            {addressesData.map((address) => (
                              <button
                                key={address.address_id}
                                onClick={() => handleAddressSelect(address.address_id)}
                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                  selectedAddressId === address.address_id
                                    ? 'border-orange-600 bg-orange-50 ring-4 ring-orange-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{address.address_label}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {address.street_address}
                                      {address.apartment_suite && `, ${address.apartment_suite}`}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {address.city}, {address.state} {address.zip_code}
                                    </p>
                                  </div>
                                  {selectedAddressId === address.address_id && (
                                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Add New Address Button */}
                        {!isAddingNewAddress && (
                          <button
                            onClick={() => setIsAddingNewAddress(true)}
                            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            Add New Address
                          </button>
                        )}

                        {/* New Address Form */}
                        {isAddingNewAddress && (
                          <div className="border-2 border-gray-200 rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-gray-900">New Address</h3>
                              <button
                                onClick={() => setIsAddingNewAddress(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Street Address *
                              </label>
                              <input
                                type="text"
                                value={newAddress.street_address}
                                onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="123 Main St"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apartment/Suite
                              </label>
                              <input
                                type="text"
                                value={newAddress.apartment_suite}
                                onChange={(e) => setNewAddress({ ...newAddress, apartment_suite: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Apt 4B"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  City *
                                </label>
                                <input
                                  type="text"
                                  value={newAddress.city}
                                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="Portland"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  State *
                                </label>
                                <select
                                  value={newAddress.state}
                                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                >
                                  <option value="">Select</option>
                                  <option value="OR">OR</option>
                                  <option value="WA">WA</option>
                                  <option value="CA">CA</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Zip Code *
                              </label>
                              <input
                                type="text"
                                value={newAddress.zip_code}
                                onChange={(e) => setNewAddress({ ...newAddress, zip_code: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="97201"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address Label
                              </label>
                              <input
                                type="text"
                                value={newAddress.address_label}
                                onChange={(e) => setNewAddress({ ...newAddress, address_label: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Home, Work, etc."
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="save-address"
                                checked={newAddress.is_default}
                                onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <label htmlFor="save-address" className="text-sm text-gray-700">
                                Set as default address
                              </label>
                            </div>

                            <button
                              onClick={handleAddNewAddress}
                              disabled={createAddressMutation.isPending}
                              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {createAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Step 2b: Pickup Time */}
                {currentStep === 2 && orderType === 'pickup' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Pickup Information</h2>
                    <p className="text-gray-600 mb-6">Pick up your order at the restaurant</p>

                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">{cartState.restaurant_name}</p>
                          <p className="text-gray-600 text-sm">Restaurant address will be displayed here</p>
                          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium mt-2 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Get Directions
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <Clock className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Estimated Pickup Time</p>
                          <p className="text-2xl font-bold text-orange-600">15-20 minutes</p>
                          <p className="text-sm text-gray-600 mt-1">ASAP pickup</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Payment Method */}
                {currentStep === 3 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Method</h2>
                    <p className="text-gray-600 mb-6">How would you like to pay?</p>

                    {isLoadingPayments ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading payment methods...</p>
                      </div>
                    ) : (
                      <>
                        {/* Saved Payment Methods */}
                        {paymentMethodsData && paymentMethodsData.length > 0 && !isAddingNewPayment && (
                          <div className="space-y-3 mb-6">
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Select Payment Method
                            </label>
                            {paymentMethodsData.map((payment) => (
                              <button
                                key={payment.payment_method_id}
                                onClick={() => setSelectedPaymentId(payment.payment_method_id)}
                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                  selectedPaymentId === payment.payment_method_id
                                    ? 'border-orange-600 bg-orange-50 ring-4 ring-orange-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CreditCard className="w-6 h-6 text-gray-600" />
                                    <div>
                                      <p className="font-semibold text-gray-900">{payment.payment_label}</p>
                                      <p className="text-sm text-gray-600">
                                        {payment.card_type} •••• {payment.last_four_digits}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Expires {payment.expiration_month}/{payment.expiration_year}
                                      </p>
                                    </div>
                                  </div>
                                  {selectedPaymentId === payment.payment_method_id && (
                                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Add New Payment Button */}
                        {!isAddingNewPayment && (
                          <button
                            onClick={() => setIsAddingNewPayment(true)}
                            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-5 h-5" />
                            Add New Payment Method
                          </button>
                        )}

                        {/* New Payment Form */}
                        {isAddingNewPayment && (
                          <div className="border-2 border-gray-200 rounded-lg p-6 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-gray-900">New Payment Method</h3>
                              <button
                                onClick={() => setIsAddingNewPayment(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Card Number *
                              </label>
                              <input
                                type="text"
                                value={newPayment.card_number}
                                onChange={(e) => setNewPayment({ ...newPayment, card_number: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cardholder Name *
                              </label>
                              <input
                                type="text"
                                value={newPayment.cardholder_name}
                                onChange={(e) => setNewPayment({ ...newPayment, cardholder_name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="John Doe"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Exp Month *
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.expiration_month}
                                  onChange={(e) => setNewPayment({ ...newPayment, expiration_month: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="MM"
                                  maxLength={2}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Exp Year *
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.expiration_year}
                                  onChange={(e) => setNewPayment({ ...newPayment, expiration_year: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="YYYY"
                                  maxLength={4}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  CVV *
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.cvv}
                                  onChange={(e) => setNewPayment({ ...newPayment, cvv: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                  placeholder="123"
                                  maxLength={4}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Billing Zip Code *
                              </label>
                              <input
                                type="text"
                                value={newPayment.billing_zip_code}
                                onChange={(e) => setNewPayment({ ...newPayment, billing_zip_code: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="97201"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="save-payment"
                                checked={newPayment.is_default}
                                onChange={(e) => setNewPayment({ ...newPayment, is_default: e.target.checked })}
                                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <label htmlFor="save-payment" className="text-sm text-gray-700">
                                Set as default payment method
                              </label>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                              <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-blue-800">
                                Your payment information is secure and encrypted
                              </p>
                            </div>

                            <button
                              onClick={handleAddNewPayment}
                              disabled={createPaymentMutation.isPending}
                              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {createPaymentMutation.isPending ? 'Saving...' : 'Save Payment Method'}
                            </button>
                          </div>
                        )}

                        {/* Security Badges */}
                        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Lock className="w-4 h-4" />
                            SSL Encrypted
                          </div>
                          <span>•</span>
                          <span>Secure Payment</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 3.5: Tip (Delivery Only) */}
                {currentStep === 3 && orderType === 'delivery' && selectedPaymentId && (
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Add a Tip</h3>
                    <p className="text-gray-600 mb-6">Support your delivery driver</p>

                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[10, 15, 20, 25].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => handleTipPercentageChange(percentage)}
                          className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                            tipPercentage === percentage
                              ? 'border-orange-600 bg-orange-50 text-orange-600'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {percentage}%
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Tip Amount
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={customTipAmount}
                            onChange={(e) => handleCustomTipChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTipPercentage(0);
                          setCustomTipAmount('');
                          updateTip(0);
                          recalculateTotals();
                        }}
                        className="mt-6 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        No Tip
                      </button>
                    </div>

                    {cartState.tip > 0 && (
                      <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                          Tip amount: <span className="font-semibold text-orange-600">${cartState.tip.toFixed(2)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Review & Place Order */}
                {currentStep === 4 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Order</h2>
                    <p className="text-gray-600 mb-6">Please review your order before placing it</p>

                    {/* Order Type & Address */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Order Type</p>
                          <p className="font-semibold text-gray-900 capitalize">{orderType}</p>
                        </div>
                        <button
                          onClick={() => goToStep(1)}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>

                      {orderType === 'delivery' && deliveryAddressLocal && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Delivery Address</p>
                            <p className="font-semibold text-gray-900">{deliveryAddressLocal.street_address}</p>
                            {deliveryAddressLocal.apartment_suite && (
                              <p className="text-gray-700">{deliveryAddressLocal.apartment_suite}</p>
                            )}
                            <p className="text-gray-700">
                              {deliveryAddressLocal.city}, {deliveryAddressLocal.state} {deliveryAddressLocal.zip_code}
                            </p>
                          </div>
                          <button
                            onClick={() => goToStep(2)}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      )}

                      {orderType === 'pickup' && (
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Pickup Location</p>
                            <p className="font-semibold text-gray-900">{cartState.restaurant_name}</p>
                            <p className="text-gray-700">Estimated time: 15-20 minutes</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Payment Method</p>
                          {selectedPaymentId && paymentMethodsData && (
                            <>
                              {(() => {
                                const payment = paymentMethodsData.find(p => p.payment_method_id === selectedPaymentId);
                                return payment ? (
                                  <p className="font-semibold text-gray-900">
                                    {payment.card_type} •••• {payment.last_four_digits}
                                  </p>
                                ) : null;
                              })()}
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => goToStep(3)}
                          className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {cartState.items.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.quantity}x {item.item_name}
                              </p>
                              {item.customizations.size && (
                                <p className="text-sm text-gray-600">Size: {item.customizations.size}</p>
                              )}
                            </div>
                            <p className="font-medium text-gray-900">${item.item_total.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Special Instructions */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Instructions (Optional)
                      </label>
                      <textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        rows={3}
                        placeholder="Any special requests?"
                        maxLength={500}
                      />
                    </div>

                    {/* Terms Acceptance */}
                    <div className="mb-6">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <label htmlFor="terms" className="text-sm text-gray-700">
                          By placing this order, you agree to our{' '}
                          <Link to="/terms" target="_blank" className="text-orange-600 hover:text-orange-700 underline">
                            Terms of Service
                          </Link>
                        </label>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={!termsAccepted || placeOrderMutation.isPending}
                      className="w-full py-4 bg-orange-600 text-white rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {placeOrderMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Placing your order...
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Place Order - ${cartState.grand_total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t">
                  {currentStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>
                  )}

                  {currentStep < 4 && (
                    <button
                      onClick={handleContinue}
                      className={`ml-auto flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors ${
                        currentStep === 1 || (currentStep > 1 && !orderType) ? '' : ''
                      }`}
                    >
                      Continue
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary (Desktop) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-8">
                {renderOrderSummary()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Checkout;