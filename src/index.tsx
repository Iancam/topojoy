import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./pages/app";
import { createBrowserRouter, useRouteError } from "react-router";
import { RouterProvider } from "react-router/dom";
import { SignIn } from "@clerk/clerk-react";
import { Layout } from "./Layout";
import AuthLayout from "./AuthLayout";
import { FrontPage } from "./pages/FrontPage";
import MyMaps from "./pages/MyMaps";
import MyOrders from "./pages/MyOrders";
import AdminPage from "./pages/admin/AdminPage";
import DonationPage from "./pages/DonationPage";
import GiftPage from "./pages/GiftPage";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/checkout/Checkout";
import { SignInPage } from "./pages/SignInPage";
import { CartProvider } from "./cartContext";
import { Terms } from "./Terms";
import { OriginStory } from "./pages/OriginStory";
import SubmitPage from "./pages/SubmitPage";
import ChooseVariantPage from "./pages/ChooseVariantPage";
import { Blog } from "./pages/Blog";
import { BlogPost } from "./pages/BlogPost";
import { Privacy } from "./Privacy";
import BrowsePage from "./pages/BrowsePage";
const AppError = () => {
  const error = useRouteError() as Error | string | null | undefined;
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
        element: <SignInPage />,
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/my-maps",
            element: <MyMaps />,
          },
          {
            path: "/my-orders",
            element: <MyOrders />,
          },
          {
            path: "/cart",
            element: <Cart />,
          },
          {
            path: "/checkout",
            element: <Checkout />,
          },
          {
            path: "/admin",
            element: <AdminPage />,
          },
          {
            path: "/choose/:parentId",
            element: <ChooseVariantPage />,
          },
        ],
      },
      {
        path: "/donate",
        element: <DonationPage />,
      },
      {
        path: "/submit",
        element: <SubmitPage />,
      },
      {
        path: "/gift/:accessToken",
        element: <GiftPage />,
      },
      {
        path: "/terms",
        element: <Terms />,
      },
      {
        path: "/privacy",
        element: <Privacy />,
      },
      {
        path: "/origin-story",
        element: <OriginStory />,
      },
      {
        path: "/browse",
        element: <BrowsePage />,
      },
      {
        path: "/blog",
        element: <Blog />,
      },
      {
        path: "/blog/:slug",
        element: <BlogPost />,
      },
      {
        path: "/:username/:filename",
        element: <App />,
        errorElement: <AppError />,
      },
    ],
  },
]);

const root = document.getElementById("app");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <CartProvider>
    <RouterProvider router={router} />
  </CartProvider>,
);
// const container = document.getElementById("app");
// const root = createRoot(container);
// root.render(<App />);
