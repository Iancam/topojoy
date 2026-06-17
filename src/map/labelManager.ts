/**
 * internal data structures:
 * - Labels: [{labels:[{name, pt, keep, bbox, category}], drawEnv: function}]
 * - Collisions: [[string, string]]
 * functions:
 * - addLabels(labels: [{name, pt}], keepList: string[], drawEnv: function, category: string)
 * - drawLabels()
 * //- reportKeptCollisions()
 * //- reportUnkeptLabels(category: string?)
 *
 */

import { collision } from "@/lib/map/utils";
import p5 from "p5";

export const labelManagerFactory = (sketch: p5) => {
  let labels: {
    name: string;
    displayName?: string;
    pt: [number, number];
    keep: boolean;
    category: string;
    bbox: { x: number; y: number; w: number; h: number };
    setContextId: number;
  }[] = [];
  let contexts: (() => void)[] = [];
  let collisions: [number, number][] = [];
  const getMultiLineBounds = (
    text: string,
    pt: [number, number],
    fontSize: number,
    f: p5.Font,
  ): { x: number; y: number; w: number; h: number } => {
    const lines = text.split("\n");
    if (lines.length === 1) {
      return (f as any).textBounds(text, pt[0], pt[1], fontSize) as {
        x: number;
        y: number;
        w: number;
        h: number;
      };
    }
    const leading = fontSize * 1.25; // p5 default leading
    const totalH = leading * lines.length;
    let maxW = 0;
    lines.forEach((line) => {
      const b = (f as any).textBounds(line, pt[0], pt[1], fontSize) as {
        x: number;
        y: number;
        w: number;
        h: number;
      };
      if (b.w > maxW) maxW = b.w;
    });
    // Return uncorrected (anchor-relative) like textBounds does for 1 line —
    // getRealBoundingBox will apply the alignment/baseline corrections.
    return { x: pt[0], y: pt[1], w: maxW, h: totalH };
  };

  const getRealBoundingBox = (
    pt: [number, number],
    bbox: { x: number; y: number; w: number; h: number },
  ) => {
    let { x, y, w, h } = bbox;
    const baseline: string = (sketch as any)._renderer._textBaseline;
    const fontSize: number = (sketch as any)._renderer._textSize;
    const isMultiLine = h > fontSize * 1.1;
    if (baseline === "center") {
      y = pt[1] - h / 2;
      if (!isMultiLine) h = fontSize;
    } else if (baseline === "bottom") {
      // y = pt[1] - h;
      // h = fontSize;
    } else if (baseline === "top") {
      // h = fontSize;
      y = pt[1];
    }
    // x: y from textBounds is already the top edge for top/alphabetic
    if ((sketch as any)._renderer._textAlign === "center") {
      x = pt[0] - w / 2;
    }
    return { x, y, w, h };
  };

  const checkCollisions = (
    bbox: { x: number; y: number; w: number; h: number },
    name: string,
    aIndex: number,
  ) => {
    let collides = false;

    for (let bIndex = 0; bIndex < labels.length; bIndex++) {
      const bLabel = labels[bIndex];
      if (collision(bbox, bLabel.bbox)) {
        collisions.push([aIndex, bIndex]);
        if (bLabel.keep) {
          collides = true;
        }
      }
    }
    return collides;
  };

  return {
    addLabels: (
      givenLabels:
        | { name: string; displayName?: string; pt: [number, number] }[]
        | Record<string, { pt: [number, number]; displayName?: string }>,
      keepList: string[],
      { setContext, font }: { setContext: () => void; font: p5.Font },
      category: string,
      drop: boolean,
    ) => {
      if (!Array.isArray(givenLabels)) {
        givenLabels = Object.entries(givenLabels).map(
          ([name, { pt, displayName }]) => ({
            name,
            displayName,
            pt,
          }),
        );
      }

      sketch.push();
      setContext();
      const setContextId = contexts.length;
      contexts.push(setContext);

      givenLabels.forEach(({ name, displayName, pt }) => {
        const bbox = getRealBoundingBox(
          pt,
          getMultiLineBounds(
            displayName || name,
            pt,
            (sketch as any)._renderer._textSize,
            font,
          ),
        );
        const collides = checkCollisions(bbox, name, labels.length);
        const keep = drop
          ? keepList.includes(name)
          : keepList.includes(name) || !collides;

        labels.push({
          name,
          displayName,
          pt,
          keep,
          category,
          bbox,
          setContextId,
        });
      });

      sketch.pop();
    },
    drawLabels: () => {
      labels.forEach(({ setContextId, keep, name, displayName, pt }) => {
        sketch.push();
        contexts[setContextId]();
        if (keep) {
          sketch.text(displayName || name, pt[0], pt[1]);
        }
        sketch.pop();
      });
    },
    textBoxes: () => {
      return labels.filter(({ keep }) => keep);
    },
    labels: () => {
      return labels;
    },
    keepLists: () => {
      const keepLists = labels.reduce(
        (
          acc: Record<string, string[]>,
          {
            name,
            category,
            keep,
          }: { name: string; category: string; keep: boolean },
        ) => {
          if (!acc[category]) {
            acc[category] = [];
          }
          if (!keep) return acc;
          acc[category].push(name);
          return acc;
        },
        {} as Record<string, string[]>,
      );
      return keepLists;
    },
    collisions: {
      edgeList: () => {
        return collisions.map(([a, b]) => [
          { name: labels[a].name, keep: labels[a].keep },
          { name: labels[b].name, keep: labels[b].keep },
        ]);
      },
      object: () => {
        return collisions
          .map(([a, b]) => [labels[a].name, labels[b].name])
          .reduce(
            (acc, [a, b]) => {
              if (!acc[a]) {
                acc[a] = [];
              }
              if (!acc[b]) {
                acc[b] = [];
              }
              acc[a].push(b);
              acc[b].push(a);
              return acc;
            },
            {} as Record<string, string[]>,
          );
      },
    },
  };
};
