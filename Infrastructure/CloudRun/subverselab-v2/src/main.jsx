import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// scripts/prerender.js bakes real <title>/<meta>/<link rel=canonical> into
// every route's HTML so crawlers that never run JavaScript still get correct
// metadata. Once the app boots, those tags have done their job and must go.
//
// On React 19, react-helmet-async stops managing head tags itself and hands
// them to React's native hoisting, which renders <title>/<meta>/<link> from
// the component tree straight into <head>. React has no idea the prerendered
// tags exist, so it appends its own alongside them — leaving the page with two
// canonicals and two descriptions, the stale prerendered pair listed first.
//
// Removing them here, before the first render, means exactly one of each
// survives and it is always the one for the route actually being viewed.
// The prerendered tags are marked data-rh="true" specifically so this can
// find them without touching the favicon, stylesheet or theme-color tags.
for (const el of document.head.querySelectorAll('[data-rh="true"]')) {
  el.remove();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
