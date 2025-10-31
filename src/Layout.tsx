import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { Link, Outlet } from "react-router";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

export const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <Outlet />
      </ClerkProvider>
    </>
  );
};
