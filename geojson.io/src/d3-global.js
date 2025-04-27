// import * as d3 from 'd3';
const d3 = window.d3;
if (!d3) {
  throw new Error(
    'd3 is not loaded. Make sure to include d3.min.js before this script.'
  );
}
const d3Compat = {
  ...d3,
  rebind: function (target, source, ...names) {
    names.forEach((name) => {
      target[name] = function () {
        const value = source[name].apply(source, arguments);
        return value === source ? target : value;
      };
    });
    return target;
  },
  dispatch: function (...names) {
    // Create a dispatch with the given event names
    const dispatch = d3.dispatch(...names);

    // Add v3-style event calling
    names.forEach((name) => {
      dispatch[name] = function (data) {
        return dispatch.call(name, null, data);
      };
    });
    // Add v3-style on method if it doesn't exist
    if (!dispatch.on) {
      dispatch.on = function (type, callback) {
        if (callback == null) return dispatch.on(type);
        dispatch.on(type, callback);
        return dispatch;
      };
    }

    return dispatch;
  },
  select: d3.select,
  get event() {
    return window.event || d3.selection.event;
  },
  set event(e) {
    d3.selection.event = e;
  },
  mouse: function (container) {
    const event = window.event;
    return [event.pageX, event.pageY];
  }
};

// Make it globally available
window.d3 = d3Compat;

export default d3;
