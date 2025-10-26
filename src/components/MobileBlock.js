import React from "react";
import logo from "./logo.png"; // Replace with your logo path
import "./MobileBlock.css"; // We'll add animations and styling here

const MobileBlock = () => {
  return (
    <div className="mobile-block-container">
      <div className="mobile-block-content">
        <img src={logo} alt="Logo" className="mobile-block-logo" />
        <h2>🚫 Desktop Version Only</h2>
        <p>
          This website is optimized for desktop or Mac devices.<br />
          Please open it on a larger screen for the best experience.
        </p>
      </div>
    </div>
  );
};

export default MobileBlock;
