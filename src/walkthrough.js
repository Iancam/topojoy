import { useEffect, useRef, useCallback, useMemo } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";

// type UseShepherdTourOpts = Partial<Shepherd.Tour.TourOptions> & {
//   /** Called after tour is fully built (so you can add extra steps). */
//   onCreate?: (tour: Shepherd.Tour) => void;
// };

export const TourMap = () => {
  const tourObject = useMemo(() => {
    const tour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: "shepherd-theme-dark",
        scrollTo: { behavior: "smooth", block: "center" },
      },
    });

    tour.addStep({
      id: "select-color-scheme",
      title: "Select a color scheme",
      text: "Select a color scheme from the dropdown.",
      attachTo: {
        element: "#config-select",
        on: "bottom",
      },
      buttons: [{ text: "Next", action: tour.next }],
    });
    tour.addStep({
      id: "adjust-details",
      title: "Adjust details",
      text: "Read the tooltips to learn more about each setting.",
      attachTo: {
        element: ".tooltip",
        on: "top",
      },
      buttons: [{ text: "Next", action: tour.next }],
    });
    return tour;
  }, []);

  return tourObject;
};
