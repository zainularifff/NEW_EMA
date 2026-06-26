import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";
import "./styles/ema-ui.css";
import "./styles/2fa.css";


import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
import "./styles/ema-layout.css";
import "./styles/ema-action-buttons.css";
import "./styles/ema-pagination.css";

import "./styles/ema-module-sidebar.css";
import "./styles/ema-standard-table.css";
import "./styles/ema-standard-controls.css";
import "./styles/ema-table-pagination-standard.css";
import { installEmaTablePaginationFinal } from "./utils/emaTablePaginationFinal";

installEmaTablePaginationFinal();
