import React, { useEffect, useState } from 'react';
import {
  Alert, Card, Chip, Grid, Stack, Typography,
} from '@mui/material';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import LoadingSpinner from '../components/LoadingSpinner';
import { getObservabilityMetrics } from '../services/api';
import { formatRelativeTime } from '../utils/helpers';

const ObservabilityPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await getObservabilityMetrics();
      setMetrics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) return <LoadingSpinner text="Loading system metrics..." />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const cards = [
    ['Requests', metrics.requests_total],
    ['2xx', metrics.responses_2xx],
    ['4xx', metrics.responses_4xx],
    ['5xx', metrics.responses_5xx],
    ['Avg Latency', `${metrics.avg_latency_ms} ms`],
  ];

  return (
    <Stack spacing={2}>
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MonitorHeartOutlinedIcon color="primary" />
          <Typography variant="h4">Observability</Typography>
          <Chip size="small" label={metrics.status} color="success" />
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Lightweight API health, latency, and product-event counters for deployment checks.
        </Typography>
      </Card>

      <Grid container spacing={1.5}>
        {cards.map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, md: 2.4 }}>
            <Card className="glass-surface" sx={{ p: 1.6 }}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card className="glass-surface" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Product Events</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {Object.entries(metrics.events || {}).length === 0 ? (
            <Typography color="text.secondary">No tracked product events yet.</Typography>
          ) : Object.entries(metrics.events).map(([key, value]) => (
            <Chip key={key} label={`${key}: ${value}`} variant="outlined" />
          ))}
        </Stack>
      </Card>

      <Card className="glass-surface" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>Recent Events</Typography>
        <Stack spacing={1}>
          {(metrics.recent_events || []).length === 0 ? (
            <Typography color="text.secondary">No recent events.</Typography>
          ) : metrics.recent_events.map((event, index) => (
            <Stack key={`${event.timestamp}-${index}`} direction="row" justifyContent="space-between" gap={1}>
              <Typography sx={{ fontWeight: 700 }}>{event.event_type}</Typography>
              <Typography variant="caption" color="text.secondary">{formatRelativeTime(new Date(event.timestamp * 1000))}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
};

export default ObservabilityPage;
