import React from 'react';

const ReceiptModal = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="overlay-container">
      <div className="modal-content">
        <div className="receipt-success-icon">
          <svg className="success-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h3 className="modal-title font-display" style={{ marginBottom: '4px' }}>Order Booked!</h3>
        <p className="modal-progress-text" style={{ marginBottom: '20px' }}>Pay cash at the counter to collect your order.</p>

        <div className="receipt-block">
          <div className="receipt-row">
            <label>Order ID</label>
            <span>{order.id}</span>
          </div>
          <div className="receipt-row">
            <label>Kiosk Machine</label>
            <span>{order.kioskId}</span>
          </div>
          <div className="receipt-row">
            <label>Job Type</label>
            <span style={{ textTransform: 'capitalize' }}>
              {order.jobType === 'print' ? 'File Print' : 'Xerox Copy'}
            </span>
          </div>
          <div className="receipt-row">
            <label>Options</label>
            <span>
              {order.copies} {order.copies > 1 ? 'Copies' : 'Copy'} ({order.colorMode === 'bw' ? 'B&W' : 'Color'})
            </span>
          </div>
          
          {order.binding && (
            <div className="receipt-row">
              <label>Binding</label>
              <span>{order.binding.name} (+₹{order.binding.price.toFixed(2)})</span>
            </div>
          )}

          {order.stationery && order.stationery.length > 0 && (
            <div style={{ marginTop: '4px', borderTop: '1px dashed #e5e7eb', paddingTop: '6px' }}>
              <label style={{ fontSize: '9px', fontWeight: '800', color: 'var(--gray-text)', textTransform: 'uppercase' }}>Stationery booked</label>
              {order.stationery.map(item => (
                <div key={item.id} className="receipt-row" style={{ marginTop: '2px' }}>
                  <span style={{ fontWeight: '500', color: 'var(--light-text)' }}>• {item.name} (x{item.qty})</span>
                  <span>₹{(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="receipt-row receipt-total">
            <label>Total Amount Due</label>
            <span>₹{order.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <button 
          type="button" 
          className="primary-btn" 
          style={{ width: '100%', borderRadius: '12px' }}
          onClick={onClose}
        >
          Print / Scan Another
        </button>
      </div>
    </div>
  );
};

export default ReceiptModal;
