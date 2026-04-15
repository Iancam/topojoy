import { html } from "../content/about.md";
import "../index.css";
import { Link } from "react-router";
import { Header } from "../components/Header";
export const FrontPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 pt-20">
      <Header />
      <div className="w-full max-w-[600px] text-center min-h-[calc(100vh-60px)] flex flex-col items-center justify-center py-8 px-4 mt-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to TopoJoy
        </h1>
        <p className="text-lg leading-7 text-gray-600 mb-8">
          These maps tell stories of wilderness. The time we built an aspen
          bridge across a raging creek; the time it snowed on us in June; The
          time we climbed Arrow, Handies, Jones,Crown, Niagra. Tell your story.
          Zoom to a place that has meaning to a friend, select the area you want
          to remember, then customize the details. Send a gift that'll mean
          something.
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
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        <Link to="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
        <span className="mx-2">·</span>
        <Link to="/terms" className="hover:underline">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
};
