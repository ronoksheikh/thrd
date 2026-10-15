import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { IMAGES, IMAGE_SIZE } from '../shared/product';

export type GalleryHandle = { showColor: (colorId: string) => void };

/** Swipeable, scroll-snap gallery (no JS carousel library = fast). */
const Gallery = forwardRef<GalleryHandle>(function Gallery(_, ref) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  useImperativeHandle(ref, () => ({
    showColor: (colorId) => {
      const i = IMAGES.findIndex((img) => img.color === colorId);
      if (i >= 0) go(i);
    },
  }));

  return (
    <Box>
      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', bgcolor: '#f6f6f4' }}>
        <Box
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {IMAGES.map((img, i) => (
            <Box
              key={img.src}
              component="img"
              src={img.src}
              alt={img.alt}
              width={IMAGE_SIZE.width}
              height={IMAGE_SIZE.height}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
              sx={{ flex: '0 0 100%', width: '100%', height: 'auto', aspectRatio: `${IMAGE_SIZE.width} / ${IMAGE_SIZE.height}`, objectFit: 'cover', scrollSnapAlign: 'start' }}
            />
          ))}
        </Box>
        <Box sx={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.75 }}>
          {IMAGES.map((img, i) => (
            <Box
              key={img.src}
              sx={{
                width: i === active ? 18 : 7,
                height: 7,
                borderRadius: 4,
                bgcolor: i === active ? 'primary.main' : 'rgba(0,0,0,.25)',
                transition: 'all .25s',
              }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${IMAGES.length}, 1fr)`, gap: 1, mt: 1 }}>
        {IMAGES.map((img, i) => (
          <ButtonBase
            key={img.src}
            onClick={() => go(i)}
            aria-label={img.alt}
            sx={{
              aspectRatio: `${IMAGE_SIZE.width} / ${IMAGE_SIZE.height}`,
              borderRadius: 2,
              overflow: 'hidden',
              border: 2,
              borderColor: i === active ? 'primary.main' : 'transparent',
              bgcolor: '#f6f6f4',
              transition: 'border-color .2s',
            }}
          >
            <img src={img.thumb} alt="" width={64} height={77} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </ButtonBase>
        ))}
      </Box>
    </Box>
  );
});

export default Gallery;
