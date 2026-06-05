import React, { useState } from 'react';
import { ZprintProvider, useZprint } from './context/ZprintContext';
import CustomerGeneralReg from './components/CustomerGeneralReg';
import CustomerConsole from './components/CustomerConsole';
import RetailerAuth from './components/RetailerAuth';
import RetailerDashboard from './components/RetailerDashboard';
import ProgressOverlay from './components/ProgressOverlay';
import ReceiptModal from './components/ReceiptModal';
import './styles/variables.css';
import './styles/main.css';

const MainAppContent = () => {
  const { 
    kiosks, 
    activeKiosk, 
    setActiveKiosk, 
    customerSession, 
    retailerSession, 
    currentOrder, 
    setCurrentOrder,
    logout 
  } = useZprint();

  // App Role selector: 'customer' or 'retailer'
  const [appRole, setAppRole] = useState('customer'); 

  // Global progress tracking
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [activeMode, setActiveMode] = useState('print'); // 'print' or 'xerox'

  const triggerProgressOverlay = (startVal, text) => {
    setProgress(startVal);
    setStatusText(text);
  };

  // Helper trigger callback to step through progress bar simulations
  const handleProgressCallback = (initialVal, initText) => {
    triggerProgressOverlay(initialVal, initText);
    setActiveMode(activeKiosk?.id?.includes('XRX') && activeKiosk?.id?.endsWith('XRX') ? 'xerox' : 'print');

    // Start a gradual interval up to 80% to feel realistic
    let currentVal = initialVal;
    const interval = setInterval(() => {
      currentVal += Math.floor(Math.random() * 8) + 4;
      if (currentVal >= 80) {
        currentVal = 80;
        clearInterval(interval);
      }
      setProgress(currentVal);

      // Shift text prompts based on percentage
      if (currentVal >= 40 && currentVal < 70) {
        setStatusText(activeKiosk?.id?.includes('XRX') ? "Scanning document..." : "Processing document layout...");
      } else if (currentVal >= 70) {
        setStatusText("Securing kiosk connection...");
      }
    }, 400);

    // Store interval reference to clear on unmount/success
    window.activeProgressInterval = interval;
  };

  // Function to mock booking verification callback from backend
  const simulatePaymentApproved = () => {
    if (window.activeProgressInterval) clearInterval(window.activeProgressInterval);
    
    setProgress(90);
    setStatusText("Booking verified! Adding to printing spooler...");
    
    setTimeout(() => {
      setProgress(100);
      setStatusText("Job completed successfully!");
      
      setTimeout(() => {
        setProgress(0);
        setStatusText('');
      }, 800);
    }, 1200);
  };

  // Listen to order submission completed
  React.useEffect(() => {
    if (currentOrder) {
      simulatePaymentApproved();
    }
  }, [currentOrder]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Mode bar (SaaS Role switcher) */}
      <nav style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--gray-border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ height: '30px', width: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justify: 'center', color: 'var(--white)', fontWeight: '900', fontSize: '14px' }}>
            Z
          </div>
          <span style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px', color: 'var(--dark-text)' }}>Zprint</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className="tab-btn" 
            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', border: appRole === 'customer' ? '1px solid var(--primary-border)' : '1px solid transparent', backgroundColor: appRole === 'customer' ? 'var(--primary-light)' : 'transparent', color: appRole === 'customer' ? 'var(--primary)' : 'var(--light-text)' }}
            onClick={() => {
              logout();
              setAppRole('customer');
            }}
          >
            Customer Kiosk
          </button>
          <button 
            type="button"
            className="tab-btn" 
            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', border: appRole === 'retailer' ? '1px solid var(--primary-border)' : '1px solid transparent', backgroundColor: appRole === 'retailer' ? 'var(--primary-light)' : 'transparent', color: appRole === 'retailer' ? 'var(--primary)' : 'var(--light-text)' }}
            onClick={() => {
              logout();
              setAppRole('retailer');
            }}
          >
            Retailer Portal
          </button>
        </div>
      </nav>

      {/* Main Body viewports based on Role selection */}
      <main style={{ flexGrow: '1', display: 'flex', flexDirection: 'column' }}>
        
        {appRole === 'customer' ? (
          /* =========================================================
             CUSTOMER VIEWPORT
             ========================================================= */
          <div className="app-container">
            {!customerSession ? (
              <CustomerGeneralReg />
            ) : !activeKiosk ? (
              /* KIOSK SLOTS DIRECTORY */
              <div className="view-transition">
                <header className="brand-header">
                  <div className="logo-box">
                    <svg className="logo-icon animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <h1 className="brand-title font-display">Zprint</h1>
                  <p className="brand-tagline">Scan it • Get it</p>
                </header>

                <div className="glass-card text-center" style={{ padding: '16px', marginBottom: '24px' }}>
                  <p style={{ color: 'var(--light-text)', fontSize: '12px', fontWeight: '500' }}>
                    Welcome, <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{customerSession.name}</span>! Select a nearby active kiosk slot below to print sheets or scan documents.
                  </p>
                </div>

                <div className="section-title-row">
                  <h2 className="section-title font-display">Active Print Kiosks</h2>
                  <span className="badge badge-primary">{kiosks.length} Available</span>
                </div>

                <div className="slots-grid">
                  {kiosks.map(kiosk => (
                    <div 
                      key={kiosk.id} 
                      className={`kiosk-slot-card ${kiosk.id.endsWith('XRX') ? 'xerox-mode' : ''} ${!kiosk.online ? 'offline' : ''}`}
                      onClick={() => kiosk.online && setActiveKiosk(kiosk)}
                    >
                      <div className="kiosk-slot-header">
                        <div className="kiosk-meta">
                          <div className="kiosk-icon-box">
                            {kiosk.id.endsWith('XRX') ? (
                              <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                              </svg>
                            ) : (
                              <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                              </svg>
                            )}
                          </div>
                          <div>
                            <h3 className="kiosk-title font-display">{kiosk.name}</h3>
                            <p className="kiosk-location">{kiosk.location}</p>
                          </div>
                        </div>

                        <span className={`badge ${kiosk.online ? 'badge-success' : 'badge-gray'}`}>
                          <span className={`status-dot ${kiosk.online ? 'online' : ''}`}></span>
                          {kiosk.online ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      <div className="kiosk-slot-footer">
                        <div className="tag-list">
                          <span className="kiosk-tag">{kiosk.id.endsWith('XRX') ? 'Xerox Scan' : 'Laser Print'}</span>
                          <span className="kiosk-tag">A4 Sheets</span>
                        </div>
                        {kiosk.online && (
                          <span className="select-link font-display">
                            Select 
                            <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* KIOSK PRINT CONSOLE */
              <CustomerConsole 
                onBack={() => setActiveKiosk(null)} 
                onTriggerProgress={handleProgressCallback}
              />
            )}
          </div>
        ) : (
          /* =========================================================
             RETAILER VIEWPORT
             ========================================================= */
          <div style={{ flexGrow: '1', display: 'flex', flexDirection: 'column' }}>
            {!retailerSession ? (
              <RetailerAuth onBackToCustomer={() => setAppRole('customer')} />
            ) : (
              <RetailerDashboard />
            )}
          </div>
        )}

      </main>

      {/* Global progress animation spinner */}
      <ProgressOverlay 
        progress={progress} 
        statusText={statusText} 
        activeMode={activeMode} 
      />

      {/* Global success receipt checkout modal */}
      <ReceiptModal 
        order={currentOrder} 
        onClose={() => setCurrentOrder(null)} 
      />

      {/* Footer copyright */}
      <footer style={{ backgroundColor: 'var(--white)', borderTop: '1px solid var(--gray-border)', padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--gray-text)', fontWeight: '600', marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Zprint Inc. • Premium Mobile Print & Xerox SaaS
      </footer>

    </div>
  );
};

const App = () => {
  return (
    <ZprintProvider>
      <MainAppContent />
    </ZprintProvider>
  );
};

export default App;
