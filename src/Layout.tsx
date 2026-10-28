import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { Link, Outlet, ScrollRestoration } from "react-router";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <div className="flex-1">
          <Outlet />
          <ScrollRestoration />
        </div>
      </ClerkProvider>
    </div>
  );
};
