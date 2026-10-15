import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../fonts.css';
import { theme } from '../theme';
import AdminApp from './AdminApp';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AdminApp />
  </ThemeProvider>,
);
