import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: "light" | "dark") => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "ema-theme";

function getInitialTheme() {
  if (typeof window === "undefined") return false;

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (saved === "dark") return true;
  if (saved === "light") return false;

  const html = document.documentElement;
  const body = document.body;

  if (
    html.classList.contains("dark") ||
    body.classList.contains("dark") ||
    html.dataset.theme === "dark" ||
    body.dataset.theme === "dark" ||
    html.getAttribute("data-bs-theme") === "dark" ||
    body.getAttribute("data-bs-theme") === "dark"
  ) {
    return true;
  }

  return false;
}

function applyTheme(isDark: boolean) {
  if (typeof document === "undefined") return;

  const mode = isDark ? "dark" : "light";
  const opposite = isDark ? "light" : "dark";

  const html = document.documentElement;
  const body = document.body;

  html.dataset.theme = mode;
  html.setAttribute("data-bs-theme", mode);
  html.classList.toggle("dark", isDark);
  html.classList.toggle("light", !isDark);
  html.classList.toggle("ema-dark", isDark);
  html.classList.toggle("ema-light", !isDark);
  html.classList.remove(opposite);

  body.dataset.theme = mode;
  body.setAttribute("data-bs-theme", mode);
  body.classList.toggle("dark", isDark);
  body.classList.toggle("light", !isDark);
  body.classList.toggle("ema-dark", isDark);
  body.classList.toggle("ema-light", !isDark);
  body.classList.remove(opposite);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent("ema-theme-change", { detail: { mode } }));
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      toggleTheme: () => setIsDark((current) => !current),
      setTheme: (mode: "light" | "dark") => setIsDark(mode === "dark"),
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
