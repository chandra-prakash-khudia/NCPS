import { useEffect } from 'react';

/**
 * SEOHead — dynamically sets document title and Open Graph meta tags.
 * Usage: <SEOHead title="..." description="..." />
 */
export default function SEOHead({ title, description, url }) {
  useEffect(() => {
    const fullTitle = title ? `${title} | NCPS` : 'NCPS — News Credibility And Propagation System';
    document.title = fullTitle;

    const setMeta = (property, content, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('description', description, true);
      setMeta('og:description', description);
      setMeta('twitter:description', description, true);
    }
    if (title) {
      setMeta('og:title', fullTitle);
      setMeta('twitter:title', fullTitle, true);
    }
    if (url) {
      setMeta('og:url', url);
    }

    return () => {
      // Restore default title on unmount
      document.title = 'NCPS — News Credibility And Propagation System';
    };
  }, [title, description, url]);

  return null;
}
