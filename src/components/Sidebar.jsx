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
          ><span>Logout</span>
          </button>
        </li>

        <div className="social-section">
  <h4 className="social-title">Keep In Touch With Us</h4>

  <div className="social-icons">
    <a href="https://facebook.com" target="_blank" className="social-btn fb">
      <i className="fab fa-facebook-f"></i>
    </a>
    <a href="https://twitter.com" target="_blank" className="social-btn tw">
      <i className="fab fa-twitter"></i>
    </a>
    <a href="https://youtube.com" target="_blank" className="social-btn yt">
      <i className="fab fa-youtube"></i>
    </a>
    <a href="https://instagram.com" target="_blank" className="social-btn ig">
      <i className="fab fa-instagram"></i>
    </a>
  </div>
</div>


        <div className="footer">
          <span className="theme">Princyy</span> @All Rights Reserved
        </div>
      </ul>
    </aside>
  );
}

export default Sidebar;