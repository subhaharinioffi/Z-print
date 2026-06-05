require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;

const PORT = process.env.PORT || 8000;
const DB_FILE = path.join(__dirname, 'database.json');

// Multer in-memory storage for Cloudinary streaming uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB Max
});

const app = express();
app.use(express.json());

// Serve static build files in production
app.use(express.static(path.join(__dirname, 'dist')));

// Helper to read database
function readDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Database read error, returning empty structure", error);
    return { retailers: [], catalogs: {}, orders: [] };
  }
}

// Helper to write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Database write error", error);
  }
}

// -------------------------------------------------------------
// Cloudinary Stream Uploader
// -------------------------------------------------------------
function uploadStreamToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    // Clock skew hack: temporarily override Date.now to return real-world 2024 time
    const originalDateNow = Date.now;
    // Subtract ~2 years (63072000000 ms) to align with real-world time
    Date.now = () => originalDateNow() - 63072000000;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "zprint",
        resource_type: "auto",
        public_id: path.parse(originalName).name.replace(/[^a-zA-Z0-9]/g, "_") + "_" + originalDateNow()
      },
      (error, result) => {
        // Restore original Date.now immediately
        Date.now = originalDateNow;
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// Retailer Sign-Up
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, location } = req.body;
  if (!name || !email || !password || !location) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = readDb();
  if (db.retailers.find(r => r.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Retailer email already registered" });
  }

  // Simple clean unique ID for the kiosk
  const id = "XRX-" + Math.floor(100 + Math.random() * 900) + "-" + name.substring(0, 3).toUpperCase();
  const newRetailer = { id, name, email, password, location, online: true };

  db.retailers.push(newRetailer);

  // Initialize default empty catalog settings for this retailer
  db.catalogs[id] = {
    bindings: [
      { id: "spiral", name: "Spiral Binding", price: 20.00, enabled: true },
      { id: "hardcover", name: "Hard Cover Binding", price: 75.00, enabled: false }
    ],
    stationery: [
      { id: "blue-pen", name: "Blue Ballpoint Pen", "price": 10.00, "stock": 20, "enabled": true },
      { id: "black-pen", name: "Black Gel Pen", "price": 12.00, "stock": 15, "enabled": true }
    ]
  };

  writeDb(db);
  res.status(201).json({ message: "Registration successful", retailer: { id, name, email, location } });
});

// Retailer Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const retailer = db.retailers.find(r => r.email.toLowerCase() === email.toLowerCase() && r.password === password);
  
  if (!retailer) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ message: "Login successful", retailer: { id: retailer.id, name: retailer.name, email: retailer.email, location: retailer.location } });
});

// Get Kiosks list
app.get('/api/kiosks', (req, res) => {
  const db = readDb();
  // Return public properties only
  const activeKiosks = db.retailers.map(r => ({
    id: r.id,
    name: r.name,
    location: r.location,
    online: r.online
  }));
  res.json(activeKiosks);
});

// Get Catalog configurations (bindings and products) for specific kiosk
app.get('/api/kiosks/:id/catalog', (req, res) => {
  const db = readDb();
  const catalog = db.catalogs[req.params.id] || { bindings: [], stationery: [] };
  res.json(catalog);
});

// Update Catalog configurations (bindings and products)
app.put('/api/kiosks/:id/catalog', (req, res) => {
  const db = readDb();
  if (!db.catalogs[req.params.id]) {
    db.catalogs[req.params.id] = { bindings: [], stationery: [] };
  }

  const { bindings, stationery } = req.body;
  if (bindings) db.catalogs[req.params.id].bindings = bindings;
  if (stationery) db.catalogs[req.params.id].stationery = stationery;

  writeDb(db);
  res.json({ message: "Catalog updated successfully", catalog: db.catalogs[req.params.id] });
});

