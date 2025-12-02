// src/pages/ProductDetail.jsx
import React, { useState, useEffect } from 'react';
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
import { db, auth } from '../firebase-config';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MobileLayout from '../layouts/MobileLayout';
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

  // Add product to recently viewed
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
      
      // Add to beginning
      const productToAdd = {
        id: productData.id,
        name: productData.name,
        price: productData.price,
        originalPrice: productData.originalPrice,
        image: productData.images?.[0] || productData.image || '',
        category: productData.category || '',
        viewedAt: new Date().toISOString()
      };

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

  // Get fallback image
  const getFallbackImage = () => {
    return "/api/placeholder/400/400";
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

  const getGeneratedDescription = (product) => {
    if (product.description) return product.description;

    const name = product.name || "This item";
    const category = product.category || "product";
    const keywords = product.keywords?.join(", ") || "";

    return `${name} is a high-quality ${category} designed to meet your daily needs. Featuring ${keywords}, it's perfect for any occasion.`;
  };

  // Get stock status - will be null when in stock
  const stockStatus = getStockStatus();

  // Calculate discount for related products
  const calculateDiscountForCard = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  // Updated Product Card Component for related products - matches Home.jsx design
  const ProductCard = ({ product, showCoupon = false }) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [cartQuantity, setCartQuantity] = useState(0);
    
    // Check if product is in wishlist
    useEffect(() => {
      setIsInWishlist(wishlistIds.includes(product.id));
    }, [wishlistIds, product.id]);

    // Check cart quantity in real-time
    useEffect(() => {
      const checkCartQuantity = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
          const cartRef = doc(db, "carts", user.uid);
          const cartSnap = await getDoc(cartRef);
          if (cartSnap.exists()) {
            const items = cartSnap.data().items || [];
            const cartItem = items.find(item => item.id === product.id);
            setCartQuantity(cartItem ? cartItem.quantity : 0);
          } else {
            setCartQuantity(0);
          }
        } catch (error) {
          console.error("Error checking cart quantity:", error);
        }
      };

      checkCartQuantity();
    }, [product.id]);

    // Calculate real discount percentage
    const originalPrice = product.originalPrice || product.price * 1.5;
    const currentPrice = product.price;
    const realDiscountPercentage = originalPrice > currentPrice 
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

    // Get real reviews data
    const averageRating = product.averageRating || 0;
    const reviewCount = product.reviewCount || 0;

    // Get product images
    const productImages = product.images && product.images.length > 0 
      ? product.images 
      : [product.displayImage || product.image || 'https://via.placeholder.com/300x300?text=No+Image'];

    // Slide navigation
    const handleSlideNavigation = (direction) => {
      if (productImages.length <= 1) return;
      
      if (direction === 'next') {
        setActiveSlide((prev) => (prev + 1) % productImages.length);
      } else {
        setActiveSlide((prev) => (prev - 1 + productImages.length) % productImages.length);
      }
    };

    const handleDotClick = (index) => {
      setActiveSlide(index);
    };

    // Auto-rotate slides
    useEffect(() => {
      if (productImages.length > 1) {
        const interval = setInterval(() => {
          setActiveSlide((prev) => (prev + 1) % productImages.length);
        }, 4000);
        
        return () => clearInterval(interval);
      }
    }, [productImages.length]);

    // Star rating helper
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

    const handleAddToCart = async (e) => {
      e.stopPropagation();
      
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
          category: product.category,
          image: productImages[0],
          quantity: 1,
          addedAt: Date.now(),
        };

        if (cartSnap.exists()) {
          const existingItems = cartSnap.data().items || [];
          const alreadyExists = existingItems.find(item => item.id === product.id);
          
          if (alreadyExists) {
            // If already in cart, increase quantity
            const updatedItems = existingItems.map(item => 
              item.id === product.id 
                ? { ...item, quantity: (item.quantity || 1) + 1 }
                : item
            );
            await setDoc(cartRef, { items: updatedItems });
            setCartQuantity(prev => prev + 1);
          } else {
            // Add new item to cart
            await updateDoc(cartRef, {
              items: arrayUnion(productToAdd)
            });
            setCartQuantity(1);
          }
        } else {
          await setDoc(cartRef, {
            items: [productToAdd]
          });
          setCartQuantity(1);
        }

        showModal({
          title: "Added to Cart",
          message: `${product.name} has been added to your cart`,
          type: "success"
        });
      } catch (error) {
        console.error("Error adding to cart:", error);
        showModal({
          title: "Error",
          message: "Failed to add item to cart",
          type: "error"
        });
      }
    };

    const updateQuantity = async (newQty) => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        
        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          const updatedItems = items.map(item => 
            item.id === product.id 
              ? { ...item, quantity: newQty }
              : item
          ).filter(item => item.quantity > 0); // Remove if quantity is 0
          
          await setDoc(cartRef, { items: updatedItems });
          setCartQuantity(newQty > 0 ? newQty : 0);
        }
      } catch (error) {
        console.error("Error updating quantity:", error);
      }
    };

    const toggleWishlist = async (e) => {
      e.stopPropagation();
      
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

        if (isInWishlist) {
          wishlistItems = wishlistItems.filter(item => item.id !== product.id);
          setIsInWishlist(false);
        } else {
          const wishlistItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image: productImages[0],
            addedAt: Date.now(),
          };
          wishlistItems.push(wishlistItem);
          setIsInWishlist(true);
        }

        await setDoc(wishlistRef, { items: wishlistItems });
      } catch (error) {
        console.error("Error updating wishlist:", error);
      }
    };

    const handleCardClick = () => {
      navigate(`/product/${product.id}`);
    };

    return (
      <div className="modern-product-card" onClick={handleCardClick}>
        {/* Product Badge */}
        {realDiscountPercentage > 0 && (
          <div className="product-badge">{realDiscountPercentage}% OFF</div>
        )}
        
        {/* Product Image Container with Slider */}
        <div className="product-image-container">
          <div className="image-slider">
            {productImages.map((image, index) => (
              <div
                key={index}
                className={`slide ${activeSlide === index ? 'active' : ''}`}
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
            ))}
          </div>
          
          {/* Slider Navigation Dots */}
          {productImages.length > 1 && (
            <div className="slider-dots">
              {productImages.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${activeSlide === index ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDotClick(index);
                  }}
                  aria-label={`View image ${index + 1}`}
                ></button>
              ))}
            </div>
          )}

          {/* Slider Navigation Arrows */}
          {productImages.length > 1 && (
            <>
              <button
                className="slider-arrow prev-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlideNavigation('prev');
                }}
                aria-label="Previous image"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button
                className="slider-arrow next-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSlideNavigation('next');
                }}
                aria-label="Next image"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </>
          )}
          
          {/* Add to Cart / Quantity Controls */}
          {cartQuantity === 0 ? (
            <button
              className="add-to-cart-plus"
              onClick={handleAddToCart}
              title="Add to Cart"
            >
              <i className="fas fa-plus"></i>
            </button>
          ) : (
            <div className="quantity-controls-corner">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(cartQuantity - 1);
                }}
                className="qty-btn-corner minus"
              >
                -
              </button>
              <span className="qty-display-corner">{cartQuantity}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateQuantity(cartQuantity + 1);
                }}
                className="qty-btn-corner plus"
              >
                +
              </button>
            </div>
          )}

          {/* Animated Wishlist Icon */}
          <WishlistButton
            isActive={isInWishlist}
            size="small"
            className="wishlist-btn-corner"
            onClick={toggleWishlist}
            title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          />
        </div>

        {/* Product Info */}
        <div className="product-info-modern">
          {/* Rating Section */}
          <div className="product-rating">
            <div className="stars">
              {renderStarRating(averageRating)}
            </div>
            <span className="rating-value">{averageRating.toFixed(1)}</span>
            <span className="review-count">({reviewCount})</span>
          </div>

          {/* Product Title */}
          <h3 className="product-title-modern" title={product.name}>
            {product.name}
          </h3>

          {/* Price Section */}
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

          {/* Coupon Offer */}
          {showCoupon && (
            <div className="coupon-offer">
              Get it for ₹{Math.round(currentPrice * 0.95)} with coupon
            </div>
          )}
        </div>
      </div>
    );
  };

  // Create the main product detail content
  const productDetailContent = (
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
      alt=""
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
        <img src={img} alt="" />
      </div>
    ))}
  </div>

  {/* FULLSCREEN VIEW */}
  {isFullscreen && (
    <div className="fullscreen-image-modal" onClick={() => setIsFullscreen(false)}>
      <span className="fullscreen-close">×</span>
      <img src={variantImages[selectedImage]} alt="" />
    </div>
  )}

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
            
            <div className="image-counter" style={{ position: 'fixed', bottom: '20px' }}>
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
                    onClick={toggleWishlist}
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
            
            <div className="product-rating">
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <i key={i} className={`fas fa-star ${i < 4 ? 'filled' : ''}`}></i>
                ))}
              </div>
              <span className="review-count">(112 reviews)</span>
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

          {/* Mobile Action Buttons - Show at top on mobile */}
          {isMobile && (
            <div className="mobile-action-buttons-sticky">
              <div className="action-buttons mobile-sticky-actions">
                {isProductInCart ? (
                  <div className="quantity-controls">
                    <button
                      onClick={() => updateCartQuantity(quantity - 1)}
                      disabled={!isVariantInStock()}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span>{quantity} in cart</span>
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
                    onClick={addToCart}
                    disabled={!isVariantInStock()}
                    title={!isVariantInStock() ? "This variant is out of stock" : "Add to cart"}
                  >
                    <i className="fas fa-shopping-cart"></i> 
                    {!isVariantInStock() ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                )}

                <button 
                  className="buy-now" 
                  onClick={buyNow}
                  disabled={!isVariantInStock()}
                  title={!isVariantInStock() ? "This variant is out of stock" : "Buy now"}
                >
                  <i className="fas fa-bolt"></i> 
                  {!isVariantInStock() ? 'Unavailable' : 'Buy Now'}
                </button>

                {/* Mobile Animated Wishlist Button */}
                <WishlistButton
                  isActive={wishlistIds.includes(product.id)}
                  size="small"
                  className="mobile-wishlist-btn"
                  onClick={toggleWishlist}
                >
                  {wishlistIds.includes(product.id) ? 'Saved' : 'Save'}
                </WishlistButton>

                {/* Mobile Share Button */}
                <ShareButton
                  size="small"
                  icon={true}
                  onShare={handleShare}
                  className="mobile-share-btn"
                  title="Share this product"
                >
                  Share
                </ShareButton>
              </div>
            </div>
          )}

          {/* Enhanced Delivery Section */}
          <div className="delivery-section">
            <div className="delivery-header">
              <i className="fas fa-truck"></i>
              <h3>Delivery Options</h3>
            </div>
            
            {!deliveryInfo ? (
              <div className="delivery-default">
                <p className="delivery-estimate">{getDefaultDeliveryEstimate()}</p>
                <p className="delivery-note">Enter your pincode for exact delivery date</p>
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

            <div className="pincode-checker">
              <div className="pincode-input-group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit pincode" 
                  maxLength="6"
                  value={pincode}
                  onChange={handlePincodeChange}
                  className={`pincode-input ${pincodeError ? 'error' : ''}`}
                />
                <button 
                  className={`check-btn ${isCheckingPincode ? 'loading' : ''}`}
                  onClick={handleCheckPincode}
                  disabled={isCheckingPincode || pincode.length !== 6}
                >
                  {isCheckingPincode ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Checking...
                    </>
                  ) : (
                    'Check'
                  )}
                </button>
              </div>
              {pincodeError && (
                <p className="pincode-error">{pincodeError}</p>
              )}
            </div>

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
            <h3>Offers For You</h3>
            <div className="offer-item">
              <input type="checkbox" id="offer1" />
              <label htmlFor="offer1">FLAT ₹150 OFF on Silver Jewellery above ₹2499</label>
            </div>
            <div className="offer-item">
              <input type="checkbox" id="offer2" />
              <label htmlFor="offer2">FLAT 5% OFF on Silver Jewellery above ₹1499</label>
            </div>
            <button className="view-more-offers">View more offers</button>
          </div>

          {/* Desktop Action Buttons */}
          {!isMobile && (
            <div className="action-buttons">
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
                  onClick={addToCart}
                  disabled={!isVariantInStock()}
                  title={!isVariantInStock() ? "This variant is out of stock" : "Add to cart"}
                >
                  <i className="fas fa-shopping-cart"></i> 
                  {!isVariantInStock() ? 'Out of Stock' : 'Add to Cart'}
                </button>
              )}

              <button 
                className="buy-now" 
                onClick={buyNow}
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
                onClick={toggleWishlist}
              >
                {wishlistIds.includes(product.id) ? 'Saved' : 'Save'}
              </WishlistButton>
            </div>
          )}

          <div className="product-description">
            <h3>Product Description</h3>
            <p><strong>The inspiration:</strong></p>
            <p>Inspired from the classy way you carry yourself, this minimalistic beauty is a must-have. The Design combines elegance with modern aesthetics to create a piece that complements your style perfectly.</p>
            <button className="show-more-btn">Show More</button>
          </div>
        </div>
      </div>

      {/* Related Products Sections */}
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
                  showCoupon={true}
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

