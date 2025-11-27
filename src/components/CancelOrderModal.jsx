// src/components/CancelOrderModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { sendCancellationEmail } from '../utils/emailService';
import './CancelOrderModal.css';

const CancelOrderModal = ({ order, isOpen, onClose, onCancelSuccess, currentUser }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: ''
  });

  const cancellationReasons = [
    'I ordered the wrong product/size/color',
    'I found a better price elsewhere',
    'The delivery time is too long',
    'I changed my mind',
    'Shipping cost is too high',
    'Other'
  ];

  // Check if order was Cash on Delivery
  const isCashOnDelivery = order.paymentMethod?.toLowerCase().includes('cash') || 
                          order.paymentMethod?.toLowerCase().includes('cod') ||
                          !order.paymentMethod;

  const handleCancelOrder = async () => {
    if (!selectedReason) {
      alert('Please select a cancellation reason');
      return;
    }

    if (isCashOnDelivery && (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolder)) {
      alert('Please provide your bank account details for refund');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderRef = doc(db, 'orders', order.id);
      const cancellationData = {
        type: 'full',
        reason: selectedReason === 'Other' ? customReason : selectedReason,
        cancelledAt: new Date().toISOString(), // Use client timestamp instead of serverTimestamp
        items: order.items,
        refundAmount: order.total,
        paymentMethod: order.paymentMethod,
        bankDetails: isCashOnDelivery ? bankDetails : null
      };

      // Update order status
      await updateDoc(orderRef, {
        status: 'Cancelled',
        cancellationReason: selectedReason === 'Other' ? customReason : selectedReason,
        cancelledAt: serverTimestamp(), // This is fine here
        updatedAt: serverTimestamp(),
        refundStatus: isCashOnDelivery ? 'pending_bank_details' : 'processing'
      });

      // Add to cancellation history - use client timestamp for array
      await updateDoc(orderRef, {
        cancellationHistory: arrayUnion({
          ...cancellationData,
          // Don't include serverTimestamp() in arrayUnion
        })
      });

      // Create cancellation record
      await addDoc(collection(db, 'cancellations'), {
        orderId: order.id,
        userId: order.userId,
        ...cancellationData,
        createdAt: serverTimestamp() // This is fine here (not in array)
      });

      // Send cancellation email
      if (currentUser?.email) {
        await sendCancellationEmail(currentUser.email, order, cancellationData);
      }

      onCancelSuccess();
      onClose();
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="cancel-order-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <div className="modal-header">
          <h2>Cancel Order</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ordercancel-modal-content">
          <p className="order-info">Order # {order.id.slice(0, 8)}</p>
          
          <div className="cancellation-reasons">
            <h4>Why are you cancelling this order?</h4>
            {cancellationReasons.map((reason, index) => (
              <label key={index} className="reason-option">
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
                <span className="checkmark"></span>
                {reason}
              </label>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <div className="custom-reason">
              <textarea
                placeholder="Please specify your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows="3"
              />
            </div>
          )}

          {/* Bank Details for Cash on Delivery */}
          {isCashOnDelivery && (
            <div className="bank-details-section">
              <h4>Bank Account Details for Refund</h4>
              <p className="bank-info-note">
                Since you paid via Cash on Delivery, please provide your bank details for refund processing.
              </p>
              
              <div className="bank-form">
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    value={bankDetails.accountHolder}
                    onChange={(e) => setBankDetails(prev => ({...prev, accountHolder: e.target.value}))}
                    placeholder="Enter account holder name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails(prev => ({...prev, accountNumber: e.target.value}))}
                    placeholder="Enter account number"
                  />
                </div>
                
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails(prev => ({...prev, ifscCode: e.target.value.toUpperCase()}))}
                    placeholder="Enter IFSC code"
                    style={{textTransform: 'uppercase'}}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="refund-info">
            <i className="fas fa-info-circle"></i>
            <span>
              {isCashOnDelivery 
                ? `Your refund of ₹${order.total} will be processed to your bank account within 5-7 business days after verification.`
                : `Your refund of ₹${order.total} will be processed to your original payment method within 3-7 business days.`
              }
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Go Back
          </button>
          <button 
            className="btn-primary cancel-btn"
            onClick={handleCancelOrder}
            disabled={isSubmitting || !selectedReason || 
              (isCashOnDelivery && (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolder))}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CancelOrderModal;