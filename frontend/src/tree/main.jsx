import '../styles/main.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { mountChrome } from '../js/layout.js';
import FamilyTreePage from './FamilyTreePage.jsx';

mountChrome('tree');

const container = document.querySelector('[data-tree-island]');
createRoot(container).render(
  <StrictMode>
    <FamilyTreePage />
  </StrictMode>,
);
