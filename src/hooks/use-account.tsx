import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadAccount, loadUserInfo, saveAccount, clearAccount } from "../lib/storage";
import type { Account, UserInfo } from "../lib/xtream";

interface AccountContextValue {
  account: Account | null;
  userInfo: UserInfo | null;
  ready: boolean;
  login: (account: Account, info: UserInfo) => void;
  logout: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccount(loadAccount());
    setUserInfo(loadUserInfo());
    setReady(true);
  }, []);

  const login = useCallback((acc: Account, info: UserInfo) => {
    saveAccount(acc, info);
    setAccount(acc);
    setUserInfo(info);
  }, []);

  const logout = useCallback(() => {
    clearAccount();
    setAccount(null);
    setUserInfo(null);
  }, []);

  const value = useMemo(
    () => ({ account, userInfo, ready, login, logout }),
    [account, userInfo, ready, login, logout],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
