import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const ADMIN_EMAIL = "admin@example.com";
const TOKEN_KEY = "aarrr_owner_token";
const ADMIN_KEY = "aarrr_admin_email";

let _adminEmail: string | null = null;

setAuthTokenGetter(() => _adminEmail);

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerToken, setOwnerToken] = useState("");

  useEffect(() => {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = uuidv4();
      localStorage.setItem(TOKEN_KEY, token);
    }
    setOwnerToken(token);

    const email = localStorage.getItem(ADMIN_KEY);
    if (email === ADMIN_EMAIL) {
      _adminEmail = email;
      setIsAdmin(true);
    }
  }, []);

  const loginAdmin = (email: string) => {
    if (email === ADMIN_EMAIL) {
      localStorage.setItem(ADMIN_KEY, email);
      _adminEmail = email;
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_KEY);
    _adminEmail = null;
    setIsAdmin(false);
  };

  return { isAdmin, ownerToken, loginAdmin, logoutAdmin };
}
