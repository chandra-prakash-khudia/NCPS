import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Chip, FormControlLabel, MenuItem, Select, Stack, Switch, TextField, Typography,
} from '@mui/material';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPreferences, updatePreferences } from '../services/api';
import { categoryOptions } from '../utils/helpers';

const SettingsPage = () => {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await getPreferences();
      setPrefs(res.data.preferences);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading preferences..." />;
  if (!prefs) return <Alert severity="error">Preferences are unavailable.</Alert>;

  const toggleTopic = (topic) => {
    const current = prefs.followed_topics || [];
    setPrefs({
      ...prefs,
      followed_topics: current.includes(topic)
        ? current.filter((item) => item !== topic)
        : [...current, topic],
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await updatePreferences(prefs);
      setPrefs(res.data.preferences);
      setMessage('Preferences saved.');
    } catch {
      setMessage('Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto' }}>
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TuneOutlinedIcon color="primary" />
          <Typography variant="h4">Preferences</Typography>
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Control feed topics, default radius, and hyperlocal alerts.
        </Typography>
      </Card>

      {message && <Alert severity={message.includes('Could') ? 'error' : 'success'}>{message}</Alert>}

      <Card className="glass-surface" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Topics</Typography>
          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
            {categoryOptions.filter((item) => item.value !== 'all').map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                color={(prefs.followed_topics || []).includes(item.value) ? 'primary' : 'default'}
                variant={(prefs.followed_topics || []).includes(item.value) ? 'filled' : 'outlined'}
                onClick={() => toggleTopic(item.value)}
              />
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card className="glass-surface" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Location and Radius</Typography>
          <TextField
            label="City for leaderboard"
            value={prefs.city || ''}
            onChange={(event) => setPrefs({ ...prefs, city: event.target.value })}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Stack spacing={0.6} sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Alert radius</Typography>
              <Select
                size="small"
                value={prefs.alert_radius_m}
                onChange={(event) => setPrefs({ ...prefs, alert_radius_m: Number(event.target.value) })}
              >
                {[1000, 5000, 10000].map((radius) => (
                  <MenuItem key={radius} value={radius}>{radius / 1000} km</MenuItem>
                ))}
              </Select>
            </Stack>
            <Stack spacing={0.6} sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Feed radius</Typography>
              <Select
                size="small"
                value={prefs.feed_radius_m}
                onChange={(event) => setPrefs({ ...prefs, feed_radius_m: Number(event.target.value) })}
              >
                {[1000, 5000, 10000, 25000, 50000, 100000].map((radius) => (
                  <MenuItem key={radius} value={radius}>{radius / 1000} km</MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>
          <FormControlLabel
            control={<Switch checked={Boolean(prefs.alerts_enabled)} onChange={(event) => setPrefs({ ...prefs, alerts_enabled: event.target.checked })} />}
            label="Enable hyperlocal alerts"
          />
          <FormControlLabel
            control={<Switch checked={Boolean(prefs.breaking_only)} onChange={(event) => setPrefs({ ...prefs, breaking_only: event.target.checked })} />}
            label="Prioritize urgent alerts"
          />
        </Stack>
      </Card>

      <Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={saving} onClick={save}>
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </Stack>
  );
};

export default SettingsPage;
