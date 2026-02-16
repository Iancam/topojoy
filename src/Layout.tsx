import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { Link, Outlet } from "react-router";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (import.meta.env.DEV && !PUBLISHABLE_KEY) {
  // throw new Error("Missing Publishable Key");
  console.log("Missing Publishable Key");
}

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {import.meta.env.DEV && PUBLISHABLE_KEY ? (
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <div className="flex-1">
            <Outlet />
          </div>
        </ClerkProvider>
      ) : (
        <div className="flex-1">
          <Outlet />
        </div>
      )}
    </div>
  );
};
