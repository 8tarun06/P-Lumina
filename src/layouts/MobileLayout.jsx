// src/layouts/MobileLayout.jsx - Updated version with scroll prevention
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import SearchOverlay from "../components/SearchOverlay";
import {db, auth } from "../firebase-config";
import { doc, getDoc } from "firebase/firestore";


function MobileTopBar({ cartCount, onSearchOpen, onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");


  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.location.reload();
    } else {
      navigate("/home");
    }
  };

  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.name || "User");
        localStorage.setItem("userName", data.name);
      }
    } else {
      setUserName("");
      localStorage.removeItem("userName");
    }
  });

  return () => unsubscribe();
}, []);


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
          <img src="dark mode .png" alt="Logo" style={{ height: 34 }} />
        </div>

        <button
          className="mobile-search-btn"
          aria-label="Search"
          onClick={onSearchOpen}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>

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
        onClick={() => navigate("/home")} 
        className={`mobile-bottom-btn ${location.pathname === "/home" ? "active" : ""}`} 
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

// Mobile Sidebar Component (same structure as desktop Sidebar.jsx)
function MobileSidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="mobile-menu-overlay" onClick={onClose} />
      )}
      
      {/* Sidebar Drawer */}
      <div className={`mobile-drawer ${isOpen ? "open" : ""}`}>
        <button className="close-drawer" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="drawer-content">
          {/* User Profile Section */}
          <div className="mobile-user-profile">
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="user-info">
              <h3>Welcome</h3>
              <p>{localStorage.getItem("userName") || "Guest"}</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <ul className="mobile-sidebar-menu">
            <li>
              <Link to="/account" onClick={onClose}>
                <i className="fas fa-user-circle"></i>
                <span>Your Account</span>
              </Link>
            </li>
            <li>
              <Link to="/orders" onClick={onClose}>
                <i className="fas fa-box"></i>
                <span>Your Orders</span>
              </Link>
            </li>
            <li>
              <Link to="/addresses" onClick={onClose}>
                <i className="fas fa-map-marker-alt"></i>
                <span>Addresses</span>
              </Link>
            </li>
            <li>
              <Link to="/wishlist" onClick={onClose}>
                <i className="fas fa-heart"></i>
                <span>Your Wishlist</span>
              </Link>
            </li>
            <li>
              <Link to="/categories" onClick={onClose}>
                <i className="fas fa-th-large"></i>
                <span>Categories</span>
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={onClose}>
                <i className="fas fa-info-circle"></i>
                <span>About Us</span>
              </Link>
            </li>
            <li>
              <Link to="/contact" onClick={onClose}>
                <i className="fas fa-envelope"></i>
                <span>Contact Us</span>
              </Link>
            </li>
          </ul>

          {/* Social Media Section */}
          <div className="mobile-social-section">
            <h4 className="mobile-social-title">Keep In Touch With Us</h4>
            <div className="mobile-social-icons">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="mobile-social-btn fb">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="mobile-social-btn tw">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="mobile-social-btn yt">
                <i className="fab fa-youtube"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="mobile-social-btn ig">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              localStorage.removeItem("userEmail");
              auth.signOut().then(() => {
                window.location.href = "/login";
              });
              onClose();
            }}
            className="mobile-logout-btn"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>

          {/* Footer */}
          <div className="mobile-sidebar-footer">
            <span className="theme">Princyy</span> @All Rights Reserved
          </div>
        </div>
      </div>
    </>
  );
}

// Quick Categories Section for Home Page
function QuickCategoriesSection({ onCategorySelect, currentCategory }) {
  const categories = [
    { id: "all", name: "All Products", icon: "shopping-bag" },
    { id: "electronics", name: "Electronics", icon: "mobile-alt" },
    { id: "clothing", name: "Clothing", icon: "tshirt" },
    { id: "home", name: "Home", icon: "home" },
    { id: "beauty", name: "Beauty", icon: "spa" },
  ];

  return (
    <div className="mobile-category-quick-access">
      <div className="mobile-category-scroll">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`mobile-category-item ${currentCategory === category.id ? "active" : ""}`}
            onClick={() => onCategorySelect(category.id)}
          >
            <i className={`fas fa-${category.icon}`}></i>
            <span>{category.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MobileLayout({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get selected category from URL parameters
  const getUrlParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      category: searchParams.get('category') || 'all',
      sort: searchParams.get('sort') || 'featured'
    };
  };

  const { category: urlCategory, sort: urlSort } = getUrlParams();

  // Prevent body scrolling when sidebar is open
  useEffect(() => {
    if (isMenuOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      const body = document.body;
      
      // Prevent scrolling
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      
      // Add class to body
      body.classList.add('mobile-drawer-open');
      
      return () => {
        // Restore scrolling
        body.style.position = '';
        body.style.top = '';
        body.style.width = '';
        body.classList.remove('mobile-drawer-open');
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMenuOpen]);

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

    // fallback polling
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
    setIsMenuOpen(prev => !prev);
  };

  // Function to navigate with query parameters
  const navigateWithParams = (category = urlCategory, sort = urlSort) => {
    const params = new URLSearchParams();
    
    if (category && category !== 'all') {
      params.set('category', category);
    }
    
    if (sort && sort !== 'featured') {
      params.set('sort', sort);
    }
    
    const queryString = params.toString();
    navigate(`/home${queryString ? `?${queryString}` : ''}`);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId) => {
    navigateWithParams(categoryId, urlSort);
  };

  // Handle sort option change
  const handleSortChange = (sortOption) => {
    navigateWithParams(urlCategory, sortOption);
  };

  // Check if we're on home page to show quick categories
  const isHomePage = location.pathname === "/home" || location.pathname === "/";

  return (
    <div className={`mobile-layout-wrapper ${isMenuOpen ? 'menu-open' : ''}`}>
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

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />

      <div className="mobile-layout-content">
        {/* Quick Categories on Home Page */}

        {/* Filter and Sort Section for Product Pages */}


        {children}
      </div>

      <MobileBottomNav />
    </div>
  );
}