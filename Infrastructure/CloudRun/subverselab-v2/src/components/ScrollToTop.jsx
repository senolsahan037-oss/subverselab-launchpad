import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*  A client-side route change kept the previous page's scroll position, so some pages opened in the middle or at the
 *  bottom (owner 2026-10-15). On every new page (link click or redirect) start at the top. Left alone:
 *    - a URL with a hash (#buy, #kubbe on /account, manual sections): those pages scroll to their anchor themselves;
 *    - Back / Forward (POP): the browser's own restoration. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useLayoutEffect(() => {
    if (hash || navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);
  return null;
}
