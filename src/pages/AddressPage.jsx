import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiMapPin } from "react-icons/fi";
import { db,auth } from "../firebase-config";

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/addresspage.css";

function AddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = auth.currentUser;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    isDefault: false
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Auto-populate name and phone from users collection
useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setFormData(prev => ({
          ...prev,
          name: userData.name || "",
          phone: userData.phone || ""
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  });

  return () => unsubscribe();
}, []);


  // Fetch addresses from Firestore
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      
      try {
        const addressesRef = collection(db, "users", user.uid, "addresses");
        const snapshot = await getDocs(addressesRef);
        const addressesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAddresses(addressesData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching addresses:", error);
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user) return;
      
      const addressesRef = collection(db, "users", user.uid, "addresses");
      
      if (editMode && currentAddress) {
        // Update existing address
        const addressRef = doc(db, "users", user.uid, "addresses", currentAddress.id);
        await updateDoc(addressRef, formData);
        
        setAddresses(addresses.map(addr => 
          addr.id === currentAddress.id ? { ...addr, ...formData } : addr
        ));
      } else {
        // Add new address
        const docRef = await addDoc(addressesRef, formData);
        setAddresses([...addresses, { id: docRef.id, ...formData }]);
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving address:", error);
    }
  };

  const handleEdit = (address) => {
    setCurrentAddress(address);
    setFormData({
      name: address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country || "India",
      isDefault: address.isDefault || false
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    
    try {
      if (!user) return;
      
      await deleteDoc(doc(db, "users", user.uid, "addresses", addressId));
      setAddresses(addresses.filter(addr => addr.id !== addressId));
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const setDefaultAddress = async (addressId) => {
    try {
      if (!user) return;
      
      // First, set all addresses to non-default
      const batch = addresses.map(async addr => {
        const addressRef = doc(db, "users", user.uid, "addresses", addr.id);
        await updateDoc(addressRef, { isDefault: addr.id === addressId });
      });
      
      await Promise.all(batch);
      
      // Update local state
      setAddresses(addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      })));
    } catch (error) {
      console.error("Error setting default address:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
      isDefault: false
    });
    setEditMode(false);
    setCurrentAddress(null);
    setShowForm(false);
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

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8 }
    }
  };

  return (
    <div className="address-page">
      <Navbar toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggle={toggleSidebar} />
      
      <motion.div 
        className="address-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="address-header" variants={itemVariants}>
          <h1>Your Addresses</h1>
          <p>Manage your shipping addresses for faster checkout</p>
        </motion.div>

        <motion.button
          className="add-address-btn"
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          variants={itemVariants}
        >
          <FiPlus /> Add New Address
        </motion.button>

        <AnimatePresence>
          {showForm && (
            <motion.div 
              className="address-form-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2>{editMode ? 'Edit Address' : 'Add New Address'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address Line 1</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address Line 2 (Landmark)</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                  <div className="form-group checkbox-group">
                    <input
                      type="checkbox"
                      id="defaultAddress"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="defaultAddress">Set as default address</label>
                  </div>
                </div>
                <div className="form-buttons">
                  <button type="button" className="cancel-btn" onClick={resetForm}>
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    {editMode ? 'Update Address' : 'Save Address'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <motion.div 
            className="loading-spinner"
            variants={fadeIn}
          >
            Loading your addresses...
          </motion.div>
        ) : addresses.length === 0 ? (
          <motion.div 
            className="empty-state"
            variants={fadeIn}
          >
            <FiMapPin size={48} />
            <h3>No addresses saved yet</h3>
            <p>Add your first address to get started</p>
          </motion.div>
        ) : (
          <motion.div 
            className="address-grid"
            variants={containerVariants}
          >
            {addresses.map(address => (
              <motion.div 
                key={address.id}
                className={`address-card ${address.isDefault ? 'default' : ''}`}
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                {address.isDefault && (
                  <div className="default-badge">DEFAULT</div>
                )}
                <div className="address-content">
                  <h3>{address.name}</h3>
                  <p>{address.phone}</p>
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.zipCode}</p>
                  <p>{address.country}</p>
                </div>
                <div className="address-actions">
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => handleEdit(address)}
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDelete(address.id)}
                  >
                    <FiTrash2 /> Delete
                  </button>
                  {!address.isDefault && (
                    <button 
                      className="action-btn default-btn"
                      onClick={() => setDefaultAddress(address.id)}
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default AddressPage;