// Submit Customer Print Order
app.post('/api/orders', upload.single('document'), async (req, res) => {
  try {
    const { name, phone, kioskId, jobType, copies, colorMode, doubleSided, selectedBinding, selectedStationery } = req.body;
    
    if (!name || !phone || !kioskId || !jobType) {
      return res.status(400).json({ error: "Missing customer details or kiosk selections" });
    }

    let fileUrl = "";
    let fileName = "";
    let fileSize = "";

    if (jobType === 'print') {
      if (!req.file) {
        return res.status(400).json({ error: "No print file uploaded" });
      }
      // Stream upload directly to Cloudinary
      const cloudResult = await uploadStreamToCloudinary(req.file.buffer, req.file.originalname);
      fileUrl = cloudResult.secure_url;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      var cloudinaryPublicId = cloudResult.public_id;
    }

    // Parse bindings and stationery
    const bindingOption = selectedBinding ? JSON.parse(selectedBinding) : null; // e.g. { id, name, price }
    const stationeryList = selectedStationery ? JSON.parse(selectedStationery) : []; // e.g. [{ id, name, price, qty }]

    const db = readDb();
    const orderId = "ORD-" + uuidv4().substring(0, 8).toUpperCase();
    
    // Calculate backend verified total price
    const currentCatalog = db.catalogs[kioskId] || { bindings: [], stationery: [] };
    
    // Base Rates per page
    const rateMap = jobType === 'print' ? { bw: 2.00, color: 5.00 } : { bw: 1.50, color: 4.00 };
    const baseRate = rateMap[colorMode] || 2.00;
    let computedTotal = baseRate * parseInt(copies || 1);

    // Add binding cost
    if (bindingOption) {
      const bindingConfig = currentCatalog.bindings.find(b => b.id === bindingOption.id && b.enabled);
      if (bindingConfig) {
        computedTotal += bindingConfig.price;
      }
    }

    // Add stationery cost
    stationeryList.forEach(item => {
      const productConfig = currentCatalog.stationery.find(p => p.id === item.id && p.enabled);
      if (productConfig) {
        computedTotal += productConfig.price * item.qty;
        // Deduct local stock
        productConfig.stock = Math.max(0, productConfig.stock - item.qty);
      }
    });

    const newOrder = {
      id: orderId,
      customerName: name,
      customerPhone: phone,
      kioskId,
      jobType,
      fileUrl,
      fileName,
      fileSize,
      cloudinaryPublicId: jobType === 'print' ? cloudinaryPublicId : null,
      copies: parseInt(copies || 1),
      colorMode,
      doubleSided: doubleSided === 'true',
      binding: bindingOption,
      stationery: stationeryList,
      totalPrice: computedTotal,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    db.orders.push(newOrder);
    writeDb(db);

    // WebSocket notification: alert the connected Retailer about this new order
    broadcastToRetailer(kioskId, {
      type: 'NEW_ORDER',
      order: newOrder
    });

    res.status(201).json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Order submission failure", error);
    res.status(500).json({ error: "Order submission failed: " + error.message });
  }
});

// Update Print/Xerox Job Status
app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Missing status field" });

  const db = readDb();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;
  writeDb(db);

  // WebSocket notification: alert the specific Customer socket about their order progression
  broadcastToCustomer(order.id, {
    type: 'STATUS_UPDATE',
    orderId: order.id,
    status: status
  });

  res.json({ message: "Order status updated", order });
});

// Trigger Mock Xerox Scanning
app.post('/api/orders/scan', async (req, res) => {
  const { name, phone, kioskId, copies, colorMode, doubleSided, selectedBinding, selectedStationery, scanResolution } = req.body;
  
  if (!name || !phone || !kioskId) {
    return res.status(400).json({ error: "Missing customer details" });
  }

  // Return a mock scanner PDF file path for the checkout receipt
  const mockScanUrl = "https://res.cloudinary.com/de4zrnxdf/image/upload/v1700000000/scanned_document.pdf";
  const orderId = "ORD-" + uuidv4().substring(0, 8).toUpperCase();
  const db = readDb();

  const bindingOption = selectedBinding ? JSON.parse(selectedBinding) : null;
  const stationeryList = selectedStationery ? JSON.parse(selectedStationery) : [];

  // Calculate prices
  const currentCatalog = db.catalogs[kioskId] || { bindings: [], stationery: [] };
  const baseRate = colorMode === 'color' ? 4.00 : 1.50; // Xerox rate
  let computedTotal = baseRate * parseInt(copies || 1);

  if (bindingOption) {
    const bindingConfig = currentCatalog.bindings.find(b => b.id === bindingOption.id && b.enabled);
    if (bindingConfig) computedTotal += bindingConfig.price;
  }

  stationeryList.forEach(item => {
    const productConfig = currentCatalog.stationery.find(p => p.id === item.id && p.enabled);
    if (productConfig) {
      computedTotal += productConfig.price * item.qty;
      productConfig.stock = Math.max(0, productConfig.stock - item.qty);
    }
  });

  const newOrder = {
    id: orderId,
    customerName: name,
    customerPhone: phone,
    kioskId,
    jobType: 'xerox',
    fileUrl: mockScanUrl,
    fileName: `Xerox_Scan_${orderId}.pdf`,
    fileSize: 154200, // 154 KB mock
    copies: parseInt(copies || 1),
    colorMode,
    doubleSided: doubleSided === 'true',
    binding: bindingOption,
    stationery: stationeryList,
    totalPrice: computedTotal,
    status: 'pending',
    timestamp: new Date().toISOString(),
    scanResolution: parseInt(scanResolution || 300)
  };

  db.orders.push(newOrder);
  writeDb(db);

  // Notify retailer
  broadcastToRetailer(kioskId, {
    type: 'NEW_ORDER',
    order: newOrder
  });

  res.status(201).json({ message: "Scan job initialized successfully", order: newOrder });
});

