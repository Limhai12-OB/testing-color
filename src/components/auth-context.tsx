"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AUTH_KEY, seedAuth, type AuthState } from "@/lib/auth";
const Context = createContext<{
  data: AuthState;
  setData: Dispatch<SetStateAction<AuthState>>;
  ready: boolean;
  toast: (message: string) => void;
} | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AuthState>(seedAuth);
  const [ready, setReady] = useState(false);
  const [message, toast] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
      if (saved?.users && saved?.invitations) {
        if (saved.rememberSession === false)
          saved.session =
            sessionStorage.getItem(`${AUTH_KEY}-session`) || undefined;
        setData(saved);
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        const persisted =
          data.rememberSession === false
            ? { ...data, session: undefined }
            : data;
        localStorage.setItem(AUTH_KEY, JSON.stringify(persisted));
        if (data.session)
          sessionStorage.setItem(`${AUTH_KEY}-session`, data.session);
        else sessionStorage.removeItem(`${AUTH_KEY}-session`);
      } catch {
        toast(
          "Browser storage is unavailable. Your session will last until this page closes.",
        );
      }
    }
  }, [data, ready]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => toast(""), 4200);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <Context.Provider value={{ data, setData, ready, toast }}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss notification" onClick={() => toast("")}>
            x
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider required");
  return {
    ...context,
    user: context.data.users.find((u) => u.id === context.data.session),
  };
}
export function useOptionalAuth() {
  return useContext(Context);
}
