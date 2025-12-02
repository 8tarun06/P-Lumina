import React, { useEffect } from "react";
import "./WishlistToast.css";

export default function WishlistToast({ text = "Saved to Wishlist", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 1200);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="wishlist-toast">
      <div className="heart-burst">❤️</div>
      <span>{text}</span>
    </div>
  );
}