// Single Page App Fallback Route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// -------------------------------------------------------------
// HTTP & WEBSOCKET SERVER INITIALIZATION
// -------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Connected Sockets Registry
const retailerSockets = new Map(); // kioskId -> WS Client
const customerSockets = new Map(); // orderId -> WS Client

// Upgrade HTTP to WS connections
server.on('upgrade', (request, socket, head) => {
  const { searchParams } = new URL(request.url, `http://${request.headers.host}`);
  const role = searchParams.get('role');
  const id = searchParams.get('id');

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.role = role;
    ws.id = id;
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log(`WebSocket connected: role=${ws.role}, id=${ws.id}`);
  
  if (ws.role === 'retailer') {
    retailerSockets.set(ws.id, ws);
  } else if (ws.role === 'customer') {
    customerSockets.set(ws.id, ws);
  }

  ws.on('close', () => {
    console.log(`WebSocket disconnected: role=${ws.role}, id=${ws.id}`);
    if (ws.role === 'retailer') {
      retailerSockets.delete(ws.id);
    } else if (ws.role === 'customer') {
      customerSockets.delete(ws.id);
    }
  });
});

// Broadcast Helper to Retailers
function broadcastToRetailer(kioskId, payload) {
  const ws = retailerSockets.get(kioskId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Broadcast Helper to Customers
function broadcastToCustomer(orderId, payload) {
  const ws = customerSockets.get(orderId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// -------------------------------------------------------------
// Cloudinary Media Auto-Cleaner (12 Hours Expiration)
// -------------------------------------------------------------
async function cleanupExpiredMedia() {
  console.log("[CLEANUP] Running scheduled media check...");
  const db = readDb();
  const now = new Date();
  let dbChanged = false;

  for (let order of db.orders) {
    if (order.cloudinaryPublicId && order.timestamp) {
      const orderTime = new Date(order.timestamp);
      const diffHrs = (now - orderTime) / (1000 * 60 * 60);

      // Clean up files older than 12 hours
      if (diffHrs >= 12) {
        console.log(`[CLEANUP] Deleting expired file for order ${order.id} (Public ID: ${order.cloudinaryPublicId})...`);
        try {
          await cloudinary.uploader.destroy(order.cloudinaryPublicId);
          order.fileUrl = "[Expired & Deleted after 12h]";
          order.fileName = "[Deleted]";
          delete order.cloudinaryPublicId;
          dbChanged = true;
        } catch (err) {
          console.error(`[CLEANUP] Failed to delete Cloudinary asset for order ${order.id}:`, err);
        }
      }
    }
  }

  if (dbChanged) {
    writeDb(db);
    console.log("[CLEANUP] Database updated after removing expired assets.");
  }
}

// Start cleanup check 5 seconds after launch, then run every 30 minutes
setTimeout(cleanupExpiredMedia, 5000);
setInterval(cleanupExpiredMedia, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(` ZPRINT ENTERPRISE SAAS SYSTEM`);
  console.log(` Server active on: http://localhost:${PORT}`);
  console.log(` Cloudinary Cloud storage ready: ${cloudinary.config().cloud_name ? "Connected ("+cloudinary.config().cloud_name+")" : "NOT CONNECTED"}`);
  console.log('='.repeat(60) + '\n');
});
