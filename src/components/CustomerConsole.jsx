import React, { useState, useEffect } from 'react';
import { useZprint } from '../context/ZprintContext';

const CustomerConsole = ({ onBack, onTriggerProgress }) => {
  const { activeKiosk, activeCatalog, fetchCatalog, triggerPrintCheckout, triggerXeroxCheckout } = useZprint();
  const [activeTab, setActiveTab] = useState('print'); // 'print' or 'xerox'
  
  // File states
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef(null);

  // Common config states
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState('bw'); // 'bw' or 'color'
  const [doubleSided, setDoubleSided] = useState(false);

  // Xerox specific options
  const [scanResolution, setScanResolution] = useState('300');

  // Binding selection state
  const [selectedBinding, setSelectedBinding] = useState(null); // Binding object or null

  // Stationery shop cart state
  const [cart, setCart] = useState({}); // productId -> qty

  // Initialize and load the catalog configurations for the selected shop Kiosk
  useEffect(() => {
    if (activeKiosk) {
      fetchCatalog(activeKiosk.id);
      
      // Reset states
      setSelectedFile(null);
      setCopies(1);
      setColorMode('bw');
      setDoubleSided(false);
      setScanResolution('300');
      setSelectedBinding(null);
      setCart({});
    }
  }, [activeKiosk]);

  // Helpers
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Get active pricing rates
  const getBaseRate = () => {
    if (activeTab === 'print') {
      return colorMode === 'color' ? 5.00 : 2.00;
    } else {
      return colorMode === 'color' ? 4.00 : 1.50;
    }
  };

  // Calculate live cumulative price totals
  const calculateTotal = () => {
    const baseRate = getBaseRate();
    let total = baseRate * copies;

    // Add binding cost
    if (selectedBinding) {
      total += selectedBinding.price;
    }

    // Add stationery items cost
    if (activeCatalog && activeCatalog.stationery) {
      activeCatalog.stationery.forEach(product => {
        const qty = cart[product.id] || 0;
        if (qty > 0) {
          total += product.price * qty;
        }
      });
    }

    return total;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cart quantity handlers
  const handleUpdateQty = (productId, delta, maxStock) => {
    setCart(prev => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, Math.min(maxStock, currentQty + delta));
      
      const nextCart = { ...prev };
      if (newQty === 0) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = newQty;
      }
      return nextCart;
    });
  };

  // Submit checkout trigger
  const handleCheckout = async () => {
    if (activeTab === 'print' && !selectedFile) return;

    // Structure stationery cart list for api payload
    const stationeryPayload = [];
    if (activeCatalog && activeCatalog.stationery) {
      activeCatalog.stationery.forEach(p => {
        const qty = cart[p.id] || 0;
        if (qty > 0) {
          stationeryPayload.push({
            id: p.id,
            name: p.name,
            price: p.price,
            qty: qty
          });
        }
      });
    }

    if (activeTab === 'print') {
      try {
        await triggerPrintCheckout(
          selectedFile,
          copies,
          colorMode,
          doubleSided,
          selectedBinding,
          stationeryPayload,
          onTriggerProgress
        );
      } catch (err) {
        alert("Transaction failed: " + err.message);
      }
    } else {
      try {
        await triggerXeroxCheckout(
          copies,
          colorMode,
          doubleSided,
          selectedBinding,
          stationeryPayload,
          scanResolution,
          onTriggerProgress
        );
      } catch (err) {
        alert("Scan transaction failed: " + err.message);
      }
    }
  };

  // Active status check
  const isButtonDisabled = activeTab === 'print' && !selectedFile;

  return (
    <div className="view-transition">
      {/* Top Console Navigation */}
      <header className="console-header">
        <button type="button" onClick={onBack} className="back-btn">
          <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <div className="active-kiosk-display">
          <span className="status-dot online"></span>
          <span>{activeKiosk?.name || 'Kiosk'}</span>
        </div>
      </header>

      {/* Mode selectors */}
      <div className="mb-5">
        <h2 className="brand-title font-display" style={{ fontSize: '24px' }}>
          {activeTab === 'print' ? 'Digital Print Console' : 'Xerox Photocopy Point'}
        </h2>
        <p style={{ color: 'var(--gray-text)', fontSize: '12px', marginTop: '2px', fontWeight: '600' }}>
          {activeTab === 'print' ? 'Send digital documents directly to print output tray.' : 'Trigger scanner copy commands directly from your screen.'}
        </p>
      </div>

      <div className="tab-selector">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'print' ? 'active' : ''}`}
          onClick={() => setActiveTab('print')}
        >
          Upload & Print
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'xerox' ? 'active' : ''}`}
          onClick={() => setActiveTab('xerox')}
        >
          Xerox & Scan
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        
        {/* PANEL A: PRINT FILE ZONE */}
        {activeTab === 'print' && (
          <div className="space-y-4">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/png,image/jpeg,image/jpg" 
              className="hidden" 
            />
            
            {!selectedFile ? (
              <div 
                className="drop-zone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon-circle">
                  <svg className="kiosk-icon animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <span className="upload-title">Tap to browse or drop file here</span>
                <span className="upload-subtitle">Accepts PDF, JPG, PNG (Max 25MB)</span>
              </div>
            ) : (
              <div className="file-preview-card">
                <div className="file-info-group">
                  <div className={`file-icon-box ${selectedFile.type === 'application/pdf' ? 'pdf' : 'image'}`}>
                    {selectedFile.type === 'application/pdf' ? (
                      <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    ) : (
                      <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    )}
                  </div>
                  <div className="file-details">
                    <p className="file-name">{selectedFile.name}</p>
                    <p className="file-size">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleRemoveFile} 
                  className="remove-file-btn"
                  title="Remove file"
                >
                  <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PANEL B: XEROX SCANNING INSTRUCTIONS */}
        {activeTab === 'xerox' && (
          <div className="space-y-4">
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)', padding: '16px', margin: '0', backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary-border)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Scanner Instructions</h4>
              <ol style={{ fontSize: '11px', color: 'var(--light-text)', listStyleType: 'decimal', paddingLeft: '16px' }} className="space-y-1">
                <li>Place your physical paper copy face down on the scanner glass.</li>
                <li>Ensure document margins align with the guides.</li>
                <li>Close the physical cover cover.</li>
                <li>Select scan density resolution options below.</li>
              </ol>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', margin: '0', backgroundColor: 'var(--white)' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800' }}>Scan Density DPI</label>
                <p style={{ fontSize: '10px', color: 'var(--gray-text)', fontWeight: '600' }}>Higher values require longer print cycles</p>
              </div>
              
              <select 
                value={scanResolution} 
                onChange={(e) => setScanResolution(e.target.value)}
                style={{ fontSize: '11px', fontWeight: '800', border: '1px solid var(--gray-border)', padding: '6px 12px', borderRadius: '10px', outline: 'none', backgroundColor: '#f9fafb' }}
              >
                <option value="150">150 DPI (Draft)</option>
                <option value="300">300 DPI (Standard)</option>
                <option value="600">600 DPI (Archival)</option>
              </select>
            </div>
          </div>
        )}

        {/* CONFIG OPTIONS CARD */}
        <div className="glass-card" style={{ padding: '20px', margin: '0' }}>
          <h3 className="section-title font-display" style={{ marginBottom: '16px', fontSize: '14px', textTransform: 'uppercase', color: 'var(--gray-text)' }}>
            Kiosk Configuration
          </h3>

          {/* Stepper counter for copies */}
          <div className="stepper-row">
            <div className="stepper-info">
              <label>Number of Copies</label>
              <p>Duplicate sheets needed</p>
            </div>
            
            <div className="stepper-controls">
              <button 
                type="button" 
                className="stepper-btn" 
                onClick={() => setCopies(Math.max(1, copies - 1))}
                disabled={copies === 1}
              >
                <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"></path>
                </svg>
              </button>
              <span className="stepper-value">{copies}</span>
              <button 
                type="button" 
                className="stepper-btn" 
                onClick={() => setCopies(copies + 1)}
              >
                <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Color Mode Option Grid */}
          <div className="options-title-block" style={{ marginTop: '16px' }}>
            <label>Color Palette</label>
            <p>Ink cartridge style</p>
            
            <div className="radio-card-grid">
              <label className="radio-card-label">
                <input 
                  type="radio" 
                  name="colorMode" 
                  value="bw" 
                  checked={colorMode === 'bw'}
                  onChange={() => setColorMode('bw')} 
                />
                <div className="radio-card-content">
                  <div className="radio-card-icon-box">
                    <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                  </div>
                  <span className="radio-card-title">Grayscale B&W</span>
                  <span className="radio-card-price">
                    {activeTab === 'print' ? '₹2.00 / page' : '₹1.50 / page'}
                  </span>
                </div>
              </label>

              <label className="radio-card-label">
                <input 
                  type="radio" 
                  name="colorMode" 
                  value="color" 
                  checked={colorMode === 'color'}
                  onChange={() => setColorMode('color')} 
                />
                <div className="radio-card-content">
                  <div className="radio-card-icon-box" style={{ background: 'linear-gradient(135deg, #fca5a5, #fde68a, #a7f3d0, #bfdbfe)' }}>
                    <svg className="kiosk-icon text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </svg>
                  </div>
                  <span className="radio-card-title">Full Color</span>
                  <span className="radio-card-price">
                    {activeTab === 'print' ? '₹5.00 / page' : '₹4.00 / page'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Double Sided Toggle Switch */}
          <div className="toggle-row">
            <div className="toggle-info">
              <label>Double-Sided Spool</label>
              <p>Print/scan on both sheet faces</p>
            </div>
            
            <label className="switch">
              <input 
                type="checkbox" 
                checked={doubleSided}
                onChange={(e) => setDoubleSided(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

        </div>

        {/* BINDING OPTIONS SELECTION */}
        {activeCatalog && activeCatalog.bindings && activeCatalog.bindings.filter(b => b.enabled).length > 0 && (
          <div className="glass-card" style={{ padding: '20px', margin: '0' }}>
            <h3 className="section-title font-display" style={{ marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase', color: 'var(--gray-text)' }}>
              Binding Services
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* No Binding choice */}
              <label className="radio-card-label" style={{ display: 'block' }}>
                <input 
                  type="radio" 
                  name="bindingOption" 
                  checked={selectedBinding === null}
                  onChange={() => setSelectedBinding(null)} 
                />
                <div className="radio-card-content" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '12px 16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800' }}>Loose Sheets (No Binding)</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>Free</span>
                </div>
              </label>

              {/* Retailer Enabled Bindings */}
              {activeCatalog.bindings.filter(b => b.enabled).map(binding => (
                <label key={binding.id} className="radio-card-label" style={{ display: 'block' }}>
                  <input 
                    type="radio" 
                    name="bindingOption" 
                    checked={selectedBinding?.id === binding.id}
                    onChange={() => setSelectedBinding(binding)} 
                  />
                  <div className="radio-card-content" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '12px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800' }}>{binding.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>+₹{binding.price.toFixed(2)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STATIONERY SHOP LISTING */}
        {activeCatalog && activeCatalog.stationery && activeCatalog.stationery.filter(p => p.enabled).length > 0 && (
          <div className="stationery-section">
            <h3 className="section-title font-display" style={{ fontSize: '16px', letterSpacing: '-0.2px' }}>
              Shop Stationery Catalog
            </h3>
            <p style={{ color: 'var(--gray-text)', fontSize: '11px', fontWeight: '600' }}>Add writing or book items to your print request</p>
            
            <div className="stationery-grid">
              {activeCatalog.stationery.filter(p => p.enabled).map(product => {
                const qty = cart[product.id] || 0;
                
                return (
                  <div key={product.id} className="stationery-card">
                    <div className="item-info">
                      <p className="item-name">{product.name}</p>
                      <p className="item-price">₹{product.price.toFixed(2)}</p>
                      <p className="item-stock">Stock: {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}</p>
                    </div>

                    <div className="item-actions">
                      {product.stock === 0 ? (
                        <span style={{ fontSize: '10px', color: 'var(--gray-text)', fontWeight: '700' }}>Sold Out</span>
                      ) : qty === 0 ? (
                        <button 
                          type="button" 
                          className="add-cart-btn"
                          onClick={() => handleUpdateQty(product.id, 1, product.stock)}
                        >
                          + Add Item
                        </button>
                      ) : (
                        <div className="cart-qty-stepper">
                          <button 
                            type="button" 
                            className="cart-qty-btn"
                            onClick={() => handleUpdateQty(product.id, -1, product.stock)}
                          >
                            -
                          </button>
                          <span className="cart-qty-val">{qty}</span>
                          <button 
                            type="button" 
                            className="cart-qty-btn"
                            onClick={() => handleUpdateQty(product.id, 1, product.stock)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </form>

      {/* Sticky price calculator action bar */}
      <div className="sticky-bottom-bar">
        <div className="bottom-bar-content">
          <div className="price-display">
            <span>Total Amount</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>

          <button 
            type="button" 
            className="primary-btn font-display" 
            disabled={isButtonDisabled}
            onClick={handleCheckout}
          >
            <span>{activeTab === 'print' ? 'Book & Print (Cash on Spot)' : 'Book & Scan (Cash on Spot)'}</span>
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
};

export default CustomerConsole;
