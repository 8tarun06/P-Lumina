import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useGlobalModal } from "../context/ModalContext";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../cart.css";
import "../bar.css";

// Coupon validation and calculation utilities
const validateCoupon = (coupon, subtotal, appliedCoupons, hasPreviousOrders) => {
  // Check if coupon is already applied
  if (appliedCoupons.some(applied => applied.code === coupon.code)) {
    return { isValid: false, message: 'Coupon already applied' };
  }

  // Check if it's a first-order-only coupon and user has previous orders
  if (coupon.firstOrderOnly && hasPreviousOrders) {
    return { isValid: false, message: 'This coupon is only valid for your first order' };
  }

  // Check minimum order value
  if (subtotal < coupon.minOrder) {
    return { 
      isValid: false, 
      message: `Add ₹${(coupon.minOrder - subtotal).toFixed(2)} more to use this coupon` 
    };
  }

  // Check expiry date
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { isValid: false, message: 'Coupon has expired' };
  }

  // Check usage limits
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { isValid: false, message: 'Coupon usage limit reached' };
  }

  // Check coupon stacking rules
  const hasPercentageCoupon = appliedCoupons.some(c => c.type === 'percentage');
  const hasFixedCoupon = appliedCoupons.some(c => c.type === 'fixed');
  const hasShippingCoupon = appliedCoupons.some(c => c.type === 'shipping');

  if (coupon.type === 'percentage' && hasPercentageCoupon) {
    return { isValid: false, message: 'Only one percentage coupon can be applied' };
  }

  if (coupon.type === 'fixed' && hasFixedCoupon) {
    return { isValid: false, message: 'Only one fixed amount coupon can be applied' };
  }

  if (coupon.type === 'shipping' && hasShippingCoupon) {
    return { isValid: false, message: 'Only one shipping coupon can be applied' };
  }

  return { isValid: true, message: 'Coupon applied successfully' };
};

const checkUserOrderHistory = async (userId) => {
  try {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Returns true if user has previous orders
  } catch (error) {
    console.error("Error checking order history:", error);
    return false; // Default to false if there's an error
  }
};

const calculateCouponDiscount = (coupon, subtotal) => {
  // Ensure values are numbers
  const safeSubtotal = parseFloat(subtotal) || 0;
  const couponValue = parseFloat(coupon.value) || 0;
  const minOrder = parseFloat(coupon.minOrder) || 0;

  console.log('Calculating discount for coupon:', coupon.code, {
    type: coupon.type,
    value: couponValue,
    subtotal: safeSubtotal,
    minOrder: minOrder
  });

  switch (coupon.type) {
    case 'percentage':
      const percentageDiscount = (safeSubtotal * couponValue) / 100;
      console.log('Percentage discount calculated:', percentageDiscount);
      return percentageDiscount;
    case 'fixed':
      const fixedDiscount = Math.min(couponValue, safeSubtotal);
      console.log('Fixed discount calculated:', fixedDiscount);
      return fixedDiscount;
    case 'shipping':
      console.log('Shipping coupon - discount handled separately');
      return 0; // Shipping handled separately
    default:
      console.log('Unknown coupon type, returning 0');
      return 0;
  }
};

