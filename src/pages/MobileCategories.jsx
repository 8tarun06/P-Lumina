import React, { useState } from "react";
import "./mobile-categories.css";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileCategories() {
  const navigate = useNavigate();

  // Temporary Demo Categories (replace with Firestore later)
  const categories = [
    {
      id: "mens",
      label: "Men's Wear",
      icon: "/assets/cat-men.png",
      sections: {
        trendingNow: [
          { img: "/assets/demo1.png", label: "Trending Now" },
          { img: "/assets/demo2.png", label: "Hot Picks" },
        ],
        spotlight: [
          { img: "/assets/demo3.png", label: "New On Myntra" },
          { img: "/assets/demo4.png", label: "Wedding Diaries" },
        ],
        stores: [
          { img: "/assets/demo5.png", label: "Myntra Unique" },
          { img: "/assets/demo6.png", label: "Rising Stars" },
          { img: "/assets/demo7.png", label: "Luxe" },
        ],
      },
    },

    {
      id: "womens",
      label: "Women's Wear",
      icon: "/assets/cat-women.png",
      sections: {
        trendingNow: [
          { img: "/assets/demo8.png", label: "Trending Styles" },
          { img: "/assets/demo9.png", label: "Hot Picks" },
        ],
        spotlight: [
          { img: "/assets/demo10.png", label: "The Edit" },
          { img: "/assets/demo6.png", label: "Winter Specials" },
        ],
        stores: [
          { img: "/assets/demo5.png", label: "Fashion Hub" },
          { img: "/assets/demo7.png", label: "Luxe India" },
        ],
      },
    },

    {
      id: "kids",
      label: "Kids Wear",
      icon: "/assets/cat-kids.png",
      sections: {
        spotlight: [
          { img: "/assets/demo11.png", label: "Mini Fashion" },
          { img: "/assets/demo12.png", label: "Trending Kids" },
        ],
        stores: [
          { img: "/assets/demo13.png", label: "Kids Corner" },
        ],
      },
    },

    {
      id: "beauty",
      label: "Beauty & Grooming",
      icon: "/assets/cat-beauty.png",
      sections: {
        spotlight: [
          { img: "/assets/demo14.png", label: "Top Beauty" },
        ],
        stores: [
          { img: "/assets/demo15.png", label: "FWD" },
        ],
      },
    },
  ];

  const [selected, setSelected] = useState(categories[0]);

  return (
    <div className="categories-container">

      {/* TOP NAVBAR */}
      <div className="cat-navbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h3>Categories</h3>
        <div className="icons">
          <i className="heart">♡</i>
          <div className="cart">
            🛒<span>26</span>
          </div>
        </div>
      </div>

      <div className="cat-main">

        {/* LEFT SIDEBAR */}
        <div className="left-menu">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`left-item ${
                selected.id === cat.id ? "active" : ""
              }`}
              onClick={() => setSelected(cat)}
            >
              <img src={cat.icon} alt="" className="left-icon" />
              <span>{cat.label}</span>
            </div>
          ))}
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="right-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {/* SECTIONS */}
              {selected.sections.trendingNow && (
                <div className="section">
                  <h4>Trending Now</h4>
                  <div className="circle-row">
                    {selected.sections.trendingNow.map((item, i) => (
                      <div className="circle-item" key={i}>
                        <img src={item.img} alt="" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.sections.spotlight && (
                <div className="section">
                  <h4>In The Spotlight</h4>
                  <div className="circle-row">
                    {selected.sections.spotlight.map((item, i) => (
                      <div className="circle-item" key={i}>
                        <img src={item.img} alt="" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.sections.stores && (
                <div className="section">
                  <h4>Trending Stores</h4>
                  <div className="circle-row">
                    {selected.sections.stores.map((item, i) => (
                      <div className="circle-item" key={i}>
                        <img src={item.img} alt="" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
