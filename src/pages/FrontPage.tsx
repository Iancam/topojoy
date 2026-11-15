import "../index.css";
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Feather, Gift, MapPin, Palette } from "lucide-react";
import { Header } from "../components/Header";
import { netlifyImageUrl } from "../api";
import { GiftIntentForm, type GiftIntent } from "../components/GiftIntentForm";
import joyAndIan from "../content/blog/joy-and-ian.jpg";

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
    description: "I send the finished print from my shop to the recipient.",
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
    <div className="min-h-screen overflow-hidden theme-topojoy-dark bg-canvas text-text">
      <Header />

      {/* Hero */}
      <section
        id="begin-gift"
        className="relative isolate min-h-[760px] overflow-hidden pt-15 lg:min-h-[820px]"
      >
        <div className="absolute inset-0 topojoy-hero-gradient" />
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
            <p className="mt-7 max-w-lg text-lg leading-8 text-text-muted">
              Choose a special place in the wilderness. Together, we'll turn it
              into a custom map they can display.
            </p>
            <div className="mt-10">
              {!formOpen ? (
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={beginGift}
                    className="group inline-flex items-center gap-3 rounded-full bg-highlight px-7 py-3.5 font-semibold text-highlight-foreground transition hover:bg-highlight-hover"
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
            <div className="relative -rotate-1 overflow-hidden rounded-sm bg-surface-raised p-2 shadow-[0_40px_100px_rgba(0,0,0,0.55)] transition-transform duration-700 hover:rotate-0">
              <img
                src={netlifyImageUrl("/img/topojoy-hero.png", {
                  w: 1200,
                  fit: "contain",
                })}
                alt="Bullet Canyon topographic map"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Gift story — Albert */}
      <section className="relative border-y border-border-strong bg-canvas/80 py-24 lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="relative">
            <div className="absolute -inset-3 translate-x-4 translate-y-4 border border-highlight/20" />
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
            <p className="mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-highlight">
              What the gift can hold
            </p>
            <blockquote className="font-serif text-3xl font-light leading-[1.35] text-text md:text-4xl">
              “Even more than a map, this [is a] poetic monument to and living
              memory of our trek together.”
            </blockquote>
            <details className="group mt-8 border-t border-border-strong pt-6">
              <summary className="cursor-pointer list-none text-sm font-medium text-teal-300 transition hover:text-teal-200">
                <span className="group-open:hidden">
                  Read Albert's full note +
                </span>
                <span className="hidden group-open:inline">
                  Close Albert's note −
                </span>
              </summary>
              <blockquote className="mt-5 text-base italic leading-7 text-text-muted">
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
            <p className="mt-7 text-xs uppercase tracking-[0.24em] text-action">
              Albert, recipient of a map commemorating Redwood Creek
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="theme-topojoy-paper bg-canvas py-24 text-text lg:py-32"
      >
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-action">
              How it works
            </p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight md:text-5xl">
              You bring the memory. I do the mapmaking.
            </h2>
          </div>
          <div className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
            <div className="absolute left-[8%] right-[8%] top-6 hidden border-t border-dashed border-border-strong md:block" />
            {steps.map(({ title, description, icon: Icon }, index) => (
              <div key={title} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-border theme-topojoy-paper bg-canvas text-action">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-text-faint">
                  0{index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-text-subtle">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gift economy */}
      <section className="relative bg-surface py-24 lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-highlight">
              Cost
            </p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-white md:text-5xl">
              A map given forward.
            </h2>
            <p className="mt-7 text-lg leading-8 text-text-muted">
              This is an economy of gifts: I don't charge you for the map. Its
              creation and printing were made possible by someone who gave
              before you.
            </p>
            <p className="mt-6 leading-7 text-text-subtle">
              There are no strings attached. If receiving the gift creates a
              desire to keep that goodness alive, you can carry it forward
              through another act of generosity elsewhere in your life, or help
              make a future map possible.
            </p>
            <p className="mt-6 border-l border-highlight/50 pl-5 text-sm italic leading-6 text-text-muted">
              Because each map is individually designed and funded by gifts, I
              can only make a limited number at a time.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link
                to="/donate"
                className="underline underline-offset-8 transition hover:text-white"
              >
                Donate here
              </Link>
            </div>
          </div>

          <div className="self-center rotate-1 theme-topojoy-paper bg-canvas p-8 text-text shadow-2xl shadow-black/25 sm:p-11">
            <p className="font-serif text-2xl italic">The chain:</p>
            <div className="mt-8 space-y-6 border-l border-highlight/50 pl-6">
              <p className="leading-7">
                A donor's generosity pays for the materials and gives me the
                time to work.
              </p>
              <p className="leading-7">
                You tell me about a person, select a place, and personalize the
                text. I make the map, revise it with you, and mail the finished
                print.
              </p>
              <p className="leading-7">
                You give it. Whatever happens after that belongs to you and the
                person receiving it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why TopoJoy */}
      <section className="theme-topojoy-paper bg-canvas py-24 text-text lg:py-32">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-action">
              Why
            </p>
            <div className="mt-5 h-px w-24 bg-highlight/50" />
            <img
              src={netlifyImageUrl(joyAndIan, { w: 800, fit: "contain" })}
              alt="Joy and Ian"
              loading="lazy"
              className="mt-8 w-full rounded-lg shadow-2xl shadow-black/25"
            />
          </div>
          <div className="max-w-2xl">
            <h2 className="font-serif text-4xl font-light leading-tight md:text-5xl">
              It started with one map.
            </h2>
            <p className="mt-7 text-lg leading-8 text-text-muted">
              In 2020, I made a topographic map of my sister's favorite trail in
              her favorite colors, with songs she used to sing worked into the
              landscape. It was born from my gratitude to her, and the desire to
              strengthen our connection.
            </p>
            <p className="mt-5 leading-7 text-text-subtle">
              Everything since has been an experiment in generosity.
            </p>
            <Link
              to="/blog/origin-story"
              className="mt-8 inline-flex items-center gap-2 font-semibold text-action transition hover:text-action-hover"
            >
              Read the origin story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-canvas px-6 py-28 text-center lg:py-36">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/5" />
        <div className="absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-300/5" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">
            Begin with the place
          </p>
          <h2 className="mt-6 font-serif text-4xl font-light text-white md:text-6xl">
            Where are you thinking of?
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-text-muted">
            A trail, a lake, a landscape? Begin with the place, and I'll make
            the gift with you from there.
          </p>
          <button
            type="button"
            onClick={beginGift}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-highlight px-8 py-4 font-semibold text-highlight-foreground transition hover:bg-highlight-hover"
          >
            Begin their map
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-border bg-canvas/80 px-6 py-7 text-xs text-text-faint sm:flex-row">
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
