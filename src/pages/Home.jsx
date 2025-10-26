import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase-config";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  query, where
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import "../home.css";
import { useGlobalModal } from "../context/ModalContext";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const searchInputRef = useRef(null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOption, setSortOption] = useState("featured");
  const { showModal } = useGlobalModal();
  const [heroBanners, setHeroBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef(null);
  const videoRefs = useRef([]);
  const autoPlayRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
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

  // Auto-rotate slides with infinite loop
  useEffect(() => {
    if (heroBanners.length > 1 && !isPaused) {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
      }, 5000); // 5 seconds per slide like Amazon
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [heroBanners.length, isPaused]);

  // Pause auto-play on hover
  const handleSliderHover = () => {
    setIsPaused(true);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const handleSliderLeave = () => {
    setIsPaused(false);
  };

  // Handle video looping
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, heroBanners.length);
    
    // When slide changes, restart the current video
    if (heroBanners[currentSlide]?.type === 'video' && videoRefs.current[currentSlide]) {
      videoRefs.current[currentSlide].currentTime = 0;
      videoRefs.current[currentSlide].play().catch(e => console.log("Autoplay prevented:", e));
    }
  }, [currentSlide, heroBanners]);

  // Fetch hero banners from Firebase with video support
  useEffect(() => {
    const fetchHeroBanners = async () => {
      try {
        const bannersRef = collection(db, "heroBanners");
        const snapshot = await getDocs(bannersRef);
        const bannersList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            let mediaUrl = data.mediaUrl || data.imageUrl || '';

            if (!mediaUrl && data.mediaPath) {
              try {
                const storageRef = ref(storage, data.mediaPath);
                mediaUrl = await getDownloadURL(storageRef);
              } catch (storageError) {
                console.error("Error loading media from Storage:", storageError);
                return null;
              }
            }
            
            return {
              id: doc.id,
              ...data,
              mediaUrl,
              type: data.type || 'image'
            };
          })
        );
        
        const validBanners = bannersList
          .filter(banner => banner !== null && banner.active !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setHeroBanners(validBanners);
      } catch (err) {
        console.error("Failed to load hero banners:", err);
        showModal({
          title: "Banner Loading Error",
          message: "Could not load promotional banners",
          type: "error"
        });
      }
    };
    fetchHeroBanners();
  }, [showModal]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        showModal({
          title: "Login First",
          message: "Please login in to Continue",
          type: "error",
        });
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate, showModal]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let q;
        if (selectedCategory === "all") {
          q = collection(db, "products");
        } else {
          q = query(
            collection(db, "products"),
            where("category", "==", selectedCategory)
          );
        }

        const snapshot = await getDocs(q);
        const productList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productList);
      } catch (err) {
        console.error("Failed to load products:", err.message);
      }
    };

    fetchProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const fetchWishlist = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const wishlistRef = doc(db, "wishlists", user.uid);
      const wishlistSnap = await getDoc(wishlistRef);
      if (wishlistSnap.exists()) {
        const items = wishlistSnap.data().items || [];
        setWishlistIds(items.map((item) => item.id));
      }
    };
    fetchWishlist();
  }, []);

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
      const productWithMeta = {
        ...product,
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

  const toggleWishlist = async (product) => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login First To Manage Wishlist",
        message: `Please Login First`,
        type: "error",
      });
      navigate("/login");
      return;
    }

    const wishlistRef = doc(db, "wishlists", user.uid);
    const wishlistSnap = await getDoc(wishlistRef);
    let wishlistItems = wishlistSnap.exists() ? wishlistSnap.data().items || [] : [];

    const alreadyInWishlist = wishlistItems.some((item) => item.id === product.id);

    if (alreadyInWishlist) {
      wishlistItems = wishlistItems.filter((item) => item.id !== product.id);
      await setDoc(wishlistRef, { items: wishlistItems });
      setWishlistIds((prev) => prev.filter((id) => id !== product.id));
    } else {
      wishlistItems.push({ ...product, addedAt: Date.now() });
      await setDoc(wishlistRef, { items: wishlistItems });
      setWishlistIds((prev) => [...prev, product.id]);
    }
  };

  const handleSearchIconClick = () => {
    if (isMobile) {
      setIsMobileSearchActive(true);
    } else {
      setSearchActive(true);
    }
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showModal({
        title: "Voice Recognition is Not Supported In Your Device/Browser",
        message: `Voice to Search can't be used right now. Please use manual search.`,
        type: "error",
      });
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
      showModal({
        title: "Voice Recognition Failed",
        message: `Please try again later.`,
        type: "error",
      });
    };
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortProducts = (products, option) => {
    switch (option) {
      case "price-low":
        return [...products].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...products].sort((a, b) => b.price - a.price);
      case "newest":
        return [...products].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      default:
        return products;
    }
  };

  const sortedProducts = sortProducts(filteredProducts, sortOption);

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

  const navigateToProductDetail = (productId) => {
    navigate(`/product/${productId}`);
  };

  const categories = [
    { id: "all", name: "All Products" },
    { id: "electronics", name: "Electronics" },
    { id: "clothing", name: "Clothing" },
    { id: "home", name: "Home Appliances" },
    { id: "beauty", name: "Beauty" },
  ];

  const getCategoryIcon = (categoryId) => {
    switch (categoryId) {
      case "electronics":
        return "mobile-alt";
      case "clothing":
        return "tshirt";
      case "home":
        return "home";
      case "beauty":
        return "spa";
      default:
        return "shopping-bag";
    }
  };

  // Handle manual slide navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Go to next/previous slide
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroBanners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroBanners.length) % heroBanners.length);
  };

  // Mobile menu handlers
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const closeMobileSearch = () => {
    setIsMobileSearchActive(false);
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



  return (
    <>
      <Navbar 
        cartCount={cart.reduce((total, item) => total + (item.quantity || 1), 0)}
        isMobile={isMobile}
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
        isMobileSearchActive={isMobileSearchActive}
        setIsMobileSearchActive={setIsMobileSearchActive}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchInputRef={searchInputRef}
        handleSearchIconClick={handleSearchIconClick}
        startVoiceInput={startVoiceInput}
        closeMobileSearch={closeMobileSearch}
      />
      
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h3>Menu</h3>
              <button className="mobile-menu-close" onClick={closeMobileMenu}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="mobile-menu-categories">
              <h4>Shop by Category</h4>
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`mobile-menu-category ${selectedCategory === category.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    closeMobileMenu();
                  }}
                >
                  <i className={`fas fa-${getCategoryIcon(category.id)}`}></i>
                  <span>{category.name}</span>
                </div>
              ))}
            </div>

            <div className="mobile-menu-sort">
              <h4>Sort By</h4>
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  closeMobileMenu();
                }}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>

            <div className="mobile-menu-footer">
              <button 
                className="mobile-menu-account"
                onClick={() => {
                  navigate('/account');
                  closeMobileMenu();
                }}
              >
                <i className="fas fa-user"></i>
                Your Account
              </button>
              <button 
                className="mobile-menu-wishlist"
                onClick={() => {
                  navigate('/wishlist');
                  closeMobileMenu();
                }}
              >
                <i className="fas fa-heart"></i>
                Your Wishlist
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="layout">
        {!isMobile && <Sidebar />}
        
        <main className="main-body">
          {/* Amazon-style Hero Banner Section */}
          <section 
            className="amazon-hero-banner"
            onMouseEnter={handleSliderHover}
            onMouseLeave={handleSliderLeave}
          >
            <div className="amazon-hero-container" ref={sliderRef}>
              {heroBanners.length > 0 ? (
                <>
                  <div 
                    className="amazon-hero-slides"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {heroBanners.map((banner, index) => (
                      <div 
                        key={banner.id} 
                        className={`amazon-hero-slide ${currentSlide === index ? 'active' : ''}`}
                        onClick={() => banner.ctaLink && navigate(banner.ctaLink)}
                      >
                        {banner.type === 'video' ? (
                          <video
                            ref={el => videoRefs.current[index] = el}
                            className="amazon-hero-media"
                            autoPlay
                            muted
                            loop
                            playsInline
                            src={banner.mediaUrl}
                          />
                        ) : (
                          <img
                            className="amazon-hero-media"
                            src={banner.mediaUrl}
                            alt={banner.title || "Promotional banner"}
                            loading="lazy"
                          />
                        )}
                        
                        {/* Amazon-style Content Overlay */}
                        <div className="amazon-hero-content">
                          {banner.title && (
                            <h2 className="amazon-hero-title">{banner.title}</h2>
                          )}
                          {banner.subtitle && (
                            <p className="amazon-hero-subtitle">{banner.subtitle}</p>
                          )}
                          {banner.ctaText && (
                            <button 
                              className="amazon-shop-now-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                banner.ctaLink && navigate(banner.ctaLink);
                              }}
                            >
                              {banner.ctaText}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Amazon-style Navigation Arrows */}
                  {heroBanners.length > 1 && !isMobile && (
                    <>
                      <button 
                        className="amazon-slider-arrow amazon-prev-arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          prevSlide();
                        }}
                        aria-label="Previous slide"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <button 
                        className="amazon-slider-arrow amazon-next-arrow"
                        onClick={(e) => {
                          e.stopPropagation();
                          nextSlide();
                        }}
                        aria-label="Next slide"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </>
                  )}
                  
                  {/* Amazon-style Slider Indicators */}
                  <div className="amazon-slider-indicators">
                    {heroBanners.map((_, index) => (
                      <button
                        key={index}
                        className={`amazon-indicator ${currentSlide === index ? "amazon-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(index);
                        }}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Progress Bar */}
                  {heroBanners.length > 1 && (
                    <div className="amazon-progress-bar">
                      <div 
                        className="amazon-progress-fill"
                        style={{ 
                          width: `${((currentSlide + 1) / heroBanners.length) * 100}%`,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                // Fallback Amazon-style banner
                <div className="amazon-hero-slide amazon-default">
                  <img
                    className="amazon-hero-media"
                    src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"
                    alt="Welcome to our store"
                  />
                  <div className="amazon-hero-content">
                    <h2 className="amazon-hero-title">Welcome to Our Store</h2>
                    <p className="amazon-hero-subtitle">Discover amazing products at unbeatable prices</p>
                    <button 
                      className="amazon-shop-now-btn"
                      onClick={() => navigate('/products')}
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Category Section - Hidden on mobile, shown in mobile menu */}
          {!isMobile && (
            <div className="category-section">
              <h2>Shop by Category</h2>
              <div className="category-list">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`category-card ${selectedCategory === category.id ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <div className="category-icon">
                      <i className={`fas fa-${getCategoryIcon(category.id)}`}></i>
                    </div>
                    <span>{category.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter and Sort Section - Hidden on mobile, shown in mobile menu */}
          {!isMobile && (
            <div className="filter-sort-section">
              <div className="sort-options">
                <span>Sort by:</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>
          )}

          {/* Mobile Category Quick Access */}
          {isMobile && (
            <div className="mobile-category-quick-access">
              <div className="mobile-category-scroll">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`mobile-category-item ${selectedCategory === category.id ? "active" : ""}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <i className={`fas fa-${getCategoryIcon(category.id)}`}></i>
                    <span>{category.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Grid */}
          <section className="product-grid">
            {sortedProducts.length === 0 ? (
              <p style={{ color: "white" }}>No products found.</p>
            ) : (
              sortedProducts.map((product) => (
                <div
                  className="product-card"
                  key={product.id}
                  onClick={() => navigateToProductDetail(product.id)}
                >
                  <img src={product.image} alt={product.name} />
                  <div className="product-info">
                    <div className="product-title">{product.name}</div>
                    <div className="product-price">₹{product.price}</div>
                   {cart.some((item) => item.id === product.id) ? (
  <div className="quantity-controls flex items-center gap-2 mt-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        updateQuantity(product.id, getQuantity(product.id) - 1);
      }}
      className="bg-gray-300 text-black px-2 py-1 rounded"
    >
      -
    </button>
    <span className="text-white">{getQuantity(product.id)}</span>
    <button
      onClick={(e) => {
        e.stopPropagation();
        updateQuantity(product.id, getQuantity(product.id) + 1);
      }}
      className="bg-gray-300 text-black px-2 py-1 rounded"
    >
      +
    </button>
  </div>
) : (
  <button
    className="add-to-cart"
    onClick={(e) => {
      e.stopPropagation();
      addToCart(product);
    }}
  >
    Add to Cart
  </button>
)}

                  </div>
                  <div
                    className={`wishlist-icon ${wishlistIds.includes(product.id) ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product);
                    }}
                    title={
                      wishlistIds.includes(product.id)
                        ? "Remove from Wishlist"
                        : "Add to Wishlist"
                    }
                  >
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </>
  );
}

export default Home;