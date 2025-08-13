/**
 * Reusable Back to Top button component
 */

import React from 'react';

interface BackToTopButtonProps {
  className?: string;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({ className = '' }) => {
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`w-full flex justify-center pt-6 pb-3 ${className}`}>
      <button
        onClick={handleBackToTop}
        className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        aria-label="Back to top of page"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default BackToTopButton;