const calculateCartSummary = (cart, appliedCoupons) => {
  const subtotal = cart.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return total + price * quantity;
  }, 0);

  console.log('Cart subtotal:', subtotal);
  console.log('Applied coupons:', appliedCoupons);

  let totalDiscount = 0;
  let shipping = 50; // Fixed shipping charges of ₹50
  let shippingSavings = 0;
  const couponResults = [];

  // Calculate discounts from each coupon
  appliedCoupons.forEach(coupon => {
    const discountAmount = calculateCouponDiscount(coupon, subtotal);
    console.log(`Discount for ${coupon.code}:`, discountAmount);
    
    totalDiscount += discountAmount;

    couponResults.push({
      ...coupon,
      discountAmount
    });

    // Apply shipping coupon - FREE shipping only when shipping coupon is applied
    if (coupon.type === 'shipping' && subtotal >= coupon.minOrder) {
      shippingSavings = 50; // Save the full shipping amount
      shipping = 0;
    }
  });

  console.log('Total discount:', totalDiscount);

  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = taxableAmount * 0.18; // 18% GST
  const total = Math.max(0, taxableAmount + tax + shipping);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(totalDiscount.toFixed(2)),
    shipping: parseFloat(shipping.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    itemCount: cart.reduce((sum, item) => sum + (item.quantity || 1), 0),
    totalSavings: parseFloat(totalDiscount.toFixed(2)),
    shippingSavings: parseFloat(shippingSavings.toFixed(2)),
    couponResults
  };
};

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponSection, setShowCouponSection] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const searchInputRef = useRef(null);
  const { showModal } = useGlobalModal();

  // Load cart and coupons
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        showModal({
          title: "Login First",
          message: "Please login in to Continue",
          type: "error"
        });
        navigate("/login");
        return;
      }

      try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          setCart(items);
          setCartCount(items.reduce((total, item) => total + (item.quantity || 1), 0));
        } else {
          setCart([]);
          setCartCount(0);
        }

        // Load available coupons from Firebase
        await loadAvailableCoupons();
        
        // Load applied coupons from localStorage (or could be from user profile)
        const savedAppliedCoupons = localStorage.getItem(`appliedCoupons_${user.uid}`);
        if (savedAppliedCoupons) {
          setAppliedCoupons(JSON.parse(savedAppliedCoupons));
        }

      } catch (error) {
        console.error("Error loading cart:", error);
        showModal({
          title: "Failed To Load Cart",
          message: "Items cant be loaded Please Refresh Or Check After Some Time",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Save applied coupons to localStorage
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      localStorage.setItem(`appliedCoupons_${user.uid}`, JSON.stringify(appliedCoupons));
    }
  }, [appliedCoupons]);

const loadAvailableCoupons = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Check if user has previous orders
    const hasPreviousOrders = await checkUserOrderHistory(user.uid);
    console.log('User has previous orders:', hasPreviousOrders); // Debug log

    const couponsRef = collection(db, "coupons");
    const q = query(
      couponsRef, 
      where("isActive", "==", true)
    );
    const querySnapshot = await getDocs(q);
    
    let coupons = [];
    querySnapshot.forEach((doc) => {
      const couponData = { id: doc.id, ...doc.data() };
      
      // Manual expiry date check
      const now = new Date();
      let isExpired = false;
      
      if (couponData.expiryDate) {
        let expiryDate;
        
        // Handle different date formats
        if (couponData.expiryDate.toDate) {
          // Firestore timestamp
          expiryDate = couponData.expiryDate.toDate();
        } else if (typeof couponData.expiryDate === 'string') {
          // String date (like '2025-12-31')
          expiryDate = new Date(couponData.expiryDate);
        } else {
          // ISO string or other format
          expiryDate = new Date(couponData.expiryDate);
        }
        
        isExpired = expiryDate < now;
      }
      
      // Only add coupon if it's not expired
      if (!isExpired) {
        // Filter out first-order-only coupons if user has previous orders
        if (couponData.firstOrderOnly && hasPreviousOrders) {
          console.log('Skipping first-order coupon:', couponData.code, 'because user has previous orders');
        } else {
          coupons.push(couponData);
        }
      }
    });

    // If no coupons in database, create default coupons
    if (coupons.length === 0) {
      const defaultCoupons = [
        {
          id: "SAVE50",
          code: "SAVE50",
          type: "fixed",
          value: 50,
          minOrder: 499,
          description: "Flat ₹50 off on orders above ₹499",
          isActive: true,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "FREESHIP",
          code: "FREESHIP",
          type: "shipping",
          value: 0,
          minOrder: 299,
          description: "Free shipping on orders above ₹299",
          isActive: true,
          expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "FREEDEL",
          code: "FREEDEL",
          type: "shipping",
          value: 0,
          minOrder: 199,
          description: "Free delivery on orders above ₹199",
          isActive: true,
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      // Only add WELCOME10 coupon if user has NO previous orders
      if (!hasPreviousOrders) {
        defaultCoupons.unshift({
          id: "WELCOME10",
          code: "WELCOME10",
          type: "percentage",
          value: 10,
          minOrder: 0,
          description: "Get 10% off on your first order",
          isActive: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          firstOrderOnly: true
        });
        console.log('Added WELCOME10 coupon for first-time user');
      }

      coupons = defaultCoupons;
    }

    console.log('Final available coupons:', coupons.map(c => c.code)); // Debug log
    setAvailableCoupons(coupons);
  } catch (error) {
    console.error("Error loading coupons:", error);
    // Set default coupons (without WELCOME10) if Firebase fails
    const defaultCoupons = [
      {
        id: "SAVE50",
        code: "SAVE50",
        type: "fixed",
        value: 50,
        minOrder: 499,
        description: "Flat ₹50 off on orders above ₹499",
        isActive: true
      },
      {
        id: "FREESHIP",
        code: "FREESHIP",
        type: "shipping",
        value: 0,
        minOrder: 299,
        description: "Free shipping on orders above ₹299",
        isActive: true
      },
      {
        id: "FREEDEL",
        code: "FREEDEL",
        type: "shipping",
        value: 0,
        minOrder: 199,
        description: "Free delivery on orders above ₹199",
        isActive: true
      }
    ];
    setAvailableCoupons(defaultCoupons);
  }
};

