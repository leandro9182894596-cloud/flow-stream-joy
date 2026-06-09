import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAccount } from "./use-account";
import type { Account } from "../lib/xtream";

/**
 * Ensures an account is present. Returns the account (or null while loading).
 * Redirects to /login when no account is stored.
 */
export function useRequireAccount(): { account: Account | null; ready: boolean } {
  const { account, ready } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !account) {
      navigate({ to: "/login" });
    }
  }, [ready, account, navigate]);

  return { account, ready };
}
