import bbox from '@turf/bbox';

export default function (map, feature) {
  if (feature.geometry.type === 'Point') {
    map.flyTo({
      center: feature.geometry.coordinates
    });
  } else {
    const bounds = bbox(feature);
    map.fitBounds(bounds, { padding: 60 });
  }
}
