// src/layouts/MobileLayout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SearchOverlay from "../components/SearchOverlay";

function MobileTopBar({ cartCount, onSearchOpen, onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const mainSearchInput = document.querySelector('.search-input-wrapper input, .mobile-search-input, input[type="search"]');
    if (mainSearchInput && mainSearchInput.value !== query) {
      setQuery(mainSearchInput.value || "");
    }
  }, [location.pathname]);

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.location.reload();
    } else {
      navigate("/");
    }
  };

  return (
    <header className="mobile-amazon-topbar" role="banner">
      <div className="mobile-top-left">
        <button
          className="mobile-menu-toggle"
          aria-label="Open menu"
          onClick={onMenuToggle}
        >
          <i className="fas fa-bars"></i>
        </button>

        <div className="mobile-logo" onClick={handleLogoClick}>
          <img src="/dark mode .png" alt="Logo" style={{ height: 34 }} />
        </div>

        <button
          className="mobile-search-btn"
          aria-label="Search"
          onClick={onSearchOpen}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>

      {/* Note: removed GlobalSearch here by design — overlay will be used */}
      {location.pathname === "/cart" && (
        <div className="mobile-cart-title">
          <h2>Shopping Cart ({cartCount})</h2>
        </div>
      )}

      <div className="mobile-top-right">
        <button
          className="mobile-cart-btn"
          aria-label="Open cart"
          onClick={() => navigate("/cart")}
        >
          <i className="fas fa-shopping-cart"></i>
          {cartCount > 0 && <span className="mobile-cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile Navigation">
      <button 
        onClick={() => navigate("/")} 
        className={`mobile-bottom-btn ${location.pathname === "/" ? "active" : ""}`} 
        aria-label="Home"
      >
        <i className="fas fa-home"></i>
        <span>Home</span>
      </button>
      <button 
        onClick={() => navigate("/categories")} 
        className={`mobile-bottom-btn ${location.pathname === "/categories" ? "active" : ""}`} 
        aria-label="Categories"
      >
        <i className="fas fa-th-large"></i>
        <span>Categories</span>
      </button>
      <button 
        onClick={() => navigate("/wishlist")} 
        className={`mobile-bottom-btn ${location.pathname === "/wishlist" ? "active" : ""}`} 
        aria-label="Wishlist"
      >
        <i className="fas fa-heart"></i>
        <span>Wishlist</span>
      </button>
      <button 
        onClick={() => navigate("/account")} 
        className={`mobile-bottom-btn ${location.pathname === "/account" ? "active" : ""}`} 
        aria-label="Account"
      >
        <i className="fas fa-user"></i>
        <span>Account</span>
      </button>
    </nav>
  );
}

export default function MobileLayout({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  useEffect(() => {
    const readCart = () => {
      try {
        const el = document.querySelector("#cart-count");
        const parsed = el ? parseInt(el.textContent || "0", 10) : 0;
        setCartCount(isNaN(parsed) ? 0 : parsed);
      } catch (error) {
        console.log('Cart count read error:', error);
        setCartCount(0);
      }
    };

    // initial read
    readCart();

    // watch for DOM changes to update cartCount
    const observer = new MutationObserver(readCart);
    const target = document.querySelector("#cart-count");
    if (target) {
      observer.observe(target, { 
        childList: true, 
        subtree: true,
        characterData: true 
      });
    }

    // fallback polling with error handling
    const interval = setInterval(readCart, 1500);

    return () => {
      if (observer) observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const openSearchOverlay = () => {
    setIsMobileSearchActive(true);
  };

  const handleMenuToggle = () => {
    try {
      // Find and click the working hamburger menu
      const workingMenuBtn = document.querySelector(".mobile-menu-toggle:not(.mobile-amazon-topbar .mobile-menu-toggle)");
      if (workingMenuBtn) {
        workingMenuBtn.click();
      }
    } catch (error) {
      console.log('Menu toggle error:', error);
    }
  };

  return (
    <div className="mobile-layout-wrapper">
      <MobileTopBar 
        cartCount={cartCount} 
        onSearchOpen={openSearchOverlay} 
        onMenuToggle={handleMenuToggle} 
      />

      {isMobileSearchActive && (
        <SearchOverlay
          isOpen={isMobileSearchActive}
          onClose={() => setIsMobileSearchActive(false)}
        />
      )}

      <div className="mobile-layout-content">
        {children}
      </div>

      <MobileBottomNav />
    </div>
  );
}
