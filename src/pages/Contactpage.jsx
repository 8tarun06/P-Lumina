import React, { useState } from "react";
import { db } from "../firebase-config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import { FiMail, FiPhone, FiMapPin, FiSend, FiCheckCircle } from "react-icons/fi";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/contactpage.css";

function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    // 1️⃣ Save the contact message in Firestore
    await addDoc(collection(db, "emails"), {
      ...formData,
      timestamp: serverTimestamp(),
      status: "unread"
    });

    // 2️⃣ Trigger email using Firebase Trigger Email extension (correct collection: emails)
    await addDoc(collection(db, "emails"), {
      to: "tarunkhilrani8@gmail.com", // 🔁 Replace with your email
      message: {
        subject: `📬 New Message from ${formData.name}`,
        text: `
You have a new contact form submission:

👤 Name: ${formData.name}
📧 Email: ${formData.email}
📱 Phone: ${formData.phone || "Not provided"}
📝 Message: ${formData.message}
        `
      }
    });

    setSubmitSuccess(true);
    setFormData({ name: "", email: "", phone: "", message: "" });
    setTimeout(() => setSubmitSuccess(false), 3000);
  } catch (error) {
    console.error("Error submitting form or sending email: ", error);
  } finally {
    setIsSubmitting(false);
  }
};


  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="contact-page">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />
      
      <motion.div 
        className="contact-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="contact-header" variants={itemVariants}>
          <h1>Get in Touch With Us</h1>
          <p>We'd love to hear from you! Send us a message and we'll respond as soon as possible.</p>
        </motion.div>

      <div className="contact-content">
  <motion.div className="contact-info" variants={itemVariants}>
    {/* ✅ Email Card as anchor tag */}
    <a
      href="mailto:support@plumina.com?subject=Customer Inquiry&body=Hi Plumina Team,"
      className="info-card"
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="info-icon">
        <FiMail size={24} />
      </div>
      <h3>Email Us</h3>
      <p>support@plumina.com</p>
    </a>

    {/* ✅ Phone Card */}
    <div className="info-card">
      <div className="info-icon">
        <FiPhone size={24} />
      </div>
      <h3>Call Us</h3>
      <p>+1 (555) 123-4567</p>
    </div>

    {/* ✅ Address Card */}
    <div className="info-card">
      <div className="info-icon">
        <FiMapPin size={24} />
      </div>
      <h3>Visit Us</h3>
      <p>123 Commerce St, Business City, BC 10001</p>
    </div>
  </motion.div>

          <motion.div className="contact-form-container" variants={itemVariants}>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Your Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  'Sending...'
                ) : submitSuccess ? (
                  <>
                    <FiCheckCircle style={{ marginRight: '8px' }} />
                    Message Sent!
                  </>
                ) : (
                  <>
                    <FiSend style={{ marginRight: '8px' }} />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ContactPage;