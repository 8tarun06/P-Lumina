import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import "./layouts/responsive-overrides.css";
import LoadingScreen from "./components/LoadingScreen";
import ResponsiveWrapper from "./layouts/ResponsiveWrapper";

// Pages
import SignUp from "./pages/signup";
import Login from "./pages/login";
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

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoaderFinish = () => {
    setIsLoading(false);
  };

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
          
          {/* 🔥 AMAZON MOBILE LAYOUT APPLIED HERE */}
          <Route path="/home" element={<ResponsiveWrapper Page={Home} />} />
          
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