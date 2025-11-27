import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useGlobalModal } from "../context/ModalContext";
import "../checkout.css";
import "../orderplace.css";
import "../home.css";

// Coupon calculation utilities (same as in Cart.jsx)
const calculateCouponDiscount = (coupon, subtotal) => {
  switch (coupon.type) {
    case 'percentage':
      return (subtotal * coupon.value) / 100;
    case 'fixed':
      return Math.min(coupon.value, subtotal);
    case 'shipping':
      return 0; // Shipping handled separately
    default:
      return 0;
  }
};

const calculateCartSummary = (cart, appliedCoupons) => {
  // Use displayPrice (variant price) if available, otherwise use base price
  const subtotal = cart.reduce((total, item) => {
    const price = parseFloat(item.displayPrice || item.price) || 0;
    const quantity = parseInt(item.quantity) || 1;
    return total + price * quantity;
  }, 0);

  console.log('🛒 Checkout - Cart Summary Calculation:');
  console.log('Cart items:', cart);
  console.log('Subtotal calculation:', subtotal);
  console.log('Applied coupons:', appliedCoupons);

  let totalDiscount = 0;
  let shipping = 50; // Fixed shipping charges of ₹50
  let shippingSavings = 0;
  const couponResults = [];

  // Calculate discounts from each coupon
  appliedCoupons.forEach(coupon => {
    const discountAmount = calculateCouponDiscount(coupon, subtotal);
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

  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const tax = taxableAmount * 0.18; // 18% GST
  const total = Math.max(0, taxableAmount + tax + shipping);

  const summary = {
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

  console.log('📊 Final Checkout Summary:', summary);
  return summary;
};

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    paymentMethod: "COD"
  });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [cartSummary, setCartSummary] = useState(null);
  const { showModal } = useGlobalModal();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(""); // Track selected address

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login First",
        message: "Please login in to Continue",
        type: "error"
      });
      navigate("/login");
      return;
    }

    const fetchCartAndCoupons = async () => {
      try {
        // Fetch cart items
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          console.log('🛒 Checkout - Loaded Cart Items:', items);
          setCartItems(items);
        }

        // Fetch applied coupons from localStorage
        const savedAppliedCoupons = localStorage.getItem(`appliedCoupons_${user.uid}`);
        if (savedAppliedCoupons) {
          const coupons = JSON.parse(savedAppliedCoupons);
          setAppliedCoupons(coupons);
          
          // Calculate cart summary with coupons
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            const summary = calculateCartSummary(items, coupons);
            setCartSummary(summary);
          }
        } else {
          // Calculate without coupons
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            const summary = calculateCartSummary(items, []);
            setCartSummary(summary);
          }
        }

        // Fetch addresses with better error handling
        try {
          const addressesRef = collection(db, "users", user.uid, "addresses");
          const snapshot = await getDocs(addressesRef);
          console.log("📫 Addresses snapshot:", snapshot); // Debug log
          
          const addressesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log("🏠 Loaded addresses:", addressesData); // Debug log
          setAddresses(addressesData);
          
          // Don't auto-select first address - let user choose manually
          // Only set selectedAddressId to empty to show "Please select an address"
          setSelectedAddressId("");
          
        } catch (addressError) {
          console.error("Error fetching addresses:", addressError);
          setAddresses([]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchCartAndCoupons();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressSelect = (address) => {
    console.log("📍 Selecting address:", address); // Debug log
    setSelectedAddressId(address.id); // Set the selected address ID
    setForm({
      fullName: address.name || address.fullName || "",
      phone: address.phone || "",
      address: `${address.addressLine1 || ""}${address.addressLine2 ? `, ${address.addressLine2}` : ''}`,
      city: address.city || "",
      pincode: address.zipCode || address.pincode || "",
      paymentMethod: form.paymentMethod
    });
  };

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;
    setSelectedAddressId(selectedId);
    
    if (selectedId) {
      const selectedAddress = addresses.find(addr => addr.id === selectedId);
      if (selectedAddress) {
        handleAddressSelect(selectedAddress);
      }
    } else {
      // Clear form when no address is selected
      setForm({
        fullName: "",
        phone: "",
        address: "",
        city: "",
        pincode: "",
        paymentMethod: form.paymentMethod
      });
    }
  };

  const handleOrderSubmit = async () => {
    if (!form.fullName || !form.phone || !form.address || !form.city || !form.pincode) {
      showModal({
        title: "Select Address First",
        message: "Please select an address from the dropdown to proceed with checkout.",
        type: "info"
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Please Login First",
        message: "Sorry For The Inconvience Just To Be Sure Please login in to Continue",
        type: "error"
      });
      return;
    }

    // Validate form
    if (!form.fullName || !form.phone || !form.address || !form.city || !form.pincode) {
      showModal({
        title: "Fill All Input Fields",
        message: "Please Fill All The Details",
        type: "info"
      });
      return;
    }

    try {
      // ✅ Get cart items
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);

      if (!cartSnap.exists() || !cartSnap.data().items || cartSnap.data().items.length === 0) {
        showModal({
          title: "Your Cart Is Empty",
          message: "Please Check Your Cart to Continue",
          type: "error"
        });
        return;
      }

      const cartItems = cartSnap.data().items;
      
      // ✅ Use discounted total from cartSummary instead of calculating from scratch
      const totalAmount = cartSummary ? cartSummary.total : calculateCartSummary(cartItems, appliedCoupons).total;

      console.log('💰 Final Order Amount:', totalAmount);
      console.log('📦 Cart Items for Order:', cartItems);

      // ✅ Add total + items + coupons in order - PRESERVE ALL VARIANT DATA
      const orderDetails = {
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        paymentMethod: form.paymentMethod,
        status: "Order Placed",
        paymentStatus: form.paymentMethod === "COD" ? "Pending" : "Paid",
        userId: user.uid,
        email: user.email,
        createdAt: new Date(),
        items: cartItems.map(item => ({
          ...item,
          // Ensure all variant data is preserved
          displayPrice: item.displayPrice || item.price,
          selectedVariants: item.selectedVariants || {},
          variantImages: item.variantImages || [],
          productData: item.productData || {}
        })),
        appliedCoupons: appliedCoupons, // Save applied coupons
        subtotal: cartSummary ? cartSummary.subtotal : totalAmount,
        discount: cartSummary ? cartSummary.discount : 0,
        shipping: cartSummary ? cartSummary.shipping : 50,
        tax: cartSummary ? cartSummary.tax : 0,
        total: totalAmount.toFixed(2) // store as string with 2 decimals
      };

      console.log('📋 Final Order Details:', orderDetails);

      if (form.paymentMethod === "COD") {
        showModal({
          title: "✅ Order Placed VIA Cash On Delivery",
          message: `Yayyy Order Placed! Total: ₹${totalAmount.toFixed(2)}`,
          type: "success"
        });
        navigate("/confirm", { state: { orderDetails } });
     } else {
  try {
    setProcessingPayment(true);
    
    // Create order with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const res = await fetch(
  "https://createorder-gfn55kqmfq-uc.a.run.app",
  {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      amount: Math.round(totalAmount * 100), // Ensure it's integer
      currency: "INR",
      userId: auth.currentUser.uid
    }),
    signal: controller.signal
  }
);

// Add validation before the request:
console.log("💰 Total Amount:", totalAmount);
console.log("🔢 Amount in Paise:", Math.round(totalAmount * 100));
console.log("📦 Request Body:", JSON.stringify({ 
  amount: Math.round(totalAmount * 100),
  currency: "INR",
  userId: auth.currentUser.uid
}));
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    
    if (!data.success) {
      throw new Error(data.error || "Failed to create payment order");
    }

    const order = data.order;

    const razorpayOptions = {
       key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "Lumina",
      description: "Order Payment",
      handler: async function (response) {
        try {
          setProcessingPayment(true);
          
          // Verify payment via server
         const verifyRes = await fetch(
  "https://verifypayment-gfn55kqmfq-uc.a.run.app",
  {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    })
  }
);

// Add debug logs:
console.log("🔍 Verifying payment:", {
  razorpay_order_id: response.razorpay_order_id,
  razorpay_payment_id: response.razorpay_payment_id,
  razorpay_signature: response.razorpay_signature
});

          if (!verifyRes.ok) {
            throw new Error(`Verification HTTP ${verifyRes.status}`);
          }

          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            const paidOrder = { 
              ...orderDetails, 
              status: "Order Placed",
              paymentStatus: "Paid",
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            };
            
            // Clear applied coupons after successful payment
            localStorage.removeItem(`appliedCoupons_${auth.currentUser.uid}`);
            
            navigate("/confirm", { state: { orderDetails: paidOrder } });
          } else {
            throw new Error(verifyData.error || "Payment verification failed");
          }
        } catch (verifyError) {
          console.error("Payment verification failed:", verifyError);
          showModal({
            title: "Payment Verification Failed",
            message: "We're unable to verify your payment. Please contact support with your transaction ID.",
            type: "error"
          });
        } finally {
          setProcessingPayment(false);
        }
      },
      prefill: {
        name: form.fullName.trim(),
        email: auth.currentUser.email,
        contact: form.phone
      },
      theme: { color: "#BA93B1" },
      modal: {
        ondismiss: function() {
          setProcessingPayment(false);
          showModal({
            title: "Payment Cancelled",
            message: "You cancelled the payment process",
            type: "info"
          });
        }
      }
    };

    const rzp = new window.Razorpay(razorpayOptions);
    
    rzp.on('payment.failed', function(response) {
      setProcessingPayment(false);
      showModal({
        title: "Payment Failed",
        message: "Please try again or contact support if the issue persists",
        type: "error"
      });
    });

    rzp.open();
    
  } catch (error) {
    setProcessingPayment(false);
    console.error("🔥 Razorpay Error:", error);
    
    if (error.name === 'AbortError') {
      showModal({
        title: "Request Timeout",
        message: "Payment request took too long. Please check your connection and try again.",
        type: "error"
      });
    } else {
      showModal({
        title: "Payment Setup Failed",
        message: "Sorry for the inconvenience. Please retry the payment.",
        type: "error"
      });
    }
  }
}
    } catch (error) {
      console.error("🔥 Error placing order:", error);
      showModal({
        title: "Order Failed",
        message: "Something went wrong while placing order.",
        type: "error"
      });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="checkout-page">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />
      
      <motion.div 
        className="checkout-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="checkout-header" variants={itemVariants}>
          <h2>Checkout</h2>
          <p>Complete your purchase with secure payment</p>
        </motion.div>

        {/* Order Summary Section */}
        {cartSummary && (
          <motion.div className="checkout-section" variants={itemVariants}>
            <h3>Order Summary</h3>
            <div className="order-summary-details">
              <div className="summary-row">
                <span>Items ({cartSummary.itemCount})</span>
                <span>₹{cartSummary.subtotal.toFixed(2)}</span>
              </div>
              
              {appliedCoupons.length > 0 && (
                <>
                  {appliedCoupons.map(coupon => (
                    <div key={coupon.code} className="summary-row discount">
                      <span>Coupon: {coupon.code}</span>
                      <span>-₹{calculateCouponDiscount(coupon, cartSummary.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="summary-row discount-total">
                    <span>Total Discount</span>
                    <span>-₹{cartSummary.discount.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="summary-row">
                <span>Shipping</span>
                <span>{cartSummary.shipping === 0 ? 'FREE' : `₹${cartSummary.shipping.toFixed(2)}`}</span>
              </div>
              
              <div className="summary-row">
                <span>Tax (18% GST)</span>
                <span>₹{cartSummary.tax.toFixed(2)}</span>
              </div>
              
              <div className="summary-row total">
                <span><strong>Total Amount</strong></span>
                <span><strong>₹{cartSummary.total.toFixed(2)}</strong></span>
              </div>

              {(cartSummary.totalSavings > 0 || cartSummary.shippingSavings > 0) && (
                <div className="savings-message">
                  You saved ₹{(cartSummary.totalSavings + cartSummary.shippingSavings).toFixed(2)}!
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div className="checkout-section" variants={itemVariants}>
          <h3>Shipping Address</h3>
          
          {loading ? (
            <div className="loading-spinner">Loading addresses...</div>
          ) : (
           <>
              {addresses.length > 0 ? (
                <div className="address-selector">
                  <label>Select Saved Address</label>
                  <select
                    value={selectedAddressId}
                    onChange={handleSelectChange}
                  >
                    <option value="">Choose an address</option>
                    {addresses.map(address => (
                      <option key={address.id} value={address.id}>
                        {address.name || address.fullName} - {address.addressLine1}, {address.city}
                        {address.isDefault && " (Default)"}
                      </option>
                    ))}
                  </select>
                  
                  {/* Display selected address preview */}
                  <div className="selected-address-preview">
                    <h4>Selected Address:</h4>
                    {selectedAddressId ? (
                      <>
                        <p><strong>{form.fullName}</strong> | {form.phone}</p>
                        <p>{form.address}, {form.city} - {form.pincode}</p>
                      </>
                    ) : (
                      <p className="no-address-selected">Please select an address</p>
                    )}
                  </div>
                  
                  <button 
                    className="add-new-address-btn"
                    onClick={() => navigate("/addresses")}
                  >
                    Manage Addresses
                  </button>
                </div>
              ) : (
                <div className="no-address-warning">
                  <p>No saved addresses found.</p>
                  <button 
                    className="add-new-address-btn"
                    onClick={() => navigate("/addresses")}
                  >
                    Add Address to Proceed
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>

        <motion.div className="checkout-section" variants={itemVariants}>
          <h3>Payment Method</h3>
          <div className="payment-options">
            <label className="payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={form.paymentMethod === "COD"}
                onChange={handleInputChange}
              />
              <div className="payment-content">
                <span>Cash on Delivery (COD)</span>
                <small>Pay when you receive your order</small>
              </div>
            </label>
            
            <label className="payment-option">
              <input
                type="radio"
                name="paymentMethod"
                value="Online"
                checked={form.paymentMethod === "Online"}
                onChange={handleInputChange}
              />
              <div className="payment-content">
                <span>Online Payment</span>
                <small>Secure payment via Razorpay</small>
              </div>
            </label>
          </div>
        </motion.div>

        <motion.div 
          className="checkout-footer"
          variants={itemVariants}
        >
          <button 
            className="confirm-order-btn"
            onClick={handleOrderSubmit}
            disabled={processingPayment}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {processingPayment ? "Processing..." : `Confirm Order - ₹${cartSummary ? cartSummary.total.toFixed(2) : '0.00'}`}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Checkout;