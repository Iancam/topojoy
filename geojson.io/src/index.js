// import d3 plus 3custom plugins
import './d3-global.js';
import './lib/d3-compat';
import './lib/d3-keybinding';
import './lib/d3-trigger';

// codemirror css
// import '../node_modules/codemirror/lib/codemirror.css';
// import '../node_modules/codemirror/addon/fold/foldgutter.css';

// fontawesome css
import '../node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '../node_modules/@fortawesome/fontawesome-free/css/solid.min.css';

// tailwind css
// import '../dist/css/tailwind_dist.css';
// import './css/tailwind_src.css';
// mapboxgl, mapboxgl-draw, mapbox-gl-geocoder css
import '../node_modules/mapbox-gl/dist/mapbox-gl.css';
import '../node_modules/@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import '../node_modules/@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

// import css
import './css/base.css';
import './css/marker.css';
import './css/theme.css';
import './css/site.css';

import { initWalkthrough } from './walkthrough.js';

import ui from './ui';
import map from './ui/map';
import data from './core/data';
import loader from './core/loader';
import router from './core/router';
import recovery from './core/recovery';
import repo from './core/repo';
import user from './core/user';
import api from './core/api';
import store from 'store';
import { Clerk } from '@clerk/clerk-js';

async function initClerk() {
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const clerk = new Clerk(clerkPubKey);
  await clerk.load();

  if (clerk.isSignedIn) {
    document.getElementById('header-right').innerHTML = `
    <div id="user-button"></div>
  `;

    const userButtonDiv = document.getElementById('user-button');

    clerk.mountUserButton(userButtonDiv);
  } else {
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const authModalOverlay = document.getElementById('authModalOverlay');
    const clerkAuthContainer = document.getElementById('clerk-auth-container');
    // const mapContainer = document.getElementsByClassName('geojsonio');
    // Function to show the modal
    const showModal = () => {
      authModalOverlay.classList.remove('hidden');
      // mapContainer[0].classList.add('hidden');
      // Render the sign-in component inside the modal
      clerk.mountSignIn(clerkAuthContainer);
    };

    // Function to hide the modal
    const hideModal = () => {
      authModalOverlay.classList.add('hidden');
      // Unmount the Clerk component to prevent memory leaks
      clerk.unmountSignIn(clerkAuthContainer);
    };

    // Event listeners for opening and closing the modal
    openModalBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);

    // Close modal when clicking outside of it
    authModalOverlay.addEventListener('click', (event) => {
      if (event.target === authModalOverlay) {
        hideModal();
      }
    });
  }
}

function geojsonIO() {
  const context = {};
  context.dispatch = d3.dispatch('change', 'route');
  context.storage = store;
  context.map = map(context);
  context.data = data(context);
  context.dispatch.on('route', loader(context));
  context.repo = repo(context);
  context.router = router(context);
  context.user = user(context);
  return context;
}

function init() {
  if (typeof window === 'undefined') return;

  window.mbxMetadata = {
    content_type: 'developer-tool'
  };

  if (typeof window.initializeMapboxAnalytics !== 'undefined') {
    window.initializeMapboxAnalytics({
      marketoMunchkin: false
    });
  }

  const gjIO = geojsonIO();
  const gjUI = ui(gjIO).write;

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      d3.select('.geojsonio').call(gjUI);
      gjIO.recovery = recovery(gjIO);
      gjIO.router.on();
      api(gjIO);
      initClerk();
    });
  } else {
    d3.select('.geojsonio').call(gjUI);
    gjIO.recovery = recovery(gjIO);
    gjIO.router.on();
    api(gjIO);
    initClerk();
  }
}

init();
initWalkthrough();
