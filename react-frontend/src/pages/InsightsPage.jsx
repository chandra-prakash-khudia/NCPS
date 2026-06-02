import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, Chip, Grid, LinearProgress, Stack, Typography, alpha, useTheme,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import LeaderboardRoundedIcon from '@mui/icons-material/LeaderboardRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  getAnalyticsOverview, getCredibilityDistribution, getLeaderboard, getPropagationStats,
} from '../services/api';
import { getCredibilityColor, CRED_GREEN, CRED_AMBER, CRED_RED, BRAND_INDIGO, CYAN } from '../utils/helpers';

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const bucketColor = { low: CRED_RED, uncertain: CRED_AMBER, credible: BRAND_INDIGO, verified: CRED_GREEN };
const tierColor = { hyperlocal: CYAN, local: BRAND_INDIGO, district: CRED_GREEN, regional: CRED_AMBER, wide: '#8b8d98' };

const ChartCard = ({ icon, title, subtitle, children, height = 260 }) => (
  <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 0.5 }}>
      <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center' }}>{icon}</Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
    <Box sx={{ width: '100%', height }}>{children}</Box>
  </Card>
);

const InsightsPage = () => {
  const theme = useTheme();
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
        const [o, c, p, l] = await Promise.all([
          getAnalyticsOverview(),
          getCredibilityDistribution(),
          getPropagationStats(),
          getLeaderboard({ limit: 10 }),
        ]);
        setOverview(o.data);
        setCredibility(c.data);
        setPropagation(p.data);
        setLeaderboard(l.data.users || []);
      } catch {
        setError('Could not load insights. Make sure the backend analytics API is running.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summaryCards = useMemo(() => {
    if (!overview) return [];
    return [
      { label: 'Accounts', value: overview.total_accounts, detail: `${overview.active_voters} active voters`, Icon: GroupsRoundedIcon, color: BRAND_INDIGO },
      { label: 'Reports', value: overview.total_posts, detail: `${overview.located_posts} with location`, Icon: ArticleRoundedIcon, color: CYAN },
      { label: 'Votes', value: overview.total_votes, detail: `${overview.vote_density} per report`, Icon: HowToVoteRoundedIcon, color: CRED_GREEN },
      { label: 'Avg credibility', value: formatPercent(overview.avg_credibility), detail: `${overview.high_trust_posts} high-trust reports`, Icon: ShieldRoundedIcon, color: getCredibilityColor(overview.avg_credibility) },
    ];
  }, [overview]);

  const pieData = useMemo(
    () => (credibility?.buckets || []).map((b) => ({ name: b.label, value: b.count, percent: b.percent, color: bucketColor[b.key] || '#8b8d98' })),
    [credibility]
  );
  const barData = useMemo(
    () => (propagation?.tiers || []).map((t) => ({ name: t.label, count: t.count, percent: t.percent, color: tierColor[t.key] || '#8b8d98' })),
    [propagation]
  );
  const avgCred = Math.round((overview?.avg_credibility || 0) * 100);

  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    fontSize: 12,
    boxShadow: 'var(--shadow-lift)',
  };

  if (loading) return <LoadingSpinner text="Loading system insights…" />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box className="rise-in">
      <PageHeader
        eyebrow="Analytics"
        title="Insights"
        subtitle="Live operational analytics from the credibility engine: how trust is distributed, how far reports propagate, and who the community relies on."
        actions={
          <Chip
            label={`${overview?.suspicious_posts || 0} low-credibility reports`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        }
      />

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {summaryCards.map(({ label, value, detail, Icon, color }) => (
          <Grid key={label} size={{ xs: 6, lg: 3 }}>
            <Card className="glass-surface" sx={{ p: 1.85, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.62rem' }}>
                    {label}
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 0.4, fontWeight: 760, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{detail}</Typography>
                </Box>
                <Box sx={{ width: 40, height: 40, borderRadius: '11px', display: 'grid', placeItems: 'center', color, bgcolor: alpha(color, 0.13), flexShrink: 0 }}>
                  <Icon fontSize="small" />
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartCard icon={<ShieldRoundedIcon />} title="Overall trust" subtitle="Mean credibility across reports">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: avgCred, fill: getCredibilityColor(avgCred / 100) }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: alpha(theme.palette.text.primary, 0.06) }} />
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 34, fontWeight: 700, fill: theme.palette.text.primary }}>
                  {avgCred}%
                </text>
                <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: theme.palette.text.secondary }}>
                  avg credibility
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <ChartCard icon={<ShieldRoundedIcon />} title="Credibility distribution" subtitle="Reports grouped by credibility band">
            {pieData.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}><Typography color="text.secondary">No data yet</Typography></Stack>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} reports`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ mt: -1 }}>
              {pieData.map((d) => (
                <Stack key={d.name} direction="row" spacing={0.6} alignItems="center">
                  <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: d.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.percent}%</Typography>
                </Stack>
              ))}
            </Stack>
          </ChartCard>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12 }}>
          <ChartCard icon={<RadarRoundedIcon />} title="Propagation tiers" subtitle="How far credible reports spread" height={280}>
            {barData.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}><Typography color="text.secondary">No data yet</Typography></Stack>
            ) : (
              <ResponsiveContainer>
                <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} contentStyle={tooltipStyle} formatter={(value) => [`${value} reports`, 'Reports']} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={26}>
                    {barData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Grid>
      </Grid>

      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
          <LeaderboardRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Trusted contributors</Typography>
        </Stack>
        {leaderboard.length === 0 ? (
          <EmptyState dense icon={<GroupsRoundedIcon />} title="No contributors yet" description="Once people start voting and reporting, the most reliable contributors surface here." />
        ) : (
          <Stack spacing={1}>
            {leaderboard.map((u, index) => (
              <Box
                key={u.user_id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '28px 1fr', sm: '36px 1fr 140px' },
                  gap: 1.4,
                  alignItems: 'center',
                  p: 1.4,
                  borderRadius: '12px',
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'border-color 140ms ease',
                  '&:hover': { borderColor: 'var(--border-strong)' },
                }}
              >
                <Typography sx={{ fontFamily: 'var(--mono)', fontWeight: 700, color: index < 3 ? 'primary.main' : 'text.secondary' }}>
                  {index + 1}
                </Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 700 }} noWrap>{u.name}</Typography>
                    <Chip label={u.badge?.label || 'Member'} size="small" color="primary" variant="outlined" sx={{ height: 20 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {u.vote_count} votes · {u.post_count} reports · weight {u.weight.toFixed(3)}
                  </Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                    <Typography variant="caption" color="text.secondary">Trust</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatPercent(u.trust_score)}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={u.trust_score * 100}
                    sx={{ height: 7, borderRadius: 99, bgcolor: alpha(getCredibilityColor(u.trust_score), 0.14), '& .MuiLinearProgress-bar': { bgcolor: getCredibilityColor(u.trust_score) } }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Card>
    </Box>
  );
};

export default InsightsPage;
