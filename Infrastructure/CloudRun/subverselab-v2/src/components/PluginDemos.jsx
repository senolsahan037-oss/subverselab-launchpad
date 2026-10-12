import React from 'react';

/*  The "Hear it" block shared by PluginPage and FreePluginPage.
 *
 *  Renders nothing when the plugin has no demo with a YouTube id. A demo marked
 *  `vertical: true` (a Short) gets a 9:16 player; any other is 16:9.
 */
export default function PluginDemos({ plugin }) {
  const demos = (plugin.demos || []).filter((d) => d.youtube);
  if (demos.length === 0) return null;
  return (
    <section className="plugin-section">
      <h2>Hear it</h2>
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
      </div>
    </section>
  );
}
