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
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase-config';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import '../home.css';
import '../styles/productdetail.css';
import { useGlobalModal } from '../context/ModalContext';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [isProductInCart, setIsProductInCart] = useState(false);
  const { showModal } = useGlobalModal();

  // Real-time product data
  useEffect(() => {
    const docRef = doc(db, "products", id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
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
            
            // Check if current product is in cart
            const productInCart = items.find(item => item.id === product?.id);
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
  }, [product?.id]); // Add product.id as dependency

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
        const item = items.find(i => i.id === id);
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
      let items = cartSnap.exists() ? cartSnap.data().items || [] : [];

      if (newQty <= 0) {
        // Remove item from cart
        items = items.filter((item) => item.id !== product.id);
        setIsProductInCart(false); // Update state
        setQuantity(1); // Reset quantity
      } else {
        const existingIndex = items.findIndex((item) => item.id === product.id);
        if (existingIndex >= 0) {
          // Update existing item
          items[existingIndex].quantity = newQty;
          items[existingIndex].addedAt = Date.now();
          setQuantity(newQty); // Update quantity state
        } else {
          // Add new item
          items.push({ 
            ...product, 
            quantity: newQty, 
            addedAt: Date.now() 
          });
          setIsProductInCart(true); // Update state
          setQuantity(newQty); // Update quantity state
        }
      }

      // Update Firestore
      await setDoc(cartRef, { items }, { merge: true });

      // Cart count will update automatically via the real-time listener

    } catch (err) {
      console.error("Error updating cart:", err);
      // Revert on error - reload the actual quantity from cart
      const currentQty = await getCartQuantity();
      setQuantity(currentQty || 1);
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

    try {
      const cartRef = doc(db, "carts", user.uid);
      const cartSnap = await getDoc(cartRef);
      
      const productToAdd = {
        ...product,
        quantity: quantity,
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

      setCartCount(prev => prev + quantity);
      navigate('/cart');
    } catch (error) {
      console.error("Error adding to cart:", error);
      showModal({
        title: "Error",
        message: "Failed to add item to cart",
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
        wishlistItems = wishlistItems.filter(item => item.id !== product.id);
        setWishlistIds(prev => prev.filter(id => id !== product.id));
      } else {
        wishlistItems.push({ ...product, addedAt: Date.now() });
        setWishlistIds(prev => [...prev, product.id]);
      }

      await setDoc(wishlistRef, { items: wishlistItems });

      showModal({
        title: isInWishlist ? "Removed from Wishlist" : "Added to Wishlist",
        message: isInWishlist 
          ? `${product.name} removed from your wishlist`
          : `${product.name} added to your wishlist`,
        type: "success"
      });
    } catch (error) {
      console.error("Error updating wishlist:", error);
      showModal({
        title: "Error",
        message: "Failed to update wishlist",
        type: "error"
      });
    }
  };

  const buyNow = async () => {
    // Check stock first
    if (!product.inStock) {
      showModal({
        title: "Out of Stock",
        message: "This product is currently unavailable",
        type: "error",
      });
      return; // Exit the function early
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
      
      // Create the product object without serverTimestamp in the array
      const productToBuy = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image,
        quantity: quantity,
        // Removed serverTimestamp from here
        addedAt: new Date().toISOString(), // Use regular date instead
        buyNow: true
      };

      // Set the document with serverTimestamp at the root level
      await setDoc(cartRef, {
        items: [productToBuy],
        createdAt: serverTimestamp(), // serverTimestamp here is fine
        lastUpdated: serverTimestamp()
      });

      setCartCount(quantity);
      navigate('/checkout');
      
    } catch (error) {
      console.error("Buy Now Error:", error);
      showModal({
        title: "Error",
        message: "Failed to process your order",
        type: "error"
      });
    }
  };

  if (loading) {
    return (
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
    return (
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

  return (
    <>
      <Navbar cartCount={cartCount} />
      <div className="layout">
        <Sidebar />
        <div className="product-detail-container">
          <div className="product-detail">
            <div className="product-gallery">
              <div className="main-image">
                <img src={(product.images && product.images[selectedImage]) || product.image || ""} alt={product.name || "Product"} />
              </div>
              <div className="thumbnail-container">
                {Array.isArray(product.images) && product.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${product.name} thumbnail ${index}`}
                    className={`thumbnail ${index === selectedImage ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            </div>

            <div className="product-info">
              <h1>{product.name}</h1>
              <div className="price-section">
                <span className="price">₹{product.price}</span>
                {product.originalPrice && (
                  <span className="original-price">₹{product.originalPrice}</span>
                )}
                {product.discount && (
                  <span className="discount">{product.discount}% OFF</span>
                )}
              </div>
              
              <div className="delivery-info">
                <p><i className="fas fa-truck"></i> {product.deliveryInfo?.freeDelivery || "Free delivery on orders over ₹500"}</p>
                <p><i className="fas fa-calendar-alt"></i> {product.deliveryInfo?.estimatedDelivery || "Estimated delivery: 3-5 business days"}</p>
                <p>
                  <i className={`fas ${product.inStock ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                  {product.inStock ? 'In stock' : 'Out of stock'}
                </p>
              </div>

              <div className="action-buttons">
                {/* Fixed cart button logic - check if specific product is in cart */}
                {isProductInCart ? (
                  <div className="quantity-controls flex items-center gap-2">
                    <button
                      onClick={() => updateCartQuantity(quantity - 1)}
                      className="bg-gray-300 text-black px-3 py-1 rounded"
                    >
                      -
                    </button>
                    <span className="text-white">{quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(quantity + 1)}
                      className="bg-gray-300 text-black px-3 py-1 rounded"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="add-to-cart"
                    onClick={() => updateCartQuantity(1)}
                  >
                    <i className="fas fa-shopping-cart"></i> Add to Cart
                  </button>
                )}

                <button 
                  className="buy-now" 
                  onClick={() => {
                    console.log("Buy Now button clicked");
                    buyNow().catch(error => {
                      console.error("Button click error:", error);
                    });
                  }}
                >
                  <i className="fas fa-bolt"></i> Buy Now
                </button>
                <button 
                  className={`wishlists-btn ${wishlistIds.includes(product.id) ? 'active' : ''}`}
                  onClick={toggleWishlist}
                >
                  <i className="fas fa-heart"></i>
                  {wishlistIds.includes(product.id) ? 'Saved' : 'Save'}
                </button>
              </div>

              <div className="product-description">
                <h3>Description</h3>
                <p>{getGeneratedDescription(product)}</p>
              </div>

              <div className="specifications">
                <h3>Specifications</h3>
                <table>
                  <tbody>
                    {product.specifications && typeof product.specifications === 'object' ? (
                      Object.entries(product.specifications).map(([key, value], i) => (
                        <tr key={i}>
                          <td className="spec-name">{key}:</td>
                          <td className="spec-value">{value}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2">No specifications available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="reviews-section">
            <h2>Customer Reviews</h2>
            <ReviewBlock productId={id} />
          </div>
        </div>
      </div>
    </>
  );
}

function ReviewBlock({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, "products", productId, "reviews"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, snapshot => {
      const reviewList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewList);
    });
    return () => unsub();
  }, [productId]);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Login to submit a review.");
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
    } catch (err) {
      console.error("Submit review error:", err);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await deleteDoc(doc(db, "products", productId, "reviews", id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = async (id, oldText, oldRating) => {
    const newText = prompt("Edit your review:", oldText);
    const newRating = Number(prompt("Edit your rating (1-5):", oldRating));
    if (!newText || !newRating || newRating < 1 || newRating > 5) return;

    try {
      await updateDoc(doc(db, "products", productId, "reviews", id), {
        text: newText,
        rating: newRating,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  const loadMore = () => setVisibleCount(prev => prev + 3);

  return (
    <div className="review-block">
      <div className="average-rating">
        <strong>{avgRating.toFixed(1)}</strong> out of 5
        <div className="stars">
          {[...Array(5)].map((_, i) => (
            <i key={i} className={`fas fa-star ${i < Math.round(avgRating) ? 'filled' : ''}`}></i>
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
          <textarea value={text} onChange={(e) => setText(e.target.value)} required />
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      <div className="reviews-list">
        {reviews.length ? (
          reviews.slice(0, visibleCount).map((r, i) => (
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
            Load More Reviews
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;