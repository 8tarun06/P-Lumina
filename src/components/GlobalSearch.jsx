import React, { useState, useRef, useEffect } from "react";
import { useGlobalModal } from "../context/ModalContext";

function GlobalSearch({ 
  searchTerm, 
  setSearchTerm, 
  onSearch, 
  placeholder = "Search Products",
  isMobile = false,
  isMobileSearchActive = false,
  setIsMobileSearchActive = null,
  closeMobileSearch = null,
  className = "",
  inputRef = null
}) {
  const [searchActive, setSearchActive] = useState(false);
  const internalInputRef = useRef(null);
  const { showModal } = useGlobalModal();
  
  // Use provided ref or internal ref
  const searchInputRef = inputRef || internalInputRef;

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showModal({
        title: "Voice Recognition is Not Supported In Your Device/Browser",
        message: `Voice to Search can't be used right now. Please use manual search.`,
        type: "error",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      if (isMobile && setIsMobileSearchActive) {
        setIsMobileSearchActive(true);
      } else {
        setSearchActive(true);
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      // Trigger search if callback provided
      if (onSearch) {
        onSearch(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      showModal({
        title: "Voice Recognition Failed",
        message: `Please try again later.`,
        type: "error",
      });
    };
  };

  const handleSearchIconClick = () => {
    if (isMobile && setIsMobileSearchActive) {
      setIsMobileSearchActive(true);
    } else {
      setSearchActive(true);
    }
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Trigger search if callback provided
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchBlur = () => {
    if (searchTerm === "") {
      setSearchActive(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchTerm);
    }
  };

  // Desktop Search Component
  const DesktopSearch = () => (
    <div className={`search-bar-container ${className}`}>
      <button className="search-icon" onClick={handleSearchIconClick}>
        <img src="/search.png" alt="Search" className="search-icon-img" />
      </button>

      <div className={`search-input-wrapper ${searchActive ? "active" : ""}`}>
        <div className="search-input-inner">
          <input
            type="text"
            ref={searchInputRef}
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={handleSearchBlur}
            onKeyPress={handleKeyPress}
          />
          <button className="mic-icon" onClick={startVoiceInput}>
            <img src="/mic.png" alt="Mic" className="mic-icon-img" />
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile Search Overlay Component
  const MobileSearchOverlay = () => (
    <div className="mobile-search-overlay">
      <div className="mobile-search-container">
        <button className="mobile-search-back" onClick={closeMobileSearch}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          className="mobile-search-input"
          autoFocus
        />
        <button className="mobile-search-voice" onClick={startVoiceInput}>
          <i className="fas fa-microphone"></i>
        </button>
      </div>
    </div>
  );

  // Mobile Search Icon (for navbar)
  const MobileSearchIcon = () => (
    <button className="mobile-search-icon" onClick={handleSearchIconClick}>
      <i className="fas fa-search"></i>
    </button>
  );

  // Render based on props
  if (isMobile && isMobileSearchActive) {
    return <MobileSearchOverlay />;
  }

  if (isMobile && !isMobileSearchActive) {
    return <MobileSearchIcon />;
  }

  return <DesktopSearch />;
}

export default GlobalSearch;