/*
 * File:    MapErrorBoundary.jsx
 * Module:  Maps
 * Owner:   Nimthara
 * Purpose: Keeps a Google Maps failure inside the map. If the Google map code
 *          throws, the map is replaced by OpenStreetMap instead of the whole
 *          page showing the error screen.
 * Source:  WEB-29 (React error boundaries).
 */
import { Component } from 'react'
import { fallBackToOpenStreetMap } from './mapProvider'

// Wraps a Google map; `fallback` is the OpenStreetMap version to show after an error.
export default class MapErrorBoundary extends Component {
  state = { failed: false }

  // Remembers that the map code failed.
  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Switches every map on the page to OpenStreetMap.
  componentDidCatch() {
    fallBackToOpenStreetMap('Google Maps stopped working, so OpenStreetMap is shown instead.')
  }

  // Shows the OpenStreetMap version once something went wrong.
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
