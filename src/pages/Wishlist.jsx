import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase-config";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../home.css";
import "../wishlist.css";
import Lottie from "lottie-react";
import emptyHeart from "../assets/empty-heart.json";
import { useGlobalModal } from "../context/ModalContext";

function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [cart, setCart] = useState([]);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();

  // State for image sliders
  const [activeSlides, setActiveSlides] = useState({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const wishlistRef = doc(db, "wishlists", user.uid);
      const unsubscribeSnapshot = onSnapshot(wishlistRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWishlistItems(data.items || []);
        } else {
          setWishlistItems([]);
        }
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribe();
  }, []);

  // Fetch cart data
  useEffect(() => {
    const fetchCartFromFirestore = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          setCart(items);
        }
      } catch (err) {
        console.error("Error loading cart from Firebase:", err.message);
      }
    };
    fetchCartFromFirestore();
  }, []);

  // Handle slide navigation
  const handleSlideNavigation = (productId, direction) => {
    const product = wishlistItems.find(p => p.id === productId);
    if (!product) return;

    const images = product.images && product.images.length > 0 ? product.images : [product.displayImage || product.image];
    if (images.length <= 1) return;

    setActiveSlides(prev => {
      const currentSlide = prev[productId] || 0;
      let newSlide;
      
      if (direction === 'next') {
        newSlide = (currentSlide + 1) % images.length;
      } else {
        newSlide = (currentSlide - 1 + images.length) % images.length;
      }
      
      return {
        ...prev,
        [productId]: newSlide
      };
    });
  };

  // Handle dot click
  const handleDotClick = (e, productId) => {
    const index = parseInt(e.currentTarget.getAttribute('data-index'));
    setActiveSlides(prev => ({
      ...prev,
      [productId]: index
    }));
  };

  // Auto-rotate slides for products with multiple images
  useEffect(() => {
    const intervals = {};
    
    wishlistItems.forEach(product => {
      const images = product.images && product.images.length > 0 ? product.images : [product.displayImage || product.image];
      
      if (images.length > 1) {
        intervals[product.id] = setInterval(() => {
          setActiveSlides(prev => {
            const currentSlide = prev[product.id] || 0;
            const newSlide = (currentSlide + 1) % images.length;
            return {
              ...prev,
              [product.id]: newSlide
            };
          });
        }, 4000); // Change slide every 4 seconds
      }
    });
    
    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [wishlistItems]);

  const handleSearchIconClick = () => {
    setSearchActive(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const startVoiceInput = () => {
    setSearchActive(true); // Always open the input

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search not supported");
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
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
      alert("Voice input failed");
    };
  };

  // Add to cart function (same as Home.jsx)
  const addToCart = async (product) => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login First",
        message: "Please login in to Continue",
        type: "error",
      });
      navigate("/login");
      return;
    }

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      
      // Create product data with proper image handling
      const productWithMeta = {
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        image: product.displayImage || product.image || (product.images && product.images[0]),
        quantity: 1,
        addedAt: Date.now(),
      };

      if (cartSnap.exists()) {
        const existingItems = cartSnap.data().items || [];
        const alreadyExists = existingItems.find((item) => item.id === product.id);
        if (alreadyExists) {
          showModal({
            title: "Item Already Added in a Cart",
            type: "info",
          });
          return;
        }
        await updateDoc(cartRef, {
          items: arrayUnion(productWithMeta),
        });
      } else {
        await setDoc(cartRef, {
          items: [productWithMeta],
        });
      }

      showModal({
        title: "Added to Cart",
        message: `${product.name} has been added to your cart.`,
        type: "success",
      });

      setCart((prev) => [...prev, productWithMeta]);
    } catch (error) {
      console.error("Error adding to cart:", error);
      showModal({
        title: "Failed to Cart",
        message: `${product.name} Failed to add to your cart.`,
        type: "error",
      });
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    const user = auth.currentUser;
    if (!user) return;

    const wishlistRef = doc(db, "wishlists", user.uid);
    const docSnap = await getDoc(wishlistRef);

    if (docSnap.exists()) {
      const currentItems = docSnap.data().items || [];
      const updatedItems = currentItems.filter((item) => item.id !== productId);
      await setDoc(wishlistRef, { items: updatedItems });
    }
  };

  // Get quantity of a product
  const getQuantity = (id) => {
    const item = cart.find((i) => i.id === id);
    return item ? item.quantity : 0;
  };

  // Optimistic Quantity Update (Instant & Smooth)
  const updateQuantity = (id, newQty) => {
    const user = auth.currentUser;
    if (!user) return;

    // 1️⃣ Instantly update local cart (no delay)
    let updatedCart = [...cart];
    const itemIndex = updatedCart.findIndex((i) => i.id === id);

    if (newQty <= 0) {
      updatedCart = updatedCart.filter((item) => item.id !== id);
    } else if (itemIndex >= 0) {
      updatedCart[itemIndex] = { ...updatedCart[itemIndex], quantity: newQty };
    }

    setCart(updatedCart); // instant state update

    // 2️⃣ Sync with Firebase in background (non-blocking)
    (async () => {
      try {
        const cartRef = doc(db, "carts", user.uid);
        await setDoc(cartRef, { items: updatedCart }, { merge: true });
      } catch (error) {
        console.error("Error syncing cart:", error);
      }
    })();
  };

  // Star rating helper method (same as Home.jsx)
  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className="fas fa-star"></i>);
    }
    
    // Half star
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>);
    }
    
    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>);
    }
    
    return stars;
  };

  const filteredWishlist = wishlistItems.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navigateToProductDetail = (productId) => {
    navigate(`/product/${productId}`);
  };

  return (
    <>
      <div className="top-navbar">
        <div className="logo">
          <a href="/home">
            <img id="siteLogo" src="/dark mode .png" alt="Logo" />
          </a>
        </div>

        <div className="search-bar-container">
          <button className="search-icon" onClick={handleSearchIconClick}>
            <img
              src="/public/search.png"
              alt="Search"
              className="search-icon-img"
            />
          </button>
          <div className={`search-input-wrapper ${searchActive ? "active" : ""}`}>
            <div className="search-input-inner">
              <input
                type="text"
                ref={searchInputRef}
                placeholder="Search Wishlist"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={() => {
                  if (searchTerm.trim() === "") {
                    setTimeout(() => {
                      setSearchActive(false);
                    }, 300);
                  }
                }}
              />
              <button className="mic-icon" onClick={startVoiceInput}>
                <img
                  src="/public/mic.png"
                  alt="Mic"
                  className="mic-icon-img"
                />
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

        <section className="wishlist-body">
          {!isLoggedIn ? (
            <p className="wishlist-msg">Please login to view your wishlist.</p>
          ) : loading ? (
            <p className="wishlist-msg">Loading wishlist...</p>
          ) : filteredWishlist.length === 0 ? (
            <div className="empty-wishlist">
              <Lottie
                animationData={emptyHeart}
                loop
                autoplay
                className="wishlist-lottie"
              />
              <p>Your wishlist is empty</p>
              <a href="/home" className="wishlist-shop-btn">
                Start Shopping
              </a>
            </div>
          ) : (
            <div className="product-grid">
              {filteredWishlist.map((product) => {
                // Calculate real discount percentage
                const originalPrice = product.originalPrice || product.price * 1.5; // Fallback if no original price
                const currentPrice = product.price;
                const realDiscountPercentage = originalPrice > currentPrice 
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0;

                // Get real reviews data
                const averageRating = product.averageRating || 0;
                const reviewCount = product.reviewCount || 0;
                
                return (
                  <div
                    className="modern-product-card"
                    key={product.id}
                    onClick={() => navigateToProductDetail(product.id)}
                  >
                    {/* Product Badge - Show only if there's a real discount */}
                    {realDiscountPercentage > 0 && (
                      <div className="product-badge">{realDiscountPercentage}% OFF</div>
                    )}
                    
                    {/* Wishlist Badge */}
                    <div className="product-badge wishlist-badge">WISHLIST</div>
                    
                    {/* Product Image Container with Slider */}
                    <div className="product-image-container">
                      <div className="image-slider">
                        {/* Get all images - support both old and new formats */}
                        {(product.images && product.images.length > 0 ? product.images : [product.displayImage || product.image]).map((image, index) => {
                          const isActive = activeSlides[product.id] === index || (activeSlides[product.id] === undefined && index === 0);
                          return (
                            <div
                              key={index}
                              className={`slide ${isActive ? 'active' : ''}`}
                              data-index={index}
                            >
                              <img 
                                src={image} 
                                alt={`${product.name} - View ${index + 1}`}
                                className="product-image"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Slider Navigation Dots - Only show if multiple images */}
                      {(product.images && product.images.length > 1) || (!product.images && product.displayImage && product.image && product.displayImage !== product.image) ? (
                        <div className="slider-dots">
                          {((product.images && product.images.length > 0) ? product.images : [product.displayImage || product.image]).map((_, index) => (
                            <button
                              key={index}
                              className={`dot ${(activeSlides[product.id] === index || (activeSlides[product.id] === undefined && index === 0)) ? 'active' : ''}`}
                              data-index={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDotClick(e, product.id);
                              }}
                              aria-label={`View image ${index + 1}`}
                            ></button>
                          ))}
                        </div>
                      ) : null}

                      {/* Slider Navigation Arrows - Only show if multiple images */}
                      {((product.images && product.images.length > 1) || (!product.images && product.displayImage && product.image && product.displayImage !== product.image)) && (
                        <>
                          <button
                            className="slider-arrow prev-arrow"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSlideNavigation(product.id, 'prev');
                            }}
                            aria-label="Previous image"
                          >
                            <i className="fas fa-chevron-left"></i>
                          </button>
                          <button
                            className="slider-arrow next-arrow"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSlideNavigation(product.id, 'next');
                            }}
                            aria-label="Next image"
                          >
                            <i className="fas fa-chevron-right"></i>
                          </button>
                        </>
                      )}
                      
                      {/* Add to Cart Plus Icon in Corner */}
                      {!cart.some((item) => item.id === product.id) ? (
                        <button
                          className="add-to-cart-plus"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          title="Add to Cart"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      ) : (
                        <div className="quantity-controls-corner">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(product.id, getQuantity(product.id) - 1);
                            }}
                            className="qty-btn-corner minus"
                          >
                            -
                          </button>
                          <span className="qty-display-corner">{getQuantity(product.id)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(product.id, getQuantity(product.id) + 1);
                            }}
                            className="qty-btn-corner plus"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Remove from Wishlist Icon */}
                      <button
                        className="wishlist-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWishlist(product.id);
                        }}
                        title="Remove from Wishlist"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>

                    {/* Product Info - Fixed Height Container */}
                    <div className="product-info-modern">
                      {/* Real Rating Section */}
                      <div className="product-rating">
                        <div className="stars">
                          {renderStarRating(averageRating)}
                        </div>
                        <span className="rating-value">{averageRating.toFixed(1)}</span>
                        <span className="review-count">({reviewCount})</span>
                      </div>

                      {/* Product Title - Fixed Height */}
                      <h3 className="product-title-modern" title={product.name}>
                        {product.name}
                      </h3>

                      {/* Real Price Section */}
                      <div className="price-section">
                        <span className="current-price">₹{currentPrice.toFixed(2)}</span>
                        {realDiscountPercentage > 0 && (
                          <>
                            <span className="original-price">₹{originalPrice.toFixed(2)}</span>
                            <span className="discount">
                              ({realDiscountPercentage}% OFF)
                            </span>
                          </>
                        )}
                      </div>

                      {/* Category Tag */}
                      <div className="category-tag">
                        {product.category || "Uncategorized"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default Wishlist;