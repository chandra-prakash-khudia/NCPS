import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Chip, Stack, Typography,
} from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined';
import { Link as RouterLink } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
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

  if (loading) return <LoadingSpinner text="Loading hyperlocal alerts..." />;

  return (
    <Stack spacing={2}>
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <NotificationsActiveOutlinedIcon color="primary" />
              <Typography variant="h4">Alerts</Typography>
            </Stack>
            <Typography color="text.secondary">
              Hyperlocal notifications are generated from credibility, urgency, and distance checks.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${unreadCount} unread`} color={unreadCount ? 'warning' : 'default'} />
            <Button startIcon={<DoneAllOutlinedIcon />} variant="outlined" disabled={!unreadCount} onClick={handleMarkAll}>
              Mark All Read
            </Button>
          </Stack>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      {alerts.length === 0 ? (
        <Alert severity="info">No alerts yet. Enable location and follow nearby reports to receive updates.</Alert>
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
    </Stack>
  );
};

export default AlertsPage;
