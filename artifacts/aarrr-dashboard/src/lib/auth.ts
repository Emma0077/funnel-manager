import { useSyncExternalStore } from "react";
import { v4 as uuidv4 } from "uuid";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const ADMIN_EMAIL = "admin@growthcamp.site";
const TOKEN_KEY = "aarrr_owner_token";
const ADMIN_KEY = "aarrr_admin_email";
const AUTH_EVENT = "aarrr-auth-changed";

function ensureOwnerToken() {
  if (typeof window === "undefined") return "";

  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = uuidv4();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return { adminEmail: null as string | null, ownerToken: "" };
  }

  return {
    adminEmail: localStorage.getItem(ADMIN_KEY),
    ownerToken: ensureOwnerToken(),
  };
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === ADMIN_KEY || e.key === TOKEN_KEY) callback();
  };

  const onAuthChanged = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_EVENT, onAuthChanged);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_EVENT, onAuthChanged);
  };
}

function emitAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

setAuthTokenGetter(() => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY);
});

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isAdmin = snapshot.adminEmail === ADMIN_EMAIL;
  const ownerToken = snapshot.ownerToken;

  const loginAdmin = (email: string) => {
    if (email !== ADMIN_EMAIL) return false;

    localStorage.setItem(ADMIN_KEY, email);
    emitAuthChanged();
    return true;
  };

  const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_KEY);
    emitAuthChanged();
  };

  return { isAdmin, ownerToken, loginAdmin, logoutAdmin };
}
