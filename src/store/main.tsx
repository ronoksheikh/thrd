import { hydrateRoot, createRoot } from 'react-dom/client';
import '../fonts.css';
import { createEmotionCache } from '../emotion';
import Root from './Root';

const el = document.getElementById('root')!;
const app = <Root cache={createEmotionCache()} />;
// The homepage HTML is prerendered at build time → hydrate it (instant first paint).
if (el.hasChildNodes()) hydrateRoot(el, app);
else createRoot(el).render(app);
