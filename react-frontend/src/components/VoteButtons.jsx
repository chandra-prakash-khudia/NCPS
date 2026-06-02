import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbUpRoundedIcon from '@mui/icons-material/ThumbUpRounded';
import ThumbDownRoundedIcon from '@mui/icons-material/ThumbDownRounded';
import { votePost } from '../services/api';
import { CRED_GREEN, CRED_RED } from '../utils/helpers';
import { toast } from 'react-toastify';

const VoteButtons = ({ postId, voteCount = 0, initialVote = null, onVoteComplete }) => {
  const [userVote, setUserVote] = useState(initialVote);
  const [loading, setLoading] = useState(false);
  const [localCount, setLocalCount] = useState(voteCount);

  useEffect(() => {
    setUserVote(initialVote);
    setLocalCount(voteCount);
  }, [initialVote, voteCount, postId]);

  const handleVote = async (direction) => {
    if (loading || userVote === direction) return;

    setLoading(true);
    try {
      const res = await votePost({
        post_id: postId,
        vote: direction,
      });
      setUserVote(direction);
      setLocalCount((prev) => prev + 1);
      if (onVoteComplete) onVoteComplete(res.data);
      toast.success('Vote recorded!');
    } catch (err) {
      toast.error('Failed to vote: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        size="small"
        variant={userVote === 1 ? 'contained' : 'outlined'}
        disabled={loading || userVote !== null}
        onClick={() => handleVote(1)}
        startIcon={userVote === 1 ? <ThumbUpRoundedIcon /> : <ThumbUpOutlinedIcon />}
        sx={{
          borderRadius: 99,
          px: 2,
          minWidth: 0,
          fontSize: '0.8rem',
          ...(userVote === 1 && {
            backgroundImage: 'none',
            background: alpha(CRED_GREEN, 0.15),
            color: CRED_GREEN,
            border: `1px solid ${alpha(CRED_GREEN, 0.3)}`,
            '&:hover': {
              backgroundImage: 'none',
              background: alpha(CRED_GREEN, 0.2),
            },
          }),
        }}
      >
        Credible
      </Button>
      <Button
        size="small"
        variant={userVote === -1 ? 'contained' : 'outlined'}
        disabled={loading || userVote !== null}
        onClick={() => handleVote(-1)}
        startIcon={userVote === -1 ? <ThumbDownRoundedIcon /> : <ThumbDownOutlinedIcon />}
        sx={{
          borderRadius: 99,
          px: 2,
          minWidth: 0,
          fontSize: '0.8rem',
          ...(userVote === -1 && {
            backgroundImage: 'none',
            background: alpha(CRED_RED, 0.15),
            color: CRED_RED,
            border: `1px solid ${alpha(CRED_RED, 0.3)}`,
            '&:hover': {
              backgroundImage: 'none',
              background: alpha(CRED_RED, 0.2),
            },
          }),
        }}
      >
        Dispute
      </Button>
      <Box sx={{ flex: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {localCount} {localCount === 1 ? 'vote' : 'votes'}
      </Typography>
    </Stack>
  );
};

export default VoteButtons;
