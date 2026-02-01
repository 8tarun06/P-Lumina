// components/auth/CompleteProfile.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase-config';
import { motion } from 'framer-motion';
import { FiPhone, FiUser, FiArrowRight } from 'react-icons/fi';
import './AuthStyles.css';

const CompleteProfile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { uid, name, email } = location.state || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!uid || !phone) return;
    
    setLoading(true);
    
    try {
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        phone,
        addresses: [],
        createdAt: serverTimestamp(),
        provider: 'google'
      });
      
      navigate('/home');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!uid) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Invalid Access</h2>
          <p>Please sign up first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="logo-section">
          <div className="logo-circle">
            <span className="logo-text">✓</span>
          </div>
          <h1 className="brand-name">Almost There!</h1>
          <p className="brand-tagline">Complete your profile</p>
        </div>

        <div className="user-info">
          <div className="info-item">
            <FiUser />
            <span>{name}</span>
          </div>
          <div className="info-item">
            <FiMail />
            <span>{email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <div className="input-group">
              <FiPhone className="input-icon" />
              <input
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="auth-input"
              />
            </div>
            <p className="helper-text">
              We'll use this for order updates and notifications
            </p>
          </div>

          <motion.button
            type="submit"
            className="submit-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Complete Profile'}
            {!loading && <FiArrowRight style={{ marginLeft: '8px' }} />}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;