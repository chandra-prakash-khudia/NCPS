import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Dialog, InputBase, List, ListItemButton, ListItemIcon, ListItemText,
  Stack, Typography, alpha, useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { onOpenCommandPalette } from '../utils/commandBus';
import { useColorMode } from '../theme/AppThemeProvider';
import { useAuth } from '../context/AuthContext';
import { fetchFeed } from '../services/api';
import { parseArticleContent } from '../utils/articleFormat';
import { getCredibilityColor } from '../utils/helpers';

const CommandPalette = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { toggleColorMode, mode } = useColorMode();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const cacheRef = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); setActive(0); }, []);

  const run = useCallback((fn) => { close(); setTimeout(fn, 0); }, [close]);

  const commands = useMemo(() => [
    { id: 'feed', label: 'Go to Feed', group: 'Navigate', Icon: HomeRoundedIcon, action: () => navigate('/') },
    { id: 'map', label: 'Open Map explorer', group: 'Navigate', Icon: MapRoundedIcon, action: () => navigate('/map') },
    { id: 'alerts', label: 'View Alerts', group: 'Navigate', Icon: NotificationsRoundedIcon, action: () => navigate('/alerts') },
    { id: 'leaderboard', label: 'Open Leaderboard', group: 'Navigate', Icon: LeaderboardRoundedIcon, action: () => navigate('/leaderboard') },
    { id: 'insights', label: 'Open Insights & analytics', group: 'Navigate', Icon: InsightsRoundedIcon, action: () => navigate('/insights') },
    { id: 'bookmarks', label: 'View Bookmarks', group: 'Navigate', Icon: BookmarkRoundedIcon, action: () => navigate('/bookmarks') },
    { id: 'profile', label: 'Open Profile', group: 'Navigate', Icon: PersonRoundedIcon, action: () => navigate('/profile') },
    { id: 'settings', label: 'Open Settings', group: 'Navigate', Icon: TuneRoundedIcon, action: () => navigate('/settings') },
    { id: 'observability', label: 'System observability', group: 'Navigate', Icon: MonitorHeartRoundedIcon, action: () => navigate('/observability') },
    { id: 'create', label: 'Report news', group: 'Actions', Icon: EditRoundedIcon, action: () => navigate('/create') },
    { id: 'theme', label: mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', group: 'Actions', Icon: mode === 'dark' ? LightModeRoundedIcon : DarkModeRoundedIcon, action: toggleColorMode },
    { id: 'logout', label: 'Sign out', group: 'Actions', Icon: LogoutRoundedIcon, action: async () => { await logout(); navigate('/login', { replace: true }); } },
  ], [navigate, toggleColorMode, mode, logout]);

  // Open via bus + ⌘K / Ctrl+K
  useEffect(() => {
    const unsub = onOpenCommandPalette(({ initialQuery }) => {
      setOpen(true);
      setQuery(initialQuery || '');
    });
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { unsub(); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  // Debounced report search over the global feed (cached for the session).
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!open || q.length < 2) { setResults([]); return undefined; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        if (!cacheRef.current) {
          const res = await fetchFeed({ mode: 'global', limit: 60 });
          cacheRef.current = res.data.posts || [];
        }
        const matches = cacheRef.current
          .filter((p) => (p.content || '').toLowerCase().includes(q))
          .slice(0, 6);
        if (!cancelled) setResults(matches);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, open]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Flatten into a single navigable list: commands first, then report results.
  const flat = useMemo(() => {
    const items = filteredCommands.map((c) => ({ type: 'command', ...c }));
    results.forEach((p) => items.push({ type: 'post', ...p }));
    return items;
  }, [filteredCommands, results]);

  useEffect(() => { setActive(0); }, [query, results.length]);

  const choose = (item) => {
    if (!item) return;
    if (item.type === 'command') run(item.action);
    else run(() => navigate(`/post/${item.post_id}`));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[active]); }
    else if (e.key === 'Escape') { close(); }
  };

  const renderCommandGroup = (groupName) => {
    const group = filteredCommands.filter((c) => c.group === groupName);
    if (!group.length) return null;
    return (
      <Box key={groupName}>
        <Typography variant="overline" sx={{ px: 2, color: 'text.disabled', fontSize: '0.62rem' }}>{groupName}</Typography>
        {group.map((c) => {
          const idx = filteredCommands.indexOf(c);
          const selected = idx === active;
          return (
            <ListItemButton
              key={c.id}
              selected={selected}
              onMouseEnter={() => setActive(idx)}
              onClick={() => choose({ type: 'command', ...c })}
              sx={{ mx: 1, borderRadius: '10px', bgcolor: selected ? 'var(--accent-soft)' : 'transparent' }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: selected ? 'primary.main' : 'text.secondary' }}>
                <c.Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={c.label} primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: '0.9rem' } }} />
            </ListItemButton>
          );
        })}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { position: 'fixed', top: { xs: 24, sm: 88 }, m: 0, width: 'min(620px, calc(100% - 24px))', overflow: 'hidden' } }}
      BackdropProps={{ sx: { backgroundColor: alpha('#05060a', 0.6), backdropFilter: 'blur(2px)' } }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
        <InputBase
          inputRef={inputRef}
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search reports or run a command…"
          sx={{ fontSize: '1rem', fontWeight: 500 }}
        />
        <Box component="kbd" sx={{ fontFamily: 'var(--mono)', fontSize: '0.66rem', px: 0.7, py: 0.2, borderRadius: '6px', border: `1px solid ${theme.palette.divider}`, color: 'text.secondary' }}>
          esc
        </Box>
      </Stack>

      <List sx={{ maxHeight: 420, overflowY: 'auto', py: 1 }} onKeyDown={onKeyDown}>
        {flat.length === 0 && (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searching ? 'Searching…' : 'No matches found.'}
            </Typography>
          </Box>
        )}

        {renderCommandGroup('Navigate')}
        {renderCommandGroup('Actions')}

        {results.length > 0 && (
          <Box>
            <Typography variant="overline" sx={{ px: 2, color: 'text.disabled', fontSize: '0.62rem' }}>Reports</Typography>
            {results.map((p, ri) => {
              const idx = filteredCommands.length + ri;
              const selected = idx === active;
              const { headline } = parseArticleContent(p.content);
              const cred = getCredibilityColor(p.credibility);
              return (
                <ListItemButton
                  key={p.post_id}
                  selected={selected}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => choose({ type: 'post', ...p })}
                  sx={{ mx: 1, borderRadius: '10px', bgcolor: selected ? 'var(--accent-soft)' : 'transparent' }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}><ArticleRoundedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText
                    primary={headline}
                    primaryTypographyProps={{ noWrap: true, sx: { fontWeight: 600, fontSize: '0.9rem' } }}
                  />
                  <Box sx={{ ml: 1, fontFamily: 'var(--mono)', fontSize: '0.74rem', fontWeight: 700, color: cred }}>
                    {Math.round(p.credibility * 100)}%
                  </Box>
                </ListItemButton>
              );
            })}
          </Box>
        )}
      </List>
    </Dialog>
  );
};

export default CommandPalette;
