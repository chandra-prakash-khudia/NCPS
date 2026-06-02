import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Grid, InputAdornment, MenuItem, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import NewsCard from '../components/NewsCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { fetchFeed, updateLocation, getNotificationConfig, savePushSubscription } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { categoryOptions } from '../utils/helpers';

const radiusOptions = [1, 5, 10, 25, 50];
const sortOptions = [
  { value: 'recent', label: 'Most recent' },
  { value: 'credible', label: 'Most credible' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'discussed', label: 'Most discussed' },
];

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

const StatCard = ({ icon, label, value, accent }) => (
  <Box
    className="glass-surface"
    sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}
  >
    <Box sx={{ width: 40, height: 40, borderRadius: '11px', display: 'grid', placeItems: 'center', color: accent, bgcolor: alpha(accent, 0.14) }}>
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.64rem' }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 760, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  </Box>
);

const FeedSkeleton = () => (
  <Grid container spacing={2}>
    {Array.from({ length: 6 }).map((_, i) => (
      <Grid key={i} size={{ xs: 12, md: 6, xl: 4 }}>
        <Box className="glass-surface" sx={{ p: 2 }}>
          <Box className="skeleton" sx={{ height: 16, width: '40%', mb: 1.5 }} />
          <Box className="skeleton" sx={{ height: 22, width: '90%', mb: 1 }} />
          <Box className="skeleton" sx={{ height: 22, width: '70%', mb: 2 }} />
          <Box className="skeleton" sx={{ height: 6, width: '100%', mb: 2 }} />
          <Box className="skeleton" sx={{ height: 32, width: '60%' }} />
        </Box>
      </Grid>
    ))}
  </Grid>
);

