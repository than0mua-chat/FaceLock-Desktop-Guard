// Ensure window.fetch has both getter and setter on Window and Window.prototype
// to prevent "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  try {
    const origFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let activeFetch = origFetch;
    const desc: PropertyDescriptor = {
      get() {
        return activeFetch;
      },
      set(newFetch) {
        activeFetch = newFetch;
      },
      configurable: true,
      enumerable: true,
    };
    if (typeof Window !== 'undefined' && Window.prototype) {
      try {
        Object.defineProperty(Window.prototype, 'fetch', desc);
      } catch {
        // Ignore if non-configurable on prototype
      }
    }
    try {
      Object.defineProperty(window, 'fetch', desc);
    } catch {
      // Ignore
    }
  } catch {
    // Ignore
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {DesktopBubbleWidget} from './components/DesktopBubbleWidget.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

const isBubbleWindow = window.location.hash === '#bubble';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isBubbleWindow ? <DesktopBubbleWidget isStandaloneWindow={true} /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
);
