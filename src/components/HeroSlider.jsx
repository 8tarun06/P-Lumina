import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";
import "../styles/HeroSlider.css";

const HeroSlider = () => {
  const slides = [
    {
      img: "/images/banner1.jpg",
      title: "SEASON’S MUST HAVES",
      subtitle: "Check out our new collection and best sellers.",
      button: "SHOP NOW",
      link: "/shop"
    },
    {
      img: "/images/banner2.jpg",
      title: "NEW ARRIVALS",
      subtitle: "Fresh styles curated for you.",
      button: "EXPLORE",
      link: "/shop"
    },
    {
      img: "/images/banner3.jpg",
      title: "BEST SELLERS",
      subtitle: "Our customers’ top favorites.",
      button: "BUY NOW",
      link: "/shop"
    }
  ];

  return (
    <div className="hero-slider-container">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        effect="fade"
        loop={true}
        autoplay={{
          delay: 3500,
          disableOnInteraction: false,
        }}
        pagination={{ clickable: true }}
        navigation
        className="hero-swiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="hero-slide">
              <img src={slide.img} alt="Banner" className="hero-image" />

              <div className="hero-content">
                <h1>{slide.title}</h1>
                <p>{slide.subtitle}</p>
                <a href={slide.link} className="hero-btn">{slide.button}</a>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default HeroSlider;
