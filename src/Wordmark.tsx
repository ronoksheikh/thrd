import Box from '@mui/material/Box';
import { brand } from './theme';

/** THREAD HOUSE wordmark — a stitched "needle line" under the name. */
export default function Wordmark({ size = 22, color = brand.main }: { size?: number; color?: string }) {
  return (
    <Box
      component="span"
      aria-label="THREAD HOUSE"
      sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, color, userSelect: 'none' }}
    >
      <Box component="span" sx={{ fontWeight: 700, fontSize: size, letterSpacing: '0.22em', mr: '-0.22em', fontFamily: 'inherit' }}>
        THREAD HOUSE
      </Box>
      <Box
        component="span"
        aria-hidden
        sx={{
          mt: `${size * 0.22}px`,
          width: '100%',
          height: 2,
          backgroundImage: `linear-gradient(90deg, ${color} 60%, transparent 0)`,
          backgroundSize: '9px 2px',
          opacity: 0.8,
        }}
      />
    </Box>
  );
}
