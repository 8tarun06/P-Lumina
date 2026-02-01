// src/pages/YourAccount.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import "../home.css";
import "../styles/youraccount.css";
import MobileLayout from "../layouts/MobileLayout";

function YourAccount() {
  const navigate = useNavigate();
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

  const tiles = [
    {
      title: "Your Orders",
      description: "Track, return, or buy things again",
      action: () => navigate("/orders"),
    },
    {
      title: "Your Addresses",
      description: "Edit or add your delivery addresses",
      action: () => navigate("/addresses"),
    },
    {
      title: "Your Wishlist",
      description: "View and manage your wishlist items",
      action: () => navigate("/wishlist"),
    },
    {
      title: "Profile Settings",
      description: "Update your name, email, or password",
      action: () => navigate("/profile-settings"),
    },
    {
      title: "Help & Support",
      description: "Contact us or visit FAQs",
      action: () => navigate("/contact"),
    },
      {
      title: "About Us",
      description: "About Our Legacy",
      action: () => navigate("/about"),
    },
    {
      title: "Logout",
      description: "Sign out from your account",
      action: () => {
        localStorage.removeItem("isLoggedIn");
        auth.signOut().then(() => navigate("/login"));
      },
    },
  ];

  // Main content
  const accountContent = (
    <section className="account-tiles">
      <h2>Your Account</h2>
      <div className="tiles-grid">
        {tiles.map((tile, idx) => (
          <div key={idx} className="tile-card" onClick={tile.action}>
            <h4>{tile.title}</h4>
            <p>{tile.description}</p>
          </div>
        ))}
      </div>
    </section>
  );

  // If mobile, use MobileLayout
  if (isMobile) {
    return (
      <MobileLayout>
        {accountContent}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <div className="your-account-container">
      {/* Top Navbar */}
      <div className="top-navbar">
        <div className="logo">
          <a href="/home">
            <img id="siteLogo" src="Vyraa Logo.jpeg" alt="Logo" />
          </a>
        </div>

        <div className="search-bar-container">
          <button className="search-icon" onClick={() => {}}>
            <img src="/public/search.png" alt="Search" className="search-icon-img" />
          </button>

          <div className="search-input-wrapper">
            <div className="search-input-inner">
              <input type="text" placeholder="Search Products" />
              <button className="mic-icon">
                <img src="/public/mic.png" alt="Mic" className="mic-icon-img" />
              </button>
            </div>
          </div>
        </div>

        <div className="wishlist-btn" title="Go to Wishlist">
          <a href="/wishlist">
            <i className="fas fa-heart"></i>
          </a>
        </div>

        <div className="cart-icon-wrapper">
          <a href="/cart" className="cart-link">
            <i className="fas fa-shopping-cart"></i>
            <span id="cart-count">2</span>
          </a>
        </div>
      </div>

      {/* Sidebar + Tiles Section */}
      <div className="layout">
        <aside className="sidebar">
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

        {accountContent}
      </div>
    </div>
  );
}

export default YourAccount;