import React, { createContext, useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase-config"; // adjust this if your firebase config is elsewhere

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    backgroundColor: "#ffffff",
    boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 12px",
  });

  useEffect(() => {
    const fetchTheme = async () => {
      const docRef = doc(db, "siteConfig", "theme");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTheme(docSnap.data());
        applyTheme(docSnap.data());
      }
    };

    fetchTheme();
  }, []);

  const applyTheme = (themeData) => {
    document.documentElement.style.setProperty("--bg-color", themeData.backgroundColor);
    document.documentElement.style.setProperty("--card-shadow", themeData.boxShadow);
  };

  const updateTheme = async (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    await updateDoc(doc(db, "siteConfig", "theme"), newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

