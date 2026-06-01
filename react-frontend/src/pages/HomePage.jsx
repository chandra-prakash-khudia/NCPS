import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Grid, Stack, Typography, alpha,
} from '@mui/material';
import RadarOutlinedIcon from '@mui/icons-material/RadarOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import NewsCard from '../components/NewsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchFeed, updateLocation, getNotificationConfig, savePushSubscription } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { categoryOptions } from '../utils/helpers';

const radiusOptions = [1, 5, 10, 25, 50];

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

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
      setError('Failed to load feed. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, [feedMode, selectedCategory, selectedRadius]);

  // Request location
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
      () => {
        setLocationStatus('denied');
        loadFeed();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [loadFeed]);

  useEffect(() => {
    loadFeed(userLocation?.lat, userLocation?.lon);
  }, [userLocation, loadFeed, selectedCategory, selectedRadius, feedMode]);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationState('unsupported');
      return;
    }
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
    } catch {
      // SSE alerts still work when Web Push is not configured.
    }
  };

  // Dashboard metrics
  const metrics = useMemo(() => {
    if (!posts.length) return { total: 0, avgCred: 0, highTrust: 0 };
    const avgCred = Math.round(
      (posts.reduce((sum, p) => sum + (p.credibility || 0), 0) / posts.length) * 100
    );
    const highTrust = posts.filter((p) => p.credibility >= 0.75).length;
    return { total: posts.length, avgCred, highTrust };
  }, [posts]);

  return (
    <Stack spacing={1.8}>
      {/* Feed controls */}
      <Card
        className="glass-surface"
        sx={{
          p: { xs: 1.5, md: 2 },
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.7}>
          {/* Title */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <RadarOutlinedIcon color="primary" />
              <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', sm: '1.55rem', md: '1.75rem' } }}>
                News Credibility Dashboard
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Community-verified local news with trust-aware credibility scoring. Content ranked by credibility × proximity × urgency.
            </Typography>
            <Chip
              label={`Signed in as ${user?.name || 'NCPS user'}`}
              size="small"
              variant="outlined"
              sx={{ mt: 1.5, fontWeight: 700 }}
            />
          </Box>

          {/* Metrics Row */}
          <Grid container spacing={1}>
            {[
              { label: 'Stories', value: metrics.total, icon: <ArticleOutlinedIcon fontSize="small" /> },
              { label: 'Avg Credibility', value: `${metrics.avgCred}%`, icon: <SecurityIcon fontSize="small" /> },
              { label: 'High Trust', value: metrics.highTrust, icon: <TrendingUpIcon fontSize="small" /> },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 4 }}>
                <Box
                  sx={{
                    p: 1.15,
                    borderRadius: 2,
                    border: (t) => `1px solid ${t.palette.divider}`,
                    bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.02 : 0.01),
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {item.icon}
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {item.label}
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.3 }}>
                    {item.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Radius Filter */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              icon={<NearMeOutlinedIcon />}
              label="Local Feed"
              color={feedMode === 'local' ? 'primary' : 'default'}
              variant={feedMode === 'local' ? 'filled' : 'outlined'}
              onClick={() => setFeedMode('local')}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              icon={<PublicOutlinedIcon />}
              label="Global Feed"
              color={feedMode === 'global' ? 'primary' : 'default'}
              variant={feedMode === 'global' ? 'filled' : 'outlined'}
              onClick={() => setFeedMode('global')}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              icon={<NotificationsActiveOutlinedIcon />}
              label={notificationState === 'granted' ? 'Notifications On' : 'Enable Alerts'}
              color={notificationState === 'granted' ? 'success' : 'default'}
              variant="outlined"
              onClick={enableNotifications}
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <NearMeOutlinedIcon color="action" sx={{ fontSize: 18 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Radius:
            </Typography>
            {radiusOptions.map((r) => (
              <Chip
                key={r}
                label={`${r} km`}
                color={selectedRadius === r ? 'primary' : 'default'}
                onClick={() => setSelectedRadius(r)}
                variant={selectedRadius === r ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                size="small"
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            {categoryOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                color={selectedCategory === item.value ? 'primary' : 'default'}
                variant={selectedCategory === item.value ? 'filled' : 'outlined'}
                onClick={() => setSelectedCategory(item.value)}
                sx={{ fontWeight: 700 }}
                size="small"
              />
            ))}
          </Stack>

          {/* Location Status */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<NearMeOutlinedIcon />}
              color={locationStatus === 'detected' ? 'success' : locationStatus === 'detecting' ? 'default' : 'warning'}
              variant="outlined"
              label={
                locationStatus === 'detected'
                  ? `${userLocation?.lat?.toFixed(4)}, ${userLocation?.lon?.toFixed(4)}`
                  : locationStatus === 'detecting'
                  ? 'Detecting location...'
                  : 'Location unavailable'
              }
              size="small"
              sx={{ maxWidth: 280 }}
            />
            <Button
              size="small"
              variant="text"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => loadFeed(userLocation?.lat, userLocation?.lon)}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Map Toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
          {posts.length} {posts.length === 1 ? 'Story' : 'Stories'} Near You
        </Typography>
        <Button
          component="a"
          href="/map"
          variant="outlined"
          startIcon={<MapOutlinedIcon />}
          size="small"
        >
          Explore Map
        </Button>
      </Stack>

      {/* Feed */}
      {loading ? (
        <LoadingSpinner text="Loading feed from your area..." />
      ) : error ? (
        <Alert
          severity="error"
          action={
            <Button size="small" color="inherit" onClick={() => loadFeed(userLocation?.lat, userLocation?.lon)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : posts.length === 0 ? (
        <Card className="glass-surface" sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <ArticleOutlinedIcon color="action" sx={{ fontSize: 38, mb: 1 }} />
          <Typography variant="h6" color="text.secondary">No reports yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Be the first to report news in your area.
          </Typography>
          <Button variant="contained" href="/create">Report News</Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {posts.map((post) => (
            <Grid key={post.post_id} size={{ xs: 12, md: 6, xl: 4 }}>
              <NewsCard post={post} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
};

export default HomePage;
