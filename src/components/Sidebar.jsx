import React from "react";
import { Link } from "react-router-dom";
import { auth } from "../firebase-config";
import "../home.css";

function Sidebar() {
  return (
    <aside className="sidebar" id="sidebar">
      <ul>
        <li><Link to="/account">Your Account</Link></li>
        <li><Link to="/orders">Your Orders</Link></li>
        <li><Link to="/addresses">Addresses</Link></li>
        <li><Link to="/about">About Us</Link></li>
        <li><Link to="/contact">Contact Us</Link></li>
        <li>
          <button
            onClick={() => {
              localStorage.removeItem("isLoggedIn");
              localStorage.removeItem("userEmail");
              auth.signOut().then(() => {
                window.location.href = "/login";
              });
            }}
            className="logout-btn"
          >
            Logout
          </button>
        </li>
        <div className="footer">
          <span className="theme">Princyy</span> @All Rights Reserved
        </div>
      </ul>
    </aside>
  );
}

export default Sidebar;