import React, { createContext, useContext, useState, useEffect } from 'react';
import './ThemeProvider.css';

// Create Context
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const initializeTheme = () => {
      try {
        const savedTheme = localStorage.getItem('wave-theme-preference');
        
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setTheme(savedTheme);
        } else {
          // Use system preference
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? 'dark' 
            : 'light';
          setTheme(systemTheme);
        }
      } catch (error) {
        // Fallback to light theme
        setTheme('light');
      }
      
      setIsInitialized(true);
      
      // Add transitions after initialization
      setTimeout(() => {
        document.documentElement.classList.add('transitions-enabled');
      }, 500);
    };

    initializeTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isInitialized) return;

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme, isInitialized]);

  // Save theme to localStorage
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem('wave-theme-preference', theme);
    } catch (error) {
      console.warn('Could not save theme preference:', error);
    }
  }, [theme, isInitialized]);

  // Toggle theme with transition
  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion || !document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Start View Transition
    document.startViewTransition(() => {
      setTheme(newTheme);
    });
  };

  // Listen for system theme changes (when no user preference)
  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      try {
        const hasUserPreference = localStorage.getItem('wave-theme-preference') !== null;
        if (!hasUserPreference) {
          const newSystemTheme = e.matches ? 'dark' : 'light';
          setTheme(newSystemTheme);
        }
      } catch (error) {
        // Silent error
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [isInitialized]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        e.preventDefault();
        switch(e.key.toLowerCase()) {
          case 't':
            toggleTheme();
            break;
          case 'l':
            setTheme('light');
            break;
          case 'd':
            setTheme('dark');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [theme]);

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};