const applyCoupon = async (couponCode) => {
  const user = auth.currentUser;
  if (!user) return;

  setApplyingCoupon(true);
  try {
    // Find coupon in available coupons
    const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase());
    
    if (!coupon) {
      showModal({
        title: "Invalid Coupon",
        message: "The coupon code you entered is invalid",
        type: "error"
      });
      return;
    }

    const subtotal = cart.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + price * quantity;
    }, 0);

    // Check if user has previous orders
    const hasPreviousOrders = await checkUserOrderHistory(user.uid);

    // Validate coupon with order history check
    const validation = validateCoupon(coupon, subtotal, appliedCoupons, hasPreviousOrders);
    if (!validation.isValid) {
      showModal({
        title: "Cannot Apply Coupon",
        message: validation.message,
        type: "error"
      });
      return;
    }

    // Apply coupon
    setAppliedCoupons(prev => [...prev, coupon]);
    setCouponInput("");
    
    // Show success message with specific savings info
    let savingsMessage = `${coupon.code} has been applied successfully`;
    
    if (coupon.type === 'shipping') {
      savingsMessage += ' - You got FREE shipping!';
    } else if (coupon.type === 'percentage') {
      const discount = (subtotal * coupon.value) / 100;
      savingsMessage += ` - Saved ₹${discount.toFixed(2)}`;
    } else if (coupon.type === 'fixed') {
      savingsMessage += ` - Saved ₹${Math.min(coupon.value, subtotal).toFixed(2)}`;
    }
    
    showModal({
      title: "Coupon Applied!",
      message: savingsMessage,
      type: "success"
    });

  } catch (error) {
    console.error("Error applying coupon:", error);
    showModal({
      title: "Application Failed",
      message: "Failed to apply coupon. Please try again.",
      type: "error"
    });
  } finally {
    setApplyingCoupon(false);
  }
};



  const removeCoupon = (couponCode) => {
    const couponToRemove = appliedCoupons.find(c => c.code === couponCode);
    setAppliedCoupons(prev => prev.filter(coupon => coupon.code !== couponCode));
    
    let removalMessage = `${couponCode} has been removed from your order`;
    
    // Show specific message if shipping coupon was removed
    if (couponToRemove?.type === 'shipping') {
      removalMessage += ' - Shipping charges of ₹50 will be applied';
    }
    
    showModal({
      title: "Coupon Removed",
      message: removalMessage,
      type: "info"
    });
  };

  const getCouponDescription = (coupon) => {
    switch (coupon.type) {
      case 'percentage':
        return `${coupon.value}% off | Min. order: ₹${coupon.minOrder}`;
      case 'fixed':
        return `Flat ₹${coupon.value} off | Min. order: ₹${coupon.minOrder}`;
      case 'shipping':
        return `Free shipping | Min. order: ₹${coupon.minOrder}`;
      default:
        return coupon.description || 'Discount applied';
    }
  };

  const getSuggestedCoupons = () => {
    const subtotal = cart.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + price * quantity;
    }, 0);

    return availableCoupons.filter(coupon => 
      !appliedCoupons.some(applied => applied.code === coupon.code) &&
      subtotal >= coupon.minOrder
    );
  };



  // Check if any shipping coupon is applied
  const hasShippingCoupon = () => {
    return appliedCoupons.some(coupon => coupon.type === 'shipping');
  };

  const filteredCart = cart.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchIconClick = () => {
    setSearchActive(true);
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 100);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showModal({
        title: "Voice Seacrh Error",
        message: "Voice Search Not Working Refresh Or Type Manually",
        type: "error"
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setSearchActive(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
      showModal({
        title: "Voice Input Failed",
        message: "Oops Mic Didnt Catch Your Voice Try Again😉",
        type: "error"
      });
    };
  };

  const decreaseQuantity = async (itemId) => {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];
    const index = currentCart.findIndex((item) => item.id === itemId);
    if (index === -1) return;

    if (currentCart[index].quantity > 1) {
      const updatedCart = currentCart.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item
      );
      await updateDoc(cartRef, { items: updatedCart });
      setCart(updatedCart);
      setCartCount(updatedCart.reduce((total, item) => total + (item.quantity || 1), 0));
    } else {
      await updateDoc(cartRef, {
        items: arrayRemove(currentCart[index]),
      });
      const newCart = currentCart.filter((item) => item.id !== itemId);
      setCart(newCart);
      setCartCount(newCart.reduce((total, item) => total + (item.quantity || 1), 0));
    }
  };

  const increaseQuantity = async (itemId) => {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];
    const index = currentCart.findIndex((item) => item.id === itemId);
    if (index === -1) return;

    const updatedCart = currentCart.map((item) =>
      item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
    );
    await updateDoc(cartRef, { items: updatedCart });
    setCart(updatedCart);
    setCartCount(updatedCart.reduce((total, item) => total + (item.quantity || 1), 0));
  };

  const removeItem = async (itemId) => {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = doc(db, "carts", user.uid);
    const itemToRemove = cart.find((item) => item.id === itemId);
    if (!itemToRemove) return;

    await updateDoc(cartRef, {
      items: arrayRemove(itemToRemove),
    });
    const newCart = cart.filter((item) => item.id !== itemId);
    setCart(newCart);
    setCartCount(newCart.reduce((total, item) => total + (item.quantity || 1), 0));
  };

  const formatPrice = (price) => `₹ ${parseFloat(price).toFixed(2)}`;

  // Calculate cart summary with coupons
  const cartSummary = calculateCartSummary(cart, appliedCoupons);

  if (loading) return <div className="loading">Loading your cart...</div>;

  return (
    <>
      <Navbar cartCount={cartCount} />

      <div className="layout">
        <Sidebar />

        <div className="main-body">
          <div className="cart-container">
            <div className="cart-items">
              {filteredCart.length === 0 ? (
                <div className="empty-cart">
                  Your Cart Is Empty
                </div>
              ) : (
                filteredCart.map((item) => {
                  const price = parseFloat(item.price) || 0;
                  const quantity = parseInt(item.quantity) || 1;
                  return (
                    <div className="cart-item" key={`${item.id}-${item.addedAt}`}>
                      <img src={item.image} className="cart-item-image" alt={item.name} />
                      <div className="cart-item-details">
                        <h3 className="cart-item-title">{item.name}</h3>
                        <p className="cart-item-price">{formatPrice(price)}</p>
                        <div className="cart-item-quantity">
                          <button className="quantity-btn minus" onClick={() => decreaseQuantity(item.id)}>-</button>
                          <span>{quantity}</span>
                          <button className="quantity-btn plus" onClick={() => increaseQuantity(item.id)}>+</button>
                        </div>
                        <button className="cart-item-remove" onClick={() => removeItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-details">
                <h3>Order Summary</h3>
                
                {/* Coupon Section */}
                <div className="coupon-section">
                  <div 
                    className="coupon-header" 
                    onClick={() => setShowCouponSection(!showCouponSection)}
                  >
                    <span>Apply Coupons & Offers</span>
                    <span>{showCouponSection ? '−' : '+'}</span>
                  </div>

                  {showCouponSection && (
                    <div className="coupon-input-section">
                      {/* Available Auto-applicable Coupons */}
                      {getSuggestedCoupons().length > 0 && (
                        <div className="available-coupons">
                          <h4>Available Offers</h4>
                          {getSuggestedCoupons().map(coupon => (
                            <div key={coupon.code} className={`coupon-card ${coupon.type === 'shipping' ? 'shipping-coupon' : ''}`}>
                              <div className="coupon-info">
                                <span className="coupon-code">{coupon.code}</span>
                                <span className="coupon-desc">{getCouponDescription(coupon)}</span>
                                {coupon.type === 'shipping' && (
                                  <span className="coupon-benefit">Save ₹50 on shipping</span>
                                )}
                              </div>
                              <button 
                                onClick={() => applyCoupon(coupon.code)}
                                disabled={applyingCoupon}
                                className="apply-coupon-btn"
                              >
                                {applyingCoupon ? 'Applying...' : 'Apply'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Manual Coupon Input */}
                      <div className="manual-coupon">
                        <input
                          type="text"
                          placeholder="Enter promo code"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && applyCoupon(couponInput)}
                        />
                        <button 
                          onClick={() => applyCoupon(couponInput)}
                          disabled={applyingCoupon || !couponInput.trim()}
                        >
                          {applyingCoupon ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Applied Coupons */}
                  {appliedCoupons.length > 0 && (
                    <div className="applied-coupons">
                      <h4>Applied Offers</h4>
                      {appliedCoupons.map(coupon => (
                        <div key={coupon.code} className="applied-coupon">
                          <div className="applied-coupon-info">
                            <span className="coupon-code">{coupon.code}</span>
                            <span className="coupon-desc">{getCouponDescription(coupon)}</span>
                            {coupon.type === 'shipping' && (
                              <span className="shipping-saved">Saved ₹50 on shipping</span>
                            )}
                          </div>
                          <button 
                            onClick={() => removeCoupon(coupon.code)}
                            className="remove-coupon-btn"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order Summary Details */}
                <div className="summary-row">
                  <span>Subtotal ({cartSummary.itemCount} items)</span>
                  <span id="subtotal">{formatPrice(cartSummary.subtotal)}</span>
                </div>

              {/* Applied Discounts */}
{appliedCoupons.map(coupon => {
  const discountAmount = calculateCouponDiscount(coupon, cartSummary.subtotal);
  return (
    <div key={coupon.code} className="summary-row discount">
      <span>Coupon: {coupon.code}</span>
      <span>-{formatPrice(discountAmount)}</span>
    </div>
  );
})}
                {cartSummary.discount > 0 && (
                  <div className="summary-row discount-total">
                    <span>Total Discount</span>
                    <span>-{formatPrice(cartSummary.discount)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Shipping</span>
                  <span className={hasShippingCoupon() ? 'free-shipping' : ''}>
                    {hasShippingCoupon() ? 'FREE' : formatPrice(cartSummary.shipping)}
                    {!hasShippingCoupon() && (
                      <span className="shipping-note"> (Standard delivery)</span>
                    )}
                  </span>
                </div>

                {/* Show shipping savings only when shipping coupon is applied */}
                {hasShippingCoupon() && (
                  <div className="summary-row shipping-savings">
                    <span>Shipping Savings</span>
                    <span>-{formatPrice(50)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Tax (18% GST)</span>
                  <span>{formatPrice(cartSummary.tax)}</span>
                </div>

                <div className="summary-row total">
                  <span>Total Amount</span>
                  <span id="total">{formatPrice(cartSummary.total)}</span>
                </div>

                {/* Savings Message - Only show when there are actual savings */}
                {(cartSummary.totalSavings > 0 || cartSummary.shippingSavings > 0) && (
                  <div className="savings-message">
                    You saved {formatPrice(cartSummary.totalSavings + cartSummary.shippingSavings)}!
                    {(cartSummary.totalSavings > 0 && cartSummary.shippingSavings > 0) && (
                      <span className="breakdown"> (₹{cartSummary.totalSavings.toFixed(2)} on products + ₹{cartSummary.shippingSavings.toFixed(2)} on shipping)</span>
                    )}
                    {cartSummary.totalSavings > 0 && cartSummary.shippingSavings === 0 && (
                      <span className="breakdown"> (₹{cartSummary.totalSavings.toFixed(2)} on products)</span>
                    )}
                    {cartSummary.shippingSavings > 0 && cartSummary.totalSavings === 0 && (
                      <span className="breakdown"> (₹{cartSummary.shippingSavings.toFixed(2)} on shipping)</span>
                    )}
                  </div>
                )}

                <button
                  className="checkout-btn"
                  onClick={() => cart.length === 0
                    ? alert("Your cart is empty!")
                    : navigate("/checkout", { 
                        state: { 
                          cart, 
                          appliedCoupons, 
                          cartSummary 
                        } 
                      })}
                  disabled={cart.length === 0}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Cart;