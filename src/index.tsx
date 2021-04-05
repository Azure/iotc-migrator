import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './pages/app';
import { AuthProvider } from './context/authContext';

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
