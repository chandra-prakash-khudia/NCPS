import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, Stack, Typography,
} from '@mui/material';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { Link as RouterLink } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { fetchAlerts, markAlertRead, markAllAlertsRead } from '../services/api';
import { formatDistance, formatRelativeTime } from '../utils/helpers';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAlerts({ limit: 80 });
      setAlerts(res.data.alerts || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleMarkAll = async () => {
    await markAllAlertsRead();
    await loadAlerts();
  };

  const handleOpen = async (alert) => {
    if (!alert.is_read) {
      await markAlertRead(alert.alert_id);
    }
  };

  if (loading) return <LoadingSpinner text="Loading hyperlocal alerts…" />;

  return (
    <Box className="rise-in">
      <PageHeader
        eyebrow="Hyperlocal"
        title="Alerts"
        subtitle="Notifications generated from credibility, urgency, and distance checks for reports near you."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${unreadCount} unread`} color={unreadCount ? 'warning' : 'default'} sx={{ fontWeight: 600 }} />
            <Button startIcon={<DoneAllRoundedIcon />} variant="outlined" size="small" disabled={!unreadCount} onClick={handleMarkAll}>
              Mark all read
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {alerts.length === 0 ? (
        <EmptyState icon={<NotificationsOffRoundedIcon />} title="No alerts yet" description="Enable location and watch nearby reports — credible, urgent updates within range will surface here." />
      ) : (
        <Stack spacing={1.2}>
          {alerts.map((item) => (
            <Card
              key={item.alert_id}
              className="glass-surface"
              sx={{ p: 1.6, borderColor: item.is_read ? 'divider' : 'warning.main' }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.2}>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                    {!item.is_read && <Chip size="small" color="warning" label="New" />}
                    {item.category && <Chip size="small" variant="outlined" label={item.category} />}
                    {item.distance_m != null && <Chip size="small" label={formatDistance(item.distance_m)} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{item.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(item.created_at)} · proximity {item.proximity ?? 'n/a'}
                  </Typography>
                </Stack>
                <Button
                  component={RouterLink}
                  to={`/post/${item.post_id}`}
                  variant="contained"
                  size="small"
                  onClick={() => handleOpen(item)}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
                >
                  Open Report
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default AlertsPage;
