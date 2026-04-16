import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const ADMIN_EMAIL = "admin@growthcamp.site";
const TOKEN_KEY = "aarrr_owner_token";
const ADMIN_KEY = "aarrr_admin_email";

function getOrCreateOwnerToken() {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) return existing;

  const token = uuidv4();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

let _adminEmail: string | null = localStorage.getItem(ADMIN_KEY);
setAuthTokenGetter(() => _adminEmail);

export function useAuth() {
  const [adminEmail, setAdminEmail] = useState<string | null>(
    localStorage.getItem(ADMIN_KEY)
  );
  const [ownerToken] = useState<string>(() => getOrCreateOwnerToken());

  const isAdmin = adminEmail === ADMIN_EMAIL;

  const loginAdmin = (email: string) => {
    if (email !== ADMIN_EMAIL) return false;

    localStorage.setItem(ADMIN_KEY, email);
    _adminEmail = email;
    setAdminEmail(email);
    return true;
  };

  const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_KEY);
    _adminEmail = null;
    setAdminEmail(null);
  };

  return { isAdmin, ownerToken, loginAdmin, logoutAdmin };
}
