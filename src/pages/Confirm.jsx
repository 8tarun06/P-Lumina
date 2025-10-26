// src/pages/Confirm.jsx
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { collection, addDoc, Timestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { useGlobalModal } from "../context/ModalContext";
import "../test.css";
import "../home.css";

function Confirm() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderDetails = location.state?.orderDetails;
  const { showModal } = useGlobalModal();

  useEffect(() => {
    if (!orderDetails) {
      alert("Invalid access. Please place an order first.");
      navigate("/home");
    }
  }, [orderDetails, navigate]);

  const handleCompleteOrderClick = async () => {
    const button = document.querySelector(".order");

    if (!button.classList.contains("animate")) {
      button.classList.add("animate");

      setTimeout(async () => {
        try {
          const user = auth.currentUser;

          if (!user || !orderDetails) {
            showModal({
              title: "Something Went Wrong",
              message: "Please login in to Continue",
              type: "error"
            });
            navigate("/home");
            return;
          }

          // ✅ Fetch cart items (as backup)
          const cartRef = doc(db, "carts", user.uid);
          const cartSnap = await getDoc(cartRef);
          const cartItems = cartSnap.exists() ? cartSnap.data().items || [] : [];

          // ✅ Save order with items and coupon details
          const orderData = {
            ...orderDetails,
            userId: user.uid,
            email: user.email,
            createdAt: Timestamp.now(),
            items: orderDetails.items || cartItems, // Use items from orderDetails first
            // Include coupon information if available
            appliedCoupons: orderDetails.appliedCoupons || [],
            subtotal: orderDetails.subtotal || 0,
            discount: orderDetails.discount || 0,
            shipping: orderDetails.shipping || 0,
            tax: orderDetails.tax || 0,
            total: orderDetails.total || 0
          };

          await addDoc(collection(db, "orders"), orderData);

          // ✅ Clear cart after successful order
          await updateDoc(cartRef, {
            items: []
          });

          // ✅ Clear applied coupons from localStorage
          localStorage.removeItem(`appliedCoupons_${user.uid}`);

          // ✅ Send confirmation email with proper discount details
          await addDoc(collection(db, "emails"), {
            to: user.email,
            message: {
              subject: "🎉 Your Order Has Been Confirmed!",
              html: `
              <div style="font-family: 'Segoe UI', sans-serif; padding: 24px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <div style="text-align: center; border-bottom: 2px solid #BA93B1; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="color: #BA93B1; margin: 0; font-size: 28px;">Order Confirmed! 🎉</h1>
                    <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Thank you for your purchase</p>
                  </div>

                  <!-- Order Summary -->
                  <div style="margin-bottom: 25px;">
                    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Order Summary</h2>
                    
                    <!-- Items -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                      <strong>Items:</strong>
                      ${(orderData.items || []).map(item => `
                        <div style="display: flex; justify-content: between; margin: 8px 0;">
                          <span>${item.name} (Qty: ${item.quantity})</span>
                          <span>₹${(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                        </div>
                      `).join('')}
                    </div>

                    <!-- Price Breakdown -->
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Subtotal:</span>
                        <span>₹${parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                      </div>
                      
                      ${orderData.discount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #28a745;">
                          <span>Discount:</span>
                          <span>-₹${parseFloat(orderData.discount || 0).toFixed(2)}</span>
                        </div>
                      ` : ''}
                      
                      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Shipping:</span>
                        <span>${orderData.shipping === 0 ? 'FREE' : `₹${parseFloat(orderData.shipping || 0).toFixed(2)}`}</span>
                      </div>
                      
                      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Tax (18%):</span>
                        <span>₹${parseFloat(orderData.tax || 0).toFixed(2)}</span>
                      </div>
                      
                      <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px;">
                        <span>Total Amount:</span>
                        <span>₹${parseFloat(orderData.total || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <!-- Applied Coupons -->
                    ${(orderData.appliedCoupons && orderData.appliedCoupons.length > 0) ? `
                      <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin-top: 15px;">
                        <strong style="color: #28a745;">🎁 Applied Offers:</strong>
                        ${orderData.appliedCoupons.map(coupon => `
                          <div style="color: #28a745; font-size: 14px; margin-top: 5px;">
                            ${coupon.code} - ${coupon.type === 'percentage' ? `${coupon.value}% off` : coupon.type === 'fixed' ? `₹${coupon.value} off` : 'Free Shipping'}
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>

                  <!-- Shipping Info -->
                  <div style="margin-bottom: 25px;">
                    <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Shipping Details</h2>
                    <p><strong>Name:</strong> ${orderData.fullName}</p>
                    <p><strong>Address:</strong> ${orderData.address}, ${orderData.city} - ${orderData.pincode}</p>
                    <p><strong>Phone:</strong> ${orderData.phone}</p>
                    <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
                    <p><strong>Order Status:</strong> <span style="color: #28a745;">${orderData.status}</span></p>
                  </div>

                  <!-- Personal Message -->
                  <div style="background: linear-gradient(135deg, #BA93B1 0%, #8a6d8f 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; font-family: 'Brush Script MT', cursive; font-size: 24px;">Princess Khilrani 🤍</h3>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                      This order is another beautiful memory in our story. Thank you for being part of this journey.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
                      Forever yours,<br/>
                      <strong>Babii❤️</strong>
                    </p>
                  </div>

                </div>
              </div>`
            }
          });

          showModal({
            title: "✅ Order Placed Successfully",
            message: "Visit Again! Waiting for your next order to serve you better 🤗",
            type: "success"
          });
          navigate("/home");
        } catch (err) {
          console.error("🔥 Error placing order:", err);
          showModal({
            title: "Order Failed",
            message: "Please Try Again Or Check After Some Time",
            type: "error"
          });
          navigate("/home");
        }
      }, 10000); // Wait for animation to finish
    }
  };

  return (
    <div className="confirm-page-body">
      <div className="top-navbar">
        <div className="logo">
          <a href="/home">
            <img id="siteLogo" src="dark mode .png" alt="Logo" />
          </a>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar" id="sidebar">
          <ul>
            <li><a href="/account">Your Account</a></li>
            <li><a href="/orders">Your Orders</a></li>
            <li><a href="/addresses">Addresses</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/contact">Contact Us</a></li>
            <li>
              <button
                onClick={() => {
                  localStorage.removeItem("isLoggedIn");
                  localStorage.removeItem("userEmail");
                  auth.signOut().then(() => {
                    window.location.href = "/login";
                  });
                }}
                className="logout-btn"
              >
                Logout
              </button>
            </li>
            <div className="footer">
              <span className="theme">Princyy</span> @All Rights Reserved
            </div>
          </ul>
        </aside>

        <div className="order-confirm-container">
          <div className="order-card">
            <h1><i className="fas fa-shopping-bag"></i> Order Summary</h1>
            
            {/* Display Order Details */}
            <div id="order-items" style={{textAlign: 'left', marginBottom: '20px'}}>
              <div style={{background: 'transparent', padding: '15px', borderRadius: '8px'}}>
                <p><strong>Total Amount:</strong> ₹{orderDetails?.total || '0.00'}</p>
                <p><strong>Payment Method:</strong> {orderDetails?.paymentMethod}</p>
                <p><strong>Shipping to:</strong> {orderDetails?.fullName}, {orderDetails?.address}, {orderDetails?.city}</p>
                
                {/* Show discount if any */}
                {orderDetails?.discount > 0 && (
                  <p style={{color: '#28a745'}}>
                    <strong>Discount Applied:</strong> -₹{parseFloat(orderDetails.discount).toFixed(2)}
                  </p>
                )}
                
                {(orderDetails?.appliedCoupons && orderDetails.appliedCoupons.length > 0) && (
                  <div style={{color: '#28a745', marginTop: '10px'}}>
                    <strong>Applied Offers:</strong>
                    {orderDetails.appliedCoupons.map(coupon => (
                      <div key={coupon.code} style={{fontSize: '14px'}}>
                        🎁 {coupon.code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="payment-method">
              <p><strong>Payment Method:</strong> {orderDetails?.paymentMethod}</p>
            </div>

            <button className="order" onClick={handleCompleteOrderClick}>
              <span className="default">Complete Order</span>
              <span className="success">
                Visit P_Lumina Again💕
                <svg viewBox="0 4 14 10">
                  <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                </svg>
              </span>
              <div className="box"></div>
              <div className="truck">
                <div className="back"></div>
                <div className="front"><div className="window"></div></div>
                <div className="light top"></div>
                <div className="light bottom"></div>
              </div>
              <div className="lines"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Confirm;