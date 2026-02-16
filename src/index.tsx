import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { createBrowserRouter, useRouteError } from "react-router";
import { RouterProvider } from "react-router/dom";
import { SignIn } from "@clerk/clerk-react";
import { Layout } from "./Layout";
import AuthLayout from "./AuthLayout";
import { FrontPage } from "./FrontPage";
import MyMaps from "./MyMaps";
import { Cart } from "./Cart";
import { Checkout } from "./Checkout";
import { SignInPage } from "./SignInPage";
import { CartProvider } from "./cartContext";
import { Terms } from "./Terms";
import { Privacy } from "./Privacy";
const AppError = () => {
  const error = useRouteError();
  console.log(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        {error && (
          <div className="mt-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 overflow-auto max-h-48">
            {error instanceof Error ? error.message : JSON.stringify(error)}
          </div>
        )}
      </div>
    </div>
  );
};

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <FrontPage />,
      },
      {
        path: "/app.html",
        element: <App />,
        errorElement: <AppError />,
      },
      {
        path: "/app",
        element: <App />,
        errorElement: <AppError />,
      },
      {
        path: "/sign-in",
        element:
          // if in dev mode, show sign in button
          import.meta.env.DEV ? (
            <SignInPage />
          ) : (
            <div className="flex items-center justify-center bg-gray-50 pt-16">
              <p>Not available in production</p>
            </div>
          ),
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/my-maps",
            element: <MyMaps />,
          },
          {
            path: "/cart",
            element: <Cart />,
          },
          {
            path: "/checkout",
            element: <Checkout />,
          },
        ],
      },
      {
        path: "/terms",
        element: <Terms />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
    ],
  },
]);

const root = document.getElementById("app");

createRoot(root).render(
  <CartProvider>
    <RouterProvider router={router} />
  </CartProvider>
);
// const container = document.getElementById("app");
// const root = createRoot(container);
// root.render(<App />);
