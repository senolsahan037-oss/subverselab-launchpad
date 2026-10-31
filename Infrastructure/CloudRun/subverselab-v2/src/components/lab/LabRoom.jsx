import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

/*  /lab/<slug> was the review address for the "Hear it first" rooms (15 Oct 2026). They now live in the rooms
 *  themselves (PluginRoom + src/data/listen.js), so an old /lab link goes to the room. */
export default function LabRoom() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/plugins/${slug}` : '/plugins'} replace />;
}
