import { getThumbnailUrl } from "@/api";
import React from "react";

export const MapThumbnail: React.FC<{
  title: string;
  s3Key: string | null | undefined;
  width?: number;
}> = ({ title, s3Key, width = 640 }) => {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!s3Key) return;

    getThumbnailUrl(s3Key, width)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch((err) => {
        console.error("Failed to load map thumbnail", err);
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [s3Key]);

  if (!src) {
    return <span className="text-sm">No image</span>;
  }

  return (
    <img
      src={src}
      alt={title}
      crossOrigin="anonymous"
      className="w-full h-full object-cover"
      onError={() => setSrc(null)}
    />
  );
};
