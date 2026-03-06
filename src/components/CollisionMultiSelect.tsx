import React from "react";
import { useConfigForm } from "./configFormContext";

const collisionFoundFactory =
  (form: any, collisions: Record<string, string[]>) => (feature: string) => {
    // get master keeplist
    const keepMap = [
      form["river.keepList"],
      form["trail.keepList"],
      form["mountain.keepList"],
      form["lake.keepList"],
    ]
      .flat()
      .reduce((acc, val) => {
        acc[val] = true;
        return acc;
      }, {});
    const collidesWith = collisions[feature] || [];
    let collisionsFound: string[] = [feature];
    for (const feature of collidesWith) {
      if (keepMap[feature]) {
        collisionsFound.push(feature);
      }
    }

    return collisionsFound;
  };

export const CollisionMultiSelect =
  (id: string) =>
  ({
    form,
    onFormChange,
  }: {
    form: any;
    onFormChange: (key: string, value: any) => void;
  }) => {
    const { features, collisions, renderFormElement } = useConfigForm();
    const collisionFound = collisionFoundFactory(form, collisions);
    const options = (features[id.split(".")[0]] || []).map(
      (feature: string) => {
        const collides = collisionFound(feature);
        return {
          style:
            collides.length > 1
              ? {
                  badgeColor: "red",
                }
              : undefined,
          value: feature,
          label: feature,
        };
      },
    );
    return renderFormElement({
      form,
      onFormChange,
      id,
      elementType: "list",
      description: "Features that will be shown on the map",
      label: `${id.split(".")[0].charAt(0).toUpperCase() + id.split(".")[0].slice(1)} Keep List`,
      props: {
        options,
      },
    });
  };
