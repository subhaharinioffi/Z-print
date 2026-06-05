import React, { createContext, useState, useEffect, useContext } from 'react';

const ZprintContext = createContext();

export const useZprint = () => useContext(ZprintContext);

export const ZprintProvider = ({ children }) => {
  const [kiosks, setKiosks] = useState([]);
  const [activeKiosk, setActiveKiosk] = useState(null);
  const [activeCatalog, setActiveCatalog] = useState({ bindings: [], stationery: [] });
  const [customerSession, setCustomerSession] = useState(null);
  const [retailerSession, setRetailerSession] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [incomingOrders, setIncomingOrders] = useState([]); // For retailer dashboard
  
  // WebSocket refs
  const wsRef = React.useRef(null);

  // Fetch Kiosk network
  const fetchKiosks = async () => {
    try {
      const res = await fetch('/api/kiosks');
      const data = await res.json();
      setKiosks(data);
    } catch (err) {
      console.error("Failed to load kiosk directory", err);
    }
  };

  // Fetch Shop Catalog
  const fetchCatalog = async (kioskId) => {
    try {
      const res = await fetch(`/api/kiosks/${kioskId}/catalog`);
      const data = await res.json();
      setActiveCatalog(data);
    } catch (err) {
      console.error("Failed to fetch catalog details", err);
    }
  };

  // Register Retailer Shop
  const registerRetailer = async (name, email, password, location) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, location })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Login Retailer Shop
  const loginRetailer = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRetailerSession(data.retailer);
      // Connect to retailer websocket stream
      connectRetailerWebSocket(data.retailer.id);
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Customer General Guest Login
  const registerCustomer = (name, phone) => {
    if (name && phone) {
      setCustomerSession({ name, phone });
    }
  };

  // Save Shop Catalog settings (Retailer)
  const updateCatalogOnBackend = async (bindings, stationery) => {
    if (!retailerSession) return;
    try {
      const res = await fetch(`/api/kiosks/${retailerSession.id}/catalog`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bindings, stationery })
      });
      const data = await res.json();
      setActiveCatalog(data.catalog);
      return data;
    } catch (err) {
      console.error("Failed to save catalog configurations", err);
    }
  };

  // Update Print Order Status (Retailer)
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      // Update local state list
      setIncomingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      return data;
    } catch (err) {
      console.error("Failed to transition job status", err);
    }
  };

  // Trigger real-time checkout with files (Customer Print)
  const triggerPrintCheckout = async (file, copies, colorMode, doubleSided, selectedBinding, selectedStationery, onProgress) => {
    if (!customerSession || !activeKiosk) return;

    try {
      // Setup progress tracking steps
      onProgress(10, "Initializing Connection...");

      const formData = new FormData();
      formData.append('document', file);
      formData.append('name', customerSession.name);
      formData.append('phone', customerSession.phone);
      formData.append('kioskId', activeKiosk.id);
      formData.append('jobType', 'print');
      formData.append('copies', copies);
      formData.append('colorMode', colorMode);
      formData.append('doubleSided', doubleSided);
      if (selectedBinding) {
        formData.append('selectedBinding', JSON.stringify(selectedBinding));
      }
      formData.append('selectedStationery', JSON.stringify(selectedStationery));

      onProgress(35, "Uploading Document to Cloudinary...");

      const res = await fetch('/api/orders', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onProgress(75, "Authorizing print transaction...");
      
      // Connect customer websocket listener for print status updates
      connectCustomerWebSocket(data.order.id, onProgress);
      setCurrentOrder(data.order);
      return data.order;
    } catch (err) {
      console.error("Checkout transaction error", err);
      throw err;
    }
  };

  // Trigger real-time checkout copier scan (Customer Xerox)
  const triggerXeroxCheckout = async (copies, colorMode, doubleSided, selectedBinding, selectedStationery, scanResolution, onProgress) => {
    if (!customerSession || !activeKiosk) return;

    try {
      onProgress(15, "Connecting to Xerox scanner...");

      const res = await fetch('/api/orders/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerSession.name,
          phone: customerSession.phone,
          kioskId: activeKiosk.id,
          copies,
          colorMode,
          doubleSided,
          selectedBinding,
          selectedStationery,
          scanResolution
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onProgress(50, "Scanner active. Place sheet down...");

      // Connect customer websocket listener
      connectCustomerWebSocket(data.order.id, onProgress);
      setCurrentOrder(data.order);
      return data.order;
    } catch (err) {
      console.error("Scan setup failure", err);
      throw err;
    }
  };

  // Retailer WebSockets client stream connection
  const connectRetailerWebSocket = (kioskId) => {
    if (wsRef.current) wsRef.current.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?role=retailer&id=${kioskId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'NEW_ORDER') {
        // Play soft chime notification and add to queue
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/911/911-200.wav');
          audio.volume = 0.4;
          audio.play();
        } catch(e) {}
        setIncomingOrders(prev => [payload.order, ...prev]);
      }
    };

    wsRef.current = ws;
  };

  // Customer WebSockets client stream connection for real-time progress
  const connectCustomerWebSocket = (orderId, onProgress) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?role=customer&id=${orderId}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'STATUS_UPDATE') {
        const status = payload.status;
        if (status === 'processing') {
          onProgress(85, "Retailer is processing your order...");
        } else if (status === 'completed') {
          onProgress(100, "Sheets printed successfully!");
          // Close connection
          ws.close();
        }
      }
    };
  };

  // Log Out / Reset
  const logout = () => {
    setRetailerSession(null);
    setCustomerSession(null);
    setCurrentOrder(null);
    setIncomingOrders([]);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Initial loading
  useEffect(() => {
    fetchKiosks();
  }, []);

  return (
    <ZprintContext.Provider value={{
      kiosks,
      activeKiosk,
      setActiveKiosk,
      activeCatalog,
      fetchCatalog,
      customerSession,
      registerCustomer,
      retailerSession,
      registerRetailer,
      loginRetailer,
      updateCatalogOnBackend,
      updateOrderStatus,
      incomingOrders,
      setIncomingOrders,
      currentOrder,
      setCurrentOrder,
      triggerPrintCheckout,
      triggerXeroxCheckout,
      logout
    }}>
      {children}
    </ZprintContext.Provider>
  );
};
