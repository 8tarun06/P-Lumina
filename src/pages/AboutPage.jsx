import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiUsers, FiAward, FiShoppingBag, FiGlobe } from "react-icons/fi";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { db } from "../firebase-config";
import { collection, getDocs } from "firebase/firestore";
import { useGlobalModal } from "../context/ModalContext";
import "../styles/aboutpage.css";

function AboutPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showModal } = useGlobalModal();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch team members from Firestore
        const teamSnapshot = await getDocs(collection(db, "teamMembers"));
        const teamData = teamSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch company stats from Firestore
        const statsSnapshot = await getDocs(collection(db, "companyStats"));
        const statsData = statsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setTeamMembers(teamData);
        setStats(statsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };

  return (
    <div className="about-page">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />

      <motion.div 
        className="about-hero"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
      >
        <div className="hero-content">
          <motion.h1 variants={itemVariants}>Our Story</motion.h1>
          <motion.p variants={itemVariants}>
            From a small idea to a thriving e-commerce platform serving thousands of customers worldwide.
          </motion.p>
        </div>
      </motion.div>

      <motion.div 
        className="about-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.section className="mission-section" variants={itemVariants}>
          <div className="mission-content">
            <h2>Our Mission</h2>
            <p>
              At Plumina, we're committed to providing high-quality products with exceptional customer service. 
              We believe in sustainable commerce that benefits both our customers and the environment.
            </p>
          </div>
          <div className="mission-image"></div>
        </motion.section>

        <motion.section className="stats-section" variants={itemVariants}>
          <h2>By The Numbers</h2>
          <div className="stats-grid">
            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              stats.map((stat, index) => (
                <motion.div 
                  className="stat-card"
                  key={stat.id}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="stat-icon">
                    {index % 4 === 0 && <FiUsers size={32} />}
                    {index % 4 === 1 && <FiShoppingBag size={32} />}
                    {index % 4 === 2 && <FiAward size={32} />}
                    {index % 4 === 3 && <FiGlobe size={32} />}
                  </div>
                  <h3>{stat.value}</h3>
                  <p>{stat.label}</p>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        <motion.section className="team-section" variants={itemVariants}>
          <h2>Meet The Team</h2>
          <div className="team-grid">
            {loading ? (
              <div className="loading-spinner">Loading team...</div>
            ) : (
              teamMembers.map(member => (
                <motion.div 
                  className="team-card"
                  key={member.id}
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="team-image" style={{ backgroundImage: `url(${member.photoURL})` }}></div>
                  <h3>{member.name}</h3>
                  <p className="position">{member.position}</p>
                  <p className="bio">{member.bio}</p>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        <motion.section className="values-section" variants={itemVariants}>
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <motion.div 
              className="value-card"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Customer First</h3>
              <p>We prioritize customer satisfaction above all else, ensuring every interaction is exceptional.</p>
            </motion.div>
            <motion.div 
              className="value-card"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Quality Assurance</h3>
              <p>Every product undergoes rigorous quality checks before reaching our customers.</p>
            </motion.div>
            <motion.div 
              className="value-card"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Sustainability</h3>
              <p>We're committed to eco-friendly practices and sustainable business operations.</p>
            </motion.div>
            <motion.div 
              className="value-card"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
            >
              <h3>Innovation</h3>
              <p>Constantly evolving to bring you the latest trends and technologies.</p>
            </motion.div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}

export default AboutPage;