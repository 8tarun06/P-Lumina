import React, { useState } from "react";
import { auth, provider, db } from "../firebase-config";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "../index.css";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useGlobalModal } from "../context/ModalContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const persistence = rememberMe
        ? import("firebase/auth").then((m) => m.browserLocalPersistence)
        : import("firebase/auth").then((m) => m.browserSessionPersistence);

      await auth.setPersistence(await persistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        showModal({
          title: "Email Not Verified",
          message: "Please verify your email before logging in.",
          type: "error"
        });
        return;
      }

      showModal({
        title: "Login Successful",
        message: "Welcome back!",
        type: "success"
      });

      navigate("/home");
    } catch (error) {
      showModal({
        title: "Login Failed",
        message: error.message,
        type: "error"
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check Firestore if user exists
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // New Google user -> redirect to CompleteProfile
        navigate("/complete-profile", {
          state: {
            uid: user.uid,
            name: user.displayName,
            email: user.email
          }
        });
        showModal({
          title: "Complete Profile",
          message: "Please provide your phone number to complete your profile.",
          type: "info"
        });
      } else {
        // Existing user -> fetch data if needed and login
        showModal({
          title: "Google Login Successful",
          message: "You're now logged in with Google.",
          type: "success"
        });
        navigate("/home");
      }

    } catch (error) {
      showModal({
        title: "Google Login Failed",
        message: error.message,
        type: "error"
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showModal({
        title: "Email Required",
        message: "Please enter your email to reset password.",
        type: "info"
      });
      return;
    }

    try {
      await import("firebase/auth").then(async (m) => {
        await m.sendPasswordResetEmail(auth, email);
      });
      showModal({
        title: "Reset Email Sent",
        message: "Check your inbox for password reset instructions.",
        type: "success"
      });
    } catch (error) {
      showModal({
        title: "Password Reset Failed",
        message: error.message,
        type: "error"
      });
    }
  };

  return (
    <div className="form-container">
      <img
        src="/dark mode .png"
        alt="Store Logo"
        className="auth-logo"
        onClick={() => window.location.href = "/login"}
      />
      <h2>Welcome Back</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div style={{ position: "relative" }}>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              className="eye-icon"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
          <label style={{ color: "#fff" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              style={{ marginRight: "5px" }}
            />
            Remember Me
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            style={{ background: "none", border: "none", color: "#e76cca", cursor: "pointer" }}
          >
            Forgot Password?
          </button>
        </div>

        <button type="submit">Login</button>
      </form>

      <div className="divider">
        <span>OR</span>
      </div>

      <button className="google-signin-btn" onClick={handleGoogleLogin}>
        <div className="google-icon-wrapper">
          <img
            className="google-icon"
            src="./public/google-icon.png"
            alt="Google sign-in"
          />
        </div>
        <p>Continue With Google</p>
      </button>

      <p>
        New to Plumina? <a href="/">Create an account</a>
      </p>
    </div>
  );
}

export default Login;
