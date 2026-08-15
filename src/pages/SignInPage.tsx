// SignInPage.tsx
import { SignIn } from "@clerk/clerk-react";
import { useLocation, useSearchParams } from "react-router";

export function SignInPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from =
    searchParams.get("redirect_url") || (location.state as any)?.from || "/";

  return (
    <div className="flex items-center justify-center bg-gray-50 pt-16">
      <SignIn redirectUrl={from} />
    </div>
  );
}
