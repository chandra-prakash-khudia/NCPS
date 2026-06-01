import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, Chip, Grid, LinearProgress, Stack, Typography, alpha,
} from '@mui/material';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import RadarOutlinedIcon from '@mui/icons-material/RadarOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getAnalyticsOverview,
  getCredibilityDistribution,
  getLeaderboard,
  getPropagationStats,
} from '../services/api';
import { getCredibilityColor } from '../utils/helpers';

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const bucketColor = {
  low: '#f4212e',
  uncertain: '#f59e0b',
  credible: '#1d9bf0',
  verified: '#00ba7c',
};

const tierColor = {
  hyperlocal: '#06b6d4',
  local: '#1d9bf0',
  district: '#00ba7c',
  regional: '#f59e0b',
  wide: '#536471',
};

const InsightsPage = () => {
  const [overview, setOverview] = useState(null);
  const [credibility, setCredibility] = useState(null);
  const [propagation, setPropagation] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, credibilityRes, propagationRes, leaderboardRes] = await Promise.all([
          getAnalyticsOverview(),
          getCredibilityDistribution(),
          getPropagationStats(),
          getLeaderboard({ limit: 10 }),
        ]);
        setOverview(overviewRes.data);
        setCredibility(credibilityRes.data);
        setPropagation(propagationRes.data);
        setLeaderboard(leaderboardRes.data.users || []);
      } catch {
        setError('Failed to load insights. Make sure the backend analytics API is running.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summaryCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        label: 'Accounts',
        value: overview.total_accounts,
        detail: `${overview.active_voters} active voters`,
        Icon: GroupsOutlinedIcon,
        color: '#1d9bf0',
      },
      {
        label: 'Reports',
        value: overview.total_posts,
        detail: `${overview.located_posts} with location`,
        Icon: AnalyticsOutlinedIcon,
        color: '#00ba7c',
      },
      {
        label: 'Votes',
        value: overview.total_votes,
        detail: `${overview.vote_density} per report`,
        Icon: HowToVoteOutlinedIcon,
        color: '#00ba7c',
      },
      {
        label: 'Average Credibility',
        value: formatPercent(overview.avg_credibility),
        detail: `${overview.high_trust_posts} high-trust reports`,
        Icon: SecurityOutlinedIcon,
        color: getCredibilityColor(overview.avg_credibility),
      },
    ];
  }, [overview]);

  if (loading) return <LoadingSpinner text="Loading system insights..." />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={1.8}>
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <AnalyticsOutlinedIcon color="primary" />
              <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', sm: '1.55rem', md: '1.75rem' } }}>
                System Insights
              </Typography>
            </Stack>
            <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
              Live operational analytics adapted from the original NCPS dashboard: credibility spread, propagation tiers, and trusted contributors.
            </Typography>
          </Box>
          <Chip
            icon={<TrendingUpOutlinedIcon />}
            label={`${overview?.suspicious_posts || 0} low-credibility reports`}
            color="warning"
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, fontWeight: 700 }}
          />
        </Stack>
      </Card>

      <Grid container spacing={2}>
        {summaryCards.map(({ label, value, detail, Icon, color }) => (
          <Grid key={label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card className="glass-surface" sx={{ p: 1.6, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    {label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{detail}</Typography>
                </Box>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color,
                    bgcolor: alpha(color, 0.12),
                  }}
                >
                  <Icon />
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
              <SecurityOutlinedIcon color="primary" />
              <Typography variant="h6">Credibility Distribution</Typography>
            </Stack>
            <Stack spacing={2}>
              {(credibility?.buckets || []).map((bucket) => {
                const color = bucketColor[bucket.key] || '#94a3b8';
                return (
                  <Box key={bucket.key}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{bucket.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {bucket.count} reports · {bucket.percent}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={bucket.percent}
                      sx={{
                        height: 9,
                        borderRadius: 99,
                        bgcolor: alpha(color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
              <RadarOutlinedIcon color="primary" />
              <Typography variant="h6">Propagation Tiers</Typography>
            </Stack>
            <Stack spacing={2}>
              {(propagation?.tiers || []).map((tier) => {
                const color = tierColor[tier.key] || '#94a3b8';
                return (
                  <Box key={tier.key}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {tier.label} · {tier.radius_km} km
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tier.count} reports · {tier.percent}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={tier.percent}
                      sx={{
                        height: 9,
                        borderRadius: 99,
                        bgcolor: alpha(color, 0.12),
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 99 },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <LeaderboardOutlinedIcon color="primary" />
          <Typography variant="h6">Trusted Contributors</Typography>
        </Stack>

        <Stack spacing={1.3}>
          {leaderboard.length === 0 ? (
            <Typography color="text.secondary">No contributors yet.</Typography>
          ) : leaderboard.map((user, index) => (
            <Box
              key={user.user_id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '32px 1fr', sm: '40px 1fr auto' },
                gap: 1.4,
                alignItems: 'center',
                p: 1.4,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.36),
              }}
            >
              <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: 'text.secondary' }}>
                #{index + 1}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontWeight: 800 }} noWrap>{user.name}</Typography>
                  <Chip label={user.badge?.label || 'Member'} size="small" color="primary" variant="outlined" sx={{ height: 22 }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {user.vote_count} votes · {user.post_count} reports · weight {user.weight.toFixed(3)}
                </Typography>
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 120 }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                  <Typography variant="caption" color="text.secondary">Trust</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>{formatPercent(user.trust_score)}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={user.trust_score * 100}
                  sx={{
                    height: 7,
                    borderRadius: 99,
                    bgcolor: alpha(getCredibilityColor(user.trust_score), 0.12),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      bgcolor: getCredibilityColor(user.trust_score),
                    },
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
};

export default InsightsPage;
