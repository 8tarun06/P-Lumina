import React, { useRef, useState } from "react";
import "./SearchBar.css"; // We'll create this next

function SearchBar({ searchTerm, setSearchTerm }) {
  const searchInputRef = useRef(null);
  const [searchActive, setSearchActive] = useState(false);

  const handleSearchIconClick = () => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search not supported in this browser.");
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
      setSearchActive(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      alert("Voice recognition failed. Please try again.");
    };
  };

  return (
    <div className="search-bar-container">
      <button className="search-icon" onClick={handleSearchIconClick}>
        <img src="/public/search.png" alt="Search" className="search-icon-img" />
      </button>

      <div className={`search-input-wrapper ${searchActive ? "active" : ""}`}>
        <input
          type="text"
          ref={searchInputRef}
          placeholder="Search Products"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onBlur={() => {
            if (searchTerm === "") setSearchActive(false);
          }}
        />
        <button className="mic-icon" onClick={startVoiceInput}>
          <img src="/public/mic.png" alt="Mic" className="mic-icon-img" />
        </button>
      </div>
    </div>
  );
}

export default SearchBar;
