# Zprint - Scan It, Get It 🖨️

Zprint is a premium self-service SaaS printing and Xerox photocopy kiosk network client. Built with a human-centric approach inspired by Apple's minimalist alignment and Web3-style glowing indicators, it allows customers to print or photocopy instantly by simply scanning a QR code at any active retailer station.

---

## ✨ Features

### 🏪 For Xerox & Print Retailers:
* **Shop Registration & Workspace:** Register a kiosk point under a custom name and location.
* **WebSocket Spooler Queue:** Receive customer print orders and scan commands in real-time. Plays an audible chime alert when new requests hit the queue.
* **Catalog Configuration:**
  - **Binding Price Manager:** Toggle and set prices for binding styles (Spiral, Hardcover, Softcover).
  - **Stationery Store Catalog:** Add stationery items (pens, notebooks, pencils) with custom rates and stock limits.

### 👥 For Customers (Guest / Frictionless Access):
* **No-Password General Registration:** Access the kiosk instantly using just a Name and Phone Number.
* **Upload & Print:** Select or drag PDF/Image files. Files stream directly to Cloudinary.
* **Physical Xerox photocopies:** Guided step-by-step scanner control console with adjustable resolutions (150, 300, 600 DPI).
* **Bindings & stationery add-ons:** Book spiral binding and stationery products sold by the shop.
* **Cash on Spot Payments:** Unified invoicing calculating prints + bindings + products. Pay cash at the counter to collect sheets.

### ⏰ 12-Hour Media Auto-Cleanup:
* Files uploaded to Cloudinary are logged with their `public_id`.
* A background cron worker automatically deletes any asset uploaded **12 hours ago or more** from Cloudinary's servers to protect customer privacy and data storage.

---

## 🛠️ Tech Stack & Setup

### Technologies:
* **Frontend:** React.js (Vite)
* **Styling:** Custom Vanilla CSS (No Tailwind CSS)
* **Backend:** Node.js, Express, WebSockets (`ws`)
* **Cloud Storage:** Cloudinary SDK

### Local Setup:

1. **Clone the repository:**
   ```bash
   git clone git@github.com:subhaharinioffi/z-print.git
   cd z-print
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
   PORT=8000
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Build the React bundle:**
   ```bash
   npm run build
   ```

5. **Start the production server:**
   ```bash
   npm start
   ```

Open **[http://localhost:8000](http://localhost:8000)** in your browser. Toggle roles at the top of the header to test both Customer and Retailer flows.

---

&copy; Zprint Inc. • Premium Mobile Print & Xerox SaaS
