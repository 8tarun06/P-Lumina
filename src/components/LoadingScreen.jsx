// src/components/LoadingScreen.jsx
import React, { useEffect, useState } from "react";
import "./loadingScreen.css";

const LoadingScreen = ({ onFinish }) => {
  const [videoSrc, setVideoSrc] = useState(null);

  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisited");

    // Decide which video to show
    if (!hasVisited) {
      setVideoSrc("/Vyraa Logo Intro.mp4");
      localStorage.setItem("hasVisited", "true");
    } else {
      setVideoSrc("/Vyraa Logo Intro.mp4");
    }

    // Auto-hide after 5 seconds
    const timeout = setTimeout(() => {
      onFinish();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [onFinish]);

  return (
    <div className="loading-screen">
      <video
        className="loading-video"
        src={videoSrc}
        autoPlay
        muted
        playsInline
      ></video>
    </div>
  );
};

export default LoadingScreen;
