// src/pages/YourAccount.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase-config";
import "../home.css";
import "../styles/youraccount.css";

function YourAccount() {
  const navigate = useNavigate();

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
      title: "Payment Methods",
      description: "Add or manage your saved cards",
      action: () => navigate("/payment-methods"),
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
      title: "Login & Security",
      description: "View login history or log out of all devices",
      action: () => navigate("/security"),
    },
    {
      title: "Theme Preferences",
      description: "Customize appearance and theme",
      action: () => navigate("/theme-settings"),
    },
    {
      title: "Refer & Earn",
      description: "Invite friends and earn rewards",
      action: () => navigate("/refer"),
    },
    {
      title: "Recently Viewed",
      description: "See your recently viewed items",
      action: () => navigate("/recently-viewed"),
    },
    {
      title: "Help & Support",
      description: "Contact us or visit FAQs",
      action: () => navigate("/contact"),
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

  return (
    <div className="your-account-container">
      {/* Top Navbar */}
     <div className="top-navbar">
  <div className="logo">
    <a href="/home">
      <img id="siteLogo" src="dark mode .png" alt="Logo" />
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
      <span id="cart-count">2</span> {/* You can replace with dynamic count */}
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

      </div>
    </div>
  );
}

export default YourAccount;
