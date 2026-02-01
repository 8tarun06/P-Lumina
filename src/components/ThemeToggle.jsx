import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

export const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleClick = async () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    await toggleTheme();
    
    // Reset transition state after delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Accessibility: keyboard support
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="theme-toggle-container">
      <button
        className={`theme-toggle ${isTransitioning ? 'wave-transition-active' : ''}`}
        id="themeToggle"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-pressed={isDark}
        disabled={isTransitioning}
      >
        <span className="toggle-icon toggle-icon--sun">☀️</span>
        <span className="toggle-icon toggle-icon--moon">🌙</span>
      </button>
    </div>
  );
};