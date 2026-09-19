import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SelectionApp } from '~/app/SelectionApp';
import '~/styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container is missing');
}

createRoot(container).render(
  <StrictMode>
    <SelectionApp />
  </StrictMode>,
);
