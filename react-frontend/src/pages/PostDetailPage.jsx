import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, LinearProgress, Stack, Typography, alpha,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import RadarOutlinedIcon from '@mui/icons-material/RadarOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { toast } from 'react-toastify';
import CredibilityMeter from '../components/CredibilityMeter';
import VoteButtons from '../components/VoteButtons';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  bookmarkPost, getPost, getPostExplanation, reportPost, sharePost, unbookmarkPost,
} from '../services/api';
import {
  formatRelativeTime, getCredibilityColor, getCredibilityLabel,
  getIndicatorInfo, getUrgencyInfo, formatDistance, getRadiusTierLabel,
} from '../utils/helpers';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getPost(postId);
        setPost(res.data);
        const explain = await getPostExplanation(postId);
        setExplanation(explain.data);
      } catch (err) {
        setError('Failed to load post. ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId]);

  if (loading) return <LoadingSpinner text="Loading post details..." />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!post) return <Alert severity="warning">Post not found</Alert>;

  const credColor = getCredibilityColor(post.credibility);
  const credLabel = getCredibilityLabel(post.credibility);
  const urgInfo = getUrgencyInfo(post.urgency);
  const [firstReason] = post.why_shown || [];

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.post_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NCPS Report', text: post.content?.slice(0, 140), url });
      } else {
        await navigator.clipboard?.writeText(url);
      }
      await sharePost(post.post_id);
      toast.success('Share recorded.');
    } catch {}
  };

  const handleBookmark = async () => {
    try {
      if (post.is_bookmarked) {
        await unbookmarkPost(post.post_id);
        setPost({ ...post, is_bookmarked: false, bookmarks_count: Math.max(0, (post.bookmarks_count || 1) - 1) });
      } else {
        await bookmarkPost(post.post_id);
        setPost({ ...post, is_bookmarked: true, bookmarks_count: (post.bookmarks_count || 0) + 1 });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update bookmark.');
    }
  };

  const handleReport = async () => {
    const description = window.prompt('Why should this report be reviewed?');
    if (description === null) return;
    try {
      await reportPost(post.post_id, { reason: 'other', description });
      toast.success('Report submitted for review.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit report.');
    }
  };

  return (
    <Stack spacing={1.8}>
      {/* Back button */}
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate(-1)}
        sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
      >
        Back to Feed
      </Button>

      {/* Main content card */}
      <Card
        className="glass-surface"
        sx={{
          p: { xs: 2, md: 2.5 },
          position: 'relative',
          '&::before': {
            content: '""', position: 'absolute', left: 0, top: 0,
            width: '100%', height: 4,
            background: credColor,
          },
        }}
      >
        <Stack spacing={3}>
          {/* Indicators */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {urgInfo && (
              <Chip
                label={urgInfo.label}
                sx={{
                  fontWeight: 700, bgcolor: alpha(urgInfo.color, 0.12),
                  color: urgInfo.color, border: `1px solid ${alpha(urgInfo.color, 0.2)}`,
                }}
              />
            )}
            {(post.indicators || []).map((ind) => {
              const info = getIndicatorInfo(ind);
              return (
                <Chip key={ind} label={ind} sx={{ fontWeight: 700, bgcolor: info.bg, color: info.color }} />
              );
            })}
            <Chip
              label={formatRelativeTime(post.created_at)}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          {/* Content */}
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.5 }}>
            {post.content}
          </Typography>

          {/* Author */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Reported by <strong>{post.author_name || post.user_id}</strong>
            </Typography>
            {firstReason && <Chip size="small" label={`Shown because: ${firstReason}`} variant="outlined" />}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<ShareOutlinedIcon />} variant="outlined" onClick={handleShare}>Share</Button>
            <Button
              startIcon={post.is_bookmarked ? <BookmarkRoundedIcon /> : <BookmarkBorderOutlinedIcon />}
              variant="outlined"
              onClick={handleBookmark}
            >
              {post.is_bookmarked ? 'Saved' : 'Bookmark'}
            </Button>
            <Button startIcon={<FlagOutlinedIcon />} color="error" variant="outlined" onClick={handleReport}>Report</Button>
          </Stack>
        </Stack>
      </Card>

      {/* Credibility Breakdown */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
          <VerifiedOutlinedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Credibility Analysis
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ md: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CredibilityMeter score={post.credibility} size="large" />
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600, color: credColor }}>
              {credLabel}
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack spacing={2}>
              {/* Bayesian credibility */}
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    C_Bayes (Crowd Consensus)
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono'", fontWeight: 700, color: getCredibilityColor(post.c_bayes) }}>
                    {(post.c_bayes * 100).toFixed(1)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={post.c_bayes * 100}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: alpha(getCredibilityColor(post.c_bayes), 0.1),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: getCredibilityColor(post.c_bayes) },
                  }}
                />
              </Box>

              {/* Variance */}
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Voter Disagreement (Variance)
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>
                    {post.variance?.toFixed(3) || '—'}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((post.variance || 0) * 400, 100)}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: 'rgba(245,158,11,0.1)',
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#f59e0b' },
                  }}
                />
              </Box>

              {/* Effective votes */}
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Effective Evidence Mass (N)
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>
                    {post.n_effective?.toFixed(1) || '—'}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(((post.n_effective || 0) / 20) * 100, 100)}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: 'rgba(59,130,246,0.1)',
                    '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#1d9bf0' },
                  }}
                />
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* Propagation & Location */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          <RadarOutlinedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Propagation & Location
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Chip
            icon={<RadarOutlinedIcon />}
            label={`${getRadiusTierLabel((post.radius || 1000) / 1000)} — ${formatDistance(post.radius)}`}
            sx={{ fontWeight: 700, bgcolor: alpha(credColor, 0.12), color: credColor }}
          />
          {post.lat && post.lon && (
            <Chip
              icon={<PlaceOutlinedIcon />}
              label={`${post.lat.toFixed(4)}, ${post.lon.toFixed(4)}`}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
          <Chip
            label={`Urgency: ${(post.urgency * 100).toFixed(0)}%`}
            sx={{
              fontWeight: 700,
              bgcolor: alpha(urgInfo?.color || '#94a3b8', 0.12),
              color: urgInfo?.color || 'text.secondary',
            }}
          />
        </Stack>
      </Card>

      {/* Decision trace */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          <FactCheckOutlinedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Decision Trace
        </Typography>
        {!explanation ? (
          <Typography color="text.secondary">Explanation is loading.</Typography>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(explanation.why_shown || []).map((reason) => (
                <Chip key={reason} label={reason} variant="outlined" />
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Propagation Gate</Typography>
                <Stack spacing={0.8}>
                  {(explanation.decision_trace?.propagation || []).map((item) => (
                    <Chip
                      key={item.label}
                      label={`${item.label}: ${item.passed ? 'pass' : 'hold'} (${item.value ?? 'n/a'})`}
                      color={item.passed ? 'success' : 'default'}
                      variant={item.passed ? 'filled' : 'outlined'}
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Alert Gate</Typography>
                <Stack spacing={0.8}>
                  {(explanation.decision_trace?.alert || []).map((item) => (
                    <Chip
                      key={item.label}
                      label={`${item.label}: ${item.passed ? 'pass' : 'hold'} (${item.value ?? 'n/a'})`}
                      color={item.passed ? 'success' : 'default'}
                      variant={item.passed ? 'filled' : 'outlined'}
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Top Vote Contributions</Typography>
              <Stack spacing={0.8}>
                {(explanation.top_contributors || []).slice(0, 5).map((item) => (
                  <Typography key={`${item.user_id}-${item.timestamp}`} variant="body2" color="text.secondary">
                    {item.user_id.slice(0, 8)} · vote {item.vote > 0 ? '+1' : '-1'} · weight {item.weight} · trust {item.trust_score}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </Card>

      {/* Vote section */}
      <Card className="glass-surface" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 700 }}>
          Cast Your Vote
        </Typography>
        <VoteButtons postId={post.post_id} voteCount={post.vote_count} initialVote={post.user_vote} />
      </Card>
    </Stack>
  );
};

export default PostDetailPage;
