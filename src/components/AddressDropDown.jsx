import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase-config";
import {
  collection,
  doc,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import "../styles/addresspage.css";

const AddressDropdown = ({ onSelect }) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    const fetchAddresses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const addressesRef = collection(db, "users", user.uid, "addresses");
      const snapshot = await getDocs(addressesRef);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddresses(fetched);
    };

    fetchAddresses();
  }, []);

  const handleSelect = (address) => {
    setSelectedId(address.id);
    onSelect(address);
  };

  const handleDelete = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    const confirm = window.confirm("Delete this address?");
    if (!confirm) return;

    await deleteDoc(doc(db, "users", user.uid, "addresses", id));
    setAddresses((prev) => prev.filter((addr) => addr.id !== id));
  };

  return (
    <div className="address-dropdown">
      <h4>Choose from saved addresses:</h4>
      {addresses.length === 0 && <p>No saved addresses found.</p>}
      {addresses.map((address) => (
        <div
          key={address.id}
          className={`dropdown-card ${selectedId === address.id ? "selected" : ""}`}
        >
          <label className="radio-label">
            <input
              type="radio"
              name="addressOption"
              checked={selectedId === address.id}
              onChange={() => handleSelect(address)}
            />
            <div className="address-details">
              <strong>{address.fullName}</strong> — {address.phone}
              <p>{address.address}, {address.city}, {address.pincode}</p>
              <small>{address.state}, {address.country}</small>
            </div>
          </label>

          <div className="dropdown-buttons">
            {/* Placeholder for edit */}
            {/* <button onClick={() => onEdit(address)}>Edit</button> */}
            <button className="delete-btn" onClick={() => handleDelete(address.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AddressDropdown;