// Complete ReviewBlock component with proper implementation
function ReviewBlock({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = auth.currentUser;
  const { showModal } = useGlobalModal();

  useEffect(() => {
    if (!productId) return;
    
    const q = query(
      collection(db, "products", productId, "reviews"), 
      orderBy("timestamp", "desc")
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const reviewList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewList);
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsub();
  }, [productId]);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length)
    : 0;

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

    setSubmitting(true);
    try {
      await addDoc(collection(db, "products", productId, "reviews"), {
        userId: user.uid,
        name: user.displayName || "Verified Buyer",
        rating,
        text,
        timestamp: serverTimestamp(),
        date: new Date().toLocaleDateString()
      });
      setText('');
      setRating(0);
      showModal({
        title: "Review Submitted",
        message: "Thank you for your review!",
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
  };

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

  const handleEdit = async (id, oldText, oldRating) => {
    const newText = prompt("Edit your review:", oldText);
    if (newText === null) return; // User cancelled
    
    const newRatingInput = prompt("Edit your rating (1-5):", oldRating);
    if (newRatingInput === null) return; // User cancelled
    
    const newRating = Number(newRatingInput);
    if (!newText || !newRating || newRating < 1 || newRating > 5) {
      showModal({
        title: "Invalid Input",
        message: "Please provide valid text and rating (1-5)",
        type: "error"
      });
      return;
    }

    try {
      await updateDoc(doc(db, "products", productId, "reviews", id), {
        text: newText,
        rating: newRating,
        timestamp: serverTimestamp()
      });
      showModal({
        title: "Review Updated",
        message: "Your review has been updated",
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

  const loadMore = () => setVisibleCount(prev => prev + 3);

  return (
    <div className="review-block">
      <div className="average-rating">
        <strong>{avgRating.toFixed(1)}</strong> out of 5
        <div className="stars">
          {[...Array(5)].map((_, i) => (
            <i 
              key={i} 
              className={`fas fa-star ${i < Math.round(avgRating) ? 'filled' : ''}`}
            ></i>
          ))}
        </div>
        <p>{reviews.length} review(s)</p>
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="review-form">
          <h4>Write a Review</h4>
          <label>Rating:</label>
          <div className="stars-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  cursor: "pointer",
                  fontSize: "24px",
                  color: star <= rating ? "#FF4081" : "#ccc",
                  transition: "color 0.2s"
                }}
                onClick={() => setRating(star)}
              >
                ★
              </span>
            ))}
          </div>

          <label>Your Review:</label>
          <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            required 
            placeholder="Share your experience with this product..."
            rows="4"
          />
          <button type="submit" disabled={submitting || !rating}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      <div className="reviews-list">
        {reviews.length ? (
          reviews.slice(0, visibleCount).map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <span className="reviewer">{r.name}</span>
                <div className="review-rating">
                  {[...Array(5)].map((_, i2) => (
                    <i 
                      key={i2} 
                      className={`fas fa-star ${i2 < r.rating ? 'filled' : 'empty'}`}
                      style={{
                        color: i2 < r.rating ? '#ff4081' : '#ddd',
                        marginRight: '2px'
                      }}
                    />
                  ))}
                  <span className="rating-value">({r.rating}/5)</span>
                </div>
              </div>
              <p className="review-text">{r.text}</p>
              <span className="review-date">{r.date}</span>

              {user && r.userId === user.uid && (
                <div className="review-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(r.id, r.text, r.rating)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(r.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="no-reviews">No reviews yet. Be the first to review!</p>
        )}

        {reviews.length > visibleCount && (
          <button 
            onClick={loadMore} 
            className="load-more-reviews"
          >
            Load More Reviews ({reviews.length - visibleCount} more)
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;