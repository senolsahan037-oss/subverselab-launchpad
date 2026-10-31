import React from 'react';

// A walk through a product's panel, one cropped section per step (MIHENK, owner 15 Oct: an app this size is
// explained, not auditioned). Wide crops get the full row; narrow ones sit beside their text, alternating sides.
export default function PanelTour({ name, tour }) {
  return (
    <section className="panel-tour" aria-labelledby="panel-tour-heading">
      <div className="container panel-tour-inner">
        <h2 id="panel-tour-heading">{tour.heading}</h2>
        <p className="panel-tour-lead">{tour.lead}</p>

        <ol className="panel-tour-steps">
          {tour.steps.map((s, i) => {
            const wide = s.w / s.h > 2.2;
            return (
              <li key={s.key} className={`panel-tour-step ${wide ? 'is-wide' : ''} ${!wide && i % 2 ? 'is-flipped' : ''}`}>
                <figure className="panel-tour-figure">
                  <img src={s.img} width={s.w} height={s.h} loading="lazy" decoding="async"
                       alt={`${name} panel, ${s.heading.toLowerCase()}`} />
                </figure>
                <div className="panel-tour-text">
                  <span className="panel-tour-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.heading}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {tour.practical?.length > 0 && (
          <div className="panel-tour-practical">
            <h3>In practice</h3>
            <ul>{tour.practical.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}