const HomePage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('detecting');
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedMode, setFeedMode] = useState('local');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [notificationState, setNotificationState] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );

  const loadFeed = useCallback(async (lat, lon, overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (lat !== undefined && lat !== null) params.lat = lat;
      if (lon !== undefined && lon !== null) params.lon = lon;
      params.category = overrides.category || selectedCategory;
      params.mode = overrides.mode || feedMode;
      params.radius_m = (overrides.radius || selectedRadius) * 1000;
      params.limit = 50;
      const res = await fetchFeed(params);
      setPosts(res.data.posts || []);
    } catch {
      setError('Could not load the feed. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [feedMode, selectedCategory, selectedRadius]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      loadFeed();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus('detected');
        updateLocation({ lat: loc.lat, lon: loc.lon }).catch(() => {});
      },
      () => { setLocationStatus('denied'); loadFeed(); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadFeed]);

  useEffect(() => {
    loadFeed(userLocation?.lat, userLocation?.lon);
  }, [userLocation, loadFeed, selectedCategory, selectedRadius, feedMode]);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') { setNotificationState('unsupported'); return; }
    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    if (permission !== 'granted') return;
    try {
      const config = await getNotificationConfig();
      if (!config.data.vapid_public_key || !navigator.serviceWorker?.ready) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.data.vapid_public_key),
      });
      await savePushSubscription(subscription.toJSON());
    } catch { /* SSE alerts still work without Web Push */ }
  };

  const metrics = useMemo(() => {
    if (!posts.length) return { total: 0, avgCred: 0, highTrust: 0 };
    const avgCred = Math.round((posts.reduce((s, p) => s + (p.credibility || 0), 0) / posts.length) * 100);
    const highTrust = posts.filter((p) => p.credibility >= 0.75).length;
    return { total: posts.length, avgCred, highTrust };
  }, [posts]);

  const visiblePosts = useMemo(() => {
    let list = posts;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.content || '').toLowerCase().includes(q));
    const sorted = [...list];
    if (sort === 'credible') sorted.sort((a, b) => (b.credibility || 0) - (a.credibility || 0));
    else if (sort === 'nearest') sorted.sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity));
    else if (sort === 'discussed') sorted.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted;
  }, [posts, search, sort]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <Box className="rise-in">
      <PageHeader
        eyebrow={greeting + (user?.name ? `, ${user.name.split(' ')[0]}` : '')}
        title="Your credibility feed"
        subtitle="Community-verified local reports, ranked by credibility, proximity and urgency — not by engagement."
        actions={
          <Button component="a" href="/map" variant="outlined" startIcon={<MapRoundedIcon />} size="small">
            Map
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4 }}><StatCard icon={<ArticleRoundedIcon />} label="Reports" value={metrics.total} accent="#6366f1" /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><StatCard icon={<ShieldRoundedIcon />} label="Avg credibility" value={`${metrics.avgCred}%`} accent="#10b981" /></Grid>
        <Grid size={{ xs: 6, sm: 4 }}><StatCard icon={<TrendingUpRoundedIcon />} label="High trust" value={metrics.highTrust} accent="#f59e0b" /></Grid>
      </Grid>

      {/* Filter bar */}
      <Box
        className="glass-surface"
        sx={{ p: 1.5, mb: 2, position: 'sticky', top: { xs: 60, md: 8 }, zIndex: 5, backdropFilter: 'blur(8px)' }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={feedMode}
              onChange={(_, v) => v && setFeedMode(v)}
            >
              <ToggleButton value="local"><NearMeRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />Local</ToggleButton>
              <ToggleButton value="global"><PublicRoundedIcon sx={{ fontSize: 16, mr: 0.6 }} />Global</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter this feed…"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ maxWidth: { md: 320 } }}
            />

            <Box sx={{ flexGrow: 1 }} />

            <TextField select size="small" label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 150 }}>
              {sortOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            {feedMode === 'local' && (
              <TextField select size="small" label="Radius" value={selectedRadius} onChange={(e) => setSelectedRadius(e.target.value)} sx={{ minWidth: 110 }}>
                {radiusOptions.map((r) => <MenuItem key={r} value={r}>{r} km</MenuItem>)}
              </TextField>
            )}
          </Stack>

          {/* Category chips */}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ overflowX: 'auto', pb: 0.25 }}>
            {categoryOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                onClick={() => setSelectedCategory(item.value)}
                variant={selectedCategory === item.value ? 'filled' : 'outlined'}
                color={selectedCategory === item.value ? 'primary' : 'default'}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>

          {/* Status row */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              icon={<NearMeRoundedIcon />}
              size="small"
              variant="outlined"
              color={locationStatus === 'detected' ? 'success' : locationStatus === 'detecting' ? 'default' : 'warning'}
              label={
                locationStatus === 'detected'
                  ? `${userLocation?.lat?.toFixed(3)}, ${userLocation?.lon?.toFixed(3)}`
                  : locationStatus === 'detecting' ? 'Detecting location…' : 'Location unavailable'
              }
            />
            <Chip
              icon={<NotificationsActiveRoundedIcon />}
              size="small"
              variant="outlined"
              color={notificationState === 'granted' ? 'success' : 'default'}
              label={notificationState === 'granted' ? 'Alerts on' : 'Enable alerts'}
              onClick={enableNotifications}
              clickable
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" variant="text" startIcon={<RefreshRoundedIcon />} onClick={() => loadFeed(userLocation?.lat, userLocation?.lon)}>
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Feed */}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={() => loadFeed(userLocation?.lat, userLocation?.lon)}>Retry</Button>}>
          {error}
        </Alert>
      ) : visiblePosts.length === 0 ? (
        <EmptyState
          icon={<ArticleRoundedIcon />}
          title={search ? 'No reports match your filter' : 'No reports here yet'}
          description={search ? 'Try a different keyword or widen your radius.' : 'Be the first to report something happening in your area.'}
          action={!search && <Button variant="contained" href="/create">Report news</Button>}
        />
      ) : (
        <Grid container spacing={2}>
          {visiblePosts.map((post) => (
            <Grid key={post.post_id} size={{ xs: 12, md: 6, xl: 4 }}>
              <NewsCard post={post} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default HomePage;
