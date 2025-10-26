import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase-config";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "../styles/hero-banner.css";

export default function HeroBanner() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannerRef = collection(db, "banners");
        const snapshot = await getDocs(bannerRef);
        const now = Date.now();
        const bannerList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(b => b.active && (!b.startTime || now >= b.startTime) && (!b.endTime || now <= b.endTime));
        setBanners(bannerList);
      } catch (error) {
        console.error("Error fetching banners:", error);
      }
    };
    fetchBanners();
  }, []);

  if (banners.length === 0) return null;

  return (
  <div className="hero-banner">
  <div className="hero-banner-container">
    <Swiper
      modules={[Autoplay, Pagination]}
      loop={true}
      autoplay={{
        delay: 5000,
        disableOnInteraction: false,
      }}
      pagination={{ clickable: true }}
    >
      {banners.map((banner) => (
        <SwiperSlide key={banner.id}>
          <a href={banner.link || "#"}>
            <img src={banner.image} alt={banner.title} loading="lazy" />
            <div className="banner-text">
              <h3>{banner.title}</h3>
              {banner.subtitle && <p>{banner.subtitle}</p>}
            </div>
          </a>
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
</div>
  );
}