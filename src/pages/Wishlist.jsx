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
import ProductCard from "../components/ProductCard";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MobileLayout from "../layouts/MobileLayout";

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

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

  // State for image sliders
  const [activeSlides, setActiveSlides] = useState({});

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const wishlistRef = doc(db, "wishlists", user.uid);

      // Listen for wishlist updates
      const unsubscribeSnapshot = onSnapshot(wishlistRef, async (docSnap) => {
        if (!docSnap.exists()) {
          setWishlistItems([]);
          setLoading(false);
          return;
        }

        const items = docSnap.data().items || [];
        const ids = items.map((i) => i.id);

        // 🔥 Fetch FULL product objects from Firestore
        const fullProducts = [];
        for (const id of ids) {
          const productRef = doc(db, "products", id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            fullProducts.push({
              id,
              ...productSnap.data()
            });
          }
        }

        setWishlistItems(fullProducts);
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
    if (isMobile) {
      setIsMobileSearchActive(true);
    } else {
      setSearchActive(true);
    }
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const startVoiceInput = () => {
    setSearchActive(true);

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

  // Add to cart function
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

  // Star rating helper method
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

  // Main content with conditional layout based on screen size
  const wishlistContent = (
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
      ) : isMobile ? (
        // Mobile layout - single column grid
        <div className="wishlist-single-grid">
          <div className="wishlist-header">
            <h1>My Wishlist</h1>
            <p className="wishlist-count">{filteredWishlist.length} items</p>
          </div>
          
          <div className="single-grid-container">
            {filteredWishlist.map((product) => (
              <div key={product.id} className="wishlist-single-item">
                <ProductCard
                  product={product}
                  wishlistIds={wishlistItems.map((p) => p.id)}
                  toggleWishlist={() => handleRemoveFromWishlist(product.id)}
                  onCartUpdate={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Desktop layout - product grid
        <div className="product-grid">
          {filteredWishlist.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              wishlistIds={wishlistItems.map((p) => p.id)}
              toggleWishlist={() => handleRemoveFromWishlist(product.id)}
              onCartUpdate={() => {}}
            />
          ))}
        </div>
      )}
    </section>
  );

  // If mobile, use MobileLayout
  if (isMobile) {
    return (
      <MobileLayout>
        {wishlistContent}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <>
      <Navbar 
        cartCount={cart.reduce((t, item) => t + (item.quantity || 1), 0)} 
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

      <div className="layout">
        <Sidebar />
        {wishlistContent}
      </div>
    </>
  );
}

export default Wishlist;