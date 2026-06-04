import * as React from "react";
import { useAuth } from "@clerk/clerk-react";
import { Outlet, useNavigate } from "react-router";

export default function AuthLayout() {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      navigate("/sign-in", {
        state: { from: location.pathname + location.search },
        replace: true,
      });
    }
  }, [isLoaded, navigate, userId, location.pathname, location.search]);

  if (!isLoaded) return "Loading...";

  return <Outlet />;
}
