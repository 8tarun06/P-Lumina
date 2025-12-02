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
import AddToCartModal from "../components/AddToCartModal";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import ProductCard from "../components/ProductCard";
import WishlistToast from "../components/WishlistToast";  // <-- add this


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
  const [wishlistToast, setWishlistToast] = useState(null);

  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // State for image sliders
  const [activeSlides, setActiveSlides] = useState({});

  // Add to Cart Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAddToCartModalOpen, setIsAddToCartModalOpen] = useState(false);

  // ======= FETCH CART FUNCTION =======
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

  // Handle slide navigation
  const handleSlideNavigation = (productId, direction) => {
    const product = products.find(p => p.id === productId);
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
    
    products.forEach(product => {
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
  }, [products]);

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

  // Add banner validation
  useEffect(() => {
    const validateBanners = () => {
      heroBanners.forEach(banner => {
        if (banner.ctaLink) {
          try {
            parseBannerCtaLink(banner.ctaLink);
          } catch (error) {
            console.warn('Invalid banner CTA link:', banner.ctaLink, error);
          }
        }
      });
    };
    
    if (heroBanners.length > 0) {
      validateBanners();
    }
  }, [heroBanners]);

  // Add helper function to parse CTA links
  const parseBannerCtaLink = (ctaLink) => {
    if (!ctaLink) return { type: 'none', value: '' };
    
    // Product link format: product@productId
    if (ctaLink.startsWith('product@')) {
      return { type: 'product', value: ctaLink.replace('product@', '') };
    }
    
    // Category link format: category@categoryName
    if (ctaLink.startsWith('category@')) {
      return { type: 'category', value: ctaLink.replace('category@', '') };
    }
    
    // Collection links
    if (['new-arrivals', 'best-sellers', 'sale', 'featured'].includes(ctaLink)) {
      return { type: 'collection', value: ctaLink };
    }
    
    // Page links
    if (ctaLink === 'contact') return { type: 'contact', value: 'contact' };
    if (ctaLink === 'about') return { type: 'about', value: 'about' };
    
    // Default: treat as external URL
    return { type: 'url', value: ctaLink };
  };

  // Add banner click handler
  const handleBannerClick = (banner) => {
    if (!banner.ctaLink) return;
    
    try {
      const link = parseBannerCtaLink(banner.ctaLink);
      
      if (link.type === 'product' && link.value) {
        navigate(`/product/${link.value}`);
      } else if (link.type === 'category' && link.value) {
        setSelectedCategory(link.value);
        // Scroll to products section
        setTimeout(() => {
          document.querySelector('.product-grid')?.scrollIntoView({ 
            behavior: 'smooth' 
          });
        }, 100);
      } else if (link.type === 'collection' && link.value) {
        // Handle collections - you might want to filter products differently
        showModal({
          title: "Collection View",
          message: `Showing ${link.value} collection`,
          type: "info"
        });
        // Implement collection filtering logic here
      } else if (link.type === 'url' && link.value) {
        // External URL
        window.open(link.value, '_blank');
      } else if (link.type === 'contact') {
        navigate('/contact');
      } else if (link.type === 'about') {
        navigate('/about');
      } else {
        console.warn('Unknown banner CTA link:', banner.ctaLink);
      }
    } catch (error) {
      console.error('Error handling banner click:', error);
      showModal({
        title: "Navigation Error",
        message: "Could not navigate to the destination",
        type: "error"
      });
    }
  };

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
        const productList = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Handle both old single image and new images array format
            let displayImage = '';
            
            if (data.images && data.images.length > 0) {
              // New format: use first image from images array
              displayImage = data.images[0];
            } else if (data.image) {
              // Old format: use single image field
              displayImage = data.image;
            } else {
              // Fallback: use a placeholder image
              displayImage = 'https://via.placeholder.com/300x300?text=No+Image';
            }
            
            return {
              id: doc.id,
              ...data,
              displayImage // Add the resolved image URL
            };
          })
        );
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

  // Update the addToCart function to handle modal opening
  const handleAddToCartClick = (product) => {
    // Check if product has variants
    const hasVariants = product.variants || product.sizes;
    
    if (hasVariants) {
      // Show modal for products with variants
      setSelectedProduct(product);
      setIsAddToCartModalOpen(true);
    } else {
      // Directly add to cart for products without variants
      addToCart(product);
    }
  };

  // Update the modal add to cart handler
