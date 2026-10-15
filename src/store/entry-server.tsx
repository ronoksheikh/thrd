import { renderToString } from 'react-dom/server';
import createEmotionServer from '@emotion/server/create-instance';
import { createEmotionCache } from '../emotion';
import Root from './Root';

/** Used only at build time by scripts/prerender.mjs. */
export function render() {
  const cache = createEmotionCache();
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);
  const html = renderToString(<Root cache={cache} />);
  const styles = constructStyleTagsFromChunks(extractCriticalToChunks(html));
  return { html, styles };
}
