import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar, Box, ButtonBase, Divider, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { useColorMode } from '../theme/AppThemeProvider';
import { useAuth } from '../context/AuthContext';
import { openCommandPalette } from '../utils/commandBus';
import { NCPS_FULL_NAME, NCPS_NAME } from '../constants/branding';

const SIDEBAR_WIDTH = 256;

const navGroups = [
  {
    items: [
      { label: 'Feed', path: '/', Icon: HomeRoundedIcon },
      { label: 'Map', path: '/map', Icon: MapRoundedIcon },
      { label: 'Alerts', path: '/alerts', Icon: NotificationsRoundedIcon },
    ],
  },
  {
    heading: 'Discover',
    items: [
      { label: 'Leaderboard', path: '/leaderboard', Icon: LeaderboardRoundedIcon },
      { label: 'Insights', path: '/insights', Icon: InsightsRoundedIcon },
      { label: 'Bookmarks', path: '/bookmarks', Icon: BookmarkRoundedIcon },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Profile', path: '/profile', Icon: PersonRoundedIcon },
      { label: 'Settings', path: '/settings', Icon: TuneRoundedIcon },
      { label: 'Observability', path: '/observability', Icon: MonitorHeartRoundedIcon },
    ],
  },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

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
    return user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setAccountAnchor(null);
  }, [location.pathname]);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  const handleLogout = async () => {
    setAccountAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const Brand = (
    <Stack
      component={Link}
      to="/"
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{ color: 'inherit', textDecoration: 'none', px: 0.5, py: 0.25 }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '11px',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          backgroundImage: `linear-gradient(150deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
          boxShadow: `0 4px 12px -4px ${alpha(theme.palette.primary.main, 0.6)}`,
        }}
      >
        <ShieldRoundedIcon sx={{ fontSize: 21 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', fontSize: '1.06rem' }}>
          {NCPS_NAME}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          title={NCPS_FULL_NAME}
          sx={{ lineHeight: 1.2, display: 'block', fontSize: '0.62rem' }}
        >
          {NCPS_FULL_NAME}
        </Typography>
      </Box>
    </Stack>
  );

  const SearchTrigger = (
    <ButtonBase
      onClick={() => openCommandPalette()}
      sx={{
        width: '100%',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.25,
        py: 1,
        borderRadius: '10px',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'var(--panel-muted)',
        color: 'text.secondary',
        transition: 'border-color 140ms ease, background-color 140ms ease',
        '&:hover': { borderColor: 'var(--border-strong)', bgcolor: 'var(--hover)' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <SearchRoundedIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>Search {NCPS_NAME}</Typography>
      </Stack>
      <Box
        component="kbd"
        sx={{
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          px: 0.6,
          py: 0.1,
          borderRadius: '6px',
          border: `1px solid ${theme.palette.divider}`,
          color: 'text.secondary',
          lineHeight: 1.4,
        }}
      >
        {isMac ? '⌘K' : 'Ctrl K'}
      </Box>
    </ButtonBase>
  );

  const navItemSx = (active) => ({
    minHeight: 40,
    mb: 0.25,
    px: 1.25,
    borderRadius: '10px',
    color: active ? 'text.primary' : 'text.secondary',
    position: 'relative',
    fontWeight: 600,
    bgcolor: active ? 'var(--accent-soft)' : 'transparent',
    '&:hover': { bgcolor: active ? 'var(--accent-soft)' : 'var(--hover)', color: 'text.primary' },
    '&::before': active ? {
      content: '""',
      position: 'absolute',
      left: -8,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 3,
      height: 18,
      borderRadius: 4,
      bgcolor: 'primary.main',
    } : {},
  });

  const NavList = (
    <List sx={{ px: 0.25, py: 0.5, flexGrow: 1, overflowY: 'auto' }}>
      <ListItemButton
        component={Link}
        to="/create"
        sx={{
          minHeight: 42,
          mb: 1,
          px: 1.5,
          borderRadius: '10px',
          color: '#fff',
          backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
          '&:hover': { backgroundImage: `linear-gradient(180deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})` },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}><EditRoundedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary="Report news" primaryTypographyProps={{ sx: { fontWeight: 700 } }} />
      </ListItemButton>

      {navGroups.map((group, gi) => (
        <Box key={group.heading || gi} sx={{ mb: 0.5 }}>
          {group.heading && (
            <Typography
              variant="overline"
              sx={{ color: 'text.disabled', px: 1.5, py: 0.5, display: 'block', fontSize: '0.64rem' }}
            >
              {group.heading}
            </Typography>
          )}
          {group.items.map(({ label, path, Icon }) => {
            const active = isActive(path);
            return (
              <ListItemButton key={path} component={Link} to={path} sx={navItemSx(active)}>
                <ListItemIcon sx={{ color: active ? 'primary.main' : 'inherit', minWidth: 32 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ sx: { fontWeight: active ? 700 : 600, fontSize: '0.9rem' } }} />
              </ListItemButton>
            );
          })}
        </Box>
      ))}
    </List>
  );

  const Account = (
    <ButtonBase
      onClick={(e) => setAccountAnchor(e.currentTarget)}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1,
        px: 1,
        py: 0.85,
        borderRadius: '12px',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': { bgcolor: 'var(--hover)' },
      }}
    >
      <Avatar sx={{ width: 32, height: 32, fontSize: '0.78rem', bgcolor: 'var(--accent-soft)', color: 'primary.main' }}>
        {initials}
      </Avatar>
      <Box sx={{ minWidth: 0, textAlign: 'left', flexGrow: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{user?.name || 'Account'}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
          {user?.email || 'member'}
        </Typography>
      </Box>
      <KeyboardArrowUpRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    </ButtonBase>
  );

  const sidebarBody = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ pt: 0.5 }}>{Brand}</Box>
      {SearchTrigger}
      {NavList}
      <Divider sx={{ mx: -1 }} />
      <Stack spacing={0.75} sx={{ pt: 0.5 }}>
        <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'} placement="top">
          <ListItemButton onClick={toggleColorMode} sx={{ borderRadius: '10px', px: 1.25, minHeight: 40, color: 'text.secondary', '&:hover': { bgcolor: 'var(--hover)', color: 'text.primary' } }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>
              {mode === 'dark' ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={mode === 'dark' ? 'Light mode' : 'Dark mode'} primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: '0.9rem' } }} />
          </ListItemButton>
        </Tooltip>
        {Account}
      </Stack>
    </Box>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          inset: '0 auto 0 0',
          width: SIDEBAR_WIDTH,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          zIndex: theme.zIndex.drawer,
          p: 1.5,
        }}
      >
        {sidebarBody}
      </Box>

      {/* Mobile top bar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 54,
          px: 1.5,
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.85),
          backdropFilter: 'saturate(180%) blur(12px)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <IconButton onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          <MenuRoundedIcon />
        </IconButton>
        {Brand}
        <IconButton onClick={() => openCommandPalette()} aria-label="Search">
          <SearchRoundedIcon />
        </IconButton>
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: { xs: '84vw', sm: 300 }, maxWidth: 320, p: 1.5, bgcolor: 'background.paper' } }}
      >
        {sidebarBody}
      </Drawer>

      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        PaperProps={{ sx: { minWidth: 230, mt: -1 } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2">{user?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAccountAnchor(null); navigate('/profile'); }}>
          <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem onClick={() => { setAccountAnchor(null); navigate('/settings'); }}>
          <ListItemIcon><TuneRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default Navbar;
