import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { normalizePhilippineNumber } from './utils/contactUtils.js';

// Sanitize any stored buyer contact at app startup to prevent invalid values like "3" from persisting.
try {
  const raw = JSON.parse(localStorage.getItem('pigmarket-buyer') || 'null');
  if (raw && raw.contactNumber) {
    const normalized = normalizePhilippineNumber(String(raw.contactNumber || ''));
    if (!normalized) {
      localStorage.removeItem('pigmarket-buyer');
    } else if (normalized !== raw.contactNumber) {
      // Normalize stored format to canonical form
      localStorage.setItem('pigmarket-buyer', JSON.stringify({ ...raw, contactNumber: normalized }));
    }
  }
} catch (e) {
  // Ignore parse errors and remove corrupt entry
  localStorage.removeItem('pigmarket-buyer');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
