import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, updateDoc, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useGlobalModal } from "../context/ModalContext";
import ResponsiveWrapper from "../layouts/ResponsiveWrapper";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../cart.css";
import "../bar.css";

/* ---------- MAIN COMPONENT ---------- */
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
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const searchInputRef = useRef(null);
  const { showModal } = useGlobalModal();

  /* ---------- HELPER FUNCTIONS ---------- */

  const hasVariants = (item) => {
    return item.productData?.variants &&
           Object.keys(item.productData.variants).length > 0;
  };

  const handleVariantAwareIncrease = (item) => {
    const user = auth.currentUser;
    if (!user) return;

    // If NO variants → normal quantity increase
    if (!hasVariants(item)) {
      increaseQuantity(item.id, item.selectedVariants || item.variants);
      return;
    }

    // If HAS variants → show professional modal with clear options
    showModal({
      title: "Add Another Item",
      message: `How would you like to add another ${item.name}?`,
      type: "choice",
      actions: [
        {
          label: "Add same variant",
          primary: true,
          onClick: () => {
            // Increase quantity of existing variant
            increaseQuantity(item.id, item.selectedVariants || item.variants);
          }
        },
        {
          label: "Choose different variant",
          primary: false,
          onClick: () => {
            // Open variant selection modal
            openVariantSelection(item);
          }
        },
        {
          label: "Cancel",
          primary: false,
          onClick: () => {}
        }
      ]
    });
  };

  const openVariantSelection = (item) => {
    setSelectedProductForVariant(item);
    setShowVariantModal(true);
  };

  const handleVariantModalConfirm = async (selectedVariants) => {
    await addNewVariantToCart(selectedProductForVariant, selectedVariants);
    setShowVariantModal(false);
    setSelectedProductForVariant(null);
  };

  const addNewVariantToCart = async (item, selectedVariants) => {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];

    const variantKey = JSON.stringify(selectedVariants || {});

    // Check if SAME variant already exists
    const existingIndex = currentCart.findIndex(
      (x) =>
        x.id === item.id &&
        JSON.stringify(x.selectedVariants || x.variants || {}) === variantKey
    );

    let updatedCart;

    if (existingIndex !== -1) {
      // Variant exists → increase quantity
      updatedCart = currentCart.map((x, i) =>
        i === existingIndex
          ? { ...x, quantity: x.quantity + 1 }
          : x
      );
    } else {
      // New variant → add new cart line
      updatedCart = [
        ...currentCart,
        {
          ...item,
          selectedVariants,
          quantity: 1
        }
      ];
    }

    await updateDoc(cartRef, { items: updatedCart });
    setCart(updatedCart);
    setCartCount(updatedCart.reduce((s, i) => s + i.quantity, 0));
    
    // Show success message
    showModal({
      title: "Added to Cart",
      message: `${item.name} with selected variant has been added to your cart.`,
      type: "success"
    });
  };

  const validateCoupon = (coupon, subtotal, appliedCoupons, hasPreviousOrders) => {
    if (appliedCoupons.some(applied => applied.code === coupon.code)) {
      return { isValid: false, message: 'Coupon already applied' };
    }
    if (coupon.firstOrderOnly && hasPreviousOrders) {
      return { isValid: false, message: 'This coupon is only valid for your first order' };
    }
    if (subtotal < coupon.minOrder) {
      return { isValid: false, message: `Add ₹${(coupon.minOrder - subtotal).toFixed(2)} more to use this coupon` };
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return { isValid: false, message: 'Coupon has expired' };
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { isValid: false, message: 'Coupon usage limit reached' };
    }
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
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking order history:", error);
      return false;
    }
  };

  const calculateCouponDiscount = (coupon, subtotal) => {
    const safeSubtotal = parseFloat(subtotal) || 0;
    const couponValue = parseFloat(coupon.value) || 0;
    switch (coupon.type) {
      case 'percentage':
        return (safeSubtotal * couponValue) / 100;
      case 'fixed':
        return Math.min(couponValue, safeSubtotal);
      case 'shipping':
        return 0;
      default:
        return 0;
    }
  };

  const calculateCartSummary = (cart, appliedCoupons) => {
    const subtotal = cart.reduce((total, item) => {
      const price = parseFloat(item.displayPrice || item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + price * quantity;
    }, 0);

    let totalDiscount = 0;
    let shipping = 50;
    let shippingSavings = 0;
    const couponResults = [];

    appliedCoupons.forEach(coupon => {
      const discountAmount = calculateCouponDiscount(coupon, subtotal);
      totalDiscount += discountAmount;
      couponResults.push({ ...coupon, discountAmount });
      if (coupon.type === 'shipping' && subtotal >= coupon.minOrder) {
        shippingSavings = 50;
        shipping = 0;
      }
    });

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = taxableAmount * 0.18;
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

  /* ---------- USE EFFECTS ---------- */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        showModal({ title: "Login First", message: "Please login in to Continue", type: "error" });
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
        await loadAvailableCoupons();
        const savedAppliedCoupons = localStorage.getItem(`appliedCoupons_${user.uid}`);
        if (savedAppliedCoupons) setAppliedCoupons(JSON.parse(savedAppliedCoupons));
      } catch (error) {
        console.error("Error loading cart:", error);
        showModal({ title: "Failed To Load Cart", message: "Items cant be loaded Please Refresh Or Check After Some Time", type: "error" });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate, showModal]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) localStorage.setItem(`appliedCoupons_${user.uid}`, JSON.stringify(appliedCoupons));
  }, [appliedCoupons]);

  useEffect(() => {
    console.log('Cart items updated:', cart.length);
  }, [cart, searchTerm]);

  /* ---------- CART FUNCTIONS ---------- */

  const loadAvailableCoupons = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const hasPreviousOrders = await checkUserOrderHistory(user.uid);
      const couponsRef = collection(db, "coupons");
      const q = query(couponsRef, where("isActive", "==", true));
      const querySnapshot = await getDocs(q);
      let coupons = [];
      querySnapshot.forEach((doc) => {
        const couponData = { id: doc.id, ...doc.data() };
        const now = new Date();
        let isExpired = false;
        if (couponData.expiryDate) {
          let expiryDate;
          if (couponData.expiryDate.toDate) expiryDate = couponData.expiryDate.toDate();
          else expiryDate = new Date(couponData.expiryDate);
          isExpired = expiryDate < now;
        }
        if (!isExpired) {
          if (couponData.firstOrderOnly && hasPreviousOrders) {
            // skip
          } else coupons.push(couponData);
        }
      });

      if (coupons.length === 0) {
        const defaultCoupons = [
          { id: "SAVE50", code: "SAVE50", type: "fixed", value: 50, minOrder: 499, description: "Flat ₹50 off on orders above ₹499", isActive: true, expiryDate: new Date(Date.now() + 15*86400000).toISOString() },
          { id: "FREESHIP", code: "FREESHIP", type: "shipping", value: 0, minOrder: 299, description: "Free shipping on orders above ₹299", isActive: true, expiryDate: new Date(Date.now() + 60*86400000).toISOString() },
          { id: "FREEDEL", code: "FREEDEL", type: "shipping", value: 0, minOrder: 199, description: "Free delivery on orders above ₹199", isActive: true, expiryDate: new Date(Date.now() + 45*86400000).toISOString() }
        ];
        if (!hasPreviousOrders) defaultCoupons.unshift({ id: "WELCOME10", code: "WELCOME10", type: "percentage", value: 10, minOrder: 0, description: "Get 10% off on your first order", isActive: true, expiryDate: new Date(Date.now() + 30*86400000).toISOString(), firstOrderOnly: true });
        coupons = defaultCoupons;
      }
      setAvailableCoupons(coupons);
    } catch (error) {
      console.error("Error loading coupons:", error);
      setAvailableCoupons([
        { id: "SAVE50", code: "SAVE50", type: "fixed", value: 50, minOrder: 499, description: "Flat ₹50 off on orders above ₹499", isActive: true },
        { id: "FREESHIP", code: "FREESHIP", type: "shipping", value: 0, minOrder: 299, description: "Free shipping on orders above ₹299", isActive: true },
        { id: "FREEDEL", code: "FREEDEL", type: "shipping", value: 0, minOrder: 199, description: "Free delivery on orders above ₹199", isActive: true }
      ]);
    }
  };

  const applyCoupon = async (couponCode) => {
    const user = auth.currentUser;
    if (!user) return;
    setApplyingCoupon(true);
    try {
      const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase());
      if (!coupon) {
        showModal({ title: "Invalid Coupon", message: "The coupon code you entered is invalid", type: "error" });
        return;
      }

      const subtotal = cart.reduce((total, item) => {
        const price = parseFloat(item.displayPrice || item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return total + price * quantity;
      }, 0);

      const hasPreviousOrders = await checkUserOrderHistory(user.uid);
      const validation = validateCoupon(coupon, subtotal, appliedCoupons, hasPreviousOrders);
      if (!validation.isValid) {
        showModal({ title: "Cannot Apply Coupon", message: validation.message, type: "error" });
        return;
      }
      setAppliedCoupons(prev => [...prev, coupon]);
      setCouponInput("");
      let savingsMessage = `${coupon.code} has been applied successfully`;
      if (coupon.type === 'shipping') savingsMessage += ' - You got FREE shipping!';
      else if (coupon.type === 'percentage') savingsMessage += ` - Saved ₹${((subtotal * coupon.value)/100).toFixed(2)}`;
      else if (coupon.type === 'fixed') savingsMessage += ` - Saved ₹${Math.min(coupon.value, subtotal).toFixed(2)}`;

      showModal({ title: "Coupon Applied!", message: savingsMessage, type: "success" });
    } catch (error) {
      console.error("Error applying coupon:", error);
      showModal({ title: "Application Failed", message: "Failed to apply coupon. Please try again.", type: "error" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = (couponCode) => {
    const couponToRemove = appliedCoupons.find(c => c.code === couponCode);
    setAppliedCoupons(prev => prev.filter(coupon => coupon.code !== couponCode));
    let removalMessage = `${couponCode} has been removed from your order`;
    if (couponToRemove?.type === 'shipping') removalMessage += ' - Shipping charges of ₹50 will be applied';
    showModal({ title: "Coupon Removed", message: removalMessage, type: "info" });
  };

  const getCouponDescription = (coupon) => {
    switch (coupon.type) {
      case 'percentage': return `${coupon.value}% off | Min. order: ₹${coupon.minOrder}`;
      case 'fixed': return `Flat ₹${coupon.value} off | Min. order: ₹${coupon.minOrder}`;
      case 'shipping': return `Free shipping | Min. order: ₹${coupon.minOrder}`;
      default: return coupon.description || 'Discount applied';
    }
  };

  const getSuggestedCoupons = () => {
    const subtotal = cart.reduce((total, item) => {
      const price = parseFloat(item.displayPrice || item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;
      return total + price * quantity;
    }, 0);

    return availableCoupons.filter(coupon => !appliedCoupons.some(applied => applied.code === coupon.code) && subtotal >= coupon.minOrder);
  };

  const hasShippingCoupon = () => appliedCoupons.some(coupon => coupon.type === 'shipping');

  const filteredCart = cart.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchIconClick = () => {
    setSearchActive(true);
    setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 100);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showModal({ title: "Voice Seacrh Error", message: "Voice Search Not Working Refresh Or Type Manually", type: "error" });
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
      setTimeout(() => searchInputRef.current?.focus(), 100);
    };
    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
      showModal({ title: "Voice Input Failed", message: "Oops Mic Didnt Catch Your Voice Try Again😉", type: "error" });
    };
  };

  /* ---------- CART CRUD FUNCTIONS ---------- */

  const decreaseQuantity = async (itemId, selectedVariants = {}) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];
    
    // Create consistent variant key for comparison
    const variantKey = JSON.stringify(selectedVariants || {});
    
    const index = currentCart.findIndex((item) => {
      const itemVariantKey = JSON.stringify(item.selectedVariants || item.variants || {});
      return item.id === itemId && itemVariantKey === variantKey;
    });
    
    if (index === -1) {
      console.log("Item not found for decrease:", itemId, variantKey);
      return;
    }
    
    if (currentCart[index].quantity > 1) {
      // Decrease quantity
      const updatedCart = currentCart.map((item, idx) =>
        idx === index ? { ...item, quantity: item.quantity - 1 } : item
      );
      await updateDoc(cartRef, { items: updatedCart });
      setCart(updatedCart);
      setCartCount(updatedCart.reduce((total, item) => total + (item.quantity || 1), 0));
    } else {
      // Remove item entirely when quantity reaches 0
      await updateDoc(cartRef, { items: arrayRemove(currentCart[index]) });
      const newCart = currentCart.filter((item, idx) => idx !== index);
      setCart(newCart);
      setCartCount(newCart.reduce((total, item) => total + (item.quantity || 1), 0));
    }
  };

  const increaseQuantity = async (itemId, selectedVariants = {}) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];
    
    // Create consistent variant key for comparison
    const variantKey = JSON.stringify(selectedVariants || {});
    
    const index = currentCart.findIndex((item) => {
      const itemVariantKey = JSON.stringify(item.selectedVariants || item.variants || {});
      return item.id === itemId && itemVariantKey === variantKey;
    });
    
    if (index === -1) {
      console.error("Item not found in cart for increase:", {
        itemId,
        variantKey,
        selectedVariants,
        currentCart: currentCart.map(item => ({
          id: item.id,
          selectedVariants: item.selectedVariants,
          variants: item.variants,
          itemVariantKey: JSON.stringify(item.selectedVariants || item.variants || {})
        }))
      });
      showModal({
        title: "Error",
        message: "Could not find item in cart. Please refresh the page.",
        type: "error"
      });
      return;
    }
    
    const updatedCart = currentCart.map((item, idx) =>
      idx === index ? { ...item, quantity: item.quantity + 1 } : item
    );
    
    try {
      await updateDoc(cartRef, { items: updatedCart });
      setCart(updatedCart);
      setCartCount(updatedCart.reduce((total, item) => total + (item.quantity || 1), 0));
      
      // Show success message
      showModal({
        title: "Quantity Updated",
        message: `${currentCart[index].name} quantity increased to ${updatedCart[index].quantity}.`,
        type: "success"
      });
    } catch (error) {
      console.error("Error increasing quantity:", error);
      showModal({
        title: "Error",
        message: "Failed to update quantity. Please try again.",
        type: "error"
      });
    }
  };

  const removeItem = async (itemId, selectedVariants = {}) => {
    const user = auth.currentUser;
    if (!user) return;

    const cartRef = doc(db, "carts", user.uid);
    const currentCart = [...cart];

    // Create a stable signature to compare variants reliably
    const variantKey = JSON.stringify(selectedVariants || {});

    const newCart = currentCart.filter((item) => {
      const itemVariantKey = JSON.stringify(item.selectedVariants || item.variants || {});
      return !(item.id === itemId && itemVariantKey === variantKey);
    });

    // Update Firestore by replacing items array
    await updateDoc(cartRef, { items: newCart });

    setCart(newCart);
    setCartCount(newCart.reduce((total, item) => total + (item.quantity || 1), 0));
  };

  const handleRemoveWithAnimation = (item) => {
    const variantKey = item.selectedVariants || item.variants || {};
    
    // Mark item visually as removing
    setCart((prev) =>
      prev.map((x) => {
        const currentVariantKey = x.selectedVariants || x.variants || {};
        return x.id === item.id &&
          JSON.stringify(currentVariantKey) === JSON.stringify(variantKey)
          ? { ...x, removing: true }
          : x
      })
    );

    // Wait for animation then remove
    setTimeout(() => {
      removeItem(item.id, variantKey);
    }, 300);
  };

  const formatPrice = (price) => `₹ ${parseFloat(price).toFixed(2)}`;
  const cartSummary = calculateCartSummary(cart, appliedCoupons);

  /* ---------- VARIANT MODAL COMPONENT ---------- */
  const VariantModal = ({ product, onConfirm, onClose }) => {
    const [selectedVariants, setSelectedVariants] = useState({});
    const variants = product?.productData?.variants || {};

    const handleVariantChange = (variantKey, value) => {
      setSelectedVariants(prev => ({
        ...prev,
        [variantKey]: value
      }));
    };

    const handleConfirm = () => {
      if (Object.keys(selectedVariants).length === Object.keys(variants).length) {
        onConfirm(selectedVariants);
      } else {
        showModal({
          title: "Selection Incomplete",
          message: "Please select all variant options before adding to cart.",
          type: "error"
        });
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content variant-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Select Variant</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="current-variant-info">
              <p>Adding another: <strong>{product?.name}</strong></p>
              <p className="modal-price">{formatPrice(product?.displayPrice || product?.price)}</p>
            </div>
            
            {Object.entries(variants).map(([key, options]) => (
              <div key={key} className="variant-option-group">
                <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <div className="variant-options">
                  {options.map((option, index) => {
                    const isSelected = selectedVariants[key]?.value === option.value;
                    return (
                      <button
                        key={index}
                        className={`variant-option-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleVariantChange(key, option)}
                        style={{
                          backgroundColor: option.value?.startsWith('#') ? option.value : 'transparent',
                          borderColor: isSelected ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                      >
                        {option.name || option.value}
                        {option.value?.startsWith('#') && (
                          <span className="color-dot" style={{ backgroundColor: option.value }}></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={handleConfirm}
              disabled={Object.keys(selectedVariants).length !== Object.keys(variants).length}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- RENDER LOGIC ---------- */

  if (loading) {
    // skeleton loader - visually nicer than text
    return (
      <>
        <Navbar cartCount={cartCount} />
        <div className="layout">
          <Sidebar />
          <div className="main-body">
            <div className="cart-container">
              <div className="cart-items">
                <div className="skeleton" aria-hidden>
                  <div className="s-item"><div style={{width:108,height:108,background:"#222",borderRadius:12}}></div><div style={{flex:1}}><div style={{height:18,width:"60%",background:"#222",borderRadius:6,marginBottom:8}}></div><div style={{height:14,width:"40%",background:"#222",borderRadius:6}}></div></div></div>
                  <div className="s-item"><div style={{width:108,height:108,background:"#222",borderRadius:12}}></div><div style={{flex:1}}><div style={{height:18,width:"50%",background:"#222",borderRadius:6,marginBottom:8}}></div><div style={{height:14,width:"30%",background:"#222",borderRadius:6}}></div></div></div>
                </div>
              </div>
              <div className="cart-summary">
                <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--subtext)"}}>Loading summary…</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar cartCount={cartCount} />
      <div className="layout">
        <Sidebar />
        <div className="main-body">
          <div className="cart-container" role="region" aria-label="Shopping cart">
            <section className="cart-items" aria-live="polite">
              {filteredCart.length === 0 ? (
                <div className="empty-cart" role="status" aria-label="Empty cart">
                  <h3>Your cart is empty</h3>
                  <p>Looks like you haven't added anything yet. Start shopping to add products here.</p>
                  <button className="apply-coupon-btn continue-shopping-btn" onClick={() => navigate("/home")}>Continue Shopping</button>
                </div>
              ) : (
                <>
                  <div className="cart-header">
                    <p style={{color: 'var(--subtext)', marginBottom: '1rem'}}>
                      Items in cart: <strong style={{color:'var(--text)'}}>{filteredCart.length}</strong>
                    </p>
                    <div className="cart-separator"></div>
                  </div>
                  
                  {filteredCart.map((item, index) => {
                    const price = parseFloat(item.displayPrice || item.price) || 0;
                    const quantity = parseInt(item.quantity) || 1;
                    const selectedVariants = item.selectedVariants || item.variants || {};
                    const itemImage = item.image || 
                                     (item.variantImages && item.variantImages[0]) || 
                                     (item.images && item.images[0]) || 
                                     '/placeholder-image.jpg';
                    const uniqueKey = `${item.id}-${JSON.stringify(selectedVariants)}`;

                    return (
                      <React.Fragment key={`${item.id}-${JSON.stringify(item.selectedVariants || item.variants || {})}`}>
                        <article className={`cart-item ${item.removing ? "item-removing" : ""}`}>
                          {/* Item counter */}
                          <div className="cart-item-counter">
                            <span className="counter-number">{index + 1}</span>
                          </div>

                          {/* UPDATED IMAGE CONTAINER - MATCHING HOME PAGE STYLE */}
                          <div className="cart-item-image-wrapper">
                            <div className="cart-item-image-container">
                              <img
                                className="cart-item-image"
                                src={itemImage}
                                alt={item.name || "product image"}
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = "/placeholder-image.jpg";
                                  e.target.alt = "Image not available";
                                }}
                              />
                            </div>
                          </div>

                          <div className="cart-item-details">
                            <div className="cart-item-header">
                              <h3 className="cart-item-title">{item.name}</h3>
                              <div className="cart-item-subtotal">
                                {formatPrice(price * quantity)}
                                <span className="item-subtotal-label"> (Subtotal)</span>
                              </div>
                            </div>

                            {/* 🔥 Fixed Variant Display - SAFE VERSION */}
                            {(() => {
                              const selected = item.selectedVariants || item.variants || {};
                              const masterVariants = item.productData?.variants || item.variantsData || {};

                              if (!selected || Object.keys(selected).length === 0) return null;

                              return (
                                <div className="premium-variant-wrapper">
                                  {Object.entries(selected).map(([key, selectedValue]) => {
                                    // SAFE HANDLING: Extract string value from object if needed
                                    let displayValue = "";
                                    let swatchColor = null;
                                    
                                    // If selectedValue is an object with a name or value property
                                    if (selectedValue && typeof selectedValue === 'object') {
                                      displayValue = selectedValue.name || selectedValue.value || JSON.stringify(selectedValue);
                                      if (selectedValue.value?.startsWith("#")) swatchColor = selectedValue.value;
                                    } else {
                                      // If selectedValue is a string
                                      displayValue = String(selectedValue || "");
                                      
                                      // Try to find matching variant in masterVariants
                                      if (masterVariants[key] && Array.isArray(masterVariants[key])) {
                                        const match = masterVariants[key].find(
                                          (v) => {
                                            if (v && typeof v === 'object') {
                                              return v.value?.toLowerCase() === displayValue?.toLowerCase() ||
                                                     v.name?.toLowerCase() === displayValue?.toLowerCase();
                                            }
                                            return false;
                                          }
                                        );

                                        if (match) {
                                          displayValue = match.name || match.value || displayValue;
                                          if (match.value?.startsWith("#")) swatchColor = match.value;
                                        }
                                      }
                                    }

                                    return (
                                      <div key={key} className="premium-variant-line">
                                        <span className="variant-title">
                                          {key.charAt(0).toUpperCase() + key.slice(1)}
                                        </span>

                                        <span className="variant-value">
                                          {swatchColor && (
                                            <span
                                              className="variant-color-dot"
                                              style={{ backgroundColor: swatchColor }}
                                            ></span>
                                          )}

                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}

                                  <div className="variant-divider"></div>
                                </div>
                              );
                            })()}

                            <div className="cart-item-price-quantity">
                              <p className="cart-item-price" aria-label="price">
                                {formatPrice(item.displayPrice || item.price)}
                                <span className="unit-price-label"> (Unit Price)</span>
                              </p>

                              <div className="cart-item-quantity" role="group" aria-label="quantity selector">
                                <button
                                  aria-label="decrease quantity"
                                  className="quantity-btn minus"
                                  onClick={() =>
                                    decreaseQuantity(item.id, item.selectedVariants || item.variants)
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </button>

                                <span aria-live="polite" className="quantity-display">
                                  {item.quantity}
                                </span>

                                <button
                                  className="quantity-btn plus"
                                  onClick={() => handleVariantAwareIncrease(item)}
                                  aria-label="increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <button
                              className="remove-item-btn"
                              onClick={() => handleRemoveWithAnimation(item)}
                              aria-label="Remove item"
                            >
                              <span className="remove-icon">✕</span> Remove
                            </button>
                          </div>
                        </article>
                        
                        {/* Add separator between items (except after last item) */}
                        {index < filteredCart.length - 1 && (
                          <div className="cart-item-separator">
                            <div className="separator-line"></div>
                            <div className="separator-dots">• • •</div>
                            <div className="separator-line"></div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </section>

            <aside className="cart-summary" aria-label="Order summary">
              <div className="summary-details">
                <h3>Order Summary</h3>

                <div className="coupon-section">
                  <div className="coupon-header" onClick={() => setShowCouponSection(!showCouponSection)} role="button" aria-expanded={showCouponSection}>
                    <span>Apply Coupons & Offers</span>
                    <span>{showCouponSection ? '−' : '+'}</span>
                  </div>

                  {showCouponSection && (
                    <div className="coupon-input-section">
                      {getSuggestedCoupons().length > 0 && (
                        <div className="available-coupons">
                          <h4>Available Offers</h4>
                          {getSuggestedCoupons().map(coupon => (
                            <div key={coupon.code} className={`coupon-card ${coupon.type === 'shipping' ? 'shipping-coupon' : ''}`}>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <div style={{fontWeight:800,color:'var(--text)'}}>{coupon.code}</div>
                                  <div style={{fontSize:12,color:'var(--subtext)'}}>{coupon.type === 'percentage' ? `${coupon.value}%` : coupon.type === 'fixed' ? `₹${coupon.value}` : 'Free shipping'}</div>
                                </div>
                                <div style={{fontSize:13,color:'var(--subtext)'}}>{getCouponDescription(coupon)}</div>
                                {coupon.type === 'shipping' && <div style={{color:'var(--success)',fontWeight:700,fontSize:13,marginTop:6}}>Save ₹50 on shipping</div>}
                              </div>
                              <div style={{marginLeft:12}}>
                                <button onClick={() => applyCoupon(coupon.code)} disabled={applyingCoupon} className="apply-coupon-btn">{applyingCoupon ? 'Applying...' : 'Apply'}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="manual-coupon" style={{marginTop:8}}>
                        <input type="text" placeholder="Enter promo code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && applyCoupon(couponInput)} aria-label="Promo code" />
                        <button onClick={() => applyCoupon(couponInput)} disabled={applyingCoupon || !couponInput.trim()} aria-label="Apply promo code">Apply</button>
                      </div>
                    </div>
                  )}

                  {appliedCoupons.length > 0 && (
                    <div className="applied-coupons">
                      <h4>Applied Offers</h4>
                      {appliedCoupons.map(coupon => (
                        <div key={coupon.code} className="applied-coupon">
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,color:'var(--text)'}}>{coupon.code}</div>
                            <div style={{fontSize:13,color:'var(--subtext)'}}>{getCouponDescription(coupon)}</div>
                            {coupon.type === 'shipping' && <div style={{color:'var(--success)',fontWeight:1000,fontSize:13,marginTop:6}}>Saved ₹50 on shipping</div>}
                          </div>
                          <div>
                            <button onClick={() => removeCoupon(coupon.code)} className="remove-coupon-btn" aria-label={`Remove coupon ${coupon.code}`}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="summary-row">
                  <span>Subtotal ({cartSummary.itemCount} items)</span>
                  <span id="subtotal">{formatPrice(cartSummary.subtotal)}</span>
                </div>

                {appliedCoupons.map(coupon => {
                  const discountAmount = calculateCouponDiscount(coupon, cartSummary.subtotal);
                  return (
                    <div key={coupon.code} className="summary-row" style={{color:'var(--success)'}}>
                      <span>Coupon: {coupon.code}</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  );
                })}

                {cartSummary.discount > 0 && (
                  <div className="summary-row" style={{fontWeight:800,color:'var(--success)'}}>
                    <span>Total Discount</span>
                    <span>-{formatPrice(cartSummary.discount)}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Shipping</span>
                  <span className={hasShippingCoupon() ? 'free-shipping' : ''}>
                    {hasShippingCoupon() ? 'FREE' : formatPrice(cartSummary.shipping)}
                    {!hasShippingCoupon() && <span className="shipping-note"> (Standard delivery)</span>}
                  </span>
                </div>

                {hasShippingCoupon() && (
                  <div className="summary-row" style={{color:'var(--success)'}}>
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

                {(cartSummary.totalSavings > 0 || cartSummary.shippingSavings > 0) && (
                  <div className="savings-message" role="status" aria-live="polite">
                    You saved {formatPrice(cartSummary.totalSavings + cartSummary.shippingSavings)}!
                  </div>
                )}

                <button
                  className="checkout-btn"
                  onClick={() => cart.length === 0 ? alert("Your cart is empty!") : navigate("/checkout", { state: { cart, appliedCoupons, cartSummary } })}
                  disabled={cart.length === 0}
                  aria-disabled={cart.length === 0}
                  aria-label="Proceed to checkout"
                >
                  Proceed to Checkout
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {showVariantModal && (
        <VariantModal
          product={selectedProductForVariant}
          onConfirm={handleVariantModalConfirm}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProductForVariant(null);
          }}
        />
      )}
    </>
  );
}

export default function CartPage() {
  return <ResponsiveWrapper Page={Cart} />;
}