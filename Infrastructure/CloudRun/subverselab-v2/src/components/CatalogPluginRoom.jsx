import React from 'react';
import { useParams } from 'react-router-dom';
import PluginRoom from './PluginRoom';
import NotFound from './NotFound';
import { ROOM_PLUGINS } from '../data/plugins';
import { useCatalog, catalogPlugins, publisherOf } from '../catalog/catalog';

// /plugins/<slug> for a plug-in that exists only in the live catalogue (added from /admin, src/catalog/catalog.js). The
// static rooms are routed before this one, so a hand-written room always wins for its own slug. Nothing is drawn until
// the catalogue has answered, so a real slug never flashes the 404 page.
const KNOWN = ROOM_PLUGINS.map((p) => p.slug);
export default function CatalogPluginRoom() {
  const { slug } = useParams();
  const cat = useCatalog();
  const plugin = catalogPlugins(cat.plugins, KNOWN).find((p) => p.slug === slug);
  if (plugin) { const by = publisherOf(cat, plugin.publisher); return <PluginRoom key={slug} plugin={by ? { ...plugin, publisherName: by.name, publisherLink: by.link } : plugin} />; }
  return cat.loaded ? <NotFound /> : null;
}
