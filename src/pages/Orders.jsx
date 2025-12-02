// src/pages/Orders.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-config";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { PDFDownloadLink } from "@react-pdf/renderer";
import Invoice from "../utils/generateInvoice";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import CancelOrderModal from "../components/CancelOrderModal";
import ReturnOrderModal from "../components/ReturnOrderModal";
import MobileLayout from "../layouts/MobileLayout";
import "../orders.css";

function toMillis(timestampOrMs) {
  if (!timestampOrMs) return null;
  if (typeof timestampOrMs.toMillis === "function") return timestampOrMs.toMillis();
  if (timestampOrMs.seconds) return timestampOrMs.seconds * 1000;
  if (typeof timestampOrMs === "number") return timestampOrMs;
  return null;
}

function normalizeStatus(status = "") {
  return String(status).toLowerCase().replace(/[_\s]+/g, "").trim();
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    let unsubscribeOrders = null;
    let unsubscribeCart = null;
    let unsubscribeAuth = null;

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setCurrentUser(null);
          setOrders([]);
          setCartCount(0);
          setLoading(false);
          navigate("/login");
          return;
        }

        // fetch user doc
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          ...userData,
        });

        // ✅ Real-time order listener
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const liveOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setOrders(liveOrders);
          setLoading(false);
        });

        // ✅ Real-time cart listener
        const cartRef = doc(db, "carts", user.uid);
        unsubscribeCart = onSnapshot(cartRef, (cartSnap) => {
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            setCartCount(items.reduce((total, item) => total + (Number(item.quantity) || 1), 0));
          } else {
            setCartCount(0);
          }
        });
      } catch (err) {
        console.error("Error in auth/order fetch:", err);
        setLoading(false);
      }
    });

    // ✅ Cleanup listeners
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeCart) unsubscribeCart();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [navigate]);

  const getStatusColor = useCallback((status) => {
    if (!status) return "#BA93B1";
    switch (normalizeStatus(status)) {
      case "delivered":
        return "#00a650";
      case "shipped":
        return "#007185";
      case "outfordelivery":
        return "#B12704";
      case "processing":
        return "#FF9900";
      case "cancelled":
        return "#6c757d";
      case "partiallycancelled":
        return "#ffc107";
      case "returnrequested":
        return "#17a2b8";
      default:
        return "#BA93B1";
    }
  }, []);

  const canCancelOrder = (order) => {
    if (!order?.status) return false;
    const s = normalizeStatus(order.status);
    const cancellable = ["pending", "processing", "confirmed", "orderplaced", "ordered"];
    if (s.includes("cancelled") || s.includes("delivered") || s.includes("outfordelivery")) return false;
    return cancellable.includes(s);
  };

  const canReturnOrder = (order) => {
    if (!order?.status) return false;
    const s = normalizeStatus(order.status);
    if (!s.includes("delivered")) return false;
    const deliveredMs = toMillis(order.deliveredAt) ?? toMillis(order.createdAt);
    if (!deliveredMs) return false;
    const returnDeadline = new Date(deliveredMs);
    returnDeadline.setDate(returnDeadline.getDate() + 8);
    const now = new Date();
    if (now > returnDeadline) return false;
    if (order.returnStatus) return false;
    if (s.includes("cancelled")) return false;
    return true;
  };

  const getReturnDaysRemaining = (order) => {
    const s = normalizeStatus(order.status);
    if (!s.includes("delivered")) return null;
    const deliveredMs = toMillis(order.deliveredAt) ?? toMillis(order.createdAt);
    if (!deliveredMs) return null;
    const deadline = new Date(deliveredMs);
    deadline.setDate(deadline.getDate() + 8);
    const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 3600 * 24));
    return diff > 0 ? diff : 0;
  };

  const handleCancelClick = (order) => {
    setSelectedOrder(order);
    setCancelModalOpen(true);
  };

  const handleReturnClick = (order) => {
    setSelectedOrder(order);
    setReturnModalOpen(true);
  };

  const handleCancelSuccess = () => {
    if (!selectedOrder) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: "Cancelled" } : o))
    );
    alert("Order cancelled successfully! Refund has been initiated.");
  };

  const handleReturnSuccess = () => {
    if (!selectedOrder) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id ? { ...o, returnStatus: "return_requested" } : o
      )
    );
    alert("Return request submitted successfully! Pickup has been scheduled.");
  };

  const calculateExpectedDelivery = (orderDateOrMs) => {
    const ms = toMillis(orderDateOrMs);
    const date = ms ? new Date(ms) : new Date();
    date.setDate(date.getDate() + 3);
    return format(date, "EEE, MMM d");
  };

  const toggleOrderExpand = (orderId) => {
    setExpandedOrder((prev) => (prev === orderId ? null : orderId));
  };

  const isStepCompleted = (step, currentStatus) => {
    const stepOrder = ["processing", "shipped", "out for delivery", "delivered"].map(s =>
      normalizeStatus(s)
    );
    const stepIdx = stepOrder.indexOf(normalizeStatus(step));
    const currentIdx = stepOrder.indexOf(normalizeStatus(currentStatus));
    if (stepIdx === -1) return false;
    if (currentIdx === -1) return false;
    return stepIdx <= currentIdx;
  };

  const calculateOrderTotal = (order) => {
    const parsed = Number(order?.total);
    if (!Number.isNaN(parsed)) return parsed;
    const sum = (order.items || []).reduce((acc, it) => {
      const price = Number(it.displayPrice || it.price) || 0;
      const qty = Number(it.quantity) || 1;
      return acc + price * qty;
    }, 0);
    return sum;
  };

  const calculateOrderSavings = (order) => {
    const parsed = Number(order?.discount);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // ✅ Get variant details for display
  const getVariantDetails = (item) => {
    const variants = item.selectedVariants || {};
    if (Object.keys(variants).length === 0) return null;

    return Object.entries(variants)
      .map(([key, value]) => {
        // Get display name from product data if available
        let displayValue = value;
        if (item.productData?.variants?.[key]) {
          const variantOption = item.productData.variants[key].find(
            opt => opt.value === value
          );
          if (variantOption) {
            displayValue = variantOption.name || value;
          }
        }
        return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${displayValue}`;
      })
      .join(', ');
  };

  // ✅ Get item price with variant pricing
  const getItemPrice = (item) => {
    return item.displayPrice || item.price || 0;
  };

  // ✅ Get item image with variant images
  const getItemImage = (item) => {
    return item.variantImages?.[0] || item.image || "/placeholder.png";
  };

  // ✅ Get live tracking order
  const currentTrackingOrder = trackingOrder
    ? orders.find((o) => o.id === trackingOrder.id) || trackingOrder
    : null;

  // Main orders content
  const ordersContent = (
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
          <i className="fas fa-spinner" aria-hidden="true"></i>
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
            const returnDaysRemaining = getReturnDaysRemaining(order);

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
                        {toMillis(order.createdAt)
                          ? format(new Date(toMillis(order.createdAt)), "MMM d, yyyy")
                          : "Date not available"}
                      </p>
                    </div>
                    <div>
                      <p className="meta-label">TOTAL</p>
                      <p className="meta-value">₹{orderTotal.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="meta-label">SHIP TO</p>
                      <p className="meta-value">{order.fullName || "You"}</p>
                    </div>
                  </div>

                  {returnDaysRemaining !== null && returnDaysRemaining > 0 && (
                    <div className="return-days-remaining">
                      <i className="fas fa-clock" aria-hidden="true"></i>
                      <span>{returnDaysRemaining} days left to return</span>
                    </div>
                  )}

                  {(orderSavings > 0 ||
                    (order.appliedCoupons && order.appliedCoupons.length > 0)) && (
                    <div className="order-savings">
                      <div className="savings-badge">
                        <i className="fas fa-tag" aria-hidden="true"></i>
                        {orderSavings > 0
                          ? `Saved ₹${orderSavings.toFixed(2)}`
                          : "Coupons Applied"}
                      </div>
                      {order.appliedCoupons && (
                        <div className="applied-coupons-list">
                          {order.appliedCoupons.map((c, i) => (
                            <span key={i} className="coupon-tag">
                              {c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="order-header">
                    <h3 className="order-id">Order #{order.id?.slice(0, 8)}</h3>
                    <div className="order-status">
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status || "Processing"}
                      </span>
                      {normalizeStatus(order.status) === "shipped" && (
                        <p className="delivery-estimate">
                          Expected delivery: {calculateExpectedDelivery(order.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="order-items-container">
                  {order.items
                    ?.slice(0, expandedOrder === order.id ? order.items.length : 2)
                    .map((item, index) => {
                      const variantDetails = getVariantDetails(item);
                      const itemPrice = getItemPrice(item);
                      const itemImage = getItemImage(item);

                      return (
                        <motion.div
                          key={index}
                          className="order-item"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="item-image">
                            <img
                              src={itemImage}
                              alt={item.name || "product"}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/placeholder.png";
                              }}
                            />
                          </div>
                          <div className="item-details">
                            <h4 className="item-name">{item.name}</h4>
                            {variantDetails && (
                              <p className="item-variants">
                                <strong>Variants:</strong> {variantDetails}
                              </p>
                            )}
                            <p className="item-price">₹{parseFloat(itemPrice).toFixed(2)}</p>
                            <p className="item-qty">Quantity: {item.quantity}</p>
                            <div className="item-actions">
                              <button
                                className="action-btn"
                                onClick={() => {
                                  setTrackingOrder(order);
                                  setShowTrackingModal(true);
                                }}
                              >
                                <i className="fas fa-box" aria-hidden="true"></i> Track Package
                              </button>

                              <button className="action-btn invoice-btn">
                                <PDFDownloadLink
                                  document={<Invoice order={order} user={currentUser} />}
                                  fileName={`Invoice_${order.id}.pdf`}
                                  style={{ color: "inherit", textDecoration: "none" }}
                                >
                                  {({ loading: pdfLoading }) => (
                                    <>
                                      <i className="fas fa-file-invoice" aria-hidden="true"></i>{" "}
                                      {pdfLoading ? "Preparing..." : "View Invoice"}
                                    </>
                                  )}
                                </PDFDownloadLink>
                              </button>

                              {canCancelOrder(order) && (
                                <button
                                  className="action-btn cancel-btn"
                                  onClick={() => handleCancelClick(order)}
                                >
                                  <i className="fas fa-times-circle" aria-hidden="true"></i>{" "}
                                  Cancel Order
                                </button>
                              )}

                              {canReturnOrder(order) && (
                                <button
                                  className="action-btn return-btn"
                                  onClick={() => handleReturnClick(order)}
                                >
                                  <i className="fas fa-undo" aria-hidden="true"></i> Return or
                                  Replace
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                  {order.items?.length > 2 && (
                    <div className="order-expand">
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="expand-btn"
                      >
                        {expandedOrder === order.id ? (
                          <>
                            <i className="fas fa-chevron-up" aria-hidden="true"></i> Show less
                          </>
                        ) : (
                          <>
                            <i className="fas fa-chevron-down" aria-hidden="true"></i> Show all
                            items ({order.items.length})
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

      {/* Modals */}
      {selectedOrder && (
        <CancelOrderModal
          order={selectedOrder}
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onCancelSuccess={handleCancelSuccess}
          currentUser={currentUser}
        />
      )}

      {selectedOrder && (
        <ReturnOrderModal
          order={selectedOrder}
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          onReturnSuccess={handleReturnSuccess}
          currentUser={currentUser}
        />
      )}

      {showTrackingModal && currentTrackingOrder && (
        <div className="tracking-modal-overlay" onClick={() => setShowTrackingModal(false)}>
          <motion.div
            className="tracking-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Tracking Order #{currentTrackingOrder.id?.slice(0, 8)}</h2>
            <p>
              <strong>Status:</strong> {currentTrackingOrder.status}
            </p>
            <p>
              <strong>Estimated Delivery:</strong>{" "}
              {calculateExpectedDelivery(currentTrackingOrder.createdAt ?? Date.now())}
            </p>

            <div className="tracking-steps">
              {["Processing", "Shipped", "Out for Delivery", "Delivered"].map((step, index) => (
                <div
                  key={index}
                  className={`step ${normalizeStatus(step) === normalizeStatus(currentTrackingOrder.status) ? "active" : ""
                    } ${isStepCompleted(step, currentTrackingOrder.status) ? "completed" : ""}`}
                >
                  <div className="step-circle">{index + 1}</div>
                  <div className="step-label">{step}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowTrackingModal(false)} className="close-btn">
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  // If mobile, use MobileLayout
  if (isMobile) {
    return (
      <MobileLayout>
        {ordersContent}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <>
      <Navbar cartCount={cartCount} />

      <div className="layout">
        <Sidebar />
        {ordersContent}
      </div>
    </>
  );
}

export default Orders;