import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebase-config";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useGlobalModal } from "../context/ModalContext";
import { useNavigate } from "react-router-dom";
import "./ProductCard.css";
import { deriveRibbon } from "../utils/ribbon";
import Portal from "./Portal";

export default function ProductCard({ product, onCartUpdate,wishlistIds, toggleWishlist }) {
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();
  
  // ======= REFS =======
  const rootRef = useRef(null);
  const imageBoxRef = useRef(null);

  // ======= STATES =======
  const [current, setCurrent] = useState(0);
  const [qty, setQty] = useState(1);
  const [qtyVisible, setQtyVisible] = useState(false);
  const [cartItems, setCartItems] = useState([]); // Track cart items locally

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [lastSelectedVariant, setLastSelectedVariant] = useState(null);
  const isWish = wishlistIds?.includes(product.id);

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // Your real product fields
const images = Array.isArray(product.images) && product.images.length > 0
  ? product.images
  : product.image
  ? [product.image]
  : product.displayImage
  ? [product.displayImage]
  : ["https://via.placeholder.com/300x300?text=No+Image"];
  const title = product.name || product.title || "Product";
  const rating = product.rating || 0;
  const reviewsCount = product.reviewsCount ||
    (Array.isArray(product.reviews) ? product.reviews.length : 0);
  const price = product.price || 0;
  const originalPrice = product.originalPrice || 0;
  const discountPercentage = product.discountPercentage || 0;
  const stock = product.stock || 0;

  // Get variants from your data structure
  const colors = product.variants?.colors || [];
  const storageOptions = product.variants?.storage || [];
  
  // Check if product has variants
  const productHasVariants = product.hasVariants || 
                            colors.length > 0 || 
                            storageOptions.length > 0;

  // AUTO RIBBON
  const ribbon = deriveRibbon(product);

  // ======= CHECK IF PRODUCT IS IN CART =======
  const isProductInCart = () => {
    if (!productHasVariants) {
      // For products without variants, check by product ID
      return cartItems.some(item => item.id === product.id);
    } else {
      // For products with variants, check if any variant of this product is in cart
      return cartItems.some(item => item.id === product.id);
    }
  };

  // ======= GET CURRENT QUANTITY FROM CART =======
  const getCurrentQuantity = () => {
    if (!productHasVariants) {
      const cartItem = cartItems.find(item => item.id === product.id);
      return cartItem ? cartItem.quantity : 0;
    } else {
      // For products with variants, sum quantities of all variants
      const productItems = cartItems.filter(item => item.id === product.id);
      return productItems.reduce((total, item) => total + (item.quantity || 0), 0);
    }
  };

  // ======= FETCH CART ITEMS =======
  const fetchCartItems = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      if (cartSnap.exists()) {
        const items = cartSnap.data().items || [];
        setCartItems(items);
        
        // If product is in cart, show quantity selector and set current quantity
        if (isProductInCart()) {
          setQtyVisible(true);
          setQty(getCurrentQuantity());
        }
      }
    } catch (err) {
      console.error("Error loading cart items:", err.message);
    }
  };

  // ======= FIREBASE ADD TO CART FUNCTION =======
  const addToCart = async (productData, quantity = 1, variants = null) => {
    const user = auth.currentUser;
    if (!user) {
      showModal({
        title: "Login Required",
        message: "Please login to add items to cart",
        type: "error",
      });
      navigate("/login");
      return false;
    }

    setAddingToCart(true);
    
    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);

      // Get the first valid image URL
      let productImage = '';
      if (productData.images && productData.images.length > 0 && productData.images[0]) {
        productImage = productData.images[0];
      } else if (productData.image) {
        productImage = productData.image;
      } else if (productData.displayImage) {
        productImage = productData.displayImage;
      } else {
        productImage = 'https://via.placeholder.com/300x300?text=No+Image';
      }

      // Create cart item with proper structure
      const cartItem = {
        id: productData.id || '',
        productId: productData.id || '',
        name: productData.name || 'Unknown Product',
        price: calculateFinalPrice(),
        originalPrice: productData.originalPrice || productData.price || 0,
        image: productImage,
        quantity: quantity || 1,
        addedAt: Date.now(),
        variants: variants || null,
        category: productData.category || 'general'
      };

      // Remove any undefined values from the cart item
      const cleanCartItem = Object.fromEntries(
        Object.entries(cartItem).filter(([_, value]) => value !== undefined)
      );

      if (cartSnap.exists()) {
        const existingItems = cartSnap.data().items || [];
        
        // Check if item with same variants already exists
        const existingItemIndex = existingItems.findIndex(item => 
          item.id === productData.id && 
          JSON.stringify(item.variants) === JSON.stringify(variants)
        );

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          const updatedItems = [...existingItems];
          updatedItems[existingItemIndex].quantity += quantity;
          
          await updateDoc(cartRef, {
            items: updatedItems
          });
        } else {
          // Add new item
          await updateDoc(cartRef, {
            items: arrayUnion(cleanCartItem)
          });
        }
      } else {
        // Create new cart
        await setDoc(cartRef, {
          items: [cleanCartItem],
          createdAt: Date.now()
        });
      }

      showModal({
        title: "Added to Cart!",
        message: `${productData.name} has been added to your cart.`,
        type: "success",
      });

      // Update local cart state and show quantity selector
      await fetchCartItems();
      setQtyVisible(true);
      setQty(quantity);

      // Notify parent component about cart update
      if (onCartUpdate) {
        onCartUpdate();
      }

      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      showModal({
        title: "Failed to Add to Cart",
        message: "There was an error adding the item to your cart. Please try again.",
        type: "error",
      });
      return false;
    } finally {
      setAddingToCart(false);
    }
  };

  // ======= REMOVE FROM CART FUNCTION =======
  const removeFromCart = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const existingItems = cartSnap.data().items || [];
        
        // Remove items with this product ID
        const updatedItems = existingItems.filter(item => item.id !== product.id);
        
        await updateDoc(cartRef, {
          items: updatedItems
        });

        // Update local state
        setCartItems(updatedItems);
        setQtyVisible(false);
        setQty(1);

        // Notify parent component
        if (onCartUpdate) {
          onCartUpdate();
        }

        showModal({
          title: "Removed from Cart",
          message: `${product.name} has been removed from your cart.`,
          type: "info",
        });
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      showModal({
        title: "Failed to Remove from Cart",
        message: "There was an error removing the item from your cart.",
        type: "error",
      });
    }
  };

  // ======= UPDATE QUANTITY IN CART =======
  const updateQuantityInCart = async (newQuantity) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const existingItems = cartSnap.data().items || [];
        
        // Update quantity for this product
        const updatedItems = existingItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        );
        
        await updateDoc(cartRef, {
          items: updatedItems
        });

        // Update local state
        setCartItems(updatedItems);
        setQty(newQuantity);

        // Notify parent component
        if (onCartUpdate) {
          onCartUpdate();
        }
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      showModal({
        title: "Failed to Update Quantity",
        message: "There was an error updating the quantity.",
        type: "error",
      });
    }
  };

  // ======= HELPERS =======
  const query = (sel) =>
    rootRef.current ? Array.from(rootRef.current.querySelectorAll(sel)) : [];

  // ======= SLIDER =======
  const showSlide = (index) => {
    const slides = query(".slide");
    const dots = query(".dot");
    slides.forEach((s, i) => s.classList.toggle("active", i === index));
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    setCurrent(index);
  };

  const nextSlide = () => {
    const next = (current + 1) % images.length;
    showSlide(next);
  };

  const prevSlide = () => {
    const prev = (current - 1 + images.length) % images.length;
    showSlide(prev);
  };

  // ======= QTY =======
  const showQtyBox = () => {
    setQtyVisible(true);
  };

  const hideQtyBox = () => {
    setQtyVisible(false);
    setQty(1);
  };

  // ======= VARIANTS =======
  const onAddPlusClick = (e) => {
    e.stopPropagation();
    if (productHasVariants) {
      openVariantModal();
    } else {
      // For products without variants, add directly to cart
      handleAddToCartWithoutVariants();
    }
  };

  const openVariantModal = (isAddMore = false) => {
    setVariantModalOpen(true);

    // Auto-select first color and storage if available
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(colors[0]);
    }
    if (storageOptions.length > 0 && !selectedStorage) {
      setSelectedStorage(storageOptions[0]);
    }

    if (isAddMore && lastSelectedVariant) {
      setSelectedColor(lastSelectedVariant.color);
      setSelectedStorage(lastSelectedVariant.storage);
    }
  };

  const closeVariantModal = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setVariantModalOpen(false);
  };

  const handleAddToCartWithoutVariants = async () => {
    const success = await addToCart(product, qty);
    if (success) {
      showQtyBox();
    }
  };

  const confirmVariantSelection = async (e) => {
    e.stopPropagation();
    
    // If no variants required, just add to cart
    if (!productHasVariants) {
      await handleAddToCartWithoutVariants();
      return;
    }

    // Validate selections for products with variants
    if ((colors.length > 0 && !selectedColor) || 
        (storageOptions.length > 0 && !selectedStorage)) {
      showModal({
        title: "Selection Required",
        message: "Please select all required options",
        type: "error",
      });
      return;
    }

    const variants = {
      color: selectedColor,
      storage: selectedStorage
    };

    const success = await addToCart(product, qty, variants);
    if (success) {
      setLastSelectedVariant(variants);
      closeVariantModal();
      showQtyBox();
    }
  };

  // ======= WISHLIST =======

  // ======= INITIALIZE CART STATE =======
  useEffect(() => {
    fetchCartItems();
  }, []);

  // ======= SLIDER INIT =======
  useEffect(() => {
    showSlide(0);
    query(".dot").forEach((d, i) => (d.dataset.id = i));
  }, [images]);

  // ======= PLUS/MINUS INSIDE QTY =======
  const handlePlusInQty = (e) => {
    e.stopPropagation();
    if (productHasVariants) {
      openVariantModal(true);
    } else {
      const newQty = qty + 1;
      setQty(newQty);
      updateQuantityInCart(newQty);
    }
  };

  const handleMinusInQty = (e) => {
    e.stopPropagation();
    if (qty > 1) {
      const newQty = qty - 1;
      setQty(newQty);
      updateQuantityInCart(newQty);
    } else {
      // Remove from cart when quantity reaches 0
      removeFromCart();
    }
  };

  // ======= COLOR & STORAGE EVENTS =======
  const handleColorClick = (color, e) => {
    e.stopPropagation();
    setSelectedColor(color);
  };

  const handleStorageClick = (storage, e) => {
    e.stopPropagation();
    setSelectedStorage(storage);
  };

  // Calculate final price with storage upgrade
  const calculateFinalPrice = () => {
    let finalPrice = price;
    if (selectedStorage?.price) {
      finalPrice += selectedStorage.price;
    }
    return finalPrice;
  };

  // ======= RENDER MODAL CONTENT =======
  const renderModalContent = () => (
    <div className="variant-modal" onClick={closeVariantModal}>
      <div className="variant-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="variant-close-btn" onClick={closeVariantModal}>
          ×
        </button>

        <h2 className="variant-title">Choose Options - {title}</h2>

        {/* COLORS */}
        {colors.length > 0 && (
          <div className="variant-section">
            <h3>Colors</h3>
            <div className="variant-colors">
              {colors.map((color) => (
                <div
                  key={color.value}
                  className={`color-dot ${selectedColor?.value === color.value ? 'active' : ''}`}
                  data-color={color.value}
                  data-color-name={color.name}
                  style={{ backgroundColor: color.value }}
                  onClick={(e) => handleColorClick(color, e)}
                />
              ))}
            </div>
            {selectedColor && (
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                Selected: {selectedColor.name}
              </p>
            )}
          </div>
        )}

        {/* STORAGE */}
        {storageOptions.length > 0 && (
          <div className="variant-section">
            <h3>Storage</h3>
            <div className="variant-sizes">
              {storageOptions.map((storage) => (
                <div
                  key={storage.value}
                  className={`size-box ${selectedStorage?.value === storage.value ? 'active' : ''}`}
                  data-size={storage.value}
                  onClick={(e) => handleStorageClick(storage, e)}
                >
                  {storage.name}
                  {storage.price > 0 && (
                    <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                      +₹{storage.price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRICE SUMMARY */}
        {(colors.length > 0 || storageOptions.length > 0) && (
          <div className="variant-section">
            <h3>Price Summary</h3>
            <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base Price:</span>
                <span>₹{price}</span>
              </div>
              {selectedStorage && selectedStorage.price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                  <span>{selectedStorage.name} Upgrade:</span>
                  <span>+₹{selectedStorage.price}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '5px' }}>
                <span>Total:</span>
                <span>₹{calculateFinalPrice()}</span>
              </div>
            </div>
          </div>
        )}

        <button 
          className="variant-add-btn" 
          onClick={confirmVariantSelection}
          disabled={addingToCart}
        >
          {addingToCart ? "Adding..." : `Add to Cart - ₹${calculateFinalPrice()}`}
        </button>
      </div>
    </div>
  );

  // ======= RENDER =======
  return (
    <>
      <div
  className="product-card"
  ref={rootRef}
  onClick={() => navigate(`/product/${product.id}`)}
>
        {/* IMAGE BOX */}
        <div className="image-box" ref={imageBoxRef}>
          {/* RIBBON */}
          {ribbon && (
            <div className={`ribbon folded ${ribbon.className}`}>
              {ribbon.label}
            </div>
          )}

          {/* SLIDES */}
          {images.length > 0 ? (
            images.map((src, i) => (
              src ? (
        <img
  key={i}
  src={src}
  className={`slide ${i === 0 ? "active" : ""}`}
  alt={`product view ${i + 1}`}
  loading="lazy"
  onError={(e) => {
    e.currentTarget.src =
      "https://via.placeholder.com/300x300?text=No+Image";
  }}
/>
              ) : null
            ))
          ) : (
            <img 
              src="https://via.placeholder.com/300x300?text=No+Image" 
              className="slide active" 
              alt="product" 
            />
          )}

          {/* WISHLIST */}
    <button 
  className={`wish-heart ${isWish ? "active" : ""}`} 
  onClick={(e) => {
    e.stopPropagation();
    toggleWishlist(product);
  }}
>
  {isWish ? "❤️" : "♡"}
</button>

          {/* ARROWS */}
          {images.length > 1 && (
            <>
              <button className="arrow prev" onClick={prevSlide}>
                &#10094;
              </button>
              <button className="arrow next" onClick={nextSlide}>
                &#10095;
              </button>
            </>
          )}

          {/* DOTS */}
          {images.length > 1 && (
            <div className="dots">
              {images.map((_, i) => (
                <div 
                  key={i} 
                  className={`dot ${i === 0 ? "active" : ""}`}
                  onClick={() => showSlide(i)}
                />
              ))}
            </div>
          )}

          {/* CART AREA */}
          <div className="cart-area">
            {/* Qty box - ALWAYS SHOW IF PRODUCT IS IN CART */}
            {(qtyVisible || isProductInCart()) && (
              <div className="qty-box" style={{ display: 'flex' }}>
                <button className="qty-btn" onClick={handleMinusInQty}>
                  −
                </button>
                <div className="qty-value" id="qtyValue">
                  {getCurrentQuantity()}
                </div>
                <button className="qty-btn" onClick={handlePlusInQty}>
                  +
                </button>
              </div>
            )}

            {/* + Button - ONLY SHOW IF PRODUCT IS NOT IN CART */}
            {!qtyVisible && !isProductInCart() && (
              <div className="add-plus" onClick={onAddPlusClick}>
                +
              </div>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div className="title">{title}</div>

        {/* PRICE */}
        <div className="price-box">
          <div className="price-now">₹{price}</div>
          {originalPrice && originalPrice > price && (
            <>
              <div className="price-old">₹{originalPrice}</div>
              <div className="discount">{discountPercentage}% OFF</div>
            </>
          )}
        </div>

        {/* CART STATUS INDICATOR */}
        {isProductInCart() && (
          <div style={{
            marginTop: '10px',
            padding: '4px 8px',
            backgroundColor: '#4CAF50',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            ✓ In Cart ({getCurrentQuantity()})
          </div>
        )}
      </div>

      {/* VARIANT MODAL - RENDERED VIA PORTAL */}
      {variantModalOpen && (
        <Portal>
          {renderModalContent()}
        </Portal>
      )}
    </>
  );
}
