// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { PDFDownloadLink } from '@react-pdf/renderer';
import Invoice from "../utils/generateInvoice";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../orders.css";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setCurrentUser({
          ...user,
          ...userDoc.data()
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          alert("Please login first.");
          navigate("/login");
          return;
        }

        try {
          const q = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          const fetchedOrders = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(fetchedOrders);

          // Fetch cart count
          const cartRef = doc(db, "carts", user.uid);
          const cartSnap = await getDoc(cartRef);
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            setCartCount(items.reduce((total, item) => total + (item.quantity || 1), 0));
          }
        } catch (error) {
          console.error("Error fetching orders:", error);
        } finally {
          setLoading(false);
        }
      });
    };

    fetchOrders();
  }, [navigate]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "#00a650";
      case "shipped":
        return "#007185";
      case "out for delivery":
        return "#B12704";
      case "processing":
        return "#FF9900";
      default:
        return "#BA93B1";
    }
  };

  const calculateExpectedDelivery = (orderDate) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 3); // Adding 3 days as example
    return format(date, "EEE, MMM d");
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const isStepCompleted = (step, currentStatus) => {
    const stepOrder = ["processing", "shipped", "out for delivery", "delivered"];
    return stepOrder.indexOf(step.toLowerCase()) <= stepOrder.indexOf(currentStatus?.toLowerCase());
  };

  // Calculate order total with proper discount handling
  const calculateOrderTotal = (order) => {
    // If order already has calculated total with discount, use it
    if (order.total !== undefined && order.total !== null) {
      return parseFloat(order.total);
    }
    
    // Otherwise calculate from items (fallback)
    return order.items?.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
      0
    ) || 0;
  };

  // Calculate savings from coupons
  const calculateOrderSavings = (order) => {
    if (order.discount !== undefined && order.discount !== null) {
      return parseFloat(order.discount);
    }
    return 0;
  };

  return (
    <>
      <Navbar cartCount={cartCount} />

      {showTrackingModal && trackingOrder && (
        <div className="tracking-modal-overlay" onClick={() => setShowTrackingModal(false)}>
          <motion.div
            className="tracking-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Tracking Order #{trackingOrder.id.slice(0, 8)}</h2>
            <p><strong>Status:</strong> {trackingOrder.status}</p>
            <p><strong>Estimated Delivery:</strong> {calculateExpectedDelivery(trackingOrder.createdAt?.seconds * 1000)}</p>

            <div className="tracking-steps">
              {["Processing", "Shipped", "Out for Delivery", "Delivered"].map((step, index) => (
                <div
                  key={index}
                  className={`step ${step.toLowerCase() === trackingOrder.status?.toLowerCase() ? "active" : ""} ${isStepCompleted(step, trackingOrder.status) ? "completed" : ""}`}
                >
                  <div className="step-circle">{index + 1}</div>
                  <div className="step-label">{step}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowTrackingModal(false)} className="close-btn">Close</button>
          </motion.div>
        </div>
      )}
      
      <div className="layout">
        <Sidebar />
        
        <div className="orders-container">
          <motion.h1 
            className="orders-title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Your Orders
          </motion.h1>

          {loading ? (
            <motion.div 
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <i className="fas fa-spinner"></i>
            </motion.div>
          ) : orders.length === 0 ? (
            <motion.div 
              className="empty-orders"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <i className="fas fa-box-open"></i>
              <p>You haven't placed any orders yet</p>
              <a href="/home" className="shop-btn">
                Start Shopping
              </a>
            </motion.div>
          ) : (
            <AnimatePresence>
              {orders.map((order) => {
                const orderTotal = calculateOrderTotal(order);
                const orderSavings = calculateOrderSavings(order);
                const subtotal = order.subtotal || orderTotal + orderSavings;
                
                return (
                  <motion.div
                    key={order.id}
                    className="order-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <div className="order-summary">
                      <div className="order-meta">
                        <div>
                          <p className="meta-label">ORDER PLACED</p>
                          <p className="meta-value">
                            {format(new Date(order.createdAt?.seconds * 1000), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label">TOTAL</p>
                          <p className="meta-value">
                            ₹{orderTotal.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="meta-label">SHIP TO</p>
                          <p className="meta-value">
                            {order.fullName || "You"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Order Savings Display */}
                      {(orderSavings > 0 || (order.appliedCoupons && order.appliedCoupons.length > 0)) && (
                        <div className="order-savings">
                          <div className="savings-badge">
                            <i className="fas fa-tag"></i>
                            {orderSavings > 0 ? `Saved ₹${orderSavings.toFixed(2)}` : 'Coupons Applied'}
                          </div>
                          {order.appliedCoupons && order.appliedCoupons.length > 0 && (
                            <div className="applied-coupons-list">
                              {order.appliedCoupons.map((coupon, index) => (
                                <span key={index} className="coupon-tag">
                                  {coupon.code}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="order-header">
                        <h3 className="order-id">Order #{order.id.slice(0, 8)}</h3>
                        <div className="order-status">
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {order.status || "Processing"}
                          </span>
                          {order.status?.toLowerCase() === "shipped" && (
                            <p className="delivery-estimate">
                              Expected delivery: {calculateExpectedDelivery(order.createdAt?.seconds * 1000)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    {(orderSavings > 0 || order.subtotal || order.shipping || order.tax) && (
                      <div className="price-breakdown">
                        <div className="breakdown-row">
                          <span>Items Total:</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        
                        {orderSavings > 0 && (
                          <div className="breakdown-row discount">
                            <span>Discounts:</span>
                            <span>-₹{orderSavings.toFixed(2)}</span>
                          </div>
                        )}
                        
                        {order.shipping !== undefined && (
                          <div className="breakdown-row">
                            <span>Shipping:</span>
                            <span>{order.shipping === 0 ? 'FREE' : `₹${parseFloat(order.shipping).toFixed(2)}`}</span>
                          </div>
                        )}
                        
                        {order.tax !== undefined && (
                          <div className="breakdown-row">
                            <span>Tax (GST):</span>
                            <span>₹{parseFloat(order.tax).toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="breakdown-row total">
                          <span><strong>Grand Total:</strong></span>
                          <span><strong>₹{orderTotal.toFixed(2)}</strong></span>
                        </div>
                      </div>
                    )}

                    <div className="order-items-container">
                      {order.items?.slice(0, expandedOrder === order.id ? order.items.length : 2).map((item, index) => (
                        <motion.div 
                          key={index} 
                          className="order-item"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="item-image">
                            <img
                              src={item.image || "/placeholder.png"}
                              alt={item.name}
                              onError={(e) => {
                                e.target.src = "/placeholder.png";
                              }}
                            />
                          </div>
                          <div className="item-details">
                            <h4 className="item-name">{item.name}</h4>
                            <p className="item-price">₹{item.price}</p>
                            <p className="item-qty">Quantity: {item.quantity}</p>
                            <div className="item-actions">
                              <button
                                className="action-btn"
                                onClick={() => {
                                  setTrackingOrder(order);
                                  setShowTrackingModal(true);
                                }}
                              >
                                <i className="fas fa-box"></i> Track Package
                              </button>

                              <button className="action-btn">
                                <PDFDownloadLink 
                                  document={<Invoice order={order} user={currentUser} />}
                                  fileName={`Invoice_${order.id}.pdf`}
                                  style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                  {({ loading }) => (
                                    <>
                                      <i className="fas fa-file-invoice"></i> 
                                      {loading ? 'Preparing...' : 'View Invoice'}
                                    </>
                                  )}
                                </PDFDownloadLink>
                              </button>

                              {order.status?.toLowerCase() === "delivered" && (
                                <button className="action-btn">
                                  <i className="fas fa-undo"></i> Return or Replace
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {order.items?.length > 2 && (
                        <div className="order-expand">
                          <button 
                            onClick={() => toggleOrderExpand(order.id)}
                            className="expand-btn"
                          >
                            {expandedOrder === order.id ? (
                              <>
                                <i className="fas fa-chevron-up"></i> Show less
                              </>
                            ) : (
                              <>
                                <i className="fas fa-chevron-down"></i> Show all items ({order.items.length})
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}

export default Orders;