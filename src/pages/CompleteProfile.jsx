import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase-config";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalModal } from "../context/ModalContext";

function CompleteProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showModal } = useGlobalModal();
  const { uid, name, email } = location.state;

  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) {
      return showModal({ type: "error", message: "Please enter your phone number" });
    }

    try {
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        phone,
        addresses: [],
        createdAt: new Date(),
      });
      showModal({ type: "success", message: "Profile completed successfully!" });
      navigate("/home");
    } catch (error) {
      showModal({ type: "error", message: error.message });
    }
  };

  return (
    <div className="form-container">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={name} disabled placeholder="Full Name" />
        <input type="email" value={email} disabled placeholder="Email Address" />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
        />
        <button type="submit">Save & Continue</button>
      </form>
    </div>
  );
}

export default CompleteProfile;
