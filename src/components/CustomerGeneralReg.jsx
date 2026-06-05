import React, { useState } from 'react';
import { useZprint } from '../context/ZprintContext';

const CustomerGeneralReg = () => {
  const { registerCustomer } = useZprint();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Please provide both name and phone number");
      return;
    }
    // Phone length check
    if (phone.trim().length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    registerCustomer(name, phone);
  };

  return (
    <div className="auth-box" style={{ maxWidth: '380px', margin: '40px auto 0 auto' }}>
      <div className="auth-header">
        <h2 className="font-display">Welcome to Zprint</h2>
        <p>Quick print / scan registration. No password needed!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="customerName">Your Name</label>
          <input 
            type="text" 
            id="customerName"
            className="text-input glass-input" 
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerPhone">Phone Number</label>
          <input 
            type="tel" 
            id="customerPhone"
            className="text-input glass-input" 
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/[^0-9]/g, ''));
              setError('');
            }}
            maxLength="10"
            required 
          />
        </div>

        <button 
          type="submit" 
          className="primary-btn" 
          style={{ width: '100%', marginTop: '16px', borderRadius: '12px' }}
        >
          Proceed to Kiosk
        </button>
      </form>
    </div>
  );
};

export default CustomerGeneralReg;
