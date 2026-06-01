import React, { useState } from 'react';
import {
  Box, Button, Card, Chip, MenuItem, Select, Stack, TextField, Typography, alpha,
} from '@mui/material';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createPost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { categoryOptions, detectUrgency, getUrgencyInfo } from '../utils/helpers';

const CreateNewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [category, setCategory] = useState('other');

  const { maxUrgency, keywords: urgencyKws } = detectUrgency(content);
  const urgInfo = getUrgencyInfo(maxUrgency);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationStatus('detected');
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  React.useEffect(() => { requestLocation(); }, []);

  const handleSubmit = async () => {
    if (content.trim().length < 10) {
      toast.error('Please provide at least 10 characters.');
      return;
    }
    setLoading(true);
    try {
      await createPost({
        content: content.trim(),
        category,
        lat: location?.lat,
        lon: location?.lon,
      });
      setSuccess(true);
      toast.success('Report submitted! The community will verify its credibility.');
    } catch (err) {
      toast.error('Failed to submit: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card
        className="glass-surface"
        sx={{ p: { xs: 4, md: 6 }, textAlign: 'center', maxWidth: 560, mx: 'auto' }}
      >
        <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Report Submitted!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your report has been created. Its credibility will be determined by community verification.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button variant="contained" onClick={() => navigate('/')}>
            View Feed
          </Button>
          <Button
            variant="outlined"
            onClick={() => { setContent(''); setSuccess(false); }}
          >
            New Report
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack spacing={1.8} sx={{ maxWidth: 680, mx: 'auto' }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <PostAddOutlinedIcon color="primary" />
          <Typography variant="h4">Create Report</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Report an incident. The community will verify its credibility through weighted voting.
        </Typography>
        <Chip
          label={`Reporting as ${user?.name || 'NCPS user'}`}
          size="small"
          variant="outlined"
          sx={{ mt: 1, fontWeight: 700 }}
        />
      </Box>

      <Card className="glass-surface" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={1.8}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              What's happening?
            </Typography>
            <TextField
              multiline
              rows={5}
              fullWidth
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the incident in detail. Include location, what you observed, and any relevant context..."
              inputProps={{ maxLength: 5000 }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.95rem',
                },
              }}
            />
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {urgencyKws.map((kw) => (
                  <Chip
                    key={kw}
                    label={kw}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      bgcolor: alpha('#f4212e', 0.12),
                      color: '#f4212e',
                      height: 20,
                    }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {content.length} / 5000
              </Typography>
            </Stack>
          </Box>

          {/* Urgency preview */}
          {urgInfo && (
            <Card
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${alpha(urgInfo.color, 0.2)}`,
                bgcolor: alpha(urgInfo.color, 0.05),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography>{urgInfo.emoji}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: urgInfo.color }}>
                  Detected: {urgInfo.label}
                </Typography>
              </Stack>
            </Card>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Category
            </Typography>
            <Select fullWidth value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoryOptions.filter((item) => item.value !== 'all').map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
              ))}
            </Select>
          </Box>

          {/* Location */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Location
            </Typography>
            <Card
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: (t) => `1px solid ${t.palette.divider}`,
                bgcolor: (t) => alpha(t.palette.background.paper, 0.5),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <NearMeOutlinedIcon
                  fontSize="small"
                  color={locationStatus === 'detected' ? 'success' : 'action'}
                />
                <Typography variant="body2" color={locationStatus === 'detected' ? 'success.main' : 'text.secondary'}>
                  {locationStatus === 'detected'
                    ? `📍 ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                    : locationStatus === 'detecting'
                    ? 'Detecting location...'
                    : '📍 Location unavailable — post will have no location'}
                </Typography>
              </Stack>
            </Card>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={loading || content.trim().length < 10}
            onClick={handleSubmit}
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
};

export default CreateNewsPage;
