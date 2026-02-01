// src/pages/Orders.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
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

// ✅ STATIC UTILITIES - NO RE-CREATION EVER
const toMillis = (timestampOrMs) => {
  if (!timestampOrMs) return null;
  if (typeof timestampOrMs.toMillis === "function") return timestampOrMs.toMillis();
  if (timestampOrMs.seconds) return timestampOrMs.seconds * 1000;
  if (typeof timestampOrMs === "number") return timestampOrMs;
  return null;
};

const normalizeStatus = (status = "") => {
  return String(status).toLowerCase().replace(/[_\s]+/g, "").trim();
};

const STATUS_COLORS = {
  delivered: "#00a650",
  shipped: "#007185",
  outfordelivery: "#B12704",
  processing: "#FF9900",
  cancelled: "#6c757d",
  partiallycancelled: "#ffc107",
  returnrequested: "#17a2b8",
  default: "#BA9c88",
};

const getStatusColor = (status) => STATUS_COLORS[normalizeStatus(status)] || STATUS_COLORS.default;

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
  
  // ✅ ULTRA PERFORMANCE REFS
  const listeners = useRef({ orders: null, cart: null, auth: null });
  const prevOrders = useRef([]);
  const prevCartCount = useRef(0);
  const isMounted = useRef(true);
  const userRef = useRef(null);
  const orderCache = useRef(new Map()); // Cache for order calculations

  // Mobile check - THROTTLED
  useEffect(() => {
    let resizeTimer;
    const checkMobile = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 50);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  // ✅ SINGLE OPTIMIZED LISTENER SETUP
  useEffect(() => {
    isMounted.current = true;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted.current) return;
      
      try {
        if (!user) {
          userRef.current = null;
          setCurrentUser(null);
          setOrders([]);
          setCartCount(0);
          setLoading(false);
          navigate("/login");
          return;
        }

        // ✅ BATCH ALL FETCHES
        await Promise.all([
          fetchUserData(user),
          setupOrderListener(user.uid),
          setupCartListener(user.uid)
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error("Auth error:", err);
        if (isMounted.current) setLoading(false);
      }
    });

    listeners.current.auth = unsubscribeAuth;

    return () => {
      isMounted.current = false;
      Object.values(listeners.current).forEach(unsub => {
        if (unsub && typeof unsub === 'function') unsub();
      });
      orderCache.current.clear();
    };
  }, [navigate]);

  // ✅ DEBOUNCED DATA FETCHING
  const fetchUserData = async (user) => {
    try {
      const userDocSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};
      const userObj = { uid: user.uid, email: user.email, ...userData };
      userRef.current = userObj;
      setCurrentUser(userObj);
    } catch (err) {
      console.error("User fetch error:", err);
    }
  };

  // ✅ OPTIMIZED ORDER LISTENER WITH DIFFING
  const setupOrderListener = (userId) => {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    listeners.current.orders = onSnapshot(ordersQuery, 
      (snapshot) => {
        if (!isMounted.current) return;
        
        const liveOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          const id = doc.id;
          return { id, ...data };
        });
        
        // ✅ ULTRA-FAST DIFF CHECK
        if (prevOrders.current.length !== liveOrders.length || 
            JSON.stringify(prevOrders.current.map(o => ({id: o.id, status: o.status, updatedAt: o.updatedAt}))) !== 
            JSON.stringify(liveOrders.map(o => ({id: o.id, status: o.status, updatedAt: o.updatedAt})))) {
          
          prevOrders.current = liveOrders;
          orderCache.current.clear(); // Clear cache when orders change
          setOrders(liveOrders);
        }
      },
      (error) => {
        console.error("Orders listener error:", error);
      }
    );
  };

  // ✅ OPTIMIZED CART LISTENER
  const setupCartListener = (userId) => {
    const cartRef = doc(db, "carts", userId);
    listeners.current.cart = onSnapshot(cartRef, 
      (cartSnap) => {
        if (!isMounted.current) return;
        
        let newCount = 0;
        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          newCount = items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
        }
        
        // ✅ ONLY UPDATE IF CHANGED
        if (prevCartCount.current !== newCount) {
          prevCartCount.current = newCount;
          setCartCount(newCount);
        }
      },
      (error) => console.error("Cart listener error:", error)
    );
  };

  // ✅ MEMOIZED CALLBACKS WITH DEP ARRAYS
  const canCancelOrder = useCallback((order) => {
    if (!order?.status) return false;
    const s = normalizeStatus(order.status);
    const cancellable = new Set(["pending", "processing", "confirmed", "orderplaced", "ordered"]);
    if (s.includes("cancelled") || s.includes("delivered") || s.includes("outfordelivery")) return false;
    return cancellable.has(s);
  }, []);

  const canReturnOrder = useCallback((order) => {
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
  }, []);

  const getReturnDaysRemaining = useCallback((order) => {
    const cacheKey = `${order.id}_returnDays`;
    if (orderCache.current.has(cacheKey)) {
      return orderCache.current.get(cacheKey);
    }
    
    const s = normalizeStatus(order.status);
    if (!s.includes("delivered")) {
      orderCache.current.set(cacheKey, null);
      return null;
    }
    
    const deliveredMs = toMillis(order.deliveredAt) ?? toMillis(order.createdAt);
    if (!deliveredMs) {
      orderCache.current.set(cacheKey, null);
      return null;
    }
    
    const deadline = new Date(deliveredMs);
    deadline.setDate(deadline.getDate() + 8);
    const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 3600 * 24));
    const result = diff > 0 ? diff : 0;
    orderCache.current.set(cacheKey, result);
    return result;
  }, []);

  // ✅ EVENT HANDLERS
  const handleCancelClick = useCallback((order) => {
    setSelectedOrder(order);
    setCancelModalOpen(true);
  }, []);

  const handleReturnClick = useCallback((order) => {
    setSelectedOrder(order);
    setReturnModalOpen(true);
  }, []);

  const handleCancelSuccess = useCallback(() => {
    if (!selectedOrder) return;
    orderCache.current.clear();
    alert("Order cancelled successfully! Refund has been initiated.");
  }, [selectedOrder]);

  const handleReturnSuccess = useCallback(() => {
    if (!selectedOrder) return;
    orderCache.current.clear();
    alert("Return request submitted successfully! Pickup has been scheduled.");
  }, [selectedOrder]);

  // ✅ CALCULATIONS WITH CACHING
  const calculateOrderTotal = useCallback((order) => {
    const cacheKey = `${order.id}_total`;
    if (orderCache.current.has(cacheKey)) {
      return orderCache.current.get(cacheKey);
    }
    
    const parsed = Number(order?.total);
    if (!Number.isNaN(parsed)) {
      orderCache.current.set(cacheKey, parsed);
      return parsed;
    }
    
    const sum = (order.items || []).reduce((acc, it) => {
      const price = Number(it.displayPrice || it.price) || 0;
      const qty = Number(it.quantity) || 1;
      return acc + price * qty;
    }, 0);
    
    orderCache.current.set(cacheKey, sum);
    return sum;
  }, []);

  const calculateOrderSavings = useCallback((order) => {
    const cacheKey = `${order.id}_savings`;
    if (orderCache.current.has(cacheKey)) {
      return orderCache.current.get(cacheKey);
    }
    
    const parsed = Number(order?.discount);
    const result = Number.isFinite(parsed) ? parsed : 0;
    orderCache.current.set(cacheKey, result);
    return result;
  }, []);

  const toggleOrderExpand = useCallback((orderId) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
  }, []);

  // ✅ MEMOIZED COMPONENTS
  const OrderItem = memo(({ item, order, index }) => {
    const variantDetails = useMemo(() => {
      const variants = item.selectedVariants || {};
      if (Object.keys(variants).length === 0) return null;
      
      return Object.entries(variants)
        .map(([key, value]) => {
          if (item.productData?.variants?.[key]) {
            const variantOption = item.productData.variants[key].find(
              opt => opt.value === value
            );
            if (variantOption) {
              return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${variantOption.name || value}`;
            }
          }
          return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
        })
        .join(', ');
    }, [item.selectedVariants, item.productData]);

    const itemPrice = item.displayPrice || item.price || 0;
    const itemImage = item.variantImages?.[0] || item.image || "/placeholder.png";

    return (
      <motion.div
        className="order-item"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03 }}
      >
        <div className="item-image">
          <img
            src={itemImage}
            alt={item.name || "product"}
            loading="lazy"
            decoding="async"
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
                document={<Invoice order={order} user={userRef.current} />}
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
                <i className="fas fa-undo" aria-hidden="true"></i> Return or Replace
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  });

  const OrderCard = memo(({ order, expandedOrder }) => {
    const orderTotal = calculateOrderTotal(order);
    const orderSavings = calculateOrderSavings(order);
    const returnDaysRemaining = getReturnDaysRemaining(order);
    
    const itemsToShow = useMemo(() => 
      order.items?.slice(0, expandedOrder === order.id ? order.items.length : 2) || [],
      [order.items, expandedOrder, order.id]
    );

    const createdAtFormatted = useMemo(() => 
      toMillis(order.createdAt)
        ? format(new Date(toMillis(order.createdAt)), "MMM d, yyyy")
        : "Date not available",
      [order.createdAt]
    );

    const deliveryEstimate = useMemo(() => {
      if (normalizeStatus(order.status) !== "shipped") return null;
      const ms = toMillis(order.createdAt);
      if (!ms) return null;
      const date = new Date(ms);
      date.setDate(date.getDate() + 3);
      return format(date, "EEE, MMM d");
    }, [order.status, order.createdAt]);

    return (
      <motion.div
        className="order-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        layout
      >
        <div className="order-summary">
          <div className="order-meta">
            <div>
              <p className="meta-label">ORDER PLACED</p>
              <p className="meta-value">{createdAtFormatted}</p>
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

          {(orderSavings > 0 || (order.appliedCoupons?.length > 0)) && (
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
                    <span key={i} className="coupon-tag">{c.code}</span>
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
              {deliveryEstimate && (
                <p className="delivery-estimate">Expected delivery: {deliveryEstimate}</p>
              )}
            </div>
          </div>
        </div>

        <div className="order-items-container">
          {itemsToShow.map((item, index) => (
            <OrderItem
              key={`${order.id}-${item.id || index}`}
              item={item}
              order={order}
              index={index}
            />
          ))}

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
                    <i className="fas fa-chevron-down" aria-hidden="true"></i> Show all items ({order.items.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  });

  // ✅ TRACKING MODAL WITH MEMOIZED CONTENT
  const TrackingModal = memo(({ order, onClose }) => {
    const steps = useMemo(() => 
      ["Processing", "Shipped", "Out for Delivery", "Delivered"], 
      []
    );

    const calculateExpectedDelivery = useCallback(() => {
      const ms = toMillis(order.createdAt) ?? Date.now();
      const date = new Date(ms);
      date.setDate(date.getDate() + 3);
      return format(date, "EEE, MMM d");
    }, [order.createdAt]);

    const isStepCompleted = useCallback((step, currentStatus) => {
      const stepOrder = steps.map(s => normalizeStatus(s));
      const stepIdx = stepOrder.indexOf(normalizeStatus(step));
      const currentIdx = stepOrder.indexOf(normalizeStatus(currentStatus));
      return stepIdx !== -1 && currentIdx !== -1 && stepIdx <= currentIdx;
    }, [steps]);

    return (
      <div className="tracking-modal-overlay" onClick={onClose}>
        <motion.div
          className="tracking-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h2>Tracking Order #{order.id?.slice(0, 8)}</h2>
          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Estimated Delivery:</strong> {calculateExpectedDelivery()}</p>

          <div className="tracking-steps">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`step ${normalizeStatus(step) === normalizeStatus(order.status) ? "active" : ""
                  } ${isStepCompleted(step, order.status) ? "completed" : ""}`}
              >
                <div className="step-circle">{index + 1}</div>
                <div className="step-label">{step}</div>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="close-btn">Close</button>
        </motion.div>
      </div>
    );
  });

  // ✅ MAIN CONTENT - FULLY MEMOIZED
  const ordersContent = useMemo(() => (
    <div className="orders-container">
      <motion.h1
        className="orders-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Your Orders
      </motion.h1>

      {loading ? (
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        >
          <i className="fas fa-spinner" aria-hidden="true"></i>
        </motion.div>
      ) : orders.length === 0 ? (
        <motion.div
          className="empty-orders"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <i className="fas fa-box-open"></i>
          <p>You haven't placed any orders yet</p>
          <a href="/home" className="shop-btn">Start Shopping</a>
        </motion.div>
      ) : (
        <div className="orders-list">
          <AnimatePresence>
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expandedOrder={expandedOrder}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {selectedOrder && (
        <CancelOrderModal
          order={selectedOrder}
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          onCancelSuccess={handleCancelSuccess}
          currentUser={userRef.current}
        />
      )}

      {selectedOrder && (
        <ReturnOrderModal
          order={selectedOrder}
          isOpen={returnModalOpen}
          onClose={() => setReturnModalOpen(false)}
          onReturnSuccess={handleReturnSuccess}
          currentUser={userRef.current}
        />
      )}

      {showTrackingModal && trackingOrder && (
        <TrackingModal
          order={trackingOrder}
          onClose={() => setShowTrackingModal(false)}
        />
      )}
    </div>
  ), [
    loading, orders, expandedOrder, selectedOrder, cancelModalOpen,
    returnModalOpen, showTrackingModal, trackingOrder,
    handleCancelSuccess, handleReturnSuccess
  ]);

  // ✅ ULTRA-FAST RENDER PATH
  if (isMobile) {
    return <MobileLayout>{ordersContent}</MobileLayout>;
  }

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