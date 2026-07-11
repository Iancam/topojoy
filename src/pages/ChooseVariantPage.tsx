import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Header } from "../components/Header";
import { submission, netlifyImageUrl } from "../api";
import { MapThumbnail } from "../components/MapThumbnail";

type Variant = {
  id: string;
  title: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  status?: string | null;
  createdAt: string;
};

export default function ChooseVariantPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !parentId) return;
    submission
      .variantsList({ parentId })
      .then((data: Variant[]) => setVariants(data))
      .catch((err: Error) => setError(err.message || "Failed to load variants"))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, parentId]);

  const handleChoose = (variantId: string) => {
    navigate(`/app?configId=${variantId}`);
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#071e25] text-[#d5f7ff]">
      <Header />
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 pt-20 pb-16">
        <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white mb-2">
          Choose your style
        </h1>
        <p className="text-sm text-[#6ab3c2] mb-10 leading-6">
          Ian has prepared a few variations for you. Pick the one that feels
          right — you'll be able to order a print from there.
        </p>

        {loading && (
          <p className="text-sm text-[#6ab3c2] animate-pulse">
            Loading variations…
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {!loading && !error && variants.length === 0 && (
          <p className="text-sm text-[#6ab3c2]">
            No variations available yet. Ian will be in touch soon!
          </p>
        )}

        {!loading && variants.length > 0 && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {variants.map((v) => (
              <div
                key={v.id}
                className="group flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-teal-500/50 transition-colors"
              >
                <div className="aspect-[3/4] bg-black/20 overflow-hidden">
                  {v.s3Key ? (
                    <MapThumbnail title={v.title} s3Key={v.s3Key} />
                  ) : v.imageUrl ? (
                    <img
                      src={netlifyImageUrl(v.imageUrl, {
                        w: 480,
                        fit: "cover",
                      })}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                      Preview coming soon
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-sm font-medium text-white">{v.title}</p>
                  <button
                    type="button"
                    onClick={() => handleChoose(v.id)}
                    className="w-full py-2 bg-teal-500 hover:bg-teal-400 text-[#071e25] font-semibold text-sm rounded transition-colors"
                  >
                    Choose this style →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
