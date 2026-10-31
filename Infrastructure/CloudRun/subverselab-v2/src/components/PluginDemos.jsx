import React from 'react';
import { HOW_TO_VIDEOS } from '../data/howToVideos';

/*  The "Hear it" block of every plugin room (PluginRoom.jsx).
 *
 *  Renders nothing when the plugin has no demo with a YouTube id. A demo marked
 *  `vertical: true` (a Short) gets a 9:16 player; any other is 16:9.
 */
export default function PluginDemos({ plugin }) {
  // The long how-to video(s) first, then the room's own short demos; an id listed in both is shown once.
  const howTo = HOW_TO_VIDEOS[plugin.slug] || [];
  const own = (plugin.demos || []).filter((d) => d.youtube && !howTo.some((h) => h.youtube === d.youtube));
  const demos = [...howTo, ...own];
  const videos = plugin.videos || [];
  if (demos.length === 0 && videos.length === 0) return null;
  return (
    <section className="plugin-section">
      <h2>{demos.length === 0 ? 'See it' : 'Hear it'}</h2>
      <div className="plugin-demos">
        {demos.map((d) => (
          <figure key={d.youtube} className={`plugin-demo${d.vertical ? ' plugin-demo-vertical' : ' plugin-demo-wide'}`}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${d.youtube}`}
                    title={`${plugin.name} \u2014 ${d.caption}`} loading="lazy"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin" />
            <figcaption>{d.caption}</figcaption>
          </figure>
        ))}
        {/* Own clips (RU-8 teasers): silent, muted loop, the first frame stands in until play. */}
        {videos.map((v) => (
          <figure key={v.src} className={`plugin-demo${v.vertical ? ' plugin-demo-vertical' : ' plugin-demo-wide'}`}>
            <video src={v.src} controls muted loop playsInline preload="metadata" aria-label={`${plugin.name}: ${v.caption}`} />
            <figcaption>{v.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
