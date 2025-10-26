import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useGlobalModal } from "../context/ModalContext";
import "../styles/paymentmethods.css";
import "../home.css";

function PaymentMethods() {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addingNewCard, setAddingNewCard] = useState(false);
  const [newCardDetails, setNewCardDetails] = useState({
    name: "",
    number: "",
    expiry: "",
    cvv: ""
  });
  const { showModal } = useGlobalModal();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to view your payment methods",
        type: "error"
      });
      navigate("/login");
      return;
    }

    const fetchPaymentMethods = async () => {
      try {
        const methodsRef = collection(db, "users", user.uid, "paymentMethods");
        const snapshot = await getDocs(methodsRef);
        const methodsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setPaymentMethods(methodsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        showModal({
          title: "Error Loading Payment Methods",
          message: "Failed to load your saved payment methods",
          type: "error"
        });
        setLoading(false);
      }
    };

    fetchPaymentMethods();
  }, [navigate, showModal]);

  const handleAddNewCard = async () => {
    if (!newCardDetails.name || !newCardDetails.number || !newCardDetails.expiry || !newCardDetails.cvv) {
      showModal({
        title: "Incomplete Details",
        message: "Please fill all card details",
        type: "info"
      });
      return;
    }

    // Basic validation
    if (newCardDetails.number.replace(/\s/g, '').length !== 16) {
      showModal({
        title: "Invalid Card Number",
        message: "Please enter a valid 16-digit card number",
        type: "info"
      });
      return;
    }

    if (newCardDetails.cvv.length < 3 || newCardDetails.cvv.length > 4) {
      showModal({
        title: "Invalid CVV",
        message: "Please enter a valid 3 or 4 digit CVV",
        type: "info"
      });
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      // In a real app, you would tokenize this with Razorpay's API
      // This is just storing the masked version for display
      const maskedNumber = `•••• •••• •••• ${newCardDetails.number.slice(-4)}`;
      
      const newMethod = {
        type: "card",
        card: {
          name: newCardDetails.name,
          last4: newCardDetails.number.slice(-4),
          brand: getCardBrand(newCardDetails.number),
          expiry: newCardDetails.expiry,
          maskedNumber
        },
        isDefault: paymentMethods.length === 0,
        createdAt: new Date()
      };

      // Add to Firestore
      const newMethodRef = doc(collection(db, "users", user.uid, "paymentMethods"));
      await setDoc(newMethodRef, newMethod);

      // Add to local state
      setPaymentMethods(prev => [...prev, { id: newMethodRef.id, ...newMethod }]);
      
      showModal({
        title: "Card Added",
        message: "Your payment method has been saved successfully",
        type: "success"
      });

      setAddingNewCard(false);
      setNewCardDetails({
        name: "",
        number: "",
        expiry: "",
        cvv: ""
      });
    } catch (error) {
      console.error("Error adding card:", error);
      showModal({
        title: "Error Adding Card",
        message: "Failed to save your payment method",
        type: "error"
      });
    }
  };

  const getCardBrand = (number) => {
    // Simple card brand detection
    const num = number.replace(/\s/g, '');
    if (/^4/.test(num)) return "Visa";
    if (/^5[1-5]/.test(num)) return "Mastercard";
    if (/^3[47]/.test(num)) return "American Express";
    if (/^6(?:011|5)/.test(num)) return "Discover";
    return "Credit Card";
  };

  const handleSetDefault = async (methodId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      // Update all methods to set isDefault to false
      const batchUpdates = paymentMethods.map(async method => {
        const methodRef = doc(db, "users", user.uid, "paymentMethods", method.id);
        await setDoc(methodRef, { isDefault: method.id === methodId }, { merge: true });
      });

      await Promise.all(batchUpdates);

      // Update local state
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }))
      );

      showModal({
        title: "Default Method Updated",
        message: "Your default payment method has been updated",
        type: "success"
      });
    } catch (error) {
      console.error("Error setting default method:", error);
      showModal({
        title: "Error Updating Default",
        message: "Failed to update your default payment method",
        type: "error"
      });
    }
  };

  const handleRemoveMethod = async (methodId) => {
    if (!window.confirm("Are you sure you want to remove this payment method?")) return;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const methodRef = doc(db, "users", user.uid, "paymentMethods", methodId);
      await deleteDoc(methodRef);

      // Update local state
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));

      showModal({
        title: "Method Removed",
        message: "The payment method has been removed",
        type: "success"
      });
    } catch (error) {
      console.error("Error removing payment method:", error);
      showModal({
        title: "Error Removing Method",
        message: "Failed to remove the payment method",
        type: "error"
      });
    }
  };

  const handlePaymentWithMethod = (method) => {
    setSelectedMethod(method.id);
    
    // In a real app, you would use Razorpay's saved card API here
    // This is a mock implementation
    setTimeout(() => {
      showModal({
        title: "Payment Successful",
        message: `Your payment of ₹${cartTotal} was processed successfully with your ${method.card.brand} card`,
        type: "success"
      });
      setSelectedMethod(null);
      navigate("/orders");
    }, 2000);
  };

  const formatCardNumber = (number) => {
    return number.replace(/(\d{4})(?=\d)/g, '$1 ');
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

  const cardFlipVariants = {
    front: { rotateY: 0 },
    back: { rotateY: 180 }
  };

  // Mock cart total for demonstration
  const cartTotal = 2499;

  return (
    <div className="payment-methods-page">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />
      
      <motion.div 
        className="payment-methods-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="payment-header" variants={itemVariants}>
          <h2>Payment Methods</h2>
          <p>Manage your saved payment options</p>
        </motion.div>

        <div className="payment-content">
          <motion.div className="payment-methods-list" variants={itemVariants}>
            <div className="section-header">
              <h3>Saved Payment Methods</h3>
              {!addingNewCard && (
                <button 
                  className="add-new-btn"
                  onClick={() => setAddingNewCard(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  + Add New Card
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-spinner">Loading your payment methods...</div>
            ) : (
              <>
                {addingNewCard && (
                  <motion.div 
                    className="new-card-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <h4>Add New Card</h4>
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Name on card"
                        value={newCardDetails.name}
                        onChange={(e) => setNewCardDetails({...newCardDetails, name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Card Number</label>
                     <input
  type="text"
  placeholder="1234 5678 9012 3456"
  value={formatCardNumber(newCardDetails.number)}
  onChange={(e) => {
    const num = e.target.value.replace(/\s/g, '');
    if (/^\d*$/.test(num)) {
      setNewCardDetails({ ...newCardDetails, number: num });
    }
  }}
  maxLength={19}
/>

                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={newCardDetails.expiry}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d{0,2}\/?\d{0,2}$/.test(val)) {
                              setNewCardDetails({...newCardDetails, expiry: val});
                            }
                          }}
                          maxLength={5}
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={newCardDetails.cvv}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d{0,4}$/.test(val)) {
                              setNewCardDetails({...newCardDetails, cvv: val});
                            }
                          }}
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button 
                        className="cancel-btn"
                        onClick={() => setAddingNewCard(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="save-btn"
                        onClick={handleAddNewCard}
                      >
                        Save Card
                      </button>
                    </div>
                  </motion.div>
                )}

                {paymentMethods.length === 0 && !addingNewCard ? (
                  <div className="empty-state">
                    <div className="empty-icon">💳</div>
                    <h4>No Saved Payment Methods</h4>
                    <p>Add a payment method to make checkout faster</p>
                    <button 
                      className="add-first-btn"
                      onClick={() => setAddingNewCard(true)}
                    >
                      + Add Payment Method
                    </button>
                  </div>
                ) : (
                  <div className="methods-grid">
                    {paymentMethods.map(method => (
                      <motion.div 
                        key={method.id}
                        className={`payment-method-card ${method.isDefault ? 'default' : ''}`}
                        whileHover={{ y: -5 }}
                        variants={itemVariants}
                      >
                        <div className="card-header">
                          <div className="card-brand">
                            {method.card.brand === "Visa" && <span className="card-logo visa">VISA</span>}
                            {method.card.brand === "Mastercard" && <span className="card-logo mastercard">MC</span>}
                            {method.card.brand === "American Express" && <span className="card-logo amex">AMEX</span>}
                            {method.card.brand === "Discover" && <span className="card-logo discover">DISCOVER</span>}
                            {!["Visa", "Mastercard", "American Express", "Discover"].includes(method.card.brand) && (
                              <span className="card-logo generic">CARD</span>
                            )}
                            {method.isDefault && <span className="default-badge">DEFAULT</span>}
                          </div>
                          <div className="card-actions">
                            <button 
                              className="action-btn set-default"
                              onClick={() => handleSetDefault(method.id)}
                              disabled={method.isDefault}
                            >
                              {method.isDefault ? '✓ Default' : 'Set Default'}
                            </button>
                            <button 
                              className="action-btn remove"
                              onClick={() => handleRemoveMethod(method.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="card-details">
                          <div className="card-number">{method.card.maskedNumber}</div>
                          <div className="card-info">
                            <span className="card-name">{method.card.name}</span>
                            <span className="card-expiry">Expires {method.card.expiry}</span>
                          </div>
                        </div>
                        <button 
                          className="pay-with-btn"
                          onClick={() => handlePaymentWithMethod(method)}
                          disabled={selectedMethod === method.id}
                        >
                          {selectedMethod === method.id ? (
                            <div className="processing-payment">
                              <div className="spinner"></div>
                              Processing...
                            </div>
                          ) : (
                            `Pay ₹${cartTotal}`
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>

          <motion.div className="order-summary" variants={itemVariants}>
            <h3>Order Summary</h3>
            <div className="summary-item">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="summary-item">
              <span>Shipping</span>
              <span>FREE</span>
            </div>
            <div className="summary-item">
              <span>Tax</span>
              <span>₹{(cartTotal * 0.18).toFixed(2)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>₹{(cartTotal * 1.18).toFixed(2)}</span>
            </div>
            <div className="security-info">
              <div className="secure-icon">🔒</div>
              <p>All transactions are secure and encrypted</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default PaymentMethods;