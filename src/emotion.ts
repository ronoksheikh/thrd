import createCache from '@emotion/cache';

// Same key on server + client so the prerendered styles are re-used on hydration.
export const createEmotionCache = () => createCache({ key: 'th' });
