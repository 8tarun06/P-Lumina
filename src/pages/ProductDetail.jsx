// src/pages/ProductDetail.jsx
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Added Firebase Storage functions
import { db, auth, storage } from '../firebase-config'; // Added storage
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MobileLayout from '../layouts/MobileLayout';
import ProductCard from '../components/ProductCard'; // ADDED: Import global ProductCard
import '../home.css';
import '../styles/productdetail.css';
import { useGlobalModal } from '../context/ModalContext';

// Mobile detection hook
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkMobile();

    // Add event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// SPECIFICATION ICONS
const specIcons = {
  material: "fas fa-cube",
  weight: "fas fa-balance-scale",
  dimensions: "fas fa-ruler-combined",
  size: "fas fa-ruler",
  color: "fas fa-palette",
  brand: "fas fa-tag",
  model: "fas fa-tools",
  warranty: "fas fa-shield-alt",
  battery: "fas fa-battery-three-quarters",
  storage: "fas fa-hdd",
  ram: "fas fa-memory",
  type: "fas fa-layer-group",
  default: "fas fa-info-circle"
};

const getSpecIcon = (key) => {
  const normalized = key.toLowerCase();
  return specIcons[normalized] || specIcons.default;
};

// Haptic feedback for mobile
const triggerHapticFeedback = (type = 'light') => {
  if ('vibrate' in navigator) {
    switch(type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      default:
        navigator.vibrate(10);
    }
  }
};

// ShareButton Component
const ShareButton = ({ 
  children = 'Share', 
  size = 'medium', 
  icon = true,
  className = '',
  onShare,
  ...props 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    setIsSupported(!!navigator.share);
  }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSupported) {
      // Fallback: copy to clipboard
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        if (onShare) onShare({ success: true, method: 'clipboard' });
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        if (onShare) onShare({ success: true, method: 'clipboard' });
      }
      return;
    }

    try {
      setIsAnimating(true);
      
      const shareData = {
        title: document.title,
        text: 'Check out this amazing product!',
        url: window.location.href,
      };

      await navigator.share(shareData);
      if (onShare) onShare({ success: true, method: 'native' });
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        if (onShare) onShare({ success: false, error });
      }
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <button
      className={`share-button ${size} ${isAnimating ? 'animating' : ''} ${className}`}
      onClick={handleShare}
      disabled={isAnimating}
      aria-label="Share this product"
      {...props}
    >
      <span className="share-button-content">
        {icon && (
          <span className="share-icon">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </span>
        )}
        <span className="share-text">{children}</span>
      </span>
      
      {/* Animation elements */}
      <span className="share-particles">
        {[...Array(6)].map((_, i) => (
          <span key={i} className="particle" style={{ '--i': i }} />
        ))}
      </span>
      
      <span className="share-wave" />
    </button>
  );
};

