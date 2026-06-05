import React, { useState } from 'react';
import { useZprint } from '../context/ZprintContext';

const RetailerAuth = ({ onBackToCustomer }) => {
  const { loginRetailer, registerRetailer } = useZprint();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLogin) {
      try {
        await loginRetailer(email, password);
      } catch (err) {
        setError(err.message || "Failed to log in");
      }
    } else {
      try {
        const res = await registerRetailer(name, email, password, location);
        setSuccess("Registration successful! Switching to login...");
        setTimeout(() => {
          setIsLogin(true);
          setName('');
          setLocation('');
          setError('');
          setSuccess('');
        }, 1500);
      } catch (err) {
        setError(err.message || "Failed to register");
      }
    }
  };

  return (
    <div className="auth-box" style={{ maxWidth: '400px', margin: '40px auto 0 auto' }}>
      <div className="auth-header">
        <h2 className="font-display">{isLogin ? 'Retailer Portal' : 'Register Shop'}</h2>
        <p>{isLogin ? 'Sign in to access your print & scan queues' : 'Register your Xerox kiosk point on Zprint'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: 'var(--success)', fontSize: '11px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
            {success}
          </div>
        )}

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="shopName">Shop Name</label>
            <input 
              type="text" 
              id="shopName"
              className="text-input glass-input" 
              placeholder="e.g. Lobby Xerox Point"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input 
            type="email" 
            id="email"
            className="text-input glass-input" 
            placeholder="e.g. contact@shop.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password"
            className="text-input glass-input" 
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="location">Shop Location</label>
            <input 
              type="text" 
              id="location"
              className="text-input glass-input" 
              placeholder="e.g. Student Lounge Block B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required 
            />
          </div>
        )}

        <button 
          type="submit" 
          className="primary-btn" 
          style={{ width: '100%', marginTop: '16px', borderRadius: '12px' }}
        >
          {isLogin ? 'Login to Dashboard' : 'Create Account'}
        </button>

        <div className="auth-toggle-row">
          <p>
            {isLogin ? "New to Zprint?" : "Already registered?"}
            <button 
              type="button" 
              className="auth-toggle-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
            >
              {isLogin ? 'Sign Up here' : 'Sign In here'}
            </button>
          </p>
        </div>

        <div className="retailer-link-container" style={{ borderTop: '1px solid var(--gray-border)', paddingTop: '16px', marginTop: '12px' }}>
          <button 
            type="button" 
            className="retailer-link-btn"
            onClick={onBackToCustomer}
          >
            ← Back to Customer Kiosk
          </button>
        </div>
      </form>
    </div>
  );
};

export default RetailerAuth;
