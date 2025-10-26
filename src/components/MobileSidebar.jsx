// components/MobileSidebar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase-config';
import { signOut } from 'firebase/auth';

function MobileSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-sidebar-overlay" onClick={onClose}></div>
      <div className="mobile-sidebar">
        <div className="mobile-sidebar-header">
          <div className="sidebar-user">
            <i className="fas fa-user"></i>
            <span>Hello, {user?.email || 'Sign in'}</span>
          </div>
          <button className="sidebar-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="mobile-sidebar-content">
          <div className="sidebar-section">
            <h3>Digital Content & Devices</h3>
            <a href="/prime">Amazon Prime</a>
            <a href="/music">Amazon Music</a>
            <a href="/video">Prime Video</a>
          </div>

          <div className="sidebar-section">
            <h3>Shop By Category</h3>
            <a href="/electronics">Electronics</a>
            <a href="/clothing">Clothing</a>
            <a href="/home">Home & Kitchen</a>
            <a href="/beauty">Beauty & Personal Care</a>
          </div>

          <div className="sidebar-section">
            <h3>Programs & Features</h3>
            <a href="/deals">Today's Deals</a>
            <a href="/sell">Sell</a>
            <a href="/gift-cards">Gift Cards</a>
          </div>

          <div className="sidebar-section">
            <h3>Help & Settings</h3>
            <a href="/help">Help</a>
            <a href="/contact">Contact Us</a>
            {user ? (
              <button onClick={handleLogout} className="sidebar-logout">
                Sign Out
              </button>
            ) : (
              <a href="/login">Sign In</a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default MobileSidebar;