// In Home.jsx, update the handleModalAddToCart function
const handleModalAddToCart = async (productWithVariants) => {
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
    
    // Enhanced product data with variants
    const productWithMeta = {
      id: productWithVariants.id,
      name: productWithVariants.name,
      price: productWithVariants.price,
      displayPrice: productWithVariants.displayPrice || productWithVariants.price,
      category: productWithVariants.category,
      image: productWithVariants.displayImage || productWithVariants.image || (productWithVariants.images && productWithVariants.images[0]),
      variantImages: productWithVariants.variantImages || [],
      selectedVariants: productWithVariants.selectedVariants || {},
      productData: { // Store original product data for variant display
        variants: productWithVariants.variants || {}
      },
      quantity: 1,
      addedAt: Date.now(),
    };

    if (cartSnap.exists()) {
      const existingItems = cartSnap.data().items || [];
      
      // Check if same product with same variants already exists
      const alreadyExists = existingItems.find((item) => 
        item.id === productWithMeta.id && 
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(productWithMeta.selectedVariants || {})
      );
      
      if (alreadyExists) {
        showModal({
          title: "Item Already in Cart",
          message: "This product with selected variants is already in your cart",
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
      message: `${productWithVariants.name} has been added to your cart.`,
      type: "success",
    });

    setCart((prev) => [...prev, productWithMeta]);
    fetchCartFromFirestore(); // Refresh cart
  } catch (error) {
    console.error("Error adding to cart:", error);
    showModal({
      title: "Failed to Add to Cart",
      message: `${productWithVariants.name} failed to add to your cart.`,
      type: "error",
    });
  }
};

const toggleWishlist = async (product) => {
  const user = auth.currentUser;
  if (!user) {
    showModal({
      title: "Login First To Manage Wishlist",
      message: "Please Login First",
      type: "error",
    });
    navigate("/login");
    return;
  }

  const wishlistRef = doc(db, "wishlists", user.uid);

  // --- INSTANT UI UPDATE (NO DELAY) ---
  setWishlistIds((prev) => {
    if (prev.includes(product.id)) {
      return prev.filter((id) => id !== product.id);
    } else {
      return [...prev, product.id];
    }
  });

  // --- SHOW TOAST INSTANTLY ---
  setWishlistToast({
    text: wishlistIds.includes(product.id)
      ? "Removed from Wishlist"
      : "Saved to Wishlist",
  });

  // --- FIREBASE SYNC (ASYNC, NON-BLOCKING) ---
  (async () => {
    try {
      const wishlistSnap = await getDoc(wishlistRef);
      let items = wishlistSnap.exists() ? wishlistSnap.data().items || [] : [];

      const alreadyExists = items.some((i) => i.id === product.id);

      if (alreadyExists) {
        items = items.filter((i) => i.id !== product.id);
      } else {
        items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          image:
            product.displayImage ||
            product.image ||
            (product.images && product.images[0]),
          addedAt: Date.now(),
        });
      }

      await setDoc(wishlistRef, { items });
    } catch (err) {
      console.error("Wishlist sync error:", err);
    }
  })();
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

  // Load cart on component mount
  useEffect(() => {
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

  useEffect(() => {
  const handleScroll = () => {
    const banner = document.querySelector(".ultra-hero-wrapper");
    if (!banner) return;

    const scrollY = window.scrollY;
    if (scrollY < 400) {
      banner.classList.add("parallax-active");
    } else {
      banner.classList.remove("parallax-active");
    }
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

{wishlistToast && (
  <WishlistToast 
    text={wishlistToast.text}
    onClose={() => setWishlistToast(null)}
  />
)}


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
          {/* === ULTRA SWIPER AMAZON HERO BANNER === */}
          <section className="ultra-hero-wrapper">
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              slidesPerView={1}
              loop={true}
              autoplay={{ delay: 3500 }}
              pagination={{ clickable: true }}
              navigation={true}
              className="ultra-hero-swiper"
            >
              {heroBanners.map((banner, index) => (
                <SwiperSlide key={banner.id}>
                  <div
                    className="ultra-hero-slide"
                    onClick={() => handleBannerClick(banner)}
                  >
                    {banner.type === "video" ? (
                      <video
                        className="ultra-hero-media"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        src={banner.mediaUrl}
                      />
                    ) : (
                      <img
                        className="ultra-hero-media"
                        src={banner.mediaUrl}
                        alt={banner.title || "Banner"}
                        loading="eager"
                      />
                    )}

                    {/* Text Overlay */}
                    {(banner.title || banner.subtitle || banner.ctaText) && (
                      <div className="ultra-hero-content">
                        {banner.title && (
                          <h2 className="ultra-hero-title">{banner.title}</h2>
                        )}
                        {banner.subtitle && (
                          <p className="ultra-hero-subtitle">{banner.subtitle}</p>
                        )}
                        {banner.ctaText && (
                          <button
                            className="ultra-hero-cta"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBannerClick(banner);
                            }}
                          >
                            {banner.ctaText}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
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
          <section className="product-grid-section">
            {sortedProducts.length === 0 ? (
              <div className="no-products-found">
                <i className="fas fa-search"></i>
                <p>No products found.</p>
              </div>
            ) : (
              <div className="products-grid-container">
                {sortedProducts.map((product) => (
                <ProductCard 
   key={product.id}
   product={product}
   onCartUpdate={fetchCartFromFirestore}
   wishlistIds={wishlistIds}
   toggleWishlist={toggleWishlist}
/>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Add to Cart Modal */}
      <AddToCartModal
        product={selectedProduct}
        isOpen={isAddToCartModalOpen}
        onClose={() => setIsAddToCartModalOpen(false)}
        onAddToCart={handleModalAddToCart}
      />
    </>
  );
}

export default Home;