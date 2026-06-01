import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, LinearProgress, Stack, TextField, Typography, alpha,
} from '@mui/material';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import LoadingSpinner from '../components/LoadingSpinner';
import { getCityLeaderboard } from '../services/api';
import { getCredibilityColor } from '../utils/helpers';

const LeaderboardPage = () => {
  const [city, setCity] = useState('');
  const [submittedCity, setSubmittedCity] = useState('');
  const [rows, setRows] = useState([]);
  const [titleCity, setTitleCity] = useState('All cities');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (nextCity = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 30 };
      if (nextCity) params.city = nextCity;
      const res = await getCityLeaderboard(params);
      setRows(res.data.users || []);
      setTitleCity(res.data.city || nextCity || 'All cities');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = (event) => {
    event.preventDefault();
    const normalized = city.trim();
    setSubmittedCity(normalized);
    load(normalized);
  };

  return (
    <Stack spacing={2}>
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <LeaderboardOutlinedIcon color="primary" />
              <Typography variant="h4">City Leaderboard</Typography>
            </Stack>
            <Typography color="text.secondary">
              Trusted local contributors ranked by trust, activity, and verification participation in {titleCity}.
            </Typography>
          </Stack>
          <Stack component="form" onSubmit={submit} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="City" value={city} onChange={(event) => setCity(event.target.value)} />
            <Button type="submit" variant="contained" startIcon={<SearchOutlinedIcon />}>Search</Button>
          </Stack>
        </Stack>
      </Card>

      {loading ? <LoadingSpinner text="Loading contributors..." /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && rows.length === 0 ? (
        <Alert severity="info">No contributors found{submittedCity ? ` for ${submittedCity}` : ''}.</Alert>
      ) : (
        <Stack spacing={1.2}>
          {rows.map((user, index) => {
            const color = getCredibilityColor(user.trust_score);
            return (
              <Card key={user.user_id} className="glass-surface" sx={{ p: 1.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.2}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: index < 3 ? alpha('#f59e0b', 0.14) : alpha(color, 0.12),
                        color: index < 3 ? '#d97706' : color,
                        fontWeight: 900,
                      }}
                    >
                      #{index + 1}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap alignItems="center">
                        <Typography sx={{ fontWeight: 800 }}>{user.name}</Typography>
                        <Chip size="small" label={user.badge?.label || 'Member'} variant="outlined" />
                        <Chip size="small" label={user.city || 'Unknown'} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {user.vote_count} votes · {user.post_count} reports · {user.points} points · {user.daily_streak} day streak
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ minWidth: { sm: 170 } }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Trust</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>{Math.round(user.trust_score * 100)}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={user.trust_score * 100}
                      sx={{
                        height: 8,
                        borderRadius: 99,
                        bgcolor: alpha(color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
                      }}
                    />
                  </Box>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default LeaderboardPage;
