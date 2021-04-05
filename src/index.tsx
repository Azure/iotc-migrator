import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom'

import Shell from './shell/shell';
import { AuthProvider } from './context/authContext';

import { initializeIcons } from '@fluentui/react/lib/Icons';
initializeIcons();

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>

  </React.StrictMode>,
  document.getElementById('root')
);
