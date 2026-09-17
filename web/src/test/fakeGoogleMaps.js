/*
 * File:    fakeGoogleMaps.js
 * Module:  Unit tests
 * Owner:   Nimthara
 * Purpose: A tiny stand-in for the Google Maps libraries so the Google map
 *          components can be tested without loading Google's script.
 */

// Returns fake Map, AdvancedMarkerElement, PinElement and LatLngBounds classes
// plus lists of what was created.
export function createFakeGoogle() {
  const maps = []
  const markers = []

  // A map that remembers its options, listeners and view.
  class FakeMap {
    // Keeps the options and the start view.
    constructor(element, options) {
      this.element = element
      this.options = options
      this.listeners = {}
      this.center = options.center
      this.zoom = options.zoom
      maps.push(this)
    }

    // Remembers a map event handler (for example "click").
    addListener(name, handler) {
      this.listeners[name] = handler
    }

    // Moves the view.
    setCenter(center) {
      this.center = center
    }

    // Changes the zoom level.
    setZoom(zoom) {
      this.zoom = zoom
    }

    // Remembers the area the map was asked to show.
    fitBounds(bounds) {
      this.bounds = bounds
    }

    // The visible area; in these tests no point is inside it.
    getBounds() {
      return { contains: () => false }
    }

    // Moves the view to a point.
    panTo(position) {
      this.center = position
    }
  }

  // A marker; setting `map` to null takes it off the map.
  class FakeMarker {
    // Copies the marker options (map, position, title, content...).
    constructor(options) {
      Object.assign(this, options)
      this.listeners = {}
      markers.push(this)
    }

    // Remembers a marker event handler (for example "gmp-click").
    addEventListener(name, handler) {
      this.listeners[name] = handler
    }
  }

  // Like Google's PinElement, the pin is itself a DOM element.
  class FakePin {
    // Returns a span that carries the pin colour.
    constructor(options) {
      const element = document.createElement('span')
      element.dataset.colour = options.background
      return element
    }
  }

  // Collects the points a map should fit.
  class FakeBounds {
    // Starts with no points.
    constructor() {
      this.points = []
    }

    // Adds one point.
    extend(point) {
      this.points.push(point)
    }
  }

  return {
    libraries: { Map: FakeMap, AdvancedMarkerElement: FakeMarker, PinElement: FakePin, LatLngBounds: FakeBounds },
    maps,
    markers,
    // Markers that are still shown on a map.
    visibleMarkers: () => markers.filter((marker) => marker.map),
  }
}

// A Google-style LatLng object.
export function latLng(lat, lng) {
  return { lat: () => lat, lng: () => lng }
}
