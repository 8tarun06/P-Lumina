import React, { useState, useEffect, useRef } from "react";
import { auth, db, storage } from "../firebase-config";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  updatePassword,
  deleteUser,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MobileLayout from "../layouts/MobileLayout";
import { useGlobalModal } from "../context/ModalContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../styles/profilesettings.css";
import "../home.css";

function ProfileSettings() {
  const [userData, setUserData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    dob: "",
    email: "",
    photoURL: "",
  });

  const [language, setLanguage] = useState("English");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [previewURL, setPreviewURL] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [activeTab, setActiveTab] = useState("personal");
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();

  const user = auth.currentUser;
  const isGoogleUser = user?.providerData?.some(
    (provider) => provider.providerId === "google.com"
  );

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleOpenPasswordModal = () => {
    const isGoogleUser = auth.currentUser?.providerData?.some(
      (provider) => provider.providerId === "google.com"
    );

    if (isGoogleUser) {
      setShowPasswordModal(true);
      return;
    }
    setShowPasswordModal(true);
  };

  const handleOpenDeleteModal = () => {
    const isGoogleUser = auth.currentUser?.providerData?.some(
      (provider) => provider.providerId === "google.com"
    );

    if (isGoogleUser) {
      setShowDeleteModal(true);
      return;
    }
    setShowDeleteModal(true);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      await auth.currentUser.reload();
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData((prev) => ({
          ...prev,
          fullName: data.fullName || "",
          phone: data.phone || "",
          gender: data.gender || "",
          dob: data.dob || "",
          email: auth.currentUser?.email || "",
          photoURL: data.photoURL || "",
        }));
        setLanguage(data.language || "English");
        setDarkMode(data.darkMode || false);
        setNotifications(data.notifications ?? true);
        setPreviewURL(data.photoURL || "");
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchCartCount = async () => {
      if (!user) return;
      try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
          const items = cartSnap.data().items || [];
          setCartCount(items.reduce((total, item) => total + (item.quantity || 1), 0));
        }
      } catch (err) {
        console.error("Error loading cart count:", err.message);
      }
    };
    fetchCartCount();
  }, [user]);

  useEffect(() => {
    const syncEmail = async () => {
      if (!auth.currentUser) return;
      await auth.currentUser.reload();
      const updatedEmail = auth.currentUser.email;
      setUserData((prev) => ({ ...prev, email: updatedEmail }));
    };
    syncEmail();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `profilePictures/${user.uid}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", user.uid), {
      photoURL: downloadURL,
    });

    setPreviewURL(downloadURL);
    alert("✅ Profile picture updated");
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    const storageRef = ref(storage, `profilePictures/${user.uid}`);
    await deleteObject(storageRef).catch(() => {});
    await updateDoc(doc(db, "users", user.uid), { photoURL: "" });
    setPreviewURL("");
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);

      await setDoc(
        userRef,
        {
          name: userData.name.trim(),
          phone: userData.phone.trim(),
          gender: userData.gender,
          dob: userData.dob,
          language,
          darkMode,
          notifications,
          photoURL: previewURL,
        },
        { merge: true }
      );

      showModal({
        title: "✅ Profile Update Successfully",
        message: "Your Profile Have Been Updated As Per Your Customization",
        type: "success"
      });
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      showModal({
        title: "❌ Failed To Update Profile",
        message: "Sorry For The Inconvenience Your Profile Updation have been Failed Please Try Again or Check after some time",
        type: "error"
      });
    }
  };

  const handleToggleDarkMode = async () => {
    const updated = !darkMode;
    setDarkMode(updated);
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { darkMode: updated });
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  const handleToggleNotifications = async () => {
    const updated = !notifications;
    setNotifications(updated);
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { notifications: updated });
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  const handleLanguageChange = async (e) => {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { language: selectedLang });
    } catch (error) {
      console.error("Error updating language:", error);
    }
  };

  const updateEmailHandler = async () => {
    if (!newEmail || !currentPassword) {
      return alert("Please fill all fields.");
    }

    const user = auth.currentUser;
    if (!user) {
      return alert("User not found. Please log in again.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      await verifyBeforeUpdateEmail(user, newEmail);

      alert("✅ Verification email sent. After verifying it via your inbox, please log out and log in again to see the updated email.");

      setShowEmailModal(false);
      setNewEmail("");
      setCurrentPassword("");
    } catch (err) {
      console.error("❌ Email update error:", err.message);
      alert("❌ Failed to update email. " + err.message);
    }
  };

  const updatePasswordHandler = async () => {
    if (!newPassword || !currentPassword) {
      return alert("Please fill all fields.");
    }

    if (newPassword.length < 6) {
      return alert("❌ Password must be at least 6 characters.");
    }

    const user = auth.currentUser;
    if (!user) {
      return alert("User not found. Please log in again.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (newPassword === currentPassword) {
        return alert("❌ New password cannot be the same as the current password.");
      }

      await updatePassword(user, newPassword);
      alert("✅ Password updated successfully.");

      setShowPasswordModal(false);
      setNewPassword("");
      setCurrentPassword("");
    } catch (err) {
      console.error("❌ Password update error:", err.message);
      if (err.code === "auth/wrong-password") {
        alert("❌ Incorrect current password.");
      } else if (err.code === "auth/too-many-requests") {
        alert("❌ Too many failed attempts. Please try again later.");
      } else {
        alert("❌ Failed to update password. " + err.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      return alert("❌ Please enter your current password.");
    }

    if (!window.confirm("⚠️ Are you sure? This action cannot be undone.")) return;

    const user = auth.currentUser;
    if (!user) {
      return alert("❌ User not found.");
    }

    try {
      setDeleting(true);
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      const uid = user.uid;
      await deleteDoc(doc(db, "users", uid));
      await deleteDoc(doc(db, "carts", uid));
      await deleteDoc(doc(db, "wishlists", uid));

      const ordersRef = collection(db, "orders");
      const orderQuery = query(ordersRef, where("userId", "==", uid));
      const orderSnap = await getDocs(orderQuery);
      for (const docu of orderSnap.docs) {
        await deleteDoc(doc(db, "orders", docu.id));
      }

      const picRef = ref(storage, `profilePictures/${uid}`);
      await deleteObject(picRef).catch(() => {
        console.log("⚠️ Profile picture not found or already deleted.");
      });

      await deleteUser(user);
      alert("✅ Your account and all data have been deleted.");
      navigate("/");
    } catch (error) {
      console.error("❌ Account deletion error:", error);
      if (error.code === "auth/wrong-password") {
        alert("❌ Incorrect password.");
      } else {
        alert("❌ Failed to delete account. " + error.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Main profile settings content
  const profileContent = (
    <div className="profile-settings-container">
      <div className="profile-header">
        <h1 className="profile-title">Account Settings</h1>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <i className="fas fa-user"></i> Personal Info
        </button>
        <button 
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-lock"></i> Security
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <i className="fas fa-cog"></i> Preferences
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'personal' && (
          <div className="settings-section">
            <h2 className="section-title">Personal Information</h2>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                name="fullName" 
                value={userData.name} 
                onChange={handleInputChange} 
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                value={userData.phone} 
                onChange={handleInputChange} 
                placeholder="Enter phone number"
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input 
                type="date" 
                name="dob" 
                value={userData.dob} 
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select 
                name="gender" 
                value={userData.gender} 
                onChange={handleInputChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="settings-section">
            <h2 className="section-title">Security Settings</h2>
            <div className="security-item">
              <div className="security-info">
                <h3>Email Address</h3>
                <p>{userData.email}</p>
              </div>
              <button 
                className="security-btn"
                onClick={() => setShowEmailModal(true)}
              >
                Change Email
              </button>
            </div>
            <div className="security-item">
              <div className="security-info">
                <h3>Password</h3>
                <p>•••••••••••</p>
              </div>
              <button 
                className="security-btn"
                onClick={() => {
                  if (isGoogleUser) {
                    setShowPasswordModal(true);
                  } else {
                    setShowPasswordModal(true);
                  }
                }}
              >
                Change Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="settings-section">
            <h2 className="section-title">Preferences</h2>
            <div className="preference-item">
              <div className="preference-info">
                <h3>Theme</h3>
                <p>Choose between light and dark mode</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={darkMode} 
                  onChange={() => setDarkMode(!darkMode)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="preference-item">
              <div className="preference-info">
                <h3>Notifications</h3>
                <p>Enable or disable notifications</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={notifications} 
                  onChange={() => setNotifications(!notifications)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="form-group">
              <label>Language</label>
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>  
        )}

        <div className="danger-zone">
          <h2 className="section-title danger-title">
            <i className="fas fa-exclamation-triangle"></i> Danger Zone
          </h2>
          <div className="danger-content">
            <p style={{ fontSize: "14px", color: "red", marginTop: "-8px" }}>
              ⚠️ All your orders, wishlist, and account data will be permanently deleted.
            </p>
            <button className="danger-btn" onClick={() => {
              setShowDeleteModal(true);
            }}>
              Delete Account
            </button>
          </div>
        </div>

        <button 
          className="save-btn"
          onClick={handleSaveProfile}
        >
          <i className="fas fa-save"></i> Save Changes
        </button>
      </div>

      {/* Modals */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Email</h3>
            <input
              type="email"
              placeholder="New Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={updateEmailHandler}>Submit</button>
              <button onClick={() => setShowEmailModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Change Password</h3>
            <div className="password-wrapper">
              <input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <FontAwesomeIcon
                icon={showCurrentPassword ? faEyeSlash : faEye}
                className="eye-icon"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
              />
            </div>
            <div className="password-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <FontAwesomeIcon
                icon={showNewPassword ? faEyeSlash : faEye}
                className="eye-icon"
                onClick={() => setShowNewPassword((prev) => !prev)}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={updatePasswordHandler}>Submit</button>
              <button onClick={() => setShowPasswordModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Account Deletion</h3>
            <input
              type="password"
              placeholder="Enter Current Password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <p style={{ color: "red", fontSize: "14px", marginTop: "-10px" }}>
              ⚠️ This will permanently delete your account, orders, and profile data.
            </p>
            <div className="modal-buttons">
              <button disabled={deleting} onClick={handleDeleteAccount}>
                {deleting ? "Deleting..." : "Confirm"}
              </button>
              <button onClick={() => setShowDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isGoogleUser && showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Google Account Detected</h3>
            <p className="google-modal-text">
              You signed up with Google. Password changes must be managed through your Google Account.
            </p>
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="modal-link"
            >
              🔐 Manage Google Account
            </a>
            <div className="modal-buttons">
              <button onClick={() => setShowPasswordModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {isGoogleUser && showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Google Account Detected</h3>
            <p className="google-modal-text">
              You signed in using Google. To delete your account, please manage it directly from your Google account.
            </p>
            <a
              href="https://myaccount.google.com/data-and-privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="modal-link"
            >
              🗑️ Manage Google Account Deletion
            </a>
            <div className="modal-buttons">
              <button onClick={() => setShowDeleteModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If mobile, use MobileLayout
  if (isMobile) {
    return (
      <MobileLayout>
        {profileContent}
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <>
      <Navbar cartCount={cartCount} />
      <div className="layout">
        <Sidebar />
        {profileContent}
      </div>
    </>
  );
}

export default ProfileSettings;