import React, { useState, useEffect } from "react";
import "../styles/addressform.css";

const AddressForm = ({ onSubmit, initialData, isEditing, cancelEdit }) => {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    pincode: "",
    address: "",
    city: "",
    state: "",
    country: "India",
  });

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      fullName: "",
      phone: "",
      pincode: "",
      address: "",
      city: "",
      state: "",
      country: "India",
    });
  };

  return (
    <form className="address-form" onSubmit={handleSubmit}>
      <input name="fullName" placeholder="Full Name" value={form.fullName} onChange={handleChange} required />
      <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
      <input name="pincode" placeholder="Pincode" value={form.pincode} onChange={handleChange} required />
      <textarea name="address" placeholder="Address" value={form.address} onChange={handleChange} required />
      <input name="city" placeholder="City" value={form.city} onChange={handleChange} required />
      <input name="state" placeholder="State" value={form.state} onChange={handleChange} required />
      <input name="country" placeholder="Country" value={form.country} onChange={handleChange} required />
      <div className="form-buttons">
        <button type="submit">{isEditing ? "Update Address" : "Add Address"}</button>
        {isEditing && <button type="button" onClick={cancelEdit}>Cancel</button>}
      </div>
    </form>
  );
};

export default AddressForm;
