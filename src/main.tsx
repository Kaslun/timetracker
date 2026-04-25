import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { Bootstrap } from './bootstrap';

const container = document.getElementById('root');
if (!container) throw new Error('No #root');
createRoot(container).render(
  <React.StrictMode>
    <Bootstrap />
  </React.StrictMode>,
);
