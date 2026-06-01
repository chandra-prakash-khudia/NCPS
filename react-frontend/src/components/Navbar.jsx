import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Stack, Tooltip, Typography, alpha, useTheme,
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

const SIDEBAR_WIDTH = 248;
const COMPACT_SIDEBAR_WIDTH = 84;

const navItems = [
  { label: 'Home', path: '/', Icon: HomeOutlinedIcon },
  { label: 'Map', path: '/map', Icon: MapOutlinedIcon },
  { label: 'Alerts', path: '/alerts', Icon: NotificationsActiveOutlinedIcon },
  { label: 'Leaderboard', path: '/leaderboard', Icon: LeaderboardOutlinedIcon },
  { label: 'Insights', path: '/insights', Icon: AnalyticsOutlinedIcon },
  { label: 'Report', path: '/create', Icon: PostAddOutlinedIcon },
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
  const [desktopCompact, setDesktopCompact] = useState(false);
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
    const width = desktopCompact ? COMPACT_SIDEBAR_WIDTH : SIDEBAR_WIDTH;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
    return () => {
      document.documentElement.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`);
    };
  }, [desktopCompact, mode]);

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

  const openProfile = () => {
    setAccountAnchor(null);
    navigate('/profile');
  };

  const navButtonSx = (active, compact = false) => ({
    minHeight: 42,
    mb: 0.35,
    px: compact ? 0 : 1.25,
    justifyContent: compact ? 'center' : 'flex-start',
    borderRadius: 2,
    color: active ? 'text.primary' : 'text.secondary',
    border: '1px solid transparent',
    bgcolor: active ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
    '&:hover': {
      bgcolor: active
        ? alpha(theme.palette.primary.main, 0.18)
        : alpha(theme.palette.text.primary, 0.08),
      color: 'text.primary',
    },
    '&.Mui-selected': {
      bgcolor: alpha(theme.palette.primary.main, 0.14),
      borderColor: alpha(theme.palette.primary.main, 0.24),
      '&:hover': {
        bgcolor: alpha(theme.palette.primary.main, 0.18),
      },
    },
  });

  const renderNavItems = (compact = false) => (
    <List sx={{ px: compact ? 0 : 0.25, py: 1 }}>
      {navItems.map(({ label, path, Icon }) => {
        const active = isActive(path);
        const item = (
          <ListItemButton
            key={path}
            component={Link}
            to={path}
            selected={active}
            sx={navButtonSx(active, compact)}
          >
            <ListItemIcon
              sx={{
                color: 'inherit',
                minWidth: compact ? 0 : 34,
                justifyContent: 'center',
              }}
            >
              <Icon fontSize="small" />
            </ListItemIcon>
            {!compact && <ListItemText primary={label} primaryTypographyProps={{ sx: { fontWeight: active ? 800 : 650 } }} />}
          </ListItemButton>
        );

        return compact ? (
          <Tooltip key={path} title={label} placement="right">
            {item}
          </Tooltip>
        ) : item;
      })}
    </List>
  );

  const renderSidebarContent = (compact = false, drawer = false) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={compact ? 0 : 1}
        sx={{ px: compact ? 0 : 0.5, py: 0.5, mb: 1, minHeight: 48 }}
      >
        <Tooltip title={drawer ? 'Close menu' : compact ? 'Expand navigation' : 'Collapse navigation'}>
          <IconButton
            onClick={() => (drawer ? setMobileOpen(false) : setDesktopCompact((prev) => !prev))}
            aria-label={drawer ? 'Close navigation' : compact ? 'Expand navigation' : 'Collapse navigation'}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.text.primary, 0.04),
              color: 'text.primary',
              '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Tooltip>

        {!compact && (
          <Stack
            component={Link}
            to="/"
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ color: 'inherit', minWidth: 0, textDecoration: 'none' }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: alpha(theme.palette.primary.main, 0.18),
                color: 'primary.main',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.26)}`,
              }}
            >
              <VerifiedUserOutlinedIcon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                NCPS
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, display: 'block' }}>
                Credibility feed
              </Typography>
            </Box>
          </Stack>
        )}
      </Stack>

      <Divider />
      {renderNavItems(compact)}
      <Box sx={{ flexGrow: 1 }} />
      <Divider />

      <Stack spacing={0.5} sx={{ py: 1, px: compact ? 0 : 0.25 }}>
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} placement={compact ? 'right' : 'top'}>
          <ListItemButton onClick={toggleColorMode} sx={navButtonSx(false, compact)}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: compact ? 0 : 34, justifyContent: 'center' }}>
              {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </ListItemIcon>
            {!compact && <ListItemText primary={mode === 'dark' ? 'Light mode' : 'Dark mode'} />}
          </ListItemButton>
        </Tooltip>

        <Tooltip title="Account" placement={compact ? 'right' : 'top'}>
          <ListItemButton
            onClick={(event) => setAccountAnchor(event.currentTarget)}
            sx={navButtonSx(false, compact)}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: compact ? 0 : 34, justifyContent: 'center' }}>
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
            </ListItemIcon>
            {!compact && (
              <>
                <ListItemText
                  primary={user?.name || 'Account'}
                  secondary={user?.role || 'member'}
                  primaryTypographyProps={{ noWrap: true, sx: { fontWeight: 800 } }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              </>
            )}
          </ListItemButton>
        </Tooltip>
      </Stack>
    </Box>
  );

  return (
    <>
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          inset: '0 auto 0 0',
          width: desktopCompact ? COMPACT_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          zIndex: theme.zIndex.drawer,
          p: 1,
        }}
      >
        {renderSidebarContent(desktopCompact)}
      </Box>

      <Box
        sx={{
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: theme.zIndex.drawer + 2,
          display: { xs: 'block', md: 'none' },
        }}
      >
        <IconButton
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            color: 'text.primary',
            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
          }}
        >
          <MenuRoundedIcon />
        </IconButton>
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '82vw', sm: 290 },
            maxWidth: 320,
            p: 1,
            bgcolor: 'background.paper',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {renderSidebarContent(false, true)}
      </Drawer>

      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        PaperProps={{
          sx: {
            ml: 1,
            minWidth: 240,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2">{user?.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={openProfile}>
          <ListItemIcon><AccountCircleOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Profile" />
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
