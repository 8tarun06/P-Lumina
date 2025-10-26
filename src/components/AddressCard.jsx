import React from "react";
import "../styles/youraddresses.css";

const AddressCard = ({ address, onDelete, onEdit }) => {
  return (
    <div className="address-card">
      <h4>{address.fullName}</h4>
      <p>{address.address}</p>
      <p>{address.city}, {address.state} - {address.pincode}</p>
      <p>Phone: {address.phone}</p>
      <p>{address.country}</p>

      <div className="card-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete} className="delete-btn">Delete</button>
      </div>
    </div>
  );
};

export default AddressCard;
