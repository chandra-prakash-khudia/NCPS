import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Avatar, Box, Button, Container, Divider, Drawer, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack,
  Toolbar, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useColorMode } from '../theme/AppThemeProvider';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Home', path: '/', Icon: HomeOutlinedIcon },
  { label: 'Map', path: '/map', Icon: MapOutlinedIcon },
  { label: 'Alerts', path: '/alerts', Icon: NotificationsActiveOutlinedIcon },
  { label: 'Leaderboard', path: '/leaderboard', Icon: LeaderboardOutlinedIcon },
  { label: 'Insights', path: '/insights', Icon: AnalyticsOutlinedIcon },
  { label: 'Report News', path: '/create', Icon: PostAddOutlinedIcon },
  { label: 'Profile', path: '/profile', Icon: AccountCircleOutlinedIcon },
  { label: 'Settings', path: '/settings', Icon: TuneOutlinedIcon },
];

const Navbar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleColorMode, mode } = useColorMode();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);

  const initials = useMemo(() => {
    if (!user?.name) return 'NC';
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountAnchor(null);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    setAccountAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backdropFilter: 'blur(20px) saturate(130%)',
        background: mode === 'dark'
          ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.88)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
          : `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.86)} 0%, ${alpha(theme.palette.background.paper, 0.78)} 100%)`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: mode === 'dark'
          ? '0 12px 32px rgba(0,0,0,0.3)'
          : '0 10px 28px rgba(14,37,60,0.1)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 0, sm: 1 }, minHeight: { xs: 62, sm: 72 } }}>
          {/* Logo */}
          <Stack
            component={Link}
            to="/"
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ color: 'inherit', minWidth: 0, textDecoration: 'none' }}
          >
            <Avatar
              sx={{
                width: { xs: 36, sm: 42 },
                height: { xs: 36, sm: 42 },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <VerifiedUserOutlinedIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                NCPS
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: { xs: 'none', sm: 'block' } }}>
                Credibility & Propagation
              </Typography>
            </Box>
          </Stack>

          {/* Desktop Nav */}
          <Stack direction="row" spacing={0.7} sx={{ ml: 4, display: { xs: 'none', md: 'flex' } }}>
            {navItems.map(({ label, path, Icon }) => (
              <Button
                key={path}
                component={Link}
                to={path}
                color={isActive(path) ? 'primary' : 'inherit'}
                startIcon={<Icon fontSize="small" />}
                variant={isActive(path) ? 'contained' : 'text'}
                sx={{
                  borderRadius: 99,
                  px: 2,
                  minHeight: 38,
                  ...(isActive(path)
                    ? {
                        color: '#fff',
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      }
                    : {
                        color: 'text.secondary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: 'text.primary',
                        },
                      }),
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          {/* Account menu */}
          <Tooltip title="Account">
            <Button
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              endIcon={<KeyboardArrowDownRoundedIcon />}
              sx={{
                mr: 1,
                display: { xs: 'none', sm: 'inline-flex' },
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                color: 'text.primary',
                px: 1,
                py: 0.45,
                minHeight: 42,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    bgcolor: alpha(theme.palette.primary.main, 0.18),
                    color: 'primary.main',
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ textAlign: 'left', display: { sm: 'none', lg: 'block' } }}>
                  <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1, fontWeight: 800 }}>
                    {user?.name || 'Account'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
                    {user?.role || 'member'}
                  </Typography>
                </Box>
              </Stack>
            </Button>
          </Tooltip>

          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 260,
                border: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2">{user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                navigate('/profile');
              }}
            >
              <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Profile" />
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Sign out" />
            </MenuItem>
          </Menu>

          {/* Theme toggle */}
          <IconButton
            onClick={toggleColorMode}
            sx={{
              mr: 1,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>

          {/* Mobile menu button */}
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
            aria-label="Open navigation"
          >
            <MenuRoundedIcon />
          </IconButton>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '80vw', sm: 280 },
            maxWidth: 320,
            p: 1.2,
            bgcolor: alpha(theme.palette.background.paper, 0.96),
            backdropFilter: 'blur(16px) saturate(130%)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Avatar
              sx={{
                width: 38,
                height: 38,
                fontSize: '0.8rem',
                fontWeight: 800,
                bgcolor: alpha(theme.palette.primary.main, 0.18),
                color: 'primary.main',
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{user?.name || 'NCPS'}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{user?.email || 'Navigation'}</Typography>
            </Box>
          </Stack>
        </Box>
        <Divider sx={{ mb: 1 }} />
        <List>
          {navItems.map(({ label, path, Icon }) => (
            <ListItemButton key={path} component={Link} to={path} selected={isActive(path)}>
              <ListItemIcon><Icon fontSize="small" /></ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ mt: 1, mb: 1 }} />
        <List>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Sign out" />
          </ListItemButton>
        </List>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
