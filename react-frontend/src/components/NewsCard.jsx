import React from 'react';
import {
  Box, Card, CardContent, Chip, Stack, Tooltip, Typography, alpha, IconButton,
} from '@mui/material';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import VoteButtons from './VoteButtons';
import { bookmarkPost, reportPost, sharePost, unbookmarkPost } from '../services/api';
import {
  formatRelativeTime, getCredibilityColor, getCredibilityLabel, getUrgencyInfo, formatDistance,
} from '../utils/helpers';
import { parseArticleContent, resolveMediaUrl, formatCategoryLabel } from '../utils/articleFormat';

const NewsCard = ({ post, showVote = true }) => {
  const navigate = useNavigate();
  const {
    post_id, content, credibility, urgency,
    distance_m, vote_count, n_effective,
    created_at, user_vote, is_bookmarked, image_url, category,
  } = post;
  const { headline, deck } = parseArticleContent(content);
  const preview = deck || (headline !== content ? content : null);
  const imageSrc = resolveMediaUrl(image_url);
  const [saved, setSaved] = React.useState(Boolean(is_bookmarked));
  const [reporting, setReporting] = React.useState(false);

  const credColor = getCredibilityColor(credibility);
  const credLabel = getCredibilityLabel(credibility);
  const urgInfo = getUrgencyInfo(urgency);
  const pct = Math.round((credibility || 0) * 100);

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NCPS report', text: headline?.slice(0, 120), url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      await sharePost(post_id);
      toast.success('Link copied · share recorded');
    } catch { /* user cancelled share */ }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    try {
      if (saved) {
        await unbookmarkPost(post_id);
        setSaved(false);
        toast.success('Removed from bookmarks');
      } else {
        await bookmarkPost(post_id);
        setSaved(true);
        toast.success('Saved to bookmarks');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update bookmark');
    }
  };

  const handleReport = async (e) => {
    e.stopPropagation();
    const description = window.prompt('Why should this report be reviewed?');
    if (description === null) return;
    setReporting(true);
    try {
      await reportPost(post_id, { reason: 'other', description });
      toast.success('Report submitted for review');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <Card
      className="glass-surface lift-on-hover"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}
    >
      <Box
        onClick={() => navigate(`/post/${post_id}`)}
        sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
      >
        {imageSrc && (
          <Box sx={{ position: 'relative', height: 150, overflow: 'hidden' }}>
            <Box component="img" src={imageSrc} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.35))' }} />
          </Box>
        )}

        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, flexGrow: 1, p: { xs: 1.75, sm: 2 } }}>
          {/* Meta line: category + urgency + time */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={0.5}>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                label={formatCategoryLabel(category)}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22, bgcolor: 'var(--accent-soft)', color: 'primary.main', border: 'none' }}
              />
              {urgInfo && (
                <Chip
                  label={urgInfo.label}
                  size="small"
                  sx={{ fontWeight: 700, fontSize: '0.66rem', height: 22, bgcolor: alpha(urgInfo.color, 0.13), color: urgInfo.color, border: `1px solid ${alpha(urgInfo.color, 0.22)}` }}
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 12, verticalAlign: '-2px', mr: 0.3 }} />
              {formatRelativeTime(created_at)}
            </Typography>
          </Stack>

          {/* Headline */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.04rem',
              lineHeight: 1.32,
              letterSpacing: '-0.01em',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {headline}
          </Typography>

          {preview && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: -0.4 }}
            >
              {preview}
            </Typography>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Credibility */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.6 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: credColor, boxShadow: `0 0 0 3px ${alpha(credColor, 0.18)}` }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{credLabel}</Typography>
              </Stack>
              <Typography sx={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '0.86rem', color: credColor }}>
                {pct}%
              </Typography>
            </Stack>
            <Box sx={{ height: 6, borderRadius: 999, bgcolor: alpha(credColor, 0.14), overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${pct}%`, borderRadius: 999, bgcolor: credColor, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
            </Box>
          </Box>

          {/* Footer meta */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ color: 'text.secondary' }}>
            {distance_m != null && (
              <Stack direction="row" spacing={0.4} alignItems="center">
                <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>{formatDistance(distance_m)}</Typography>
              </Stack>
            )}
            {n_effective > 0 && (
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {n_effective.toFixed(0)} weighted votes
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Box>

      {/* Action bar */}
      <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
            {showVote && <VoteButtons postId={post_id} voteCount={vote_count} initialVote={user_vote} />}
          </Box>
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Share"><IconButton size="small" onClick={handleShare} sx={{ color: 'text.secondary' }}><ShareOutlinedIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={saved ? 'Remove bookmark' : 'Bookmark'}>
              <IconButton size="small" onClick={handleBookmark} sx={{ color: saved ? 'primary.main' : 'text.secondary' }}>
                {saved ? <BookmarkRoundedIcon fontSize="small" /> : <BookmarkBorderRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Report"><IconButton size="small" disabled={reporting} onClick={handleReport} sx={{ color: 'text.secondary' }}><FlagOutlinedIcon fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
};

export default NewsCard;
