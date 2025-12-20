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
  const getRealBoundingBox = (
    pt: [number, number],
    bbox: { x: number; y: number; w: number; h: number }
  ) => {
    let { x, y, w, h } = bbox;
    if (sketch._renderer._textBaseline === "center") {
      y = pt[1] - h / 2;
    }
    return { x, y, w, h };
  };

  const checkCollisions = (
    bbox: { x: number; y: number; w: number; h: number },
    name: string,
    aIndex: number
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
      drop: boolean
    ) => {
      if (!Array.isArray(givenLabels)) {
        givenLabels = Object.entries(givenLabels).map(
          ([name, { pt, displayName }]) => ({
            name,
            displayName,
            pt,
          })
        );
      }

      sketch.push();
      setContext();
      const setContextId = contexts.length;
      contexts.push(setContext);

      givenLabels.forEach(({ name, displayName, pt }) => {
        const bbox = getRealBoundingBox(
          pt,
          font.textBounds(displayName || name, pt[0], pt[1]) as {
            x: number;
            y: number;
            w: number;
            h: number;
          }
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
          }: { name: string; category: string; keep: boolean }
        ) => {
          if (!acc[category]) {
            acc[category] = [];
          }
          if (!keep) return acc;
          acc[category].push(name);
          return acc;
        },
        {} as Record<string, string[]>
      );
      return keepLists;
    },
    collisions: {
      edgelist: () => {
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
            {} as Record<number, number[]>
          );
      },
    },
  };
};
