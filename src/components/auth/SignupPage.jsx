// components/auth/SignupPage.jsx
import React, { useState } from 'react';
import { auth, db, provider } from '../../firebase-config';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, 
  FiCheck, FiAlertCircle 
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import './AuthStyles.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    if (error) setError('');
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordStrength < 75) {
      setError('Please use a stronger password');
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        addresses: [],
        createdAt: serverTimestamp(),
        emailVerified: false
      });

      // Success - redirect to verification page
      navigate('/verify-email', { 
        state: { email: formData.email } 
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        navigate('/complete-profile', {
          state: {
            uid: user.uid,
            name: user.displayName,
            email: user.email
          }
        });
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return '#ff4444';
    if (passwordStrength < 50) return '#ffbb33';
    if (passwordStrength < 75) return '#00C851';
    return '#007E33';
  };

  return (
    <div className="auth-container">
      {/* Animated Background */}
      <div className="bg-animation">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="bg-circle"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.08 }}
            transition={{ delay: i * 0.1, duration: 1.5 }}
          />
        ))}
      </div>

      <motion.div 
        className="auth-card signup-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo Section */}
        <motion.div 
          className="logo-section"
          whileHover={{ scale: 1.05 }}
        >
          <motion.div 
            className="logo-circle"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <span className="logo-text">P</span>
          </motion.div>
          <h1 className="brand-name">Plumina</h1>
          <p className="brand-tagline">Join Our Community</p>
        </motion.div>

        {/* Form Section */}
        <motion.div 
          className="form-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="form-header">
            <h2>Create Account</h2>
            <p>Start your journey with us</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Field */}
            <motion.div className="form-group">
              <div className="input-group">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="auth-input"
                />
              </div>
            </motion.div>

            {/* Email Field */}
            <motion.div className="form-group">
              <div className="input-group">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="auth-input"
                />
              </div>
            </motion.div>

            {/* Phone Field */}
            <motion.div className="form-group">
              <div className="input-group">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="auth-input"
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div className="form-group">
              <div className="input-group">
                <FiLock className="input-icon" />
                <input
                  type={showPassword.password ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('password')}
                >
                  {showPassword.password ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {formData.password && (
                <motion.div 
                  className="password-strength"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="strength-meter">
                    <div 
                      className="strength-fill"
                      style={{ 
                        width: `${passwordStrength}%`,
                        backgroundColor: getPasswordStrengthColor()
                      }}
                    />
                  </div>
                  <div className="strength-rules">
                    <span className={formData.password.length >= 8 ? 'rule-met' : ''}>
                      <FiCheck /> At least 8 characters
                    </span>
                    <span className={/[A-Z]/.test(formData.password) ? 'rule-met' : ''}>
                      <FiCheck /> One uppercase letter
                    </span>
                    <span className={/[0-9]/.test(formData.password) ? 'rule-met' : ''}>
                      <FiCheck /> One number
                    </span>
                    <span className={/[^A-Za-z0-9]/.test(formData.password) ? 'rule-met' : ''}>
                      <FiCheck /> One special character
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div className="form-group">
              <div className="input-group">
                <FiLock className="input-icon" />
                <input
                  type={showPassword.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                >
                  {showPassword.confirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="error-message"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <FiAlertCircle />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Terms Agreement */}
            <div className="terms-agreement">
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>
                  I agree to the <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="submit-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
            >
              {loading ? (
                <motion.div 
                  className="spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>or sign up with</span>
          </div>

          {/* Google Sign Up */}
          <motion.button
            className="google-btn"
            onClick={handleGoogleSignUp}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            <FcGoogle className="google-icon" />
            <span>Google</span>
          </motion.button>

          {/* Login Link */}
          <div className="auth-link">
            <p>Already have an account?</p>
            <motion.button
              className="link-btn"
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign In
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignupPage;