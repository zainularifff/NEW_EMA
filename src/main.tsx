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
          <EmaToastProvider>
        <App />
      </EmaToastProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);

import { installEmaTablePaginationFinal } from "./utils/emaTablePaginationFinal";
import "./styles/ema-settings-clean.css";
import { EmaToastProvider } from "./components/common/EmaToastProvider";
import "./styles/ema-common-ui.css";

installEmaTablePaginationFinal();

