'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
} from '@mui/material';
import {
  Logout,
  Brightness4,
  Brightness7,
  EmojiEvents,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't show header if not logged in or on landing/login pages
  if (!user || pathname === '/landing' || pathname === '/login' || pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/landing');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Tournaments', icon: <EmojiEvents />, path: '/tournaments' },
    { text: 'Compare Players', icon: <CompareIcon />, path: '/players/compare' },
  ];

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ width: 250 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEvents color="primary" />
        <Typography variant="h6">Menu</Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => router.push(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={toggleTheme}>
            <ListItemIcon>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </ListItemIcon>
            <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {user?.playerName || user?.username}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          {/* Mobile Menu Icon */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <EmojiEvents sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Game Dashboard
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
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
              Compare
            </Button>
            
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>

            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', md: 'block' } }}>
              {user?.playerName || user?.username}
            </Typography>

            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}
  );
}

