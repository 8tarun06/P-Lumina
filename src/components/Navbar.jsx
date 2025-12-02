import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase-config";
import "../home.css";

function Navbar({ 
  cartCount, 
  isMobile, 
  isMobileMenuOpen, 
  toggleMobileMenu, 
  isMobileSearchActive, 
  setIsMobileSearchActive,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  handleSearchIconClick,
  startVoiceInput,
  closeMobileSearch 
}) {
  const [searchActive, setSearchActive] = useState(false);

  // Expose search functionality to mobile layout
  useEffect(() => {
    window.__SET_SEARCH_TERM__ = setSearchTerm;
    window.__PERFORM_SEARCH__ = (term) => {
      setSearchTerm(term);
      // Trigger your search logic here
      if (window.performProductSearch) {
        window.performProductSearch(term);
      }
    };
    
    return () => {
      delete window.__SET_SEARCH_TERM__;
      delete window.__PERFORM_SEARCH__;
    };
  }, [setSearchTerm]);

  const handleSearchIconClickLocal = () => {
    if (isMobile) {
      setIsMobileSearchActive(true);
    } else {
      setSearchActive(true);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  const startVoiceInputLocal = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      if (isMobile) {
        setIsMobileSearchActive(true);
      } else {
        setSearchActive(true);
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      alert("Voice recognition failed. Please try again.");
    };
  };

  return (
    <nav className="navbar">

      {/* Mobile hamburger menu */}
      {isMobile && (
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}></button>
      )}
      
      <div className="top-navbar">
        <div className="logo">
          <Link to="/home">
            <img id="siteLogo" src="/dark mode .png" alt="Logo" />
          </Link>
        </div>

        {/* Desktop Search Bar */}
        {!isMobile && (
          <div className="search-bar-container">
            <button className="search-icon" onClick={handleSearchIconClickLocal}>
              <img src="/search.png" alt="Search" className="search-icon-img" />
            </button>

            <div className={`search-input-wrapper ${searchActive ? "active" : ""}`}>
              <div className="search-input-inner">
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Search Products"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={() => {
                    if (searchTerm === "") setSearchActive(false);
                  }}
                />
                <button className="mic-icon" onClick={startVoiceInputLocal}>
                  <img src="/mic.png" alt="Mic" className="mic-icon-img" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Search Icon */}
        {isMobile && (
          <button className="mobile-search-icon" onClick={handleSearchIconClickLocal}>
            <i className="fas fa-search"></i>
          </button>
        )}

        <div className="wishlist-btn" title="Go to Wishlist">
          <Link to="/wishlist">
            <i className="fas fa-heart"></i>
          </Link>
        </div>

        <div className="cart-icon-wrapper">
          <Link to="/cart" className="cart-link">
            <i className="fas fa-shopping-cart"></i>
            <span id="cart-count">{cartCount}</span>
          </Link>
        </div>
      </div>

      {/* Mobile search overlay */}
      {isMobile && isMobileSearchActive && (
        <div className="mobile-search-overlay">
          <div className="mobile-search-container">
            <button className="mobile-search-back" onClick={closeMobileSearch}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-search-input"
            />
            <button className="mobile-search-voice" onClick={startVoiceInputLocal}>
              <i className="fas fa-microphone"></i>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- GLOBAL MOBILE MENU (Works on ALL pages) ---------------- */}
      {isMobile && isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={toggleMobileMenu}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>

            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button className="mobile-menu-close" onClick={toggleMobileMenu}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mobile-menu-links">

              <Link to="/home" className="mobile-menu-item" onClick={toggleMobileMenu}>
                <i className="fas fa-home"></i>
                <span>Home</span>
              </Link>

              <Link to="/wishlist" className="mobile-menu-item" onClick={toggleMobileMenu}>
                <i className="fas fa-heart"></i>
                <span>Your Wishlist</span>
              </Link>

              <Link to="/account" className="mobile-menu-item" onClick={toggleMobileMenu}>
                <i className="fas fa-user"></i>
                <span>Your Account</span>
              </Link>

              <Link to="/cart" className="mobile-menu-item" onClick={toggleMobileMenu}>
                <i className="fas fa-shopping-cart"></i>
                <span>Your Cart</span>
              </Link>

            </div>

            <div className="mobile-menu-footer">
              <p>Keep in touch</p>

              <div className="social-links">
                <a href="#" className="social-icon"><i className="fab fa-instagram"></i></a>
                <a href="#" className="social-icon"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-icon"><i className="fab fa-facebook"></i></a>
              </div>
            </div>

          </div>
        </div>
      )}

    </nav>
  );
}

export default Navbar;
