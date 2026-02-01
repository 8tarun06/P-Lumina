import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./mobile-categories.css";

export default function MobileCategories() {
  const navigate = useNavigate();

  return (
    <div className="coming-soon-wrapper">
      {/* CENTER CONTENT */}
      <motion.div
        className="coming-soon-card"
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="coming-icon"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          🚀
        </motion.div>

        <h2>Categories</h2>
        <p>This feature is coming very soon</p>

        <span className="coming-subtext">
          We’re building something powerful & beautiful for you.
        </span>

        <motion.button
          className="coming-home-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/home")}
        >
          Go to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
