import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureAmplify } from '@/lib/amplify';
import { App } from './App';
import 'antd/dist/reset.css';

// Bootstrap AWS Amplify trước khi render
configureAmplify();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
