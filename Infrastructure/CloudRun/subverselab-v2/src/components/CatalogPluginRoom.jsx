import React from 'react';
import { useParams } from 'react-router-dom';
import PluginRoom from './PluginRoom';
import NotFound from './NotFound';
import { ROOM_PLUGINS } from '../data/plugins';
import { useCatalog, catalogPlugins, publisherOf, livePlugin } from '../catalog/catalog';
import { useRoomEdit } from '../liveEdit/liveEdit';

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

// A room from src/data/plugins.js with its live catalogue item laid over it (texts, pictures, videos filled in from /admin,
// owner 2 Nov 2026: "bunlar da panelden eklenebilir olmalı"). Until the catalogue answers it is the code's own room, which
// is also what the prerendered HTML carries.
export function LivePluginRoom({ plugin }) {
  const cat = useCatalog();
  const shown = livePlugin(plugin, cat.plugins);
  // An admin edits the room in place (src/liveEdit/liveEdit.jsx); for everyone else `edit` is null and `p` is `shown`.
  const { plugin: p, edit } = useRoomEdit(plugin, shown);
  const by = p !== plugin ? publisherOf(cat, p.publisher) : null;
  return <PluginRoom plugin={by ? { ...p, publisherName: by.name, publisherLink: by.link } : p} edit={edit} />;
}
