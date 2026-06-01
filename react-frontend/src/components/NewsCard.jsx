import React from 'react';
import {
  Box, Card, CardContent, Chip, LinearProgress, Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import RadarOutlinedIcon from '@mui/icons-material/RadarOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import CredibilityMeter from './CredibilityMeter';
import VoteButtons from './VoteButtons';
import { bookmarkPost, reportPost, sharePost, unbookmarkPost } from '../services/api';
import { formatRelativeTime, getCredibilityColor, getIndicatorInfo, getUrgencyInfo, formatDistance, getRadiusTierLabel } from '../utils/helpers';

const NewsCard = ({ post, showVote = true }) => {
  const navigate = useNavigate();
  const {
    post_id, content, credibility, urgency, indicators = [],
    distance_m, radius, vote_count, n_effective,
    created_at, user_vote, is_bookmarked,
  } = post;
  const [saved, setSaved] = React.useState(Boolean(is_bookmarked));
  const [reporting, setReporting] = React.useState(false);

  const credColor = getCredibilityColor(credibility);
  const urgInfo = getUrgencyInfo(urgency);
  const radiusLabel = getRadiusTierLabel((radius || 1000) / 1000);

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post_id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NCPS Report', text: content?.slice(0, 120), url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      await sharePost(post_id);
      toast.success('Share recorded.');
    } catch {}
  };

  const handleBookmark = async () => {
    try {
      if (saved) {
        await unbookmarkPost(post_id);
        setSaved(false);
        toast.success('Removed from bookmarks.');
      } else {
        await bookmarkPost(post_id);
        setSaved(true);
        toast.success('Saved to bookmarks.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update bookmark.');
    }
  };

  const handleReport = async () => {
    const description = window.prompt('Why should this report be reviewed?');
    if (description === null) return;
    setReporting(true);
    try {
      await reportPost(post_id, { reason: 'other', description });
      toast.success('Report submitted for review.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not submit report.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <Card
      className="glass-surface"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        transition: 'border-color 160ms ease, background-color 160ms ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0, top: 0,
          width: '100%', height: 3,
          background: credColor,
          zIndex: 2,
        },
        '&:hover': {
          borderColor: alpha(credColor, 0.5),
          bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.025 : 0.02),
        },
      }}
    >
      <CardContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flexGrow: 1, p: { xs: 1.35, sm: 1.6 } }}
        onClick={() => navigate(`/post/${post_id}`)}
      >
        {/* Top row: indicators + time */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {urgInfo && (
              <Chip
                label={urgInfo.label}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  bgcolor: alpha(urgInfo.color, 0.12),
                  color: urgInfo.color,
                  border: `1px solid ${alpha(urgInfo.color, 0.2)}`,
                  height: 22,
                }}
              />
            )}
            {indicators.map((ind) => {
              const info = getIndicatorInfo(ind);
              return (
                <Chip
                  key={ind}
                  label={ind}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    bgcolor: info.bg,
                    color: info.color,
                    height: 22,
                  }}
                />
              );
            })}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.3 }} />
            {formatRelativeTime(created_at)}
          </Typography>
        </Stack>

        {/* Content */}
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {content}
        </Typography>

        {/* Credibility bar */}
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CredibilityMeter score={credibility} size="small" showLabel={false} />
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Credibility
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: credColor,
                }}
              >
                {(credibility * 100).toFixed(1)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={credibility * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(credColor, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: credColor,
                  transition: 'none',
                },
              }}
            />
          </Box>
        </Stack>

        {/* Meta row */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {distance_m != null && (
            <Chip
              icon={<PlaceOutlinedIcon />}
              label={formatDistance(distance_m)}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24 }}
            />
          )}
          <Chip
            icon={<RadarOutlinedIcon />}
            label={radiusLabel}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24 }}
          />
          {n_effective > 0 && (
            <Typography variant="caption" color="text.secondary">
              {n_effective.toFixed(0)} effective votes
            </Typography>
          )}
        </Stack>
      </CardContent>

      {/* Action bar */}
      <Box sx={{ px: 1.5, pb: 1.15, pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
            {showVote && <VoteButtons postId={post_id} voteCount={vote_count} initialVote={user_vote} />}
          </Box>
          <Tooltip title="Share">
            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleShare(); }}>
              <ShareOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={saved ? 'Remove bookmark' : 'Bookmark'}>
            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleBookmark(); }}>
              {saved ? <BookmarkRoundedIcon fontSize="small" /> : <BookmarkBorderOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Report">
            <IconButton size="small" color="error" disabled={reporting} onClick={(e) => { e.stopPropagation(); handleReport(); }}>
              <FlagOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Card>
  );
};

export default NewsCard;
