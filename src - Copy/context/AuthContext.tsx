import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthUser = {
  id?: number;
  username: string;
  name?: string;
  role?: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAuth() {
  try {
    const token =
      localStorage.getItem("ema-access-token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token");

    const rawAuth = localStorage.getItem("ema-auth");
    const parsed = rawAuth ? JSON.parse(rawAuth) : null;

    return {
      token,
      user: parsed?.user || null,
    };
  } catch {
    return {
      token: null,
      user: null,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStoredAuth();

  const [token, setToken] = useState<string | null>(stored.token);
  const [user, setUser] = useState<AuthUser | null>(stored.user);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login: (accessToken, loggedInUser) => {
        setToken(accessToken);
        setUser(loggedInUser);

        localStorage.setItem("ema-access-token", accessToken);
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("token", accessToken);
        localStorage.setItem(
          "ema-auth",
          JSON.stringify({
            token: accessToken,
            accessToken,
            user: loggedInUser,
          })
        );
      },
      logout: () => {
        setToken(null);
        setUser(null);

        localStorage.removeItem("ema-access-token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("ema-auth");
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}