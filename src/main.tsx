
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize the extension
document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById("root")!).render(<App />);
});
