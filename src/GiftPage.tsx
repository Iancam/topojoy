import React from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Header } from "./components/Header";
import { GIFT_TOKEN_KEY } from "./lib/giftToken";

type GiftInfo = {
  id: string;
  amount: number;
  message: string | null;
  expiryDate: string;
  status: string;
  donor: { name: string } | null;
};

export default function GiftPage() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();

  const [gift, setGift] = React.useState<GiftInfo | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Persist the token to localStorage immediately so it survives external redirects
  React.useEffect(() => {
    if (accessToken) {
      localStorage.setItem(GIFT_TOKEN_KEY, accessToken);
    }
  }, [accessToken]);

  // Fetch gift info once we have a token
  React.useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch(
      `/.netlify/functions/donation-get-gift?accessToken=${encodeURIComponent(accessToken)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.message && !data.id) {
          setError(data.message);
        } else {
          setGift(data);
        }
      })
      .catch(() => setError("Could not load gift details."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const amountDollars = gift ? (gift.amount / 100).toFixed(0) : null;

  const handleMakeMap = () => {
    if (!userId) {
      // Not signed in — send to sign-in then back here
      navigate("/sign-in", {
        state: { from: `/gift/${accessToken}` },
      });
      return;
    }
    // accessToken is already in localStorage; navigate to the external editor
    window.location.href = "geojson.io/index.html";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex-1 flex items-start justify-center pt-24 pb-16 px-4">
        <div className="w-full max-w-xl">
          {loading && (
            <p className="text-sm text-gray-400 text-center">
              Loading your gift…
            </p>
          )}

          {error && (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
              <p className="text-red-600 text-sm font-medium">{error}</p>
              <p className="text-gray-400 text-xs mt-2">
                This gift link may be invalid or expired.
              </p>
            </div>
          )}

          {gift && !loading && (
            <div className="flex flex-col gap-6">
              {/* Gift card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="text-5xl mb-4">🎁</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  You've received a gift!
                </h1>
                {gift.donor?.name && (
                  <p className="text-sm text-gray-500 mb-4">
                    from{" "}
                    <span className="font-semibold text-gray-700">
                      {gift.donor.name}
                    </span>
                  </p>
                )}
                {gift.message && (
                  <blockquote className="mt-6 px-4 py-3 bg-gray-50 rounded-lg border-l-4 border-teal-300 text-sm text-gray-600 italic text-left">
                    "{gift.message}"
                  </blockquote>
                )}
              </div>

              {/* How it works */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Welcome! You know{" "}
                  <a
                    href="https://greatergood.berkeley.edu/article/item/5_ways_giving_is_good_for_you"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 underline hover:text-teal-800"
                  >
                    how good it feels
                  </a>{" "}
                  to light up someone's day with a thoughtful gift? Well,
                  someone wanted to share that experience with you, through
                  mapmaking. You're the cartographer and the giver, so you make
                  the map and decide who will receive it, where the map will
                  focus, the trails it will highlight, the color scheme and
                  style, the background message, and if the map will be framed,
                  stretched canvas, or a poster. Click below to join the TopoJoy
                  community or start thinking about your most excellent gift.
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleMakeMap}
                className="w-full py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-base font-semibold transition-colors shadow-sm"
              >
                {userId ? "Open Map Editor →" : "Sign in to get started →"}
              </button>

              <p className="text-center text-xs text-gray-400">
                Your gift will be here when you come back.
                {gift.expiryDate && (
                  <>
                    {" "}
                    Expires{" "}
                    {new Date(gift.expiryDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
