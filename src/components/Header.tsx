'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import {
  Logout,
  Brightness4,
  Brightness7,
  EmojiEvents,
} from '@mui/icons-material';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();

  // Don't show header if not logged in or on landing/login pages
  if (!user || pathname === '/landing' || pathname === '/login' || pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/landing');
  };

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <EmojiEvents sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Game Dashboard
        </Typography>

        <Button
          color="inherit"
          onClick={() => router.push('/dashboard')}
          sx={{ mr: 1 }}
        >
          Dashboard
        </Button>

        <Button
          color="inherit"
          onClick={() => router.push('/tournaments')}
          sx={{ mr: 1 }}
        >
          Tournaments
        </Button>

        <Button
          color="inherit"
          onClick={() => router.push('/players/compare')}
          sx={{ mr: 1 }}
        >
          Compare Players
        </Button>
        
        <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
          {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>

        <Typography variant="body2" sx={{ mr: 2 }}>
          {user?.playerName || user?.username}
        </Typography>

        <IconButton color="inherit" onClick={handleLogout}>
          <Logout />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}

