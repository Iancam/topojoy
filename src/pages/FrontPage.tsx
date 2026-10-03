import "../index.css";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Feather, Gift, MapPin, Palette } from "lucide-react";
import { Header } from "../components/Header";
import { netlifyImageUrl } from "../api";
import { GiftIntentForm, type GiftIntent } from "../components/GiftIntentForm";

const steps = [
  {
    title: "Choose a place",
    description: "Select the location and trails that hold the memory.",
    icon: MapPin,
  },
  {
    title: "Add something personal",
    description: "Include poetry, lyrics, or a message in the landscape.",
    icon: Feather,
  },
  {
    title: "Choose a design",
    description: "I make several interpretations and send them to you.",
    icon: Palette,
  },
  {
    title: "Give the map",
    description: "I'll print your favorite and mail it to the recipient.",
    icon: Gift,
  },
];

export const FrontPage = () => {
  const [formOpen, setFormOpen] = useState(false);

  const handleComplete = (_intent: GiftIntent) => {
    window.location.href = `${window.location.origin}/geojson.io/index.html`;
  };

  const handleSkip = () => {
    window.location.href = `${window.location.origin}/geojson.io/index.html`;
  };

  const beginGift = () => {
    setFormOpen(true);
    window.setTimeout(() => {
      document.getElementById("begin-gift")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#071e25] text-[#d5f7ff]">
      <Header />

      {/* Hero */}
      <section
        id="begin-gift"
        className="relative isolate min-h-[760px] overflow-hidden pt-15 lg:min-h-[820px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_35%,#164c55_0%,#0b2c34_32%,#071e25_70%)]" />
        <div className="absolute -left-40 top-28 h-[520px] w-[520px] rounded-full border border-teal-300/5" />
        <div className="absolute -left-24 top-44 h-[390px] w-[390px] rounded-full border border-teal-300/5" />
        <div className="relative mx-auto grid min-h-[700px] w-full max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-20">
          <div className="z-10 max-w-xl">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.3em] text-teal-300">
              A generosity experiment
            </p>
            <h1 className="text-4xl font-light leading-[1.08] text-white sm:text-5xl lg:text-7xl">
              Give someone a map of a place that matters to them.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-[#a8dde9]">
              Choose a special place in the wilderness. Together, we'll turn it
              into a custom map they can keep.
            </p>
            <p className="mt-5 max-w-md border-l border-teal-300/40 pl-4 text-sm leading-6 text-[#79b7c4]">
              I'm Ian. TopoJoy is just me: I design each map, send you the
              options, and pack the finished print myself.
            </p>
            <div className="mt-10">
              {!formOpen ? (
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={beginGift}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#e8c98f] px-7 py-3.5 font-semibold text-[#071e25] transition hover:bg-[#f3dba9]"
                  >
                    Begin a gift
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#how-it-works"
                    className="text-sm text-teal-200 underline decoration-teal-500/50 underline-offset-8 transition hover:text-white"
                  >
                    See how it works
                  </a>
                </div>
              ) : (
                <GiftIntentForm
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  ctaLabel="Choose the place →"
                />
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl lg:translate-x-12">
            <div className="absolute -inset-6 rotate-2 rounded-sm border border-teal-200/10" />
            <div className="relative -rotate-1 overflow-hidden rounded-sm bg-[#0b252c] p-2 shadow-[0_40px_100px_rgba(0,0,0,0.55)] transition-transform duration-700 hover:rotate-0">
              <img
                src={netlifyImageUrl("/img/topojoy-hero.png", {
                  w: 1200,
                  fit: "contain",
                })}
                alt="Bullet Canyon topographic map"
                className="w-full"
              />
            </div>
            <div className="ml-auto mt-[-18px] w-fit max-w-[260px] rotate-1 bg-[#efe8da] px-5 py-4 text-[#29484c] shadow-lg shadow-black/30">
              <p className="font-serif text-base italic leading-6">
                I make these one at a time, with you and a particular person in
                mind.
              </p>
              <p className="mt-2 text-right text-xs text-[#8b613d]">— Ian</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gift story — Albert */}
      <section className="relative border-y border-[#16434c] bg-[#06191f] py-24 lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="relative">
            <div className="absolute -inset-3 translate-x-4 translate-y-4 border border-[#b89061]/20" />
            <img
              src={netlifyImageUrl("/img/Albert.png", {
                w: 1000,
                fit: "contain",
              })}
              alt="Tall Trees, Ian and Albert, a topographic map of Redwood Creek"
              className="relative w-full shadow-2xl shadow-black/70"
            />
          </div>
          <div>
            <p className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-[#b89061]">
              What the gift can hold
            </p>
            <blockquote className="font-serif text-3xl font-light leading-[1.35] text-[#e9f8f7] md:text-4xl">
              “Even more than a map, this [is a] poetic monument to and living
              memory of our trek together.”
            </blockquote>
            <details className="group mt-8 border-t border-[#16434c] pt-6">
              <summary className="cursor-pointer list-none text-sm font-medium text-teal-300 transition hover:text-teal-200">
                <span className="group-open:hidden">
                  Read Albert's full note +
                </span>
                <span className="hidden group-open:inline">
                  Close Albert's note −
                </span>
              </summary>
              <blockquote className="mt-5 text-base italic leading-7 text-[#8fc8d3]">
                “I'm beyond grateful for, even more than a map, this poetic
                monument to and living memory of our trek together. I will think
                of our wet footsteps through the tall trees, our quiet night
                camped on the gravel bar of Redwood Creek, and our thrilling
                descent in the back of the truck each time I see this on the
                wall. Eleven years later, it's a treat to have a physical
                manifestation of an otherwise-distant memory, and to know it
                mattered as much to you as it did to me.”
              </blockquote>
            </details>
            <p className="mt-7 text-xs uppercase tracking-[0.24em] text-[#6ab3c2]">
              Albert, recipient of a map commemorating Redwood Creek
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-[#efe8da] py-24 text-[#17373c] lg:py-32"
      >
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8b613d]">
              How it works
            </p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight md:text-5xl">
              You bring the memory. I do the mapmaking.
            </h2>
            <p className="mt-6 max-w-xl leading-7 text-[#607577]">
              There isn't a team or an automated design service behind this. We
              start with your place, then I work through the details with you.
            </p>
          </div>
          <div className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <div className="absolute left-[8%] right-[8%] top-6 hidden border-t border-dashed border-[#9c8c73] md:block" />
            {steps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#a69479] bg-[#efe8da] text-[#8b613d]">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a8062]">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#52696b]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gift economy */}
      <section className="relative bg-[#0b2a31] py-24 lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#e8c98f]">
              What it costs
            </p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-white md:text-5xl">
              A map given forward.
            </h2>
            <p className="mt-7 text-lg leading-8 text-[#a8dde9]">
              This is an economy of gifts: I don't charge you for the map. Its
              creation and printing were made possible by someone who gave
              before you.
            </p>
            <p className="mt-6 leading-7 text-[#79b7c4]">
              There are no strings attached. If receiving the gift creates a
              desire to keep that goodness alive, you can carry it forward
              through another act of generosity elsewhere in your life, or help
              make a future map possible.
            </p>
            <p className="mt-6 border-l border-[#e8c98f]/50 pl-5 text-sm italic leading-6 text-[#8fc8d3]">
              Because each map is individually designed and funded by gifts, I
              can only make a limited number at a time.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={beginGift}
                className="inline-flex items-center gap-2 font-semibold text-[#e8c98f] transition hover:text-[#f5dfb5]"
              >
                Begin a gift <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/donate"
                className="text-sm text-[#79b7c4] underline decoration-[#79b7c4]/40 underline-offset-8 transition hover:text-white"
              >
                Make a future map possible
              </Link>
            </div>
          </div>

          <div className="self-center rotate-1 bg-[#efe8da] p-8 text-[#29484c] shadow-2xl shadow-black/25 sm:p-11">
            <p className="font-serif text-2xl italic">
              The chain, as I see it:
            </p>
            <div className="mt-8 space-y-6 border-l border-[#b89061]/50 pl-6">
              <p className="leading-7">
                Someone else's generosity pays for the materials and gives me
                the time to work.
              </p>
              <p className="leading-7">
                You tell me about a person and a place. I make the map, revise
                it with you, print it, and pack it.
              </p>
              <p className="leading-7">
                You give it. Whatever happens after that belongs to you and the
                person receiving it.
              </p>
            </div>
            <p className="mt-8 text-right font-serif italic text-[#8b613d]">
              That's the whole operation. — Ian
            </p>
          </div>
        </div>
      </section>

      {/* Why TopoJoy */}
      <section className="bg-[#efe8da] py-24 text-[#17373c] lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8b613d]">
              A note from me
            </p>
            <div className="mt-5 h-px w-24 bg-[#b89061]/50" />
          </div>
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl">
              It started with one map.
            </h2>
            <p className="mt-7 text-lg leading-8 text-[#405d60]">
              I made a topographic map of my sister's favorite trail in her
              favorite colors, with songs she used to sing worked into the
              landscape. It was not a product. It was a way of showing her that
              her memories mattered.
            </p>
            <p className="mt-5 leading-7 text-[#607577]">
              Everything since has been an experiment in what generosity can set
              in motion.
            </p>
            <Link
              to="/origin-story"
              className="mt-8 inline-flex items-center gap-2 font-semibold text-[#825735] transition hover:text-[#5d3c25]"
            >
              Read the origin story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071e25] px-6 py-28 text-center lg:py-36">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/5" />
        <div className="absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/5" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
            Begin with the place
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light text-white md:text-6xl">
            Whose place are you thinking of?
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#8fc8d3]">
            A trail you walked together. A lake they return to. A landscape tied
            to someone you miss. Begin with the place, and I'll make the gift
            with you from there.
          </p>
          <button
            type="button"
            onClick={beginGift}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-[#e8c98f] px-8 py-4 font-semibold text-[#071e25] transition hover:bg-[#f3dba9]"
          >
            Begin their map
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-[#0e3942] bg-[#06191f] px-6 py-7 text-xs text-[#4a8a99] sm:flex-row">
        <p>TopoJoy · Maps made in a spirit of generosity</p>
        <div>
          <a href="mailto:hello@topojoy.studio" className="hover:text-teal-300">
            Contact
          </a>
          <span className="mx-3">·</span>
          <Link to="/privacy" className="hover:text-teal-300">
            Privacy
          </Link>
          <span className="mx-3">·</span>
          <Link to="/terms" className="hover:text-teal-300">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
};
