import React, { useEffect, useState } from 'react';
import {
  Box, Card, Chip, Divider, LinearProgress, Stack, Typography, alpha,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMyActivity, getMyUserState } from '../services/api';
import { formatRelativeTime, getTrustBadge, getCredibilityColor } from '../utils/helpers';

const signalDefs = [
  { key: 'r_star', label: 'Effective Reliability (R*)', desc: 'Bayesian ratio of correct actions' },
  { key: 'exp_score', label: 'Experience Score', desc: 'Log-normalized action count' },
  { key: 'anomaly_score', label: 'Anomaly Score', desc: 'Deviation from normal behavior', invert: true },
  { key: 'trust_score', label: 'Graph Trust (T)', desc: 'Network-propagated trust' },
  { key: 'location_confidence', label: 'Location Confidence', desc: 'GPS accuracy & consistency' },
];

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState({ posts: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [stateRes, activityRes] = await Promise.all([
          getMyUserState(),
          getMyActivity(),
        ]);
        setUser(stateRes.data);
        setActivity(activityRes.data);
      } catch {
        setError('Failed to load profile. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner text="Loading your profile..." />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!user) return <Typography color="text.secondary">No user data found.</Typography>;

  const badge = getTrustBadge(user.trust_score);
  const weight = user.weight;

  return (
    <Stack spacing={1.8} sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header Card */}
      <Card
        className="glass-surface"
        sx={{
          p: { xs: 2, md: 2.5 },
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.16),
              border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.28)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AccountCircleOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {user.name || `${user.user_id?.slice(0, 8)}...`}
            </Typography>
            {user.email && (
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 16 }}>{badge.icon}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: badge.color }}>
                {badge.label}
              </Typography>
              <Chip label={user.role} size="small" variant="outlined" sx={{ height: 22, fontWeight: 700 }} />
            </Stack>
          </Box>
        </Stack>

        {/* Stats row */}
        <Stack direction="row" spacing={2.5} sx={{ mt: 2 }}>
          {[
            { label: 'Votes', value: user.vote_count },
            { label: 'Posts', value: user.post_count },
            { label: 'Weight', value: weight?.toFixed(3) },
          ].map((s) => (
            <Box key={s.label}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{s.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: "'JetBrains Mono'" }}>{s.value}</Typography>
            </Box>
          ))}
        </Stack>
      </Card>

      {/* Weight Decomposition */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          <VerifiedUserOutlinedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Weight Decomposition
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ py: 2 }}>
          {[
            { label: 'Trust (T)', value: user.trust_score, color: '#1d9bf0' },
            { label: '×', isOp: true },
            { label: '1 − Anom', value: 1 - user.anomaly_score, color: user.anomaly_score > 0.3 ? '#f4212e' : '#00ba7c' },
            { label: '×', isOp: true },
            { label: 'Exp', value: user.exp_score, color: '#00ba7c' },
            { label: '=', isOp: true },
            { label: 'Weight', value: weight, color: '#1d9bf0', isResult: true },
          ].map((item, i) =>
            item.isOp ? (
              <Typography key={i} sx={{ fontSize: 24, color: 'text.secondary', fontWeight: 300 }}>
                {item.label}
              </Typography>
            ) : (
              <Box
                key={i}
                sx={{
                  p: 1.5, minWidth: 90, textAlign: 'center',
                  border: item.isResult
                    ? `2px solid ${alpha('#1d9bf0', 0.42)}`
                    : `1px solid ${alpha(item.color, 0.15)}`,
                  borderRadius: 2,
                  bgcolor: alpha(item.color, 0.05),
                }}
              >
                <Typography sx={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: '1.2rem', color: item.color }}>
                  {item.value?.toFixed(3)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>
                  {item.label}
                </Typography>
              </Box>
            )
          )}
        </Stack>
      </Card>

      {/* Account Activity */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
          Account Activity
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ArticleOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Recent reports</Typography>
            </Stack>
            <Stack spacing={1.2}>
              {(activity.posts || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No reports yet.</Typography>
              ) : (
                activity.posts.slice(0, 3).map((post) => (
                  <Box key={post.post_id}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {post.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(post.credibility * 100).toFixed(1)}% credibility · {formatRelativeTime(post.created_at)}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
          <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <HowToVoteOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Recent votes</Typography>
            </Stack>
            <Stack spacing={1.2}>
              {(activity.votes || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No votes yet.</Typography>
              ) : (
                activity.votes.slice(0, 3).map((vote) => (
                  <Box key={vote.interaction_id}>
                    <Chip
                      label={vote.vote > 0 ? 'Credible' : 'Fake'}
                      size="small"
                      color={vote.vote > 0 ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ height: 22, fontWeight: 700, mb: 0.5 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {vote.post_preview}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatRelativeTime(vote.timestamp)}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* Signal Bars */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
          Trust Signals
        </Typography>
        <Stack spacing={2}>
          {signalDefs.map((sig) => {
            const val = user[sig.key] || 0;
            const displayVal = sig.invert ? 1 - val : val;
            const color = sig.invert
              ? (val > 0.3 ? '#f4212e' : val > 0.1 ? '#f59e0b' : '#00ba7c')
              : getCredibilityColor(val);
            return (
              <Box key={sig.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{sig.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{sig.desc}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, color }}>
                    {val.toFixed(3)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={displayVal * 100}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: alpha(color, 0.1),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: color, transition: 'none' },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Card>
    </Stack>
  );
};

export default ProfilePage;
