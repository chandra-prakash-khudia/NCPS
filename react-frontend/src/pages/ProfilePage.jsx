import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Box, Card, Chip, Divider, Grid, LinearProgress, Stack, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getMyActivity, getMyUserState } from '../services/api';
import {
  formatRelativeTime, getTrustBadge, getCredibilityColor, CRED_GREEN, CRED_AMBER, CRED_RED, BRAND_INDIGO,
} from '../utils/helpers';
import { parseArticleContent } from '../utils/articleFormat';

const signalDefs = [
  { key: 'r_star', label: 'Effective reliability (R*)', desc: 'Bayesian ratio of correct actions' },
  { key: 'exp_score', label: 'Experience', desc: 'Log-normalised action count' },
  { key: 'anomaly_score', label: 'Anomaly score', desc: 'Deviation from normal behaviour', invert: true },
  { key: 'trust_score', label: 'Graph trust (T)', desc: 'Network-propagated trust' },
  { key: 'location_confidence', label: 'Location confidence', desc: 'GPS accuracy & consistency' },
];

const computeStreak = (timestamps) => {
  const days = new Set(
    timestamps
      .filter(Boolean)
      .map((t) => new Date(t).toISOString().slice(0, 10))
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Allow today or yesterday as the streak anchor.
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const ProfilePage = () => {
  const theme = useTheme();
  const [user, setUser] = useState(null);
  const [activity, setActivity] = useState({ posts: [], votes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [stateRes, activityRes] = await Promise.all([getMyUserState(), getMyActivity()]);
        setUser(stateRes.data);
        setActivity(activityRes.data);
      } catch {
        setError('Could not load your profile. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) return 'NC';
    return user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  }, [user?.name]);

  const streak = useMemo(() => {
    if (!activity) return 0;
    const ts = [...(activity.posts || []).map((p) => p.created_at), ...(activity.votes || []).map((v) => v.timestamp)];
    return computeStreak(ts);
  }, [activity]);

  const badges = useMemo(() => {
    if (!user) return [];
    const list = [];
    if ((user.post_count || 0) >= 1) list.push({ label: 'First report', Icon: ArticleRoundedIcon, color: BRAND_INDIGO, earned: true });
    if ((user.vote_count || 0) >= 10) list.push({ label: '10+ votes', Icon: HowToVoteRoundedIcon, color: CRED_GREEN, earned: true });
    if ((user.trust_score || 0) >= 0.7) list.push({ label: 'Trusted', Icon: VerifiedRoundedIcon, color: CRED_GREEN, earned: true });
    if ((user.trust_score || 0) >= 0.9) list.push({ label: 'Expert', Icon: WorkspacePremiumRoundedIcon, color: CRED_AMBER, earned: true });
    if (streak >= 3) list.push({ label: `${streak}-day streak`, Icon: LocalFireDepartmentRoundedIcon, color: '#f97316', earned: true });
    if (list.length === 0) list.push({ label: 'Getting started', Icon: MilitaryTechRoundedIcon, color: theme.palette.text.secondary, earned: false });
    return list;
  }, [user, streak, theme.palette.text.secondary]);

  if (loading) return <LoadingSpinner text="Loading your profile…" />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!user) return <Typography color="text.secondary">No user data found.</Typography>;

  const badge = getTrustBadge(user.trust_score);
  const weight = user.weight;

  const stats = [
    { label: 'Votes', value: user.vote_count ?? 0 },
    { label: 'Reports', value: user.post_count ?? 0 },
    { label: 'Weight', value: weight?.toFixed(3) ?? '—' },
    { label: 'Streak', value: `${streak}d` },
  ];

  return (
    <Box className="rise-in" sx={{ maxWidth: 860, mx: 'auto' }}>
      {/* Header card with gradient banner */}
      <Card className="glass-surface" sx={{ overflow: 'hidden', mb: 2 }}>
        <Box sx={{ height: 96, backgroundImage: `linear-gradient(120deg, ${theme.palette.primary.dark}, ${theme.palette.primary.light})`, position: 'relative' }}>
          <Box sx={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </Box>
        <Box sx={{ px: { xs: 2, md: 3 }, pb: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ mt: -4 }}>
            <Avatar sx={{ width: 80, height: 80, fontSize: '1.7rem', fontWeight: 700, border: `4px solid ${theme.palette.background.paper}`, bgcolor: 'primary.main', color: '#fff' }}>
              {initials}
            </Avatar>
            <Box sx={{ pb: 0.5, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 760 }} noWrap>
                {user.name || `${user.user_id?.slice(0, 8)}…`}
              </Typography>
              {user.email && <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip icon={<ShieldRoundedIcon />} label={badge.label} size="small" sx={{ fontWeight: 700, bgcolor: alpha(badge.color, 0.14), color: badge.color, border: `1px solid ${alpha(badge.color, 0.28)}` }} />
            <Chip label={user.role || 'member'} size="small" variant="outlined" sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
          </Stack>

          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {stats.map((s) => (
              <Grid key={s.label} size={{ xs: 3 }}>
                <Box sx={{ textAlign: 'center', py: 1.25, borderRadius: '12px', border: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="h6" sx={{ fontWeight: 760, fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{s.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Card>

      {/* Badges */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Badges</Typography>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          {badges.map((b) => (
            <Tooltip key={b.label} title={b.earned ? 'Earned' : 'Keep contributing to unlock'}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ px: 1.5, py: 1, borderRadius: '12px', border: `1px solid ${alpha(b.color, b.earned ? 0.28 : 0.14)}`, bgcolor: alpha(b.color, b.earned ? 0.1 : 0.04), opacity: b.earned ? 1 : 0.6 }}
              >
                <b.Icon sx={{ fontSize: 20, color: b.color }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{b.label}</Typography>
              </Stack>
            </Tooltip>
          ))}
        </Stack>
      </Card>

      {/* Weight decomposition */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>How your weight is built</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your influence on credibility is the product of three gates — all must be healthy for your vote to carry full weight.
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          {[
            { label: 'Trust (T)', value: user.trust_score, color: BRAND_INDIGO },
            { op: '×' },
            { label: '1 − Anom', value: 1 - user.anomaly_score, color: user.anomaly_score > 0.3 ? CRED_RED : CRED_GREEN },
            { op: '×' },
            { label: 'Experience', value: user.exp_score, color: CRED_GREEN },
            { op: '=' },
            { label: 'Weight', value: weight, color: BRAND_INDIGO, isResult: true },
          ].map((item, i) =>
            item.op ? (
              <Typography key={i} sx={{ fontSize: 22, color: 'text.secondary', fontWeight: 300 }}>{item.op}</Typography>
            ) : (
              <Box
                key={i}
                sx={{
                  p: 1.5, minWidth: 96, textAlign: 'center', borderRadius: '12px',
                  border: item.isResult ? `1.5px solid ${alpha(BRAND_INDIGO, 0.45)}` : `1px solid ${alpha(item.color, 0.2)}`,
                  bgcolor: alpha(item.color, item.isResult ? 0.1 : 0.05),
                }}
              >
                <Typography sx={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1.2rem', color: item.color }}>
                  {item.value?.toFixed(3)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.58rem' }}>
                  {item.label}
                </Typography>
              </Box>
            )
          )}
        </Stack>
      </Card>

      {/* Trust signals */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Trust signals</Typography>
        <Stack spacing={2}>
          {signalDefs.map((sig) => {
            const val = user[sig.key] || 0;
            const displayVal = sig.invert ? 1 - val : val;
            const color = sig.invert ? (val > 0.3 ? CRED_RED : val > 0.1 ? CRED_AMBER : CRED_GREEN) : getCredibilityColor(val);
            return (
              <Box key={sig.key}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{sig.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{sig.desc}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{val.toFixed(3)}</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={displayVal * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color } }}
                />
              </Box>
            );
          })}
        </Stack>
      </Card>

      {/* Activity */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Recent activity</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ArticleRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Reports</Typography>
            </Stack>
            {(activity.posts || []).length === 0 ? (
              <EmptyState dense icon={<ArticleRoundedIcon />} title="No reports yet" />
            ) : (
              <Stack spacing={1.4}>
                {activity.posts.slice(0, 4).map((post) => (
                  <Box key={post.post_id}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{parseArticleContent(post.content).headline}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(post.credibility * 100).toFixed(0)}% credibility · {formatRelativeTime(post.created_at)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', md: 'block' } }} />
          <Divider sx={{ display: { xs: 'block', md: 'none' } }} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <HowToVoteRoundedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Votes</Typography>
            </Stack>
            {(activity.votes || []).length === 0 ? (
              <EmptyState dense icon={<HowToVoteRoundedIcon />} title="No votes yet" />
            ) : (
              <Stack spacing={1.4}>
                {activity.votes.slice(0, 4).map((vote) => (
                  <Box key={vote.interaction_id}>
                    <Chip label={vote.vote > 0 ? 'Credible' : 'Disputed'} size="small" color={vote.vote > 0 ? 'success' : 'error'} variant="outlined" sx={{ height: 20, fontWeight: 700, mb: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{vote.post_preview}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatRelativeTime(vote.timestamp)}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};

export default ProfilePage;
