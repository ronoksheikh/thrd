import { createTheme } from '@mui/material/styles';
import { pink, grey } from '@mui/material/colors';

// Brand colour = MUI's default pink palette (the rose/red tone from our ads).
export const brand = { main: pink[600], light: pink[50], dark: pink[800] };

export const theme = createTheme({
  palette: {
    primary: { main: pink[600], light: pink[400], dark: pink[800], contrastText: '#fff' },
    background: { default: grey[50], paper: '#fff' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Anek Bangla", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeightMedium: 700,
    button: { fontWeight: 700, textTransform: 'none', fontSize: '1.05rem' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { fullWidth: true } },
  },
});
