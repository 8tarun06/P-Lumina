import React, { useState } from "react";
import { auth, db, provider } from "../firebase-config";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useGlobalModal } from "../context/ModalContext";
import MobileLayout from "../layouts/MobileLayout";

function SignUp() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!name || !phone || !email || !password || !confirm) {
      return showModal({
        type: "error",
        message: "Please fill in all fields",
      });
    }

    if (password !== confirm) {
      return showModal({
        type: "error",
        message: "Passwords do not match",
      });
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      await sendEmailVerification(user);

      // Save new user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        phone,
        email,
        addresses: [],
        createdAt: serverTimestamp(),
      });

      showModal({
        type: "success",
        message: "Account created! Please verify your email.",
      });

      navigate("/login");
    } catch (error) {
      showModal({
        title: "Signup Failed",
        message: error.message,
        type: "error",
      });
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // New Google user -> redirect to complete profile
        navigate("/complete-profile", { state: { uid: user.uid, name: user.displayName, email: user.email } });
        showModal({
          title: "Complete Profile",
          message: "Please provide your phone number to complete your profile.",
          type: "info",
        });
      } else {
        // Existing user -> login successful
        showModal({
          title: "Google Login Successful",
          message: "You're now logged in with Google.",
          type: "success",
        });
        navigate("/home");
      }
    } catch (error) {
      showModal({
        title: "Google Signup Failed",
        message: error.message,
        type: "error",
      });
    }
  };

  // Signup form content
  const signupContent = (
    <div className="auth-page-container">
      <div className="form-container">
        <img
          src="/dark mode .png"
          alt="Store Logo"
          className="auth-logo"
          onClick={() => navigate("/")}
        />
        <h2>Create Your Account</h2>
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

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

          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <FontAwesomeIcon
              icon={showConfirmPassword ? faEyeSlash : faEye}
              className="eye-icon"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </div>

          <button type="submit">Create Account</button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button className="google-signin-btn" onClick={handleGoogleSignUp}>
          <div className="google-icon-wrapper">
            <img
              className="google-icon"
              src="/google-icon.png"
              alt="Google sign-in"
            />
          </div>
          <p>Continue With Google</p>
        </button>

        <p>
          Already have an account? <a href="/login">Log in here</a>
        </p>
      </div>
    </div>
  );

  // Use MobileLayout for mobile devices, otherwise render directly
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (isMobile) {
    return <MobileLayout>{signupContent}</MobileLayout>;
  }

  return signupContent;
}

export default SignUp;