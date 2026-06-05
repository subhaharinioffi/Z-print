import React from 'react';

const ProgressOverlay = ({ progress, statusText, activeMode }) => {
  if (progress === 0) return null;

  return (
    <div className="overlay-container">
      <div className="modal-content">
        <div className="modal-icon-container">
          <div className="modal-icon-pulse"></div>
          <div className="modal-spinner"></div>
          
          {/* Print vs Xerox Mode dynamic SVG icon */}
          {activeMode === 'print' ? (
            <svg className="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
          ) : (
            <svg className="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
            </svg>
          )}
        </div>

        <h3 className="modal-title font-display">
          {activeMode === 'print' ? 'Processing Print Job' : 'Running Xerox Scan'}
        </h3>
        <p className="modal-progress-text">{statusText}</p>

        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <p className="progress-percentage">{progress}%</p>
      </div>
    </div>
  );
};

export default ProgressOverlay;
