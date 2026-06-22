import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css";
import "./styles/theme.css";
import "./styles/app-global.css";

import "./styles/typography.css";
import "./styles/button.css";
import "./styles/form.css";
import "./styles/filter.css";
import "./styles/table.css";
import "./styles/modal.css";
import "./styles/pagination.css";
import "./styles/toast.css";
import "./styles/settings-widgets.css";
import "./styles/ema-layout.css";
import "./styles/module-container.css";
import "./styles/management-control-settings.css";
import "./styles/notification-channels.css";
import "./styles/ema-system-shell.css";
import "./styles/module-ui-fixes.css";

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
