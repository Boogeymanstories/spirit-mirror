import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign TensorFlow Lite WASM / XNNPACK informational notices routed to console.error
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');
    if (
      message.includes('Created TensorFlow Lite XNNPACK delegate') ||
      message.includes('INFO: Created TensorFlow Lite') ||
      message.includes('XNNPACK delegate for CPU')
    ) {
      // Benign TFLite engine initialization notice - redirect to debug log
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');
    if (
      message.includes('Created TensorFlow Lite XNNPACK delegate') ||
      message.includes('INFO: Created TensorFlow Lite') ||
      message.includes('XNNPACK delegate for CPU')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

