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
import '../dist/css/tailwind_dist.css';

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
    });
  } else {
    d3.select('.geojsonio').call(gjUI);
    gjIO.recovery = recovery(gjIO);
    gjIO.router.on();
    api(gjIO);
  }
}

init();
initWalkthrough();
