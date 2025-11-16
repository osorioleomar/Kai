'use client';

import { useEffect } from 'react';

export default function PWAMetaTags() {
  useEffect(() => {
    // Add iOS-specific meta tags dynamically
    const addMetaTag = (name: string, content: string) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    const addLinkTag = (rel: string, href: string) => {
      if (!document.querySelector(`link[rel="${rel}"]`)) {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
      }
    };

    addLinkTag('apple-touch-icon', '/apple-touch-icon.png');
    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', 'Kai');
    addMetaTag('mobile-web-app-capable', 'yes');
  }, []);

  return null;
}

