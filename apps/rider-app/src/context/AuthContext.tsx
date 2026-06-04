import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getToken, clearAuth } from "../lib/auth";

interface AuthContextValue {
  isReady: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  setSignedIn: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    getToken().then((token) => {
      setIsSignedIn(Boolean(token));
      setIsReady(true);
    });
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setIsSignedIn(false);
  }, []);

  const setSignedIn = useCallback((v: boolean) => {
    setIsSignedIn(v);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isReady, isSignedIn, signOut, setSignedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
