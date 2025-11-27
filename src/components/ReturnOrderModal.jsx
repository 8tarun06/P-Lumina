// src/components/ReturnOrderModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { sendReturnEmail, sendReplacementEmail } from '../utils/emailService';
import './ReturnOrderModal.css';

const ReturnOrderModal = ({ order, isOpen, onClose, onReturnSuccess, currentUser }) => {
  const [selectedItems, setSelectedItems] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [resolutionType, setResolutionType] = useState('refund');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolder: ''
  });

  const returnReasons = [
    'Size Issue - Too big',
    'Size Issue - Too small',
    'Quality Issue - Damaged',
    'Quality Issue - Defective',
    'Not as described',
    'Wrong item shipped',
    'Item not needed',
    'Changed my mind'
  ];

  // Check if order was Cash on Delivery
  const isCashOnDelivery = order.paymentMethod?.toLowerCase().includes('cash') || 
                          order.paymentMethod?.toLowerCase().includes('cod') ||
                          !order.paymentMethod;

  // Get next available pickup dates
  const getAvailablePickupDates = () => {
    const dates = [];
    const today = new Date();
    
    // Generate next 3 available dates (excluding today)
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip Sundays (0) - you can modify this logic as needed
      if (date.getDay() !== 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('en-IN', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          })
        });
      }
    }
    
    return dates;
  };

  const availablePickupDates = getAvailablePickupDates();
  const [selectedPickupDate, setSelectedPickupDate] = useState(availablePickupDates[0]?.date || '');

  const handleItemSelection = (itemId, checked) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const calculateReturnAmount = () => {
    return order.items
      .filter(item => selectedItems[item.id || item.name])
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleSubmitReturn = async () => {
    if (Object.values(selectedItems).filter(Boolean).length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    if (!returnReason) {
      alert('Please select a return reason');
      return;
    }

    if (!selectedPickupDate) {
      alert('Please select a pickup date');
      return;
    }

    if (resolutionType === 'refund' && isCashOnDelivery && 
        (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolder)) {
      alert('Please provide your bank account details for refund');
      return;
    }

    setIsSubmitting(true);

    try {
      const returnItems = order.items.filter(item => selectedItems[item.id || item.name]);
      const returnData = {
        orderId: order.id,
        userId: order.userId,
        items: returnItems,
        reason: returnReason,
        resolution: resolutionType,
        returnAmount: calculateReturnAmount(),
        pickupDate: selectedPickupDate,
        status: 'return_requested',
        paymentMethod: order.paymentMethod,
        bankDetails: (resolutionType === 'refund' && isCashOnDelivery) ? bankDetails : null,
        createdAt: new Date().toISOString() // Use client timestamp
      };

      // Create return request
      const returnRef = await addDoc(collection(db, 'returns'), {
        ...returnData,
        createdAt: serverTimestamp() // This is fine here (not in array)
      });

      // Update order status
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        returnStatus: 'return_requested',
        returnRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        returnHistory: arrayUnion({
          returnId: returnRef.id,
          ...returnData
          // Don't include serverTimestamp() in arrayUnion
        })
      });

      // Send appropriate email based on resolution type
      if (currentUser?.email) {
        if (resolutionType === 'refund') {
          await sendReturnEmail(currentUser.email, order, returnData);
        } else {
          await sendReplacementEmail(currentUser.email, order, returnData);
        }
      }

      onReturnSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating return request:', error);
      alert('Failed to create return request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQualityIssue = returnReason.includes('Quality') || 
                        returnReason.includes('Damaged') || 
                        returnReason.includes('Defective') || 
                        returnReason.includes('Wrong item');

  const isSizeIssue = returnReason.includes('Size Issue');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="return-order-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <div className="modal-header">
          <h2>Return or Replace Items</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="returnorder-modal-content">
          {/* Step 1: Select Items */}
          <div className="return-step">
            <h4>Select Items to Return</h4>
            <div className="items-list">
              {order.items.map((item, index) => (
                <label key={index} className="item-option">
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.id || item.name]}
                    onChange={(e) => handleItemSelection(item.id || item.name, e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">₹{item.price} × {item.quantity}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Step 2: Select Reason */}
          <div className="return-step">
            <h4>Why are you returning this?</h4>
            <div className="reason-options">
              {returnReasons.map((reason, index) => (
                <label key={index} className="reason-option">
                  <input
                    type="radio"
                    name="returnReason"
                    value={reason}
                    checked={returnReason === reason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                  <span className="checkmark"></span>
                  {reason}
                </label>
              ))}
            </div>
          </div>

          {/* Step 3: Choose Resolution */}
          <div className="return-step">
            <h4>What would you like to do?</h4>
            <div className="resolution-options">
              <label className="resolution-option">
                <input
                  type="radio"
                  name="resolution"
                  value="refund"
                  checked={resolutionType === 'refund'}
                  onChange={(e) => setResolutionType(e.target.value)}
                />
                <span className="checkmark"></span>
                <div>
                  <strong>Refund</strong>
                  <span>Get your money back</span>
                </div>
              </label>
              
              {/* Show replacement option for size issues and non-quality issues */}
              {!isQualityIssue && (isSizeIssue || returnReason.includes('Wrong item')) && (
                <label className="resolution-option">
                  <input
                    type="radio"
                    name="resolution"
                    value="replace"
                    checked={resolutionType === 'replace'}
                    onChange={(e) => setResolutionType(e.target.value)}
                  />
                  <span className="checkmark"></span>
                  <div>
                    <strong>Hassle-Free Replacement</strong>
                    <span>Get the correct size/color/item</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Step 4: Pickup Schedule */}
          <div className="return-step">
            <h4>Schedule Pickup</h4>
            <div className="pickup-schedule">
              <label>
                Available Pickup Dates:
                <select
                  value={selectedPickupDate}
                  onChange={(e) => setSelectedPickupDate(e.target.value)}
                >
                  <option value="">Select a date</option>
                  {availablePickupDates.map((dateObj, index) => (
                    <option key={index} value={dateObj.date}>
                      {dateObj.display}
                    </option>
                  ))}
                </select>
              </label>
              <div className="pickup-info">
                <i className="fas fa-info-circle"></i>
                <span>
                  Our delivery agent will collect the product on the selected date between 9 AM - 7 PM. 
                  Please keep the product in original condition with tags and invoice.
                </span>
              </div>
            </div>
          </div>

          {/* Bank Details for Cash on Delivery - Only show for refund option */}
          {resolutionType === 'refund' && isCashOnDelivery && (
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

          {/* Return Summary */}
          <div className="return-summary">
            <h4>Return Summary</h4>
            <div className="summary-details">
              <p>Items to return: {Object.values(selectedItems).filter(Boolean).length}</p>
              <p>Resolution: {resolutionType === 'refund' ? 'Refund' : 'Replacement'}</p>
              {resolutionType === 'refund' && (
                <p>Refund Amount: ₹{calculateReturnAmount()}</p>
              )}
              {selectedPickupDate && (
                <p>Pickup Date: {availablePickupDates.find(d => d.date === selectedPickupDate)?.display}</p>
              )}
            </div>
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
            className="btn-primary return-btn"
            onClick={handleSubmitReturn}
            disabled={isSubmitting || !returnReason || 
              Object.values(selectedItems).filter(Boolean).length === 0 ||
              !selectedPickupDate ||
              (resolutionType === 'refund' && isCashOnDelivery && 
               (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolder))}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Processing...
              </>
            ) : (
              'Submit Return Request'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReturnOrderModal;