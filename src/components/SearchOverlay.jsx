// src/components/SearchOverlay.jsx
import React, { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, startAt, endAt, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase-config"; // keep your existing firebase export path
import { useNavigate } from "react-router-dom";

/**
 * SearchOverlay (production-ready voice search)
 * - Debounced search (300ms)
 * - Firestore prefix search on 'name'
 * - Live interim results from SpeechRecognition (if available)
 * - Graceful fallback when SpeechRecognition not supported
 */

export default function SearchOverlay({ isOpen = false, onClose = () => {} }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    mountedRef.current = true;
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    if (isOpen) {
      fetchRecentProducts();
    }
    return () => {
      mountedRef.current = false;
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(searchTerm.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchRecentProducts = async () => {
    try {
      const col = collection(db, "products");
      const q = query(col, orderBy("updatedAt", "desc"), limit(30));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!mountedRef.current) return;
      setRecent(docs);
      setResults(docs);
    } catch (error) {
      console.error("fetchRecentProducts error:", error);
    }
  };

  const performSearch = async (term) => {
    if (!term) {
      setSuggestions([]);
      setResults(recent);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const col = collection(db, "products");
      const rangeStart = term;
      const rangeEnd = term + "\uf8ff";

      let q1 = query(col, orderBy("name"), startAt(rangeStart), endAt(rangeEnd), limit(30));
      const snap1 = await getDocs(q1);
      const byName = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

      let combined = byName;

      if (combined.length < 8) {
        const q2 = query(col, orderBy("updatedAt", "desc"), limit(80));
        const snap2 = await getDocs(q2);
        const byDesc = snap2.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) =>
            (p.description || "").toLowerCase().includes(term.toLowerCase()) &&
            !combined.find((c) => c.id === p.id)
          );
        combined = combined.concat(byDesc);
      }

      // Dedupe
      const unique = [];
      const seen = new Set();
      for (const p of combined) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
        if (unique.length >= 40) break;
      }

      if (!mountedRef.current) return;
      setSuggestions(unique.slice(0, 8));
      setResults(unique);
    } catch (error) {
      console.error("performSearch error:", error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // --- Speech Recognition helpers ---
  const startRecognition = async () => {
    if (!speechSupported) {
      // no Web Speech API
      alert("Voice search is not supported in this browser.");
      return;
    }

    if (listening) {
      stopRecognition();
      return;
    }

    try {
      // Request microphone permission explicitly. Many browsers require getUserMedia before SpeechRecognition.
      // We'll immediately stop tracks after permission granted.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // stop all tracks - we only requested to get permission
        stream.getTracks().forEach((t) => t.stop());
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false; // short single-shot recognition

      let interimTranscript = "";

      recognition.onstart = () => {
        if (!mountedRef.current) return;
        setListening(true);
      };

      recognition.onresult = (event) => {
        if (!mountedRef.current) return;
        interimTranscript = "";
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }
        // Show interim immediately and final when available
        if (interimTranscript) {
          setSearchTerm((prev) => {
            // Only update if interim differs to avoid loops
            if (prev !== interimTranscript) return interimTranscript;
            return prev;
          });
        }
        if (finalTranscript) {
          // Set final transcript and run search (debounce will also run)
          setSearchTerm(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event);
        // stop and notify user gracefully
        stopRecognition();
      };

      recognition.onend = () => {
        // onend called when recognition stops
        if (!mountedRef.current) return;
        setListening(false);
        recognitionRef.current = null;
      };

      // Start recognition
      recognition.start();
    } catch (err) {
      console.error("startRecognition error:", err);
      // In some browsers permission may be denied; show a friendly message
      setListening(false);
      recognitionRef.current = null;
      if (err && err.name === "NotAllowedError") {
        alert("Microphone permission denied. Please allow microphone access to use voice search.");
      }
    }
  };

  const stopRecognition = () => {
    try {
      const r = recognitionRef.current;
      if (r && typeof r.stop === "function") {
        r.stop();
      }
    } catch (e) {
      console.warn("stopRecognition warning:", e);
    } finally {
      recognitionRef.current = null;
      if (mountedRef.current) setListening(false);
    }
  };

  // --- navigation ---
  const goToProduct = (productId) => {
    onClose();
    navigate(`/product/${productId}`);
  };

  const clearAndClose = () => {
    setSearchTerm("");
    setSuggestions([]);
    setResults(recent);
    stopRecognition();
    onClose();
  };

  return (
    <div className="mobile-fullscreen-search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mobile-fullscreen-search-bar">
        <button
          className="mobile-fullscreen-back-btn"
          onClick={clearAndClose}
          aria-label="Close search"
        >
          <i className="fas fa-arrow-left"></i>
        </button>

        <input
          className="mobile-fullscreen-input"
          placeholder="Search products, brands and more"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search input"
          autoFocus
        />

        <button
          className={`mobile-fullscreen-voice-btn ${listening ? "listening" : ""}`}
          onClick={startRecognition}
          aria-pressed={listening}
          aria-label={listening ? "Stop voice search" : "Start voice search"}
          title={speechSupported ? (listening ? "Stop voice search" : "Start voice search") : "Voice search not supported"}
        >
          <i className="fas fa-microphone"></i>
          {/* accessible label for screen readers */}
          <span className="sr-only">{listening ? "Listening" : "Voice search"}</span>
        </button>
      </div>

      <div className="mobile-search-body" style={{ paddingTop: 70 }}>
        {listening && (
          <div className="voice-listening-indicator" role="status" aria-live="polite">
            <div className="listening-dot" aria-hidden="true"></div>
            <div className="listening-text">Listening…</div>
          </div>
        )}

        <div className="mobile-search-suggestions">
          {loading && <div className="search-loading">Searching…</div>}

          {!loading && searchTerm && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((s) => (
                <li key={s.id} className="suggestion-item" onClick={() => goToProduct(s.id)}>
                  <img src={(s.images && s.images[0]) || ""} alt={s.name} className="suggestion-thumb" />
                  <div className="suggestion-meta">
                    <div className="suggestion-title">{s.name}</div>
                    <div className="suggestion-sub">{s.inStock ? `In stock • ₹${s.price}` : "Out of stock"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && !searchTerm && recent.length > 0 && (
            <div>
              <h4 className="recent-title">Recent & popular</h4>
              <div className="recent-grid">
                {recent.slice(0, 12).map((p) => (
                  <div key={p.id} className="recent-card" onClick={() => goToProduct(p.id)}>
                    <img src={(p.images && p.images[0]) || ""} alt={p.name} />
                    <div className="rc-name">{p.name}</div>
                    <div className="rc-price">₹{p.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mobile-search-results">
          {!loading && results.length > 0 && (
            <>
              <h4 className="results-count">{results.length} result{results.length > 1 ? "s" : ""}</h4>

              <div className="results-grid">
                {results.map((p) => (
                  <div key={p.id} className="product-card" onClick={() => goToProduct(p.id)}>
                    <div className="product-image-wrap">
                      <img src={(p.images && p.images[0]) || ""} alt={p.name} />
                    </div>
                    <div className="product-info">
                      <div className="product-name">{p.name}</div>
                      <div className="product-meta">
                        <span className="product-price">₹{p.price}</span>
                        {p.discountPercentage ? <span className="product-discount"> {p.discountPercentage}% off</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && results.length === 0 && (
            <div className="no-results">No products found for "{searchTerm}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
