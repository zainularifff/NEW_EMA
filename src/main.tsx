import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./styles/2fa.css";


import "./styles/ema-ui.css";
import "./styles/ema-core.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <EmaToastProvider>
        <App />
      </EmaToastProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

import { installEmaTablePaginationFinal } from "./utils/emaTablePaginationFinal";

import { EmaToastProvider } from "./components/common/EmaToastProvider";

import "./styles/ema-sidebar-compact-fix.css";
import "./styles/ema-sidebar-force-compact.css";
import "./styles/ema-global-compact-fonts.css";
import "./styles/ema-page-layout.css";
import "./styles/ema-side-tree.css";
import "./styles/ema-panel.css";
import "./styles/ema-table.css";
import "./styles/ema-modal.css";
import "./styles/ema-confirm.css";
import "./styles/ema-toast.css";
import "./styles/ema-pagination.css";
import "./styles/ema-icon.css";
import "./styles/ema-settings-force.css";
installEmaTablePaginationFinal();







