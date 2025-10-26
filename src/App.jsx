import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoadingScreen from "./components/LoadingScreen";

// Pages
import SignUp from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Confirm from "./pages/Confirm";
import Wishlist from "./pages/Wishlist";
import Orders from "./pages/Orders";
import AddressPage from "./pages/AddressPage";
import YourAccount from "./pages/YourAccount";
import Paymentmethods from "./pages/Paymentmethods";
import ProfileSettings from "./pages/Profilesettings";
import ContactPage from "./pages/Contactpage";
import AboutPage from "./pages/AboutPage";
import ProductDetail from "./pages/ProductDetail";
import CompleteProfile from "./pages/CompleteProfile";


// Mobile block component
const MobileBlock = () => (
  <div style={{
    fontFamily: "Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #f5f7fa, #c3cfe2)",
    textAlign: "center",
    padding: "20px",
  }}>
    <div style={{
      maxWidth: "400px",
      padding: "20px",
      background: "rgba(255, 255, 255, 0.85)",
      borderRadius: "15px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    }}>
      <h2 style={{ fontSize: "24px", marginBottom: "15px", color: "#111827" }}>🚫 Desktop Version Only</h2>
      <p style={{ fontSize: "16px", lineHeight: "1.5", color: "#333" }}>
        This website is optimized for desktop or Mac devices.<br />
        Please open it on a larger screen for the best experience.
      </p>
    </div>
  </div>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const handleLoaderFinish = () => {
    setIsLoading(false);
  };

  // Detect mobile once when app loads
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const mobileCheck = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    setIsMobile(mobileCheck);
  }, []);

  // Show mobile block if mobile detected
  if (isMobile) return <MobileBlock />;

  return (
    <>
      <ToastContainer 
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {isLoading ? (
        <LoadingScreen onFinish={handleLoaderFinish} />
      ) : (
        <Routes>
          <Route path="/" element={<SignUp />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirm" element={<Confirm />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/addresses" element={<AddressPage />} />
          <Route path="/account" element={<YourAccount />} />
          <Route path="/payment-methods" element={<Paymentmethods />} />
          <Route path="/profile-settings" element={<ProfileSettings />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

        </Routes>
      )}
    </>
  );
}

export default App;
