'use client';

import React, { useState, useEffect } from 'react';
import './share-button.css';

export const ShareButton = ({ 
  children = 'Share', 
  size = 'medium', 
  icon = true,
  className = '',
  onShare,
  ...props 
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    setIsSupported(!!navigator.share);
  }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSupported) {
      // Fallback: copy to clipboard
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        if (onShare) onShare({ success: true, method: 'clipboard' });
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        if (onShare) onShare({ success: true, method: 'clipboard' });
      }
      return;
    }

    try {
      setIsAnimating(true);
      
      const shareData = {
        title: document.title,
        text: 'Check out this amazing product!',
        url: window.location.href,
      };

      await navigator.share(shareData);
      if (onShare) onShare({ success: true, method: 'native' });
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        if (onShare) onShare({ success: false, error });
      }
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <button
      className={`share-button ${size} ${isAnimating ? 'animating' : ''} ${className}`}
      onClick={handleShare}
      disabled={isAnimating}
      aria-label="Share this product"
      {...props}
    >
      <span className="share-button-content">
        {icon && (
          <span className="share-icon">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </span>
        )}
        <span className="share-text">{children}</span>
      </span>
      
      {/* Animation elements */}
      <span className="share-particles">
        {[...Array(6)].map((_, i) => (
          <span key={i} className="particle" style={{ '--i': i }} />
        ))}
      </span>
      
      <span className="share-wave" />
    </button>
  );
};

export default ShareButton;