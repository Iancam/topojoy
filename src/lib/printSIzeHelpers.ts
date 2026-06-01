import _ from "lodash";

export const printTypes = {
  poster: {
    maximumHeight: 43.0,
    maximumWidth: 110.0,
    minimumHeight: 4.0,
    minimumWidth: 4.0,
    name: "Archival Matte Fine Art Paper",
    requiredDPI: 300,
    subcategoryId: 103001,
    options: [
      { optionId: 36, optionName: "0.25in Bleed (0.25in on each side)" },
    ],
    transform: (w: number, h: number) => {
      return {
        width: w - 0.5,
        height: h - 0.5,
      };
    },
  },

  framed: {
    subcategoryId: 105005,
    name: "1.25w x 0.875h Black Frame",
    minimumWidth: 5.0,
    maximumWidth: 60.0,
    minimumHeight: 5.0,
    maximumHeight: 40.0,
    requiredDPI: 300,
    options: [
      { optionId: 64, optionName: "No Mat" },
      { optionId: 74, optionName: "Archival Matte Fine Art Paper" },
      { optionId: 83, optionName: "Hanging Wire installed on frame" },
      { optionId: 94, optionName: "No Backing" },
      { optionId: 96, optionName: "White" },
      { optionId: 146, optionName: "Acrylic Glass (recommended)" },
      { optionId: 149, optionName: "Loose Mounted" },
    ],
  },

  canvas: {
    subcategoryId: 101002,
    name: "1.25in Stretched Canvas",
    minimumWidth: 6.0,
    maximumWidth: 110.0,
    minimumHeight: 6.0,
    maximumHeight: 52.0,
    requiredDPI: 200,
    options: [
      { optionId: 2, optionName: "Mirror Wrap" },
      { optionId: 11, optionName: "Sawtooth Hanger installed" },
      { optionId: 259, optionName: "Matte" },
    ],
  },
};

export const generateSizes = ({
  minimumWidth,
  minimumHeight,
  maximumWidth,
  maximumHeight,
  subcategoryId,
  options,
}: {
  minimumWidth: number;
  minimumHeight: number;
  maximumWidth: number;
  maximumHeight: number;
  subcategoryId: number;
  options: { optionId: number; optionName: string }[];
}) => {
  const sizes = [];
  for (let width = minimumWidth; width <= maximumWidth; width += 1) {
    for (let height = minimumHeight; height <= maximumHeight; height += 1) {
      sizes.push({ width, height, subcategoryId, options });
      // if (width !== height) {
      //   sizes.push({ width: height, height: width });
      // }
    }
  }
  return _.uniqBy(sizes, (s) => `${s.width}x${s.height}`);
};

type size = { width: number; height: number };

export const getMatchScore = (
  printW: number,
  printH: number,
  imgW: number,
  imgH: number,
) => {
  // if (!imgW || !imgH) (console.warn("Image dimensions not provided");
  const printRatio = printW / printH;
  const imageRatio = imgW / imgH;
  const diff = Math.abs(printRatio - imageRatio);
  return 1 - Math.min(diff, 1);
};

const getDPI = (imgW: number, imgH: number, printW: number, printH: number) => {
  if (!printW || !printH) return 0;
  const dpiX = imgW / printW;
  const dpiY = imgH / printH;
  return Math.min(dpiX, dpiY);
};

export const getRecommendedSizes = (
  printTypeKey: keyof typeof printTypes,
  imgW: number,
  imgH: number,
) => {
  const sizes = generateSizes(printTypes[printTypeKey]);
  const minDPI = 120;
  const scoredSizes = sizes
    .map(
      (s: {
        width: number;
        height: number;
        subcategoryId: number;
        options: { optionId: number; optionName: string }[];
      }) => {
        const t = printTypes[printTypeKey].transform;
        const transformedSize = t ? t(s.width, s.height) : null;
        return {
          ...s,
          transformedSize,
          options: s.options.map((o) => o.optionId),
          score: t
            ? getMatchScore(
                transformedSize.width,
                transformedSize.height,
                imgW,
                imgH,
              )
            : getMatchScore(s.width, s.height, imgW, imgH),
        };
      },
    )
    .sort((a, b) => b.score - a.score);

  const recommended = scoredSizes
    .filter(
      (s) =>
        s.score >= 0.975 && getDPI(imgW, imgH, s.width, s.height) >= minDPI,
    )
    // .slice(0, numSizes)
    .sort((a, b) => a.width - b.width || a.height - b.height);

  const noRecSizes = recommended.length === 0;
  const noLegitDPI =
    scoredSizes.filter((s) => getDPI(imgW, imgH, s.width, s.height) >= minDPI)
      .length === 0;
  const noGoodScore = scoredSizes.filter((s) => s.score >= 0.975).length === 0;

  return { recommended, error: { noRecSizes, noLegitDPI, noGoodScore } };
};
