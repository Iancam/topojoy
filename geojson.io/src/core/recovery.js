import qs from 'qs-hash';
import bbox from '@turf/bbox';
import { addTrails } from '../ui/draw/addTrails.js';
import store, { interfaceStates } from '../store.js';
import { LS } from '../../../src/lib/utils';
export default function (context) {
  d3.select(window).on('unload', onunload);
  context.dispatch.on('change', onchange);

  const query = qs.stringQs(location.hash.split('#')[1] || '');

  if (location.hash !== '#new' && !query.id && !query.data) {
    const rec = context.storage.get(LS.GEOJSON_BBOX);
    if (rec && confirm('recover your map from the last time you edited?')) {
      // context.data.set({
      //   ...rec,
      //   recovery: true
      // });
      const bounds = bbox(rec);
      context.map.fitBounds(bounds, {
        padding: 50,
        duration: 1000
      });
      context.map.on('load', () => {
        addTrails(rec, context.map, store);
      });
    } else {
      store.setBBox(null);
      store.setBBoxTrails([]);
    }
  }

  function onunload() {
    if (context.data.get('type') === 'local' && context.data.hasFeatures()) {
      try {
        context.storage.set('recover', context.data.all());
      } catch (e) {
        // QuotaStorageExceeded
      }
    } else {
      context.storage.remove('recover');
    }
  }

  function onchange() {
    if (context.data.get('type') !== 'local') {
      context.storage.remove('recover');
    }
  }
}
