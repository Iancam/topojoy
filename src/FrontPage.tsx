import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { html } from "./content/about.md";
import "./index.css";
import { Link } from "react-router";
import { Header } from "./components/Header";
export const FrontPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 pt-20">
      <Header />
      {/* <nav className="flex justify-between px-3 py-2 fixed top-0 left-0 right-0 shadow-lg bg-white z-10 backdrop-blur-lg">
        <a href="#hero" className="text-gray-800 font-semibold hover:underline">
          TopoJoy
        </a>
        <a
          href="#about"
          className="px-4 text-gray-800 font-semibold hover:underline"
        >
          About
        </a>
        <div className="flex ml-auto">
          <a
            className="text-black text-xs font-bold py-1 px-4"
            href="/geojson.io/index.html"
          >
            Open Map Editor
          </a>
        </div>

        <div className="flex">
          <Link
            to="/app"
            className="px-4 text-gray-800 font-semibold hover:underline"
          >
            Open App
          </Link>
        </div>

        <div className="px-4">
          {import.meta.env.DEV && (
            <div>
              <SignedIn>
                <UserButton afterSignOutUrl="/sign-in" />
                <Link
                  to="/my-maps"
                  className="text-gray-800 font-semibold hover:underline"
                >
                  My Maps
                </Link>
              </SignedIn>
              <SignedOut>
                <Link
                  to="/sign-in"
                  className="text-gray-800 font-semibold hover:underline"
                >
                  Sign In
                </Link>
              </SignedOut>
            </div>
          )}
        </div>
      </nav> */}
      <div className="w-full max-w-[600px] text-center min-h-[calc(100vh-60px)] flex flex-col items-center justify-center py-8 px-4 mt-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to TopoJoy
        </h1>
        <p className="text-lg leading-7 text-gray-600 mb-8">
          Create stylized, topography-inspired maps that tell a story. Zoom to a
          place that has meaning to a friend, select the area you want to
          remember, then customize the color scheme, features, and background
          text. Send a gift that'll mean something.
        </p>
        <a
          href="geojson.io/index.html"
          className="text-2xl px-8 py-4 bg-indigo-600 text-white rounded-lg mb-4 transition-colors hover:bg-indigo-700 inline-block"
        >
          Open Map Editor
        </a>
        <a
          href="app.html"
          className="text-gray-500 hover:underline inline-block"
        >
          View App
        </a>
      </div>
      <section
        id="about"
        className="py-12 px-4 max-w-[700px] mx-auto text-slate-700 leading-7 prose"
        dangerouslySetInnerHTML={{ __html: html }}
      ></section>
    </div>
  );
};
