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

const AppError = () => {
  const error = useRouteError();
  console.log(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          It looks like you need a bounding box to work with. To get one, go to
          the map before using the app part of the website
        </h1>
        <a
          href="/geojson.io/index.html"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Go to the map
        </a>
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
            <div className="flex items-center justify-center bg-gray-50 pt-16">
              <SignIn />
            </div>
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
        ],
      },
    ],
  },
]);

const root = document.getElementById("app");

createRoot(root).render(<RouterProvider router={router} />);
// const container = document.getElementById("app");
// const root = createRoot(container);
// root.render(<App />);
