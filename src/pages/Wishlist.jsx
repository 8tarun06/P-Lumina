import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase-config";
import {
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  getDoc,
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
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
   const { showModal } = useGlobalModal();

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

  const handleAddToCart = async (product) => {
    const user = auth.currentUser;
    if (!user) return navigate("/login");

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
  type: "info"
});
    
        return;
      }

      await updateDoc(cartRef, {
        items: [...existingItems, productWithMeta],
      });
    } else {
      await setDoc(cartRef, {
        items: [productWithMeta],
      });
    }

     showModal({
  title: "Added to Cart",
  message: `${product.name} has been added to your cart.`,
  type: "success"
});
    handleRemoveFromWishlist(product.id);
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

  const filteredWishlist = wishlistItems.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              {filteredWishlist.map((product) => (
                <div className="product-card" key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <div className="product-info">
                    <div className="product-title">{product.name}</div>
                    <div className="product-price">₹{product.price}</div>
                    <button
                      className="add-to-cart"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                  <div
                    className="wishlist-icon active"
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    title="Remove from Wishlist"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default Wishlist;
