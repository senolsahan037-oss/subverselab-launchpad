import React from 'react';
import PageMeta from './PageMeta';
import HomeIntro from './HomeIntro';
import NewsFeed from './NewsFeed';
import { HOME } from '../data/siteMeta';

// "/" is the news since 2026-10-26 (owner): the SubverseLab logo leads here, the news is read by scrolling down, and the
// browser tools live on /tools (Storefront) under the Tools tab.
export default function HomePage() {
  return (
    <div>
      <PageMeta title={HOME.title} description={HOME.description} path={HOME.path} />
      <HomeIntro />
      <NewsFeed />
    </div>
  );
}
