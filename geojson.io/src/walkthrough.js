import Shepherd from 'shepherd.js';

export function initWalkthrough() {
  const tour = new Shepherd.Tour({
    defaultStepOptions: {
      cancelIcon: {
        enabled: true
      },
      classes: 'shepherd-theme-dark'
    }
  });

  tour.addStep({
    id: 'search-bar',
    title: 'Search for a location',
    text: 'Enter a location to search for',
    attachTo: {
      element: '.mapboxgl-ctrl-geocoder--input',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: tour.next }]
  });

  tour.addStep({
    id: 'draw-button',
    title: 'Draw a rectangle',
    text: 'Click the rectangle button to start drawing. Click and release, not click and drag.',
    attachTo: {
      element: '.mapbox-gl-draw_ctrl-draw-btn.mapbox-gl-draw_rectangle',
      on: 'bottom'
    },
    buttons: [{ text: 'Next', action: tour.next }]
  });

  tour.addStep({
    id: 'final-step',
    text: "click here when you've completed your selection",
    attachTo: {
      element: '.link-to-app',
      on: 'bottom'
    },
    buttons: [{ text: 'Finish', action: tour.complete }]
  });

  tour.start();
}
