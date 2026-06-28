import "../index.css";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { netlifyImageUrl } from "../api";

export const FrontPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#071e25] text-[#d5f7ff]">
      <Header />

      {/* Hero */}
      <section className="relative w-full pt-15">
        <img
          src={netlifyImageUrl("/img/topojoy-hero.png", {
            w: 1600,
            fit: "cover",
          })}
          alt="Bullet Canyon topographic map"
          className="w-full object-cover max-h-[85vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071e25] via-transparent to-transparent" />
        <div className="absolute bottom-10 left-0 right-0 text-center px-4">
          <p className="text-3xl md:text-5xl font-light tracking-widest text-white/90 mb-8 drop-shadow-lg">
            Tell your story.
          </p>
          <a
            href="/geojson.io/index.html"
            className="inline-block text-base md:text-lg px-8 py-3 bg-teal-500 hover:bg-teal-400 text-[#071e25] font-bold rounded transition-colors duration-200"
          >
            Open Map Editor
          </a>
        </div>
      </section>

      {/* Gift story — Albert */}
      <section className="w-full max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <blockquote className="text-lg md:text-xl italic leading-8 text-[#a8dde9] mb-6">
            "I'm beyond grateful for, even more than a map, this poetic monument
            to and living memory of our trek together. I will think of our wet
            footsteps through the tall trees, our quiet night camped on the
            gravel bar of Redwood Creek, and our thrilling descent in the back
            of the truck each time I see this on the wall. Eleven years later,
            it's a treat to have a physical manifestation of an
            otherwise-distant memory, and to know it mattered as much to you as
            it did to me."
          </blockquote>
          <p className="text-sm text-[#6ab3c2] tracking-widest uppercase">
            — Albert
          </p>
          <div className="mt-8 border-t border-[#0e3942] pt-6 text-sm text-[#6ab3c2] leading-6">
            <p>
              The first map I ever made was a gift to my sister — her favorite
              trail, her favorite color scheme, song lyrics she'd hum to herself
              on the trail. It was an experiment in generosity. It's still on
              her wall.
            </p>
            <Link
              to="/origin-story"
              className="inline-block mt-3 text-teal-400 hover:text-teal-300 transition-colors"
            >
              Read the origin story →
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <img
            src={netlifyImageUrl("/img/Albert.png", { w: 800, fit: "cover" })}
            alt="Tall Trees, Ian and Albert — topographic map of Redwood Creek"
            className="w-full rounded shadow-2xl shadow-black/60"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#0e3942] w-full max-w-5xl mx-auto px-6 py-16 text-center">
        <p className="text-base md:text-lg text-[#a8dde9] max-w-xl mx-auto leading-7 mb-10">
          If you have a friend who goes backpacking, or a place in the woods
          that matters to someone you know — make something that'll stay on
          their wall.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/geojson.io/index.html"
            className="px-8 py-3 bg-teal-500 hover:bg-teal-400 text-[#071e25] font-bold rounded transition-colors duration-200"
          >
            Make a map
          </a>
          <Link
            to="/donate"
            className="px-8 py-3 border border-teal-500 text-teal-400 hover:bg-teal-500/10 rounded transition-colors duration-200"
          >
            Give a gift
          </Link>
        </div>
      </section>

      {/* Contact / Gift Token */}
      <section className="border-t border-[#0e3942] w-full max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-light tracking-wide text-[#d5f7ff] mb-4">
          Get in Touch
        </h2>
        <p className="text-sm md:text-base text-[#6ab3c2] max-w-lg mx-auto leading-7 mb-2">
          Maps are only made with a gift token. Gift tokens come from donations
          — every donation unlocks one.
        </p>
        <p className="text-sm md:text-base text-[#6ab3c2] max-w-lg mx-auto leading-7 mb-8">
          If you'd like a token, just ask.
        </p>
        <a
          href="mailto:hello@topojoy.studio"
          className="inline-block px-8 py-3 bg-teal-500 hover:bg-teal-400 text-[#071e25] font-bold rounded transition-colors duration-200"
        >
          hello@topojoy.studio
        </a>
      </section>

      <footer className="border-t border-[#0e3942] py-6 text-center text-xs text-[#4a8a99]">
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
