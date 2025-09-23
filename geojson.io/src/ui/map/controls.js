import mapboxgl from 'mapbox-gl';
class EditControl {
  onAdd(map) {
    this.map = map;
    this._container = document.createElement('div');
    this._container.className =
      'mapboxgl-ctrl-group mapboxgl-ctrl edit-control hidden';

    this._container.innerHTML = `
            <button class="mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_edit" title="Edit geometries" style="background-image: url(/img/edit.svg); background-size: 13px 13px;">
              
            </button>
          `;

    return this._container;
  }
}
class SaveCancelControl {
  onAdd(map) {
    this.map = map;
    this._container = document.createElement('div');
    this._container.className =
      'save-cancel-control bg-white rounded pt-1 pb-2 px-2 mt-2 mr-2 float-right clear-both pointer-events-auto';
    this._container.style = 'display: none;';
    this._container.innerHTML = `
            <div class='font-bold mb-0.5'>Editing Geometries</div>
              <div class="flex">
                <button class='mapboxgl-draw-actions-btn mapboxgl-draw-actions-btn_save txt-xs bg-gray-500 hover:bg-gray-700 text-white font-bold py-0 px-2 rounded' title="Save changes.">
                  Save
                </button>
                <button class='mapboxgl-draw-actions-btn mapboxgl-draw-actions-btn_cancel ml-1 txt-xs bg-gray-500 hover:bg-gray-700 text-white font-bold py-0 px-2 rounded' title="Cancel editing, discards all changes.">
                  Cancel
                </button>
              </div>
          `;

    return this._container;
  }
}
class TrashControl {
  onAdd(map) {
    this.map = map;
    this._container = document.createElement('div');
    this._container.className =
      'mapboxgl-ctrl-group mapboxgl-ctrl trash-control';
    this._container.style = 'display: none;';
    this._container.innerHTML = `
        <button class="mapbox-gl-draw_ctrl-draw-btn mapbox-gl-draw_trash" title="Delete">
        </button>
      `;

    return this._container;
  }
}

class NominatimSearchControl {
  constructor(options = {}) {
    this.limit = options.limit || 5;
    this.placeholder = options.placeholder || 'Search places…';
    this.endpoint =
      options.endpoint || 'https://nominatim.openstreetmap.org/search';
    this.format = options.format || 'geojson';
    this._marker = null;
    this._debounceMs = options.debounceMs || 250;
  }

  onAdd(map) {
    this.map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl nominatim-search-ctrl';
    this._container.style.pointerEvents = 'auto';

    // UI
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = this.placeholder;
    input.className =
      'bg-white text-sm rounded px-2 py-1 shadow border border-gray-300 w-64';

    const results = document.createElement('div');
    results.className =
      'absolute z-10 mt-1 max-h-64 overflow-auto w-full bg-white border border-gray-200 rounded shadow hidden';

    wrapper.appendChild(input);
    wrapper.appendChild(results);
    this._container.appendChild(wrapper);

    // Handlers
    const debounced = this._debounce(async (q) => {
      if (!q || q.trim().length < 2) {
        results.innerHTML = '';
        results.classList.add('hidden');
        return;
      }
      const url = new URL(this.endpoint);
      url.searchParams.set('q', q);
      url.searchParams.set('format', this.format);
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(this.limit));
      url.searchParams.set('polygon_geojson', '0');
      url.searchParams.set('accept-language', 'en');

      try {
        const resp = await fetch(url.toString(), {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TopoJoy/1.0 (dev)'
          }
        });
        if (!resp.ok) throw new Error('Geocode failed');
        const data = await resp.json();
        const feats = data.features || [];
        results.innerHTML = '';
        if (!feats.length) {
          results.classList.add('hidden');
          return;
        }
        feats.forEach((f) => {
          const label =
            f.properties?.display_name || f.properties?.name || 'Result';
          const item = document.createElement('div');
          item.className = 'px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer';
          item.textContent = label;
          item.addEventListener('click', () => this._goToFeature(f));
          results.appendChild(item);
        });
        results.classList.remove('hidden');
      } catch (e) {
        console.error('Nominatim search failed', e);
        results.innerHTML = '';
        results.classList.add('hidden');
      }
    }, this._debounceMs);

    input.addEventListener('input', (e) => debounced(e.target.value));

    // Hide on outside click
    document.addEventListener('click', (e) => {
      if (!this._container.contains(e.target)) {
        results.classList.add('hidden');
      }
    });

    return this._container;
  }

  onRemove() {
    if (this._marker) {
      this._marker.remove();
      this._marker = null;
    }
    this._container.parentNode.removeChild(this._container);
    this.map = undefined;
  }

  _goToFeature(f) {
    try {
      const geom = f.geometry;
      const props = f.properties || {};
      // Center
      let center;
      if (geom.type === 'Point') {
        center = geom.coordinates;
      } else if (f.bbox && f.bbox.length === 4) {
        // bbox: [minX, minY, maxX, maxY]
        center = [(f.bbox[0] + f.bbox[2]) / 2, (f.bbox[1] + f.bbox[3]) / 2];
      }

      if (f.bbox && f.bbox.length === 4) {
        this.map.fitBounds(
          [
            [f.bbox[0], f.bbox[1]],
            [f.bbox[2], f.bbox[3]]
          ],
          {
            padding: 40,
            duration: 800
          }
        );
      } else if (center) {
        this.map.flyTo({
          center,
          zoom: Math.max(12, this.map.getZoom()),
          essential: true
        });
      }

      // Drop/update a simple marker
      if (center) {
        if (!this._marker) {
          this._marker = new mapboxgl.Marker({ color: '#ef4444' });
        }
        this._marker.setLngLat(center).addTo(this.map);
      }
    } catch (e) {
      console.error('Failed to go to feature', e);
    }
  }

  _debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
}

export { EditControl, SaveCancelControl, TrashControl, NominatimSearchControl };
