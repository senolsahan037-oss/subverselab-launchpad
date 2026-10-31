import React from 'react';
import { Link } from 'react-router-dom';
import { FREE_TOOLS } from '../data/tools';



export default function ToolsStrip() {
  return (
    <section className="plugin-section tools-strip">
      <h2>Browser tools for producers</h2>
      <p>More for your session, right in the browser: sketch an arrangement, write drums, check a mix, split stems. Free to start; some ask for a free account. Where a tool has a daily limit, the credits that come with any plugin purchase pay for more.</p>
      <ul className="tools-strip-list">
        {FREE_TOOLS.map(([slug, name, line]) => (
          <li key={slug}>
            <Link to={`/tools/${slug}`}><strong>{name}</strong></Link>
            <span> — {line}</span>
          </li>
        ))}
      </ul>
      <p><Link to="/tools">All tools</Link></p>
    </section>
  );
}