// Animated Wishlist Button Component
const WishlistButton = ({ 
  isActive = false,
  size = 'medium',
  className = '',
  onClick,
  children,
  ...props 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [localActive, setLocalActive] = useState(isActive);

  useEffect(() => {
    setLocalActive(isActive);
  }, [isActive]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAnimating(true);
    setLocalActive(!localActive);
    
    if (onClick) {
      onClick(e);
    }
    
    setTimeout(() => setIsAnimating(false), 600);
  };
  

  return (
    <button
      className={`wishlist-button ${size} ${localActive ? 'active' : ''} ${isAnimating ? 'animating' : ''} ${className}`}
      onClick={handleClick}
      aria-label={localActive ? "Remove from wishlist" : "Add to wishlist"}
      {...props}
    >
      <span className="wishlist-button-content">
        <span className="wishlist-icon">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill={localActive ? "currentColor" : "none"} 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </span>
        {children && <span className="wishlist-text">{children}</span>}
      </span>
      
      {/* Heart particles animation */}
      <span className="wishlist-particles">
        {[...Array(8)].map((_, i) => (
          <span key={i} className="wishlist-particle" style={{ '--i': i }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </span>
        ))}
      </span>
      
      {/* Pulse effect */}
      <span className="wishlist-pulse" />
    </button>
  );
};

// Premium Copy Button Component with Animations
const CopyButton = ({ 
  text = '', 
  size = 'medium', 
  className = '',
  onCopy,
  children,
  ...props 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!text) return;
    
    setIsAnimating(true);
    
    try {
      // Try using the Clipboard API first
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setIsCopied(true);
      
      if (onCopy) {
        onCopy({ success: true, text });
      }
      
      // Show success state for 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error copying text:', error);
      if (onCopy) {
        onCopy({ success: false, error });
      }
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <button
      className={`copy-button ${size} ${isAnimating ? 'animating' : ''} ${isCopied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      disabled={isAnimating}
      aria-label={isCopied ? "Copied!" : `Copy "${text}"`}
      {...props}
    >
      <span className="copy-button-content">
        <span className="copy-icon">
          {isCopied ? (
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          ) : (
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </span>
        <span className="copy-text">
          {isCopied ? 'Copied!' : (children || 'Copy')}
        </span>
      </span>
      
      {/* Premium animation elements */}
      <span className="copy-confetti">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="confetti-piece" style={{ '--i': i }} />
        ))}
      </span>
      
      <span className="copy-wave" />
      <span className="copy-sparkles">
        {[...Array(8)].map((_, i) => (
          <span key={i} className="sparkle" style={{ '--i': i }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9 12 2 12 8 17 5 22 12 17 19 22 16 17 22 12 15 12z"/>
            </svg>
          </span>
        ))}
      </span>
    </button>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();
  const isMobile = useMobileDetection();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [isProductInCart, setIsProductInCart] = useState(false);

  // Variant states
  const [selectedVariants, setSelectedVariants] = useState({});
  const [currentPrice, setCurrentPrice] = useState(0);
  const [variantImages, setVariantImages] = useState([]);

  // Delivery states
  const [pincode, setPincode] = useState('');
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [pincodeError, setPincodeError] = useState('');

  // Related products states
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [youMayAlsoLike, setYouMayAlsoLike] = useState([]);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [relatedProductsLoading, setRelatedProductsLoading] = useState(true);

  // Image error handling state
  const [imageErrors, setImageErrors] = useState({});

  // Enhanced image gallery states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [thumbnailScrollPosition, setThumbnailScrollPosition] = useState(0);

  // Coupon states
  const [coupons, setCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(true);

  // Fix horizontal scroll
  useEffect(() => {
    // Prevent horizontal scroll on mount
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    return () => {
      // Reset on unmount
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, []);

  // Enhanced share handler
  const handleShare = async (shareData) => {
    if (shareData.success) {
      showModal({
        title: shareData.method === 'native' ? "Shared Successfully!" : "Link Copied!",
        message: shareData.method === 'native' 
          ? "Product shared successfully!" 
          : "Product link has been copied to clipboard",
        type: "success"
      });
    } else if (shareData.error) {
      showModal({
        title: "Share Failed",
        message: "Unable to share at the moment. Please try again.",
        type: "error"
      });
    }
  };

  // ADDED: Function to fetch cart count
  const fetchCartCount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      if (cartSnap.exists()) {
        const items = cartSnap.data().items || [];
        setCartCount(items.reduce((total, item) => total + (item.quantity || 1), 0));
      } else {
        setCartCount(0);
      }
    } catch (err) {
      console.error("Error loading cart count:", err.message);
    }
  };

  // Real-time product data
  useEffect(() => {
    const docRef = doc(db, "products", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() };
        setProduct(productData);
        setLoading(false);
        
        // Initialize variants
        initializeVariants(productData);
        
        // Load related products
        loadRelatedProducts(productData);
        
        // Add to recently viewed
        addToRecentlyViewed(productData);
      } else {
        navigate('/home');
        showModal({
          title: "Product Not Found",
          message: "The product you're looking for doesn't exist.",
          type: "error"
        });
      }
    }, (error) => {
      console.error("Error fetching product:", error);
      showModal({
        title: "Error",
        message: "Failed to load product details.",
        type: "error"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate, showModal]);

  // Coupon fetching useEffect
  useEffect(() => {
    const couponsRef = collection(db, "coupons");

    const unsubscribe = onSnapshot(couponsRef, (snapshot) => {
      const now = new Date();

      const fetched = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => 
          c.isActive === true &&
          new Date(c.expiryDate) > now &&
          (c.usageLimit === undefined || c.usedCount < c.usageLimit)
        )
        .sort((a, b) => a.minOrder - b.minOrder);

      setCoupons(fetched);
      setCouponLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enhanced image navigation functions
  const nextImage = () => {
    if (variantImages.length > 0) {
      setSelectedImage((prev) => (prev + 1) % variantImages.length);
    }
  };

  const prevImage = () => {
    if (variantImages.length > 0) {
      setSelectedImage((prev) => (prev - 1 + variantImages.length) % variantImages.length);
    }
  };

  // Zoom functionality
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  // Fullscreen functionality
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsZoomed(false); // Reset zoom when entering/exiting fullscreen
  };

  // Thumbnail scroll functionality
  const scrollThumbnails = (direction) => {
    const scrollContainer = document.querySelector('.thumbnail-scroll');
    if (scrollContainer) {
      const scrollAmount = 200;
      scrollContainer.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Close fullscreen on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setIsZoomed(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Enhanced image error handling
  const handleImageError = (imageType, index) => {
    setImageErrors(prev => ({
      ...prev,
      [`${imageType}_${index}`]: true
    }));
  };

  const handleImageLoad = (imageType, index) => {
    setImageErrors(prev => ({
      ...prev,
      [`${imageType}_${index}`]: false
    }));
  };

  // Add product to recently viewed - FIXED VERSION
  const addToRecentlyViewed = async (productData) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const recentlyViewedRef = doc(db, "recentlyViewed", user.uid);
      const recentlyViewedSnap = await getDoc(recentlyViewedRef);
      
      let items = [];
      if (recentlyViewedSnap.exists()) {
        items = recentlyViewedSnap.data().items || [];
      }

      // Remove if already exists
      items = items.filter(item => item.id !== productData.id);
      
      // Add to beginning - ensure all fields have values
      const productToAdd = {
        id: productData.id || '',
        name: productData.name || '',
        price: productData.price || 0,
        originalPrice: productData.originalPrice || productData.price || 0,
        image: productData.images?.[0] || productData.image || '',
        category: productData.category || '',
        viewedAt: new Date().toISOString()
      };

      // Filter out any undefined/null values
      Object.keys(productToAdd).forEach(key => {
        if (productToAdd[key] === undefined || productToAdd[key] === null) {
          productToAdd[key] = '';
        }
      });

      items.unshift(productToAdd);

      // Keep only last 10 items
      items = items.slice(0, 10);

      await setDoc(recentlyViewedRef, { items }, { merge: true });
    } catch (error) {
      console.error("Error adding to recently viewed:", error);
    }
  };

  // Load recently viewed products
  const loadRecentlyViewed = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const recentlyViewedRef = doc(db, "recentlyViewed", user.uid);
      const recentlyViewedSnap = await getDoc(recentlyViewedRef);
      
      if (recentlyViewedSnap.exists()) {
        const items = recentlyViewedSnap.data().items || [];
        // Filter out current product
        const filteredItems = items.filter(item => item.id !== id);
        setRecentlyViewed(filteredItems.slice(0, 6));
      }
    } catch (error) {
      console.error("Error loading recently viewed:", error);
    }
  };

  // Load you may also like products - SIMPLIFIED to avoid index issues
  const loadYouMayAlsoLike = async (currentProduct) => {
    if (!currentProduct) return;

    try {
      const productsRef = collection(db, "products");
      // Simplified query to avoid multiple range fields
      const q = query(
        productsRef,
        where("id", "!=", currentProduct.id),
        limit(6)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setYouMayAlsoLike(products);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading you may also like:", error);
      // Fallback: use empty array
      setYouMayAlsoLike([]);
    }
  };

  // Load similar products - SIMPLIFIED to avoid index issues
  const loadSimilarProducts = async (currentProduct) => {
    if (!currentProduct) return;

    try {
      const productsRef = collection(db, "products");
      // Simplified query to avoid multiple range fields
      const q = query(
        productsRef,
        where("id", "!=", currentProduct.id),
        limit(6)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSimilarProducts(products);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading similar products:", error);
      // Fallback to you may also like
      setSimilarProducts([]);
    }
  };

  // Load all related products
  const loadRelatedProducts = async (currentProduct) => {
    setRelatedProductsLoading(true);
    
    await loadRecentlyViewed();
    
    const unsubscribe1 = await loadYouMayAlsoLike(currentProduct);
    const unsubscribe2 = await loadSimilarProducts(currentProduct);
    
    setRelatedProductsLoading(false);

    return () => {
      if (unsubscribe1) unsubscribe1();
      if (unsubscribe2) unsubscribe2();
    };
  };

  // Quick add to cart function for related products
  const quickAddToCart = async (product) => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to add items to cart",
        type: "error"
      });
      navigate('/login');
      return;
    }

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      
      const productToAdd = {
        id: product.id,
        name: product.name,
        price: product.price,
        displayPrice: product.price,
        image: product.images?.[0] || product.image || '',
        quantity: 1,
        addedAt: Date.now()
      };

      if (cartSnap.exists()) {
        const existingItems = cartSnap.data().items || [];
        const alreadyExists = existingItems.find(item => item.id === product.id);
        
        if (alreadyExists) {
          showModal({
            title: "Item Already in Cart",
            message: "This product is already in your cart",
            type: "info"
          });
          return;
        }

        await updateDoc(cartRef, {
          items: arrayUnion(productToAdd)
        });
      } else {
        await setDoc(cartRef, {
          items: [productToAdd]
        });
      }

      showModal({
        title: "Added to Cart",
        message: `${product.name} has been added to your cart`,
        type: "success"
      });

      setCartCount(prev => prev + 1);
    } catch (error) {
      console.error("Error adding to cart:", error);
      showModal({
        title: "Error",
        message: "Failed to add item to cart",
        type: "error"
      });
    }
  };

  // Initialize variants with default selections
  const initializeVariants = (productData) => {
    const initialVariants = {};
    let basePrice = productData.price || 0;
    
    if (productData.variants) {
      Object.keys(productData.variants).forEach(variantType => {
        const options = productData.variants[variantType];
        if (options && options.length > 0) {
          // Select first in-stock option, or first option if all are out of stock
          const inStockOption = options.find(opt => opt.inStock !== false) || options[0];
          if (inStockOption) {
            initialVariants[variantType] = inStockOption.value;
            // Add variant price to base price
            if (inStockOption.price) {
              basePrice += inStockOption.price;
            }
          }
        }
      });
    }

    // For clothing sizes (legacy support)
    if (productData.sizes && productData.sizes.length > 0) {
      const inStockSize = productData.sizes.find(size => size.inStock !== false) || productData.sizes[0];
      if (inStockSize) {
        initialVariants.size = inStockSize.value;
        if (inStockSize.price) {
          basePrice += inStockSize.price;
        }
      }
    }

    setSelectedVariants(initialVariants);
    setCurrentPrice(basePrice);
    updateVariantImages(productData, initialVariants);
  };

  // Update images when variant changes
  const updateVariantImages = (productData, variants) => {
    let images = productData.images || [];
    
    // Check if color variant has specific images
    if (variants.color && productData.variants?.colors) {
      const selectedColor = productData.variants.colors.find(
        color => color.value === variants.color
      );
      if (selectedColor && selectedColor.images && selectedColor.images.length > 0) {
        images = selectedColor.images;
      }
    }
    
    setVariantImages(images);
    setSelectedImage(0); // Reset to first image
  };

  // Enhanced variant selection with better stock handling
  const handleVariantSelect = (variantType, value, option) => {
    // Prevent selection of out-of-stock variants
    if (option?.inStock === false) {
      showModal({
        title: "Out of Stock",
        message: `This ${variantType} variant is currently unavailable. Please select another option.`,
        type: "error"
      });
      return;
    }
    
    const newVariants = {
      ...selectedVariants,
      [variantType]: value
    };
    
    setSelectedVariants(newVariants);
    
    // Recalculate price with new variants
    calculatePriceWithVariants(newVariants);
    
    // Update images if color variant changed
    if (variantType === 'color') {
      updateVariantImages(product, newVariants);
    }
  };

  // Calculate price with all selected variants
  const calculatePriceWithVariants = (variants) => {
    if (!product) return;
    
    let totalPrice = product.price || 0;
    
    // Add prices from all selected variants
    Object.entries(variants).forEach(([type, val]) => {
      if (!product.variants) return;

      // Handle plural naming (e.g., "color" → "colors")
      const variantKey = product.variants[type]
        ? type
        : type === "color"
        ? "colors"
        : type;

      const variantOptions = product.variants[variantKey];
      if (variantOptions) {
        const variantOption = variantOptions.find(opt => opt.value === val);
        if (variantOption && variantOption.price) {
          totalPrice += variantOption.price;
        }
      }
    });
    
    setCurrentPrice(totalPrice);
  };

  // Update price when product or variants change
  useEffect(() => {
    if (product && selectedVariants) {
      calculatePriceWithVariants(selectedVariants);
    }
  }, [product, selectedVariants]);

  // Get current variant option
  const getCurrentVariantOption = (variantType) => {
    if (!product?.variants || !product.variants[variantType]) return null;
    const option = product.variants[variantType].find(
      opt => opt.value === selectedVariants[variantType]
    );
    return option;
  };

  // Get display name for variant
  const getVariantDisplayName = (variantType, value) => {
    if (!product?.variants || !product.variants[variantType]) return value;
    const option = product.variants[variantType].find(opt => opt.value === value);
    return option ? option.name : value;
  };

  // Enhanced variant availability check
  const isVariantInStock = () => {
    if (!product?.variants) return product?.inStock;

    // Check each selected variant
    for (const [variantType, value] of Object.entries(selectedVariants)) {
      if (product.variants[variantType]) {
        const option = product.variants[variantType].find(opt => opt.value === value);
        if (option && option.inStock === false) {
          return false;
        }
      }
    }

    return product.inStock !== false;
  };

  // Get stock status message - ONLY returns when out of stock
  const getStockStatus = () => {
    if (!isVariantInStock()) {
      return {
        status: 'out-of-stock',
        message: 'This variant is currently out of stock',
        icon: 'fa-times-circle'
      };
    }
    
    // Return null when product is in stock (no status to show)
    return null;
  };

  // Get fallback image - UPDATED to use local placeholder
  const getFallbackImage = () => {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='16' fill='%23999' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
  };

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (!product.originalPrice || product.originalPrice <= currentPrice) return 0;
    return Math.round(((product.originalPrice - currentPrice) / product.originalPrice) * 100);
  };

  // Format price with Indian numbering system
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Delivery time calculation function (Production-ready)
  const calculateDeliveryDate = (pincode) => {
    // Mock delivery service - in production, this would call an API
    const today = new Date();
    const deliveryDays = {
      // Metro cities - 2-3 days
      '110001': 2, '400001': 2, '600001': 2, '700001': 2, '560001': 2,
      '380001': 2, '500001': 2, '110020': 2, '400020': 2,
      // Tier 2 cities - 3-4 days
      '302001': 3, '411001': 3, '530001': 3, '641001': 3, '395001': 3,
      // Other locations - 4-7 days
      'default': 5
    };

    const daysToAdd = deliveryDays[pincode] || deliveryDays['default'];
    
    // Add business days (skip weekends)
    let deliveryDate = new Date(today);
    let daysAdded = 0;
    
    while (daysAdded < daysToAdd) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
        daysAdded++;
      }
    }

    return deliveryDate;
  };

  // Check delivery serviceability
  const checkDeliveryServiceability = async (pincode) => {
    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPincodeError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsCheckingPincode(true);
    setPincodeError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock serviceable pincodes - in production, this would be a real API call
      const nonServiceablePincodes = ['123456', '654321', '111111'];
      
      if (nonServiceablePincodes.includes(pincode)) {
        setDeliveryInfo({
          serviceable: false,
          message: 'Sorry, we do not deliver to this pincode yet.'
        });
        return;
      }

      const deliveryDate = calculateDeliveryDate(pincode);
      const options = { weekday: 'short', day: 'numeric', month: 'short' };
      const formattedDate = deliveryDate.toLocaleDateString('en-IN', options);

      setDeliveryInfo({
        serviceable: true,
        deliveryDate: formattedDate,
        days: Math.ceil((deliveryDate - new Date()) / (1000 * 60 * 60 * 24)),
        message: `Delivery by ${formattedDate}`,
        isExpress: ['110001', '400001', '600001', '700001'].includes(pincode)
      });

    } catch (error) {
      console.error('Delivery check error:', error);
      setPincodeError('Unable to check delivery at the moment. Please try again.');
    } finally {
      setIsCheckingPincode(false);
    }
  };

  // Handle pincode input change
  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    
    if (value.length === 6) {
      checkDeliveryServiceability(value);
    } else {
      setDeliveryInfo(null);
      setPincodeError('');
    }
  };

  // Handle pincode check button click
  const handleCheckPincode = () => {
    if (pincode.length === 6) {
      checkDeliveryServiceability(pincode);
    } else {
      setPincodeError('Please enter a valid 6-digit pincode');
    }
  };

  // Get default delivery estimate (when no pincode is entered)
  const getDefaultDeliveryEstimate = () => {
    const today = new Date();
    const defaultDate = new Date(today);
    
    // Add 4-7 business days as default estimate
    let daysAdded = 0;
    while (daysAdded < 5) {
      defaultDate.setDate(defaultDate.getDate() + 1);
      if (defaultDate.getDay() !== 0 && defaultDate.getDay() !== 6) {
        daysAdded++;
      }
    }

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return `Usually delivered in 4-7 business days (by ${defaultDate.toLocaleDateString('en-IN', options)})`;
  };

  // Real-time cart count AND product-specific check
  useEffect(() => {
    let unsubscribe;
    const fetchCartCount = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const cartRef = doc(db, "carts", user.uid);
        unsubscribe = onSnapshot(cartRef, (cartSnap) => {
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            setCartCount(items.reduce((total, item) => total + (item.quantity || 1), 0));
            
            // Check if current product with same variants is in cart
            const productInCart = items.find(item => 
              item.id === product?.id && 
              JSON.stringify(item.selectedVariants) === JSON.stringify(selectedVariants)
            );
            setIsProductInCart(!!productInCart);
            
            // Set quantity if product is in cart
            if (productInCart) {
              setQuantity(productInCart.quantity || 1);
            } else {
              setQuantity(1);
            }
          } else {
            setCartCount(0);
            setIsProductInCart(false);
            setQuantity(1);
          }
        });
      } catch (err) {
        console.error("Error loading cart count:", err.message);
      }
    };

    if (product) {
      fetchCartCount();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [product?.id, selectedVariants]);

  // Real-time wishlist
  useEffect(() => {
    let unsubscribe;
    const fetchWishlist = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const wishlistRef = doc(db, "wishlists", user.uid);
        unsubscribe = onSnapshot(wishlistRef, (wishlistSnap) => {
          if (wishlistSnap.exists()) {
            const items = wishlistSnap.data().items || [];
            setWishlistIds(items.map((item) => item.id));
          }
        });
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      }
    };

    fetchWishlist();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Get quantity of this product in the cart
  const getCartQuantity = async () => {
    const user = auth.currentUser;
    if (!user) return 0;
    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      if (cartSnap.exists()) {
        const items = cartSnap.data().items || [];
        const item = items.find(i => 
          i.id === id && 
          JSON.stringify(i.selectedVariants) === JSON.stringify(selectedVariants)
        );
        return item ? item.quantity || 1 : 0;
      }
    } catch (e) {
      console.error("Error getting quantity:", e);
    }
    return 0;
  };

  const updateCartQuantity = async (newQty) => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to modify your cart",
        type: "error",
      });
      navigate('/login');
      return;
    }

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      let items = cartSnap.exists() ? [...cartSnap.data().items] : [];

      // Clean selectedVariants to remove any undefined values
      const cleanSelectedVariants = {};
      if (selectedVariants) {
        Object.keys(selectedVariants).forEach(key => {
          if (selectedVariants[key] !== undefined && selectedVariants[key] !== null) {
            cleanSelectedVariants[key] = selectedVariants[key];
          }
        });
      }

      // Find item with same ID and same variants
      const itemIndex = items.findIndex(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(cleanSelectedVariants)
      );

      if (itemIndex >= 0) {
        if (newQty <= 0) {
          // Remove item from cart
          items.splice(itemIndex, 1);
          setIsProductInCart(false);
          setQuantity(1);
          
          showModal({
            title: "Removed from Cart",
            message: `${product.name} has been removed from your cart`,
            type: "success"
          });
        } else {
          // Update quantity
          items[itemIndex].quantity = newQty;
          items[itemIndex].addedAt = new Date().toISOString();
          setQuantity(newQty);
        }
      } else if (newQty > 0) {
        // Add new item - with cleaned data
        const productToAdd = {
          id: product.id,
          name: product.name || '',
          price: product.price || 0,
          displayPrice: currentPrice || product.price || 0,
          selectedVariants: cleanSelectedVariants,
          image: variantImages[0] || product.images?.[0] || product.image || '',
          quantity: newQty,
          addedAt: new Date().toISOString(),
          productData: {
            name: product.name || '',
            category: product.category || '',
            variants: product.variants || {}
          }
        };
        items.push(productToAdd);
        setIsProductInCart(true);
        setQuantity(newQty);
      }

      // Clean the entire items array before saving
      const cleanItems = items.map(item => ({
        id: item.id || '',
        name: item.name || '',
        price: item.price || 0,
        displayPrice: item.displayPrice || item.price || 0,
        selectedVariants: item.selectedVariants || {},
        image: item.image || '',
        quantity: item.quantity || 1,
        addedAt: item.addedAt || new Date().toISOString(),
        productData: item.productData || {
          name: item.name || '',
          category: item.category || '',
          variants: item.variants || {}
        }
      }));

      await setDoc(cartRef, { 
        items: cleanItems,
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (err) {
      console.error("Error updating cart:", err);
      showModal({
        title: "Error",
        message: "Failed to update cart quantity",
        type: "error"
      });
    }
  };

  const handleAddToCart = async () => {
    triggerHapticFeedback('medium');
    await addToCart();
  };

  const handleBuyNow = async () => {
    triggerHapticFeedback('medium');
    await buyNow();
  };

  const handleToggleWishlist = async () => {
    triggerHapticFeedback('light');
    await toggleWishlist();
  };

  const addToCart = async () => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to add items to cart",
        type: "error"
      });
      navigate('/login');
      return;
    }

    // Check stock first
    if (!isVariantInStock()) {
      showModal({
        title: "Out of Stock",
        message: "This product variant is currently unavailable",
        type: "error"
      });
      return;
    }

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      
      // Clean selectedVariants to remove any undefined values
      const cleanSelectedVariants = {};
      if (selectedVariants) {
        Object.keys(selectedVariants).forEach(key => {
          if (selectedVariants[key] !== undefined && selectedVariants[key] !== null) {
            cleanSelectedVariants[key] = selectedVariants[key];
          }
        });
      }

      // Create a clean product object for cart
      const productToAdd = {
        id: product.id,
        name: product.name || '',
        price: product.price || 0,
        displayPrice: currentPrice || product.price || 0,
        selectedVariants: cleanSelectedVariants,
        image: variantImages[0] || product.images?.[0] || product.image || '',
        quantity: quantity || 1,
        addedAt: new Date().toISOString(),
        productData: {
          name: product.name || '',
          category: product.category || '',
          variants: product.variants || {}
        }
      };

      let existingItems = [];
      if (cartSnap.exists()) {
        existingItems = cartSnap.data().items || [];
      }

      // Check if same product with same variants already exists
      const existingItemIndex = existingItems.findIndex(item => 
        item.id === product.id && 
        JSON.stringify(item.selectedVariants || {}) === JSON.stringify(cleanSelectedVariants)
      );

      if (existingItemIndex >= 0) {
        // Update quantity if already exists
        existingItems[existingItemIndex].quantity += quantity;
        existingItems[existingItemIndex].addedAt = new Date().toISOString();
      } else {
        // Add new item
        existingItems.push(productToAdd);
      }

      // Clean all items before saving
      const cleanExistingItems = existingItems.map(item => ({
        id: item.id || '',
        name: item.name || '',
        price: item.price || 0,
        displayPrice: item.displayPrice || item.price || 0,
        selectedVariants: item.selectedVariants || {},
        image: item.image || '',
        quantity: item.quantity || 1,
        addedAt: item.addedAt || new Date().toISOString(),
        productData: item.productData || {
          name: item.name || '',
          category: item.category || '',
          variants: item.variants || {}
        }
      }));

      // Update cart
      await setDoc(cartRef, { 
        items: cleanExistingItems,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      showModal({
        title: "Added to Cart",
        message: `${product.name} has been added to your cart`,
        type: "success"
      });

      // Update cart count
      setCartCount(prev => prev + quantity);

    } catch (error) {
      console.error("Error adding to cart:", error);
      showModal({
        title: "Error",
        message: "Failed to add item to cart. Please try again.",
        type: "error"
      });
    }
  };

  const toggleWishlist = async () => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to manage wishlist",
        type: "error"
      });
      navigate('/login');
      return;
    }

    try {
      const wishlistRef = doc(db, "wishlists", user.uid);
      const wishlistSnap = await getDoc(wishlistRef);
      let wishlistItems = wishlistSnap.exists() ? wishlistSnap.data().items || [] : [];

      const isInWishlist = wishlistItems.some(item => item.id === product.id);

      if (isInWishlist) {
        // Remove from wishlist
        wishlistItems = wishlistItems.filter(item => item.id !== product.id);
        setWishlistIds(prev => prev.filter(id => id !== product.id));
        
        showModal({
          title: "Removed from Wishlist",
          message: `${product.name} removed from your wishlist`,
          type: "success"
        });
      } else {
        // Add to wishlist
        const wishlistItem = {
          id: product.id,
          name: product.name,
          price: currentPrice,
          image: variantImages[0] || product.images?.[0] || product.image || '',
          category: product.category,
          addedAt: Date.now(),
        };
        wishlistItems.push(wishlistItem);
        setWishlistIds(prev => [...prev, product.id]);
        
        showModal({
          title: "Added to Wishlist",
          message: `${product.name} added to your wishlist`,
          type: "success"
        });
      }

      await setDoc(wishlistRef, { 
        items: wishlistItems,
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error("Error updating wishlist:", error);
      showModal({
        title: "Error",
        message: "Failed to update wishlist. Please try again.",
        type: "error"
      });
    }
  };

  const buyNow = async () => {
    // Check stock first
    if (!isVariantInStock()) {
      showModal({
        title: "Out of Stock",
        message: "This product variant is currently unavailable",
        type: "error",
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to proceed with your purchase",
        type: "error"
      });
      navigate('/login');
      return;
    }

    try {
      const cartRef = doc(db, "carts", user.uid);
      
      // Clean selectedVariants to remove any undefined values
      const cleanSelectedVariants = {};
      if (selectedVariants) {
        Object.keys(selectedVariants).forEach(key => {
          if (selectedVariants[key] !== undefined && selectedVariants[key] !== null) {
            cleanSelectedVariants[key] = selectedVariants[key];
          }
        });
      }

      // Create the product object with cleaned data
      const productToBuy = {
        id: product.id,
        name: product.name || '',
        price: product.price || 0,
        displayPrice: currentPrice || product.price || 0,
        selectedVariants: cleanSelectedVariants,
        image: variantImages[0] || product.images?.[0] || product.image || '',
        productData: {
          name: product.name || '',
          category: product.category || '',
          variants: product.variants || {}
        },
        quantity: quantity || 1,
        addedAt: new Date().toISOString(),
        buyNow: true
      };

      // Set the document with cleaned data
      await setDoc(cartRef, {
        items: [productToBuy],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      setCartCount(quantity);
      navigate('/checkout');
      
    } catch (error) {
      console.error("Buy Now Error:", error);
      showModal({
        title: "Error",
        message: "Failed to process your order. Please try again.",
        type: "error"
      });
    }
  };

  // Enhanced variant selector with better stock display
  const renderVariantSelector = (variantType, options, label) => {
    if (!options || options.length === 0) return null;

    return (
      <div className="variant-selector">
        <label>{label}:</label>
        <div className="variant-options">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              className={`variant-option ${
                selectedVariants[variantType] === option.value ? 'selected' : ''
              } ${option.inStock === false ? 'out-of-stock' : ''} ${
                option.stockLevel === 'low' ? 'low-stock' : ''
              }`}
              onClick={() => handleVariantSelect(variantType, option.value, option)}
              disabled={option.inStock === false}
              title={
                option.inStock === false 
                  ? 'Out of stock' 
                  : option.stockLevel === 'low' 
                    ? 'Low stock - Only a few left!' 
                    : option.name
              }
            >
              {option.name}
              {option.price && option.price > 0 && (
                <span className="variant-price"> (+₹{option.price})</span>
              )}
              {option.stockLevel === 'low' && option.inStock !== false && (
                <div className="low-stock-indicator">!</div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced color selector with better stock indicators
  const renderColorSelector = (colors) => {
    if (!colors || colors.length === 0) return null;

    return (
      <div className="variant-selector color-selector">
        <label>Color:</label>
        <div className="color-options">
          {colors.map((color, index) => (
            <div key={index} className="color-option-container">
              <button
                type="button"
                className={`color-option ${
                  selectedVariants.color === color.value ? 'selected' : ''
                } ${color.inStock === false ? 'out-of-stock' : ''} ${
                  color.stockLevel === 'low' ? 'low-stock' : ''
                }`}
                onClick={() => handleVariantSelect('color', color.value, color)}
                disabled={color.inStock === false}
                title={
                  color.inStock === false 
                    ? `${color.name} - Out of stock` 
                    : color.stockLevel === 'low' 
                      ? `${color.name} - Low stock` 
                      : color.name
                }
              >
                <div
                  className="color-swatch"
                  style={{
                    backgroundColor: color.hex || color.value,
                    border:
                      color.hex === '#ffffff' || color.value === 'white'
                        ? '1px solid #ccc'
                        : 'none',
                  }}
                >
                  {color.images && color.images.length > 0 && (
                    <img
                      src={color.images[0]}
                      alt={color.name}
                      className="color-preview-image"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  )}
                  {color.stockLevel === 'low' && color.inStock !== false && (
                    <div className="low-stock-badge">!</div>
                  )}
                </div>
                <span className="color-name">
                  {color.name}
                  {selectedVariants.color === color.value && ' ✓'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Enhanced size selector
  const renderSizeSelector = (sizes, label) => {
    if (!sizes || sizes.length === 0) return null;

    return (
      <div className="variant-selector size-selector">
        <label>{label}:</label>
        <div className="size-options">
          {sizes.map((size, index) => (
            <button
              key={index}
              type="button"
              className={`size-option ${
                selectedVariants.size === size.value ? 'selected' : ''
              } ${size.inStock === false ? 'out-of-stock' : ''} ${
                size.stockLevel === 'low' ? 'low-stock' : ''
              }`}
              onClick={() => handleVariantSelect('size', size.value, size)}
              disabled={size.inStock === false}
              title={
                size.inStock === false 
                  ? 'Out of stock' 
                  : size.stockLevel === 'low' 
                    ? 'Low stock' 
                    : ''
              }
            >
              {size.name}
              {size.stockLevel === 'low' && size.inStock !== false && (
                <span className="low-stock-dot"></span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Get generated description function
  const getGeneratedDescription = (product) => {
    if (product.description) return product.description;

    const name = product.name || "This item";
    const category = product.category || "product";
    const keywords = product.keywords?.join(", ") || "";

    return `${name} is a high-quality ${category} designed to meet your daily needs. Featuring ${keywords}, it's perfect for any occasion.`;
  };

  // Get AI generated description
  const generateAIDescription = () => {
    if (!product) return "";

    const name = product.name || "this product";
    const category = product.category || "item";

    const specs = product.specifications
      ? (Array.isArray(product.specifications)
          ? product.specifications.map(s => `${s.key}: ${s.value}`).join(", ")
          : Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join(", "))
      : "";

    return `${name} is crafted with precision and engineered to deliver exceptional quality. This ${category} combines modern design with practical functionality, making it ideal for everyday use. Key Features: • Premium build and excellent durability • Smooth performance with reliable components • Comfortable, stylish and made for long-term use • Specifications include: ${specs} Experience a perfect balance of aesthetics, utility, and value with ${name}.`;
  };

  // Define finalDescription for use in JSX
  const finalDescription = product && product.description && product.description.length > 20
    ? product.description
    : product ? generateAIDescription() : "";

  // Mobile Sticky Action Buttons Component
  const MobileStickyActions = () => {
    if (!product || isMobile === false) return null;

    return (
      <div className="mobile-action-buttons-sticky">
        <div className="mobile-sticky-actions">
          {isProductInCart ? (
            <div className="quantity-controls mobile-quantity-controls">
              <button 
                onClick={() => updateCartQuantity(quantity - 1)}
                disabled={!isVariantInStock() || quantity <= 1}
                className="quantity-btn minus"
                title="Decrease quantity"
              >
                <i className="fas fa-minus"></i>
              </button>
              <span className="quantity-display">
                <i className="fas fa-shopping-cart"></i> {quantity}
              </span>
              <button 
                onClick={() => updateCartQuantity(quantity + 1)}
                disabled={!isVariantInStock()}
                className="quantity-btn plus"
                title="Increase quantity"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          ) : (
            <button
              className="add-to-cart mobile-add-to-cart"
              onClick={handleAddToCart}
              disabled={!isVariantInStock()}
              title={!isVariantInStock() ? "This variant is out of stock" : "Add to cart"}
            >
              <i className="fas fa-shopping-cart"></i>
              {!isVariantInStock() ? 'Out of Stock' : 'Add to Cart'}
            </button>
          )}

          <button 
            className="buy-now mobile-buy-now" 
            onClick={handleBuyNow}
            disabled={!isVariantInStock()}
            title={!isVariantInStock() ? "This variant is out of stock" : "Buy now"}
          >
            <i className="fas fa-bolt"></i>
            {!isVariantInStock() ? 'Unavailable' : 'Buy Now'}
          </button>

          <WishlistButton
            isActive={wishlistIds.includes(product.id)}
            size="small"
            className="mobile-wishlist-btn"
            onClick={handleToggleWishlist}
            title={wishlistIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          />
        </div>
      </div>
    );
  };

  // Loading states
  if (loading) {
    return isMobile ? (
      <MobileLayout>
        <div className="mobile-loading-spinner">
          <div className="spinner"></div>
          <p>Loading product details...</p>
        </div>
      </MobileLayout>
    ) : (
      <>
        <Navbar cartCount={cartCount} />
        <div className="layout">
          <Sidebar />
          <div className="loading-spinner">Loading...</div>
        </div>
      </>
    );
  }

  if (!product) {
    return isMobile ? (
      <MobileLayout>
        <div className="mobile-product-not-found">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Product Not Found</h3>
          <p>The product you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/')} className="mobile-back-button">
            Back to Home
          </button>
        </div>
      </MobileLayout>
    ) : (
      <>
        <Navbar cartCount={cartCount} />
        <div className="layout">
          <Sidebar />
          <div className="product-not-found">Product not found</div>
        </div>
      </>
    );
  }

  // Get stock status - will be null when in stock
  const stockStatus = getStockStatus();

  // Calculate discount for related products
  const calculateDiscountForCard = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  // Create the main product detail content
  const productDetailContent = (
    <ErrorBoundary>
      <div className={`product-detail-container ${isMobile ? 'mobile-product-detail-container' : ''}`}>
        <div className={`product-detail ${isMobile ? 'mobile-product-detail' : ''}`}>
          
          {/* Product Gallery Section */}
          <div className="product-gallery">

            {/* MAIN IMAGE */}
            <div
              className="main-image-box"
              onClick={() => setIsFullscreen(true)}
            >
              <img
                src={variantImages[selectedImage]}
                className="main-product-image"
                alt={product.name || "Product"}
                onLoad={() => handleImageLoad('main', selectedImage)}
                onError={() => handleImageError('main', selectedImage)}
              />
            </div>

            {/* LEFT THUMBNAILS */}
            <div className="thumbnail-list">
              {variantImages.map((img, index) => (
                <div
                  key={index}
                  className={`thumbnail-item ${selectedImage === index ? "active" : ""}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img 
                    src={img} 
                    alt={`${product.name} - view ${index + 1}`}
                    onLoad={() => handleImageLoad('thumbnail', index)}
                    onError={() => handleImageError('thumbnail', index)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Fullscreen Modal */}
          {isFullscreen && !isMobile && (
            <div className="image-fullscreen" onClick={toggleFullscreen}>
              <button className="fullscreen-close" onClick={toggleFullscreen}>
                ×
              </button>
              
              {variantImages.length > 1 && (
                <>
                  <button className="fullscreen-nav prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                    ‹
                  </button>
                  <button className="fullscreen-nav next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                    ›
                  </button>
                </>
              )}
              
              <img 
                src={variantImages[selectedImage] || getFallbackImage()} 
                alt={product.name || "Product"}
                className="fullscreen-image"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain' }}
              />
              
              <div className="image-counter">
                {selectedImage + 1} / {variantImages.length}
              </div>
            </div>
          )}

          <div className={`product-info ${isMobile ? 'mobile-product-info' : ''}`}>
            {/* Product Header Section */}
            <div className="product-header">
              <div className="product-title-section">
                <h1>{product.name}</h1>
                {!isMobile && (
                  <div className="product-actions">
                    {/* Animated Wishlist Button */}
                    <WishlistButton
                      isActive={wishlistIds.includes(product.id)}
                      size="small"
                      className="animated-wishlist-btn"
                      onClick={handleToggleWishlist}
                      title={wishlistIds.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    />
                    
                    {/* Animated Share Button */}
                    <ShareButton
                      size="small"
                      icon={true}
                      onShare={handleShare}
                      className="animated-share-btn"
                      title="Share this product"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Price Section */}
            <div className="price-section">
              <div className="price-main">
                <span className="current-price">₹{formatPrice(currentPrice)}</span>
                {product.originalPrice && product.originalPrice > currentPrice && (
                  <div className="original-price-container">
                    <span className="original-price">₹{formatPrice(product.originalPrice)}</span>
                    <span className="discount-percent">{calculateDiscount()}% OFF</span>
                  </div>
                )}
              </div>
              <div className="tax-info">MRP incl. of all taxes</div>
            </div>
            
            {/* Stock Status Display */}
            {stockStatus && (
              <div className={`stock-status ${stockStatus.status}`}>
                <i className={`fas ${stockStatus.icon}`}></i>
                {stockStatus.message}
              </div>
            )}
            
            {/* Variant Selectors */}
            {product.variants && (
              <div className="variant-selectors">
                {/* Color Selector */}
                {product.variants.colors && renderColorSelector(product.variants.colors, "Color")}
                
                {/* Storage Selector */}
                {product.variants.storage && renderVariantSelector("storage", product.variants.storage, "Storage")}
                
                {/* RAM Selector */}
                {product.variants.ram && renderVariantSelector("ram", product.variants.ram, "RAM")}
              </div>
            )}

            {/* Legacy Size Selector for Clothing */}
            {product.sizes && renderSizeSelector(product.sizes, "Size")}

           

            {/* Enhanced Delivery Section */}
            <div className="delivery-section">
              <div className="delivery-header">
                <i className="fas fa-truck"></i>
                <h3>Delivery</h3>
              </div>
              
              {!deliveryInfo ? (
                <div className="delivery-default">
                  <p className="delivery-estimate">{getDefaultDeliveryEstimate()}</p>
                </div>
              ) : deliveryInfo.serviceable ? (
                <div className="delivery-success">
                  <div className="delivery-info">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <p className="delivery-date">{deliveryInfo.message}</p>
                      {deliveryInfo.isExpress && (
                        <p className="express-delivery">
                          <i className="fas fa-bolt"></i>
                          Express delivery available
                        </p>
                      )}
                      <p className="delivery-days">Order within next 4 hours</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="delivery-error">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>{deliveryInfo.message}</p>
                </div>
              )}

              <div className="delivery-features">
                <div className="delivery-feature">
                  <i className="fas fa-sync-alt"></i>
                  <span>Free & easy returns</span>
                </div>
                <div className="delivery-feature">
                  <i className="fas fa-shield-alt"></i>
                  <span>100% secure delivery</span>
                </div>
              </div>
            </div>

            <div className="features-grid">
              <div className="feature-item">
                <i className="fas fa-sync-alt"></i>
                <span>Easy 30 Days Return</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-truck"></i>
                <span>Free Shipping</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-gift"></i>
                <span>Gift Wrap available for ₹50</span>
              </div>
            </div>

            <div className="offers-section">
              <h3 className="offers-title">Offers For You</h3>

              {couponLoading ? (
                <div className="coupon-loader">Loading offers...</div>
              ) : coupons.length === 0 ? (
                <div className="no-offers">No offers available right now</div>
              ) : (
                <div className="coupon-list">
                  {coupons.map(c => (
                    <div className="coupon-card" key={c.id}>
                      
                      <div className="coupon-left">
                        <div className="coupon-code">{c.code}</div>
                        <p className="coupon-desc">{c.description}</p>

                        <div className="coupon-tags">
                          {c.firstOrderOnly && <span className="tag first-order">First Order</span>}
                          {c.type === "percentage" && <span className="tag percent">{c.value}% Off</span>}
                          {c.type === "flat" && <span className="tag flat">₹{c.value} Off</span>}
                        </div>
                      </div>

                      <div className="coupon-right">
                        <CopyButton 
                          text={c.code}
                          size="small"
                          className="copy-coupon-btn"
                          onCopy={(result) => {
                            if (result.success) {
                              showModal({
                                title: "Coupon Copied!",
                                message: `Coupon code "${c.code}" copied to clipboard`,
                                type: "success"
                              });
                            }
                          }}
                        >
                          Copy Code
                        </CopyButton>
                        <span className="expiry">
                          Expires: {new Date(c.expiryDate).toLocaleDateString("en-IN")}
                        </span>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Sticky Action Buttons - Only on mobile */}
            {isMobile && <MobileStickyActions />}

            {/* Desktop Action Buttons - Only on desktop */}
            {!isMobile && (
              <div className="action-buttons desktop-action-buttons">
                {isProductInCart ? (
                  <div className="quantity-controls">
                    <button 
                      onClick={() => updateCartQuantity(quantity - 1)}
                      disabled={!isVariantInStock()}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span>{quantity} in Cart</span>
                    <button 
                      onClick={() => updateCartQuantity(quantity + 1)}
                      disabled={!isVariantInStock()}
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="add-to-cart"
                    onClick={handleAddToCart}
                    disabled={!isVariantInStock()}
                    title={!isVariantInStock() ? "This variant is out of stock" : "Add to cart"}
                  >
                    <i className="fas fa-shopping-cart"></i> 
                    {!isVariantInStock() ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                )}

                <button 
                  className="buy-now" 
                  onClick={handleBuyNow}
                  disabled={!isVariantInStock()}
                  title={!isVariantInStock() ? "This variant is out of stock" : "Buy now"}
                >
                  <i className="fas fa-bolt"></i> 
                  {!isVariantInStock() ? 'Unavailable' : 'Buy Now'}
                </button>

                {/* Desktop Animated Wishlist Button */}
                <WishlistButton
                  isActive={wishlistIds.includes(product.id)}
                  size="medium"
                  className="desktop-wishlist-btn"
                  onClick={handleToggleWishlist}
                >
                  {wishlistIds.includes(product.id) ? 'Saved' : 'Save'}
                </WishlistButton>
              </div>
            )}

            {/* PRODUCT DESCRIPTION */}
            <div className="product-description-section">
              <h3 className="section-title">Product Description</h3>
              <p className="product-description-text">
                {finalDescription}
              </p>

              {/* SPECIFICATIONS */}
              {product.specifications && (
                <div className="specifications-section">
                  <h3 className="section-title">Specifications</h3>
                  <div className="spec-table">
                    {/* ARRAY TYPE */}
                    {Array.isArray(product.specifications) &&
                      product.specifications.map((item, index) => (
                        <div className="spec-row" key={index}>
                          <div className="spec-left">
                            <i className={getSpecIcon(item.key)}></i>
                            <span className="spec-key">{item.key}</span>
                          </div>
                          <span className="spec-value">{item.value}</span>
                        </div>
                      ))}
                    
                    {/* OBJECT TYPE */}
                    {!Array.isArray(product.specifications) &&
                      Object.entries(product.specifications).map(([key, value], index) => (
                        <div className="spec-row" key={index}>
                          <div className="spec-left">
                            <i className={getSpecIcon(key)}></i>
                            <span className="spec-key">{key}</span>
                          </div>
                          <span className="spec-value">{value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products Sections - UPDATED: Using Global ProductCard */}
        <div className="related-products-sections">
          {/* Recently Viewed */}
          <div className="related-products-section">
            <h3>Recently Viewed</h3>
            {relatedProductsLoading ? (
              <div className="related-products-loading">Loading recently viewed...</div>
            ) : recentlyViewed.length > 0 ? (
              <div className="products-grid">
                {recentlyViewed.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    onCartUpdate={fetchCartCount}
                    wishlistIds={wishlistIds}
                    toggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <div className="related-products-empty">No recently viewed items</div>
            )}
          </div>

          {/* You May Also Like */}
          <div className="related-products-section">
            <h3>You May Also Like</h3>
            {relatedProductsLoading ? (
              <div className="related-products-loading">Loading recommendations...</div>
            ) : youMayAlsoLike.length > 0 ? (
              <div className="products-grid">
                {youMayAlsoLike.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    onCartUpdate={fetchCartCount}
                    wishlistIds={wishlistIds}
                    toggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <div className="related-products-empty">No recommendations available</div>
            )}
          </div>

          {/* Similar Products */}
          <div className="related-products-section">
            <h3>Similar Products</h3>
            {relatedProductsLoading ? (
              <div className="related-products-loading">Loading similar products...</div>
            ) : similarProducts.length > 0 ? (
              <div className="products-grid">
                {similarProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    onCartUpdate={fetchCartCount}
                    wishlistIds={wishlistIds}
                    toggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            ) : (
              <div className="related-products-empty">No similar products found</div>
            )}
          </div>
        </div>

        {/* Additional Sections */}
        <div className="additional-sections">
          <div className="shipping-details">
            <h3>Shipping & Returns</h3>
            <ul>
              <li>Free express shipping on orders above ₹999</li>
              <li>No questions asked 30 days return policy</li>
              <li>Cash on delivery available</li>
              <li>100% quality guarantee</li>
              <li>Secure packaging</li>
              <li>Track your order in real-time</li>
            </ul>
            <button className="show-more-btn">View Shipping Policy</button>
          </div>

          <div className="reviews-section">
            <h2>Customer Reviews</h2>
            <ReviewBlock productId={id} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );

  // Return the appropriate layout based on device
  return isMobile ? (
    <MobileLayout>
      {productDetailContent}
    </MobileLayout>
  ) : (
    <>
      <Navbar cartCount={cartCount} />
      <div className="layout">
        <Sidebar />
        {productDetailContent}
      </div>
    </>
  );
}

// Complete Professional ReviewBlock Component with Premium Features
function ReviewBlock({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [title, setTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState(0);
  const [showMediaOnly, setShowMediaOnly] = useState(false);
  const [userVotes, setUserVotes] = useState({});
  
  const user = auth.currentUser;
  const { showModal } = useGlobalModal();
  const navigate = useNavigate(); // Added navigate
  const fileInputRef = useRef(null); // Added useRef

  // Stats for review summary
  const reviewStats = {
    total: reviews.length,
    average: reviews.length ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) : 0,
    distribution: {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    }
  };

  // Fetch reviews with real-time updates
  useEffect(() => {
    if (!productId) return;
    
    let q;
    if (sortBy === 'helpful') {
      q = query(
        collection(db, "products", productId, "reviews"), 
        orderBy("helpfulCount", "desc"),
        orderBy("timestamp", "desc")
      );
    } else if (sortBy === 'highest') {
      q = query(
        collection(db, "products", productId, "reviews"), 
        orderBy("rating", "desc"),
        orderBy("timestamp", "desc")
      );
    } else if (sortBy === 'lowest') {
      q = query(
        collection(db, "products", productId, "reviews"), 
        orderBy("rating", "asc"),
        orderBy("timestamp", "desc")
      );
    } else {
      // newest first
      q = query(
        collection(db, "products", productId, "reviews"), 
        orderBy("timestamp", "desc")
      );
    }
    
    const unsub = onSnapshot(q, (snapshot) => {
      const reviewList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply rating filter if set
      let filteredReviews = reviewList;
      if (filterRating > 0) {
        filteredReviews = reviewList.filter(r => r.rating === filterRating);
      }
      
      // Apply media filter if set
      if (showMediaOnly) {
        filteredReviews = filteredReviews.filter(r => 
          (r.media && r.media.length > 0) || 
          (r.videos && r.videos.length > 0)
        );
      }
      
      setReviews(filteredReviews);
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsub();
  }, [productId, sortBy, filterRating, showMediaOnly]);

  // Load user votes from localStorage
  useEffect(() => {
    if (user) {
      const savedVotes = localStorage.getItem(`reviewVotes_${user.uid}`);
      if (savedVotes) {
        setUserVotes(JSON.parse(savedVotes));
      }
    }
  }, [user]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.slice(0, 5 - selectedFiles.length); // Max 5 files
    
    validFiles.forEach(file => {
      // Validate file types
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
      
      if (!validImageTypes.includes(file.type) && !validVideoTypes.includes(file.type)) {
        showModal({
          title: "Invalid File Type",
          message: "Please upload only images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, OGG)",
          type: "error"
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showModal({
          title: "File Too Large",
          message: "Each file must be less than 10MB",
          type: "error"
        });
        return;
      }
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  // Remove selected file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files to Firebase Storage
  const uploadFiles = async () => {
    if (!selectedFiles.length) return { images: [], videos: [] };
    
    // Check if storage is available
    if (!storage) {
      console.error('Firebase Storage not available');
      showModal({
        title: "Upload Error",
        message: "File upload is not available at the moment.",
        type: "error"
      });
      return { images: [], videos: [] };
    }
    
    setUploading(true);
    const uploadedImages = [];
    const uploadedVideos = [];
    
    try {
      for (const file of selectedFiles) {
        const timestamp = Date.now();
        const fileName = `${user.uid}_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `reviews/${productId}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        if (file.type.startsWith('image/')) {
          uploadedImages.push({
            url: downloadURL,
            thumbnail: downloadURL,
            type: 'image'
          });
        } else if (file.type.startsWith('video/')) {
          uploadedVideos.push({
            url: downloadURL,
            thumbnail: null, // You could generate thumbnails here
            type: 'video'
          });
        }
      }
      
      setUploading(false);
      return { images: uploadedImages, videos: uploadedVideos };
      
    } catch (error) {
      console.error("Error uploading files:", error);
      setUploading(false);
      throw error;
    }
  };

  // Submit review
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to submit a review",
        type: "error"
      });
      return;
    }
    
    if (!rating) {
      showModal({
        title: "Rating Required",
        message: "Please select a rating before submitting",
        type: "error"
      });
      return;
    }
    
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      showModal({
        title: "Review Too Short",
        message: "Please write a detailed review (minimum 10 characters)",
        type: "error"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      let media = { images: [], videos: [] };
      
      // Upload files if any
      if (selectedFiles.length > 0) {
        media = await uploadFiles();
      }
      
      // Create review data
      const reviewData = {
        userId: user.uid,
        userName: user.displayName || "Verified Buyer",
        userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random`,
        rating,
        title: title.trim() || null,
        text: reviewText.trim(),
        media: media.images,
        videos: media.videos,
        timestamp: serverTimestamp(),
        date: new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        helpfulCount: 0,
        verifiedPurchase: true, // You can implement actual verification logic
        featured: Math.random() < 0.1, // Randomly feature 10% of reviews
        reactions: {
          helpful: 0,
          funny: 0,
          love: 0
        }
      };
      
      // Add review to Firestore
      await addDoc(collection(db, "products", productId, "reviews"), reviewData);
      
      // Clear form
      setReviewText('');
      setTitle('');
      setRating(0);
      setSelectedFiles([]);
      
      // Show success message
      showModal({
        title: "Review Submitted!",
        message: "Thank you for sharing your experience. Your review helps other customers.",
        type: "success"
      });
      
    } catch (err) {
      console.error("Submit review error:", err);
      showModal({
        title: "Error",
        message: "Failed to submit review. Please try again.",
        type: "error"
      });
    }
    
    setSubmitting(false);
    setUploading(false);
  };

  // Handle helpful vote
  const handleVoteHelpful = async (reviewId, currentCount) => {
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to vote on reviews",
        type: "error"
      });
      return;
    }
    
    const voteKey = `${productId}_${reviewId}`;
    const hasVoted = userVotes[voteKey]?.helpful || false;
    
    try {
      const reviewRef = doc(db, "products", productId, "reviews", reviewId);
      
      if (hasVoted) {
        // Remove vote
        await updateDoc(reviewRef, {
          helpfulCount: Math.max(0, currentCount - 1)
        });
        
        const newVotes = { ...userVotes };
        delete newVotes[voteKey];
        setUserVotes(newVotes);
        localStorage.setItem(`reviewVotes_${user.uid}`, JSON.stringify(newVotes));
        
      } else {
        // Add vote
        await updateDoc(reviewRef, {
          helpfulCount: currentCount + 1
        });
        
        const newVotes = {
          ...userVotes,
          [voteKey]: { helpful: true }
        };
        setUserVotes(newVotes);
        localStorage.setItem(`reviewVotes_${user.uid}`, JSON.stringify(newVotes));
      }
      
    } catch (error) {
      console.error("Error updating vote:", error);
    }
  };

  // Handle reaction
  const handleReaction = async (reviewId, reactionType) => {
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to react to reviews",
        type: "error"
      });
      return;
    }
    
    const voteKey = `${productId}_${reviewId}_${reactionType}`;
    const hasReacted = userVotes[voteKey] || false;
    
    try {
      const reviewRef = doc(db, "products", productId, "reviews", reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (reviewDoc.exists()) {
        const currentReactions = reviewDoc.data().reactions || { helpful: 0, funny: 0, love: 0 };
        
        if (hasReacted) {
          // Remove reaction
          await updateDoc(reviewRef, {
            [`reactions.${reactionType}`]: Math.max(0, currentReactions[reactionType] - 1)
          });
          
          const newVotes = { ...userVotes };
          delete newVotes[voteKey];
          setUserVotes(newVotes);
          
        } else {
          // Add reaction
          await updateDoc(reviewRef, {
            [`reactions.${reactionType}`]: currentReactions[reactionType] + 1
          });
          
          const newVotes = {
            ...userVotes,
            [voteKey]: true
          };
          setUserVotes(newVotes);
        }
        
        localStorage.setItem(`reviewVotes_${user.uid}`, JSON.stringify(userVotes));
      }
      
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  // Report review
  const handleReport = async (reviewId) => {
    const reason = prompt("Please specify the reason for reporting this review:", "Inappropriate content");
    
    if (reason && user) {
      try {
        await addDoc(collection(db, "reportedReviews"), {
          productId,
          reviewId,
          userId: user.uid,
          reason,
          timestamp: serverTimestamp()
        });
        
        showModal({
          title: "Review Reported",
          message: "Thank you for your report. Our team will review it shortly.",
          type: "success"
        });
        
      } catch (error) {
        console.error("Error reporting review:", error);
      }
    }
  };

  // Delete review
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    
    try {
      await deleteDoc(doc(db, "products", productId, "reviews", id));
      showModal({
        title: "Review Deleted",
        message: "Your review has been deleted",
        type: "success"
      });
    } catch (err) {
      console.error("Delete error:", err);
      showModal({
        title: "Error",
        message: "Failed to delete review",
        type: "error"
      });
    }
  };

  // Edit review
  const handleEdit = async (id, oldTitle, oldText, oldRating) => {
    const newTitle = prompt("Edit review title:", oldTitle || "");
    if (newTitle === null) return;
    
    const newText = prompt("Edit your review:", oldText);
    if (newText === null) return;
    
    const newRatingInput = prompt("Edit your rating (1-5):", oldRating);
    if (newRatingInput === null) return;
    
    const newRating = Number(newRatingInput);
    
    if (!newText || newText.trim().length < 10 || !newRating || newRating < 1 || newRating > 5) {
      showModal({
        title: "Invalid Input",
        message: "Please provide valid text (minimum 10 characters) and rating (1-5)",
        type: "error"
      });
      return;
    }

    try {
      await updateDoc(doc(db, "products", productId, "reviews", id), {
        title: newTitle.trim() || null,
        text: newText.trim(),
        rating: newRating,
        timestamp: serverTimestamp(),
        date: new Date().toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      });
      
      showModal({
        title: "Review Updated",
        message: "Your review has been updated successfully",
        type: "success"
      });
      
    } catch (err) {
      console.error("Edit error:", err);
      showModal({
        title: "Error",
        message: "Failed to update review",
        type: "error"
      });
    }
  };

  // Load more reviews
  const loadMore = () => setVisibleCount(prev => prev + 6);

  // Calculate percentage for rating bar
  const calculatePercentage = (count) => {
    return reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
  };

  return (
    <div className="premium-review-section">
      {/* Review Summary Header */}
      <div className="review-header">
        <div className="review-summary">
          <div className="average-rating-box">
            <div className="average-number">{reviewStats.average.toFixed(1)}</div>
            <div className="stars-large">
              {[...Array(5)].map((_, i) => (
                <i 
                  key={i} 
                  className={`fas fa-star ${i < Math.floor(reviewStats.average) ? 'filled' : ''} ${i === Math.floor(reviewStats.average) && reviewStats.average % 1 >= 0.5 ? 'half' : ''}`}
                ></i>
              ))}
            </div>
            <div className="review-count">{reviewStats.total} verified reviews</div>
          </div>
          
          <div className="rating-distribution">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="distribution-row" onClick={() => setFilterRating(filterRating === star ? 0 : star)}>
                <span className="star-label">{star} star{star !== 1 ? 's' : ''}</span>
                <div className="distribution-bar">
                  <div 
                    className="distribution-fill" 
                    style={{ width: `${calculatePercentage(reviewStats.distribution[star])}%` }}
                  ></div>
                </div>
                <span className="distribution-count">{reviewStats.distribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="review-actions">
          <button 
            className="write-review-btn"
            onClick={() => document.getElementById('reviewForm')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <i className="fas fa-pen"></i> Write a Review
          </button>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="review-filters">
        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="newest">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={showMediaOnly} 
              onChange={(e) => setShowMediaOnly(e.target.checked)} 
            />
            <span>Show only reviews with media</span>
          </label>
        </div>
        
        {filterRating > 0 && (
          <div className="active-filter">
            Showing {filterRating} star reviews
            <button onClick={() => setFilterRating(0)} className="clear-filter">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </div>

      {/* Review Form */}
      {user && (
        <form id="reviewForm" onSubmit={handleSubmit} className="premium-review-form">
          <div className="form-header">
            <h3>Write Your Review</h3>
            <p>Share your experience to help other customers</p>
          </div>
          
          <div className="form-section">
            <label>Overall Rating *</label>
            <div className="star-rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  title={`${star} star${star !== 1 ? 's' : ''}`}
                >
                  <i className="fas fa-star"></i>
                </button>
              ))}
              <span className="rating-label">
                {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select rating'}
              </span>
            </div>
          </div>
          
          <div className="form-section">
            <label htmlFor="reviewTitle">Review Title (Optional)</label>
            <input
              id="reviewTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              maxLength="100"
            />
          </div>
          
          <div className="form-section">
            <label htmlFor="reviewText">Your Review *</label>
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us about your experience with this product..."
              rows="6"
              minLength="10"
              maxLength="2000"
              required
            />
            <div className="char-counter">
              {reviewText.length}/2000 characters
            </div>
          </div>
          
          {/* Media Upload Section */}
          <div className="form-section">
            <label>Add Photos/Videos</label>
            <p className="upload-hint">Upload up to 5 images or videos (max 10MB each)</p>
            
            <div className="media-upload-area">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                style={{ display: 'none' }}
              />
              
              <div 
                className="upload-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('dragover');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('dragover');
                  handleFileSelect({ target: { files: e.dataTransfer.files } });
                }}
              >
                <i className="fas fa-cloud-upload-alt"></i>
                <p>Click or drag files to upload</p>
                <span className="upload-types">JPG, PNG, GIF, MP4, WebM</span>
              </div>
              
              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="selected-files">
                  <h4>Selected Files ({selectedFiles.length}/5)</h4>
                  <div className="file-previews">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="file-preview">
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Preview ${index + 1}`}
                            className="file-thumbnail"
                          />
                        ) : (
                          <div className="file-thumbnail video">
                            <i className="fas fa-video"></i>
                            <span>{file.name}</span>
                          </div>
                        )}
                        <button 
                          type="button"
                          className="remove-file"
                          onClick={() => removeFile(index)}
                          title="Remove file"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Verification Notice */}
          <div className="verification-notice">
            <i className="fas fa-shield-alt"></i>
            <span>Only verified purchases can submit reviews</span>
          </div>
          
          {/* Submit Button */}
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => {
                setReviewText('');
                setTitle('');
                setRating(0);
                setSelectedFiles([]);
              }}
              disabled={submitting || uploading}
            >
              Clear Form
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting || uploading || !rating || reviewText.trim().length < 10}
            >
              {submitting || uploading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {uploading ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.length > 0 ? (
          reviews.slice(0, visibleCount).map((review) => {
            const voteKey = `${productId}_${review.id}`;
            const hasVotedHelpful = userVotes[voteKey]?.helpful || false;
            
            return (
              <div 
                key={review.id} 
                className={`review-card ${review.featured ? 'featured' : ''} ${review.verifiedPurchase ? 'verified' : ''}`}
              >
                {review.featured && (
                  <div className="featured-badge">
                    <i className="fas fa-award"></i> Featured Review
                  </div>
                )}
                
                <div className="review-card-header">
                  <div className="reviewer-info">
                    {review.userAvatar ? (
                      <img 
                        src={review.userAvatar} 
                        alt={review.userName || 'Anonymous'}
                        className="reviewer-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName || 'User')}&background=random`;
                        }}
                      />
                    ) : (
                      <div className="reviewer-avatar-placeholder">
                        {(review.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="reviewer-details">
                      <div className="reviewer-name">
                        {review.userName || 'Anonymous User'}
                        {review.verifiedPurchase && (
                          <span className="verified-badge">
                            <i className="fas fa-check-circle"></i> Verified Purchase
                          </span>
                        )}
                      </div>
                      <div className="review-date">{review.date || 'Recently'}</div>
                    </div>
                  </div>
                  
                  <div className="review-rating-display">
                    <div className="stars-static">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`fas fa-star ${i < (review.rating || 0) ? 'filled' : ''}`}
                        ></i>
                      ))}
                    </div>
                    <div className="rating-value">{(review.rating || 0)}/5</div>
                  </div>
                </div>
                
                {review.title && (
                  <h4 className="review-title">{review.title}</h4>
                )}
                
                <p className="review-text">{review.text || 'No review text provided'}</p>
                
                {/* Media Gallery */}
                {(review.media?.length > 0 || review.videos?.length > 0) && (
                  <div className="review-media-gallery">
                    {review.media?.map((image, index) => (
                      <div key={index} className="media-item">
                        <img 
                          src={image.url} 
                          alt={`Review image ${index + 1}`}
                          onClick={() => window.open(image.url, '_blank')}
                          className="media-image"
                        />
                      </div>
                    ))}
                    
                    {review.videos?.map((video, index) => (
                      <div key={index} className="media-item">
                        <video 
                          controls
                          className="media-video"
                          poster={video.thumbnail}
                        >
                          <source src={video.url} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Review Actions */}
                <div className="review-actions-footer">
                  <div className="helpful-section">
                    <button 
                      className={`helpful-btn ${hasVotedHelpful ? 'voted' : ''}`}
                      onClick={() => handleVoteHelpful(review.id, review.helpfulCount || 0)}
                    >
                      <i className="fas fa-thumbs-up"></i>
                      {hasVotedHelpful ? 'Helpful' : 'Was this helpful?'}
                      {review.helpfulCount > 0 && (
                        <span className="helpful-count">({review.helpfulCount})</span>
                      )}
                    </button>
                    
                    <div className="reactions">
                      <button 
                        className="reaction-btn"
                        onClick={() => handleReaction(review.id, 'funny')}
                        title="Funny"
                      >
                        😂 {review.reactions?.funny || 0}
                      </button>
                      <button 
                        className="reaction-btn"
                        onClick={() => handleReaction(review.id, 'love')}
                        title="Love"
                      >
                        ❤️ {review.reactions?.love || 0}
                      </button>
                    </div>
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      className="report-btn"
                      onClick={() => handleReport(review.id)}
                      title="Report inappropriate content"
                    >
                      <i className="fas fa-flag"></i> Report
                    </button>
                    
                    {user && review.userId === user.uid && (
                      <>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEdit(review.id, review.title, review.text, review.rating)}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDelete(review.id)}
                        >
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-reviews-placeholder">
            <i className="fas fa-comments"></i>
            <h3>No reviews yet</h3>
            <p>Be the first to share your experience with this product!</p>
            {!user && (
              <button 
                className="login-to-review"
                onClick={() => navigate('/login')}
              >
                Login to Write Review
              </button>
            )}
          </div>
        )}
        
        {/* Load More Button */}
        {reviews.length > visibleCount && (
          <div className="load-more-container">
            <button onClick={loadMore} className="load-more-reviews">
              Load More Reviews ({reviews.length - visibleCount} remaining)
              <i className="fas fa-chevron-down"></i>
            </button>
          </div>
        )}
      </div>
      
      {/* Review Guidelines */}
      <div className="review-guidelines">
        <h4><i className="fas fa-info-circle"></i> Review Guidelines</h4>
        <ul>
          <li>Share your genuine experience with the product</li>
          <li>Include photos/videos to make your review more helpful</li>
          <li>Focus on the product's features, quality, and value</li>
          <li>Be respectful - no offensive language or personal attacks</li>
          <li>Don't include personal information or external links</li>
          <li>Reviews are moderated and may be removed if they violate guidelines</li>
        </ul>
      </div>
    </div>
  );
}

export default ProductDetail;