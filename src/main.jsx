import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import './index.css';
import { ModalProvider } from './context/ModalContext';
import GlobalModal from './components/GlobalModal';
import App from './App';   // ✅ Import App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ModalProvider>
        <ThemeProvider>
          <GlobalModal />
          <App />   {/* ✅ Render App here */}
        </ThemeProvider>
      </ModalProvider>
    </BrowserRouter>
  </React.StrictMode>
);

