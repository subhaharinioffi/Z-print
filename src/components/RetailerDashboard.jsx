import React, { useState, useEffect } from 'react';
import { useZprint } from '../context/ZprintContext';

const RetailerDashboard = () => {
  const { retailerSession, logout, incomingOrders, setIncomingOrders, updateOrderStatus, activeCatalog, fetchCatalog, updateCatalogOnBackend } = useZprint();
  const [activeCatalogTab, setActiveCatalogTab] = useState('bindings'); // 'bindings' or 'stationery'
  
  // Local catalog editor states
  const [localBindings, setLocalBindings] = useState([]);
  const [localStationery, setLocalStationery] = useState([]);

  // Form states for adding stationery
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Initial fetch for incoming orders & catalog configurations
  useEffect(() => {
    if (retailerSession) {
      fetchCatalog(retailerSession.id);
      fetchOrders();
    }
  }, [retailerSession]);

  // Sync local editor state when backend catalog is fetched
  useEffect(() => {
    if (activeCatalog) {
      setLocalBindings(activeCatalog.bindings || []);
      setLocalStationery(activeCatalog.stationery || []);
    }
  }, [activeCatalog]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      // Filter orders relevant to this kiosk
      const filtered = data.filter(o => o.kioskId === retailerSession.id);
      // Sort newest first
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setIncomingOrders(filtered);
    } catch (err) {
      console.error("Failed to load active orders", err);
    }
  };

  // Stepper handlers to edit catalog prices
  const handleBindingPriceChange = (index, val) => {
    const parsedVal = parseFloat(val) || 0;
    setLocalBindings(prev => prev.map((b, idx) => idx === index ? { ...b, price: parsedVal } : b));
  };

  const handleBindingToggle = (index) => {
    setLocalBindings(prev => prev.map((b, idx) => idx === index ? { ...b, enabled: !b.enabled } : b));
  };

  const handleStationeryChange = (index, key, val) => {
    setLocalStationery(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { 
          ...item, 
          [key]: key === 'price' ? parseFloat(val) || 0 : parseInt(val) || 0 
        };
      }
      return item;
    }));
  };

  const handleStationeryToggle = (index) => {
    setLocalStationery(prev => prev.map((item, idx) => idx === index ? { ...item, enabled: !item.enabled } : item));
  };

  // Add new product item
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice || !newProductStock) return;

    const newProduct = {
      id: newProductName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "_" + Date.now(),
      name: newProductName,
      price: parseFloat(newProductPrice) || 0,
      stock: parseInt(newProductStock) || 0,
      enabled: true
    };

    setLocalStationery(prev => [...prev, newProduct]);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductStock('');
  };

  // Save changes to backend database
  const handleSaveCatalog = async () => {
    setSaveStatus('Saving catalog changes...');
    try {
      await updateCatalogOnBackend(localBindings, localStationery);
      setSaveStatus('Catalog settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      setSaveStatus('Failed to save settings.');
    }
  };

  return (
    <div className="retailer-container">
      {/* Dashboard Top bar */}
      <header className="dash-header">
        <div>
          <h1 className="dash-header-title font-display">{retailerSession.name}</h1>
          <p className="kiosk-location" style={{ fontSize: '13px' }}>
            ID: <span style={{ fontWeight: '800', color: 'var(--primary)' }}>{retailerSession.id}</span> • Location: {retailerSession.location}
          </p>
        </div>

        <div className="dash-header-meta">
          <div className="badge badge-success">
            <span className="status-dot online"></span>
            Online & Ready
          </div>
          <button onClick={logout} className="back-btn" title="Logout" style={{ borderRadius: '12px' }}>
            <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Main dashboard content */}
      <div className="dashboard-layout">
        
        {/* LEFT COLUMN: Active Queue */}
        <div>
          <div className="queue-title-row">
            <h2 className="section-title font-display">Active Print Spooler</h2>
            <button onClick={fetchOrders} className="back-btn" style={{ height: '32px', width: '32px', borderRadius: '8px' }}>
              <svg className="kiosk-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89"></path>
              </svg>
            </button>
          </div>

          {incomingOrders.length === 0 ? (
            <div className="empty-queue-box">
              <svg className="empty-queue-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
              <p>Queue is empty. Active print jobs will display here.</p>
            </div>
          ) : (
            <div className="orders-list">
              {incomingOrders.map(order => (
                <div key={order.id} className="order-card" style={{ borderLeft: `4px solid ${order.status === 'completed' ? 'var(--success)' : order.status === 'processing' ? 'var(--warning)' : 'var(--primary)'}` }}>
                  
                  {/* Order Card Header */}
                  <div className="order-card-header">
                    <div className="order-id-section">
                      <h4 className="font-display">{order.id}</h4>
                      <p className="order-time">{new Date(order.timestamp).toLocaleTimeString()}</p>
                    </div>
                    
                    <span className={`badge ${order.status === 'completed' ? 'badge-success' : order.status === 'processing' ? 'badge-warning' : 'badge-primary'}`}>
                      {order.status === 'completed' ? 'Finished' : order.status === 'processing' ? 'In Spooler' : 'Pending'}
                    </span>
                  </div>

                  {/* Order Card Body */}
                  <div className="order-card-body">
                    <p className="order-customer-info">
                      Customer: <span>{order.customerName} ({order.customerPhone})</span>
                    </p>

                    {/* Show file link if type is print */}
                    {order.fileUrl && (
                      <div className="order-document-info">
                        <svg className="order-doc-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                        <a href={order.fileUrl} target="_blank" rel="noopener noreferrer" className="order-doc-name">
                          {order.fileName}
                        </a>
                        <span className="order-doc-details">
                          {order.copies} {order.copies > 1 ? 'copies' : 'copy'} • {order.colorMode === 'bw' ? 'B&W' : 'Color'} {order.doubleSided ? '(Duplex)' : ''}
                        </span>
                      </div>
                    )}

                    {/* Xerox Mode status details */}
                    {!order.fileUrl && (
                      <div className="order-document-info" style={{ backgroundColor: '#fff5f5', borderColor: '#ffe3e3' }}>
                        <svg className="order-doc-icon" style={{ color: 'var(--secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--secondary)' }}>Physical Xerox Scanner Request</span>
                        <span className="order-doc-details" style={{ marginLeft: '12px' }}>
                          Resolution: {order.scanResolution || 300} DPI • {order.copies} copies • {order.colorMode === 'bw' ? 'B&W' : 'Color'}
                        </span>
                      </div>
                    )}

                    {/* Catalog bindings and stationery items tags */}
                    <div className="order-catalog-section">
                      {order.binding && (
                        <span className="catalog-tag catalog-tag-binding">
                          Binding: {order.binding.name} (+₹{order.binding.price.toFixed(2)})
                        </span>
                      )}
                      {order.stationery && order.stationery.length > 0 && order.stationery.map(item => (
                        <span key={item.id} className="catalog-tag catalog-tag-stationery">
                          Product: {item.name} x{item.qty} (+₹{(item.price * item.qty).toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Order Card Footer */}
                  <div className="order-card-footer">
                    <div className="order-price-box">
                      <label>Total Price</label>
                      <span className="order-price-value">₹{order.totalPrice.toFixed(2)}</span>
                    </div>

                    <div className="order-actions">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'processing')}
                          className="action-btn-sm action-btn-primary"
                        >
                          Start Printing
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="action-btn-sm action-btn-success"
                        >
                          Finish Order
                        </button>
                      )}
                      {order.status === 'completed' && (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--success)' }}>
                          Completed ✓
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Kiosk Settings Config */}
        <div>
          <div className="queue-title-row">
            <h2 className="section-title font-display">Kiosk Catalogue</h2>
          </div>

          <div className="catalog-settings-panel">
            <div className="catalog-section-card">
              
              {/* Settings Sub Tabs */}
              <div className="tab-selector" style={{ marginBottom: '16px' }}>
                <button 
                  type="button" 
                  className={`tab-btn ${activeCatalogTab === 'bindings' ? 'active' : ''}`}
                  onClick={() => setActiveCatalogTab('bindings')}
                >
                  Bindings Options
                </button>
                <button 
                  type="button" 
                  className={`tab-btn ${activeCatalogTab === 'stationery' ? 'active' : ''}`}
                  onClick={() => setActiveCatalogTab('stationery')}
                >
                  Stationery Items
                </button>
              </div>

              {/* SAVE BUTTON STATE info */}
              {saveStatus && (
                <div style={{ padding: '8px', fontSize: '11px', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: 'var(--primary)', marginBottom: '16px' }}>
                  {saveStatus}
                </div>
              )}

              {/* EDITOR PANELS */}
              {activeCatalogTab === 'bindings' ? (
                <div>
                  <table className="catalog-editor-table">
                    <thead>
                      <tr>
                        <th>Enable</th>
                        <th>Binding Style</th>
                        <th>Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localBindings.map((binding, idx) => (
                        <tr key={binding.id}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={binding.enabled}
                              onChange={() => handleBindingToggle(idx)}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: '700', color: 'var(--dark-text)' }}>{binding.name}</td>
                          <td>
                            <input 
                              type="number" 
                              className="inline-edit-input"
                              value={binding.price}
                              onChange={(e) => handleBindingPriceChange(idx, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Table of stationery items */}
                  <table className="catalog-editor-table">
                    <thead>
                      <tr>
                        <th>Enable</th>
                        <th>Item</th>
                        <th>Price (₹)</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localStationery.map((item, idx) => (
                        <tr key={item.id}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={item.enabled}
                              onChange={() => handleStationeryToggle(idx)}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                          </td>
                          <td style={{ fontWeight: '700', color: 'var(--dark-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }} title={item.name}>
                            {item.name}
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="inline-edit-input"
                              value={item.price}
                              onChange={(e) => handleStationeryChange(idx, 'price', e.target.value)}
                              style={{ width: '50px' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="inline-edit-input"
                              value={item.stock}
                              onChange={(e) => handleStationeryChange(idx, 'stock', e.target.value)}
                              style={{ width: '45px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add new product form */}
                  <form onSubmit={handleAddProduct} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px' }} className="space-y-3">
                    <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--gray-text)', marginBottom: '8px' }}>Add Shop Product</h4>
                    
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Item name (e.g. Gel Pen)"
                        className="text-input glass-input"
                        style={{ padding: '8px 12px', fontSize: '11px' }}
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateCols: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <input 
                          type="number" 
                          placeholder="Price (₹)"
                          className="text-input glass-input"
                          style={{ padding: '8px 12px', fontSize: '11px' }}
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '0' }}>
                        <input 
                          type="number" 
                          placeholder="Stock qty"
                          className="text-input glass-input"
                          style={{ padding: '8px 12px', fontSize: '11px' }}
                          value={newProductStock}
                          onChange={(e) => setNewProductStock(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="primary-btn" 
                      style={{ width: '100%', padding: '8px', fontSize: '11px', borderRadius: '8px' }}
                    >
                      + Add to Catalog
                    </button>
                  </form>
                </div>
              )}

              {/* SAVE CATALOG CHANGES ACTION BUTTON */}
              <button 
                type="button" 
                onClick={handleSaveCatalog}
                className="primary-btn" 
                style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }}
              >
                Save Catalogue Configs
              </button>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default RetailerDashboard;
