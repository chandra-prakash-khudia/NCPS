import React, { useMemo, useState } from 'react';
import {
  Box, Button, Card, Chip, MenuItem, Select, Stack, TextField, Typography, alpha,
} from '@mui/material';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import NearMeOutlinedIcon from '@mui/icons-material/NearMeOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createPost, uploadPostImage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { categoryOptions, detectUrgency, getUrgencyInfo } from '../utils/helpers';
import { buildArticleContent } from '../utils/articleFormat';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const CreateNewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [category, setCategory] = useState('civic');

  const draftText = useMemo(
    () => [headline, summary, body].filter(Boolean).join(' '),
    [headline, summary, body],
  );
  const { keywords: urgencyKws } = detectUrgency(draftText);
  const urgInfo = getUrgencyInfo(detectUrgency(draftText).maxUrgency);

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
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  React.useEffect(() => { requestLocation(); }, []);

  React.useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setHeadline('');
    setSummary('');
    setBody('');
    setSourceUrl('');
    clearImage();
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (headline.trim().length < 12) {
      toast.error('Headline needs at least 12 characters.');
      return;
    }
    if (body.trim().length < 40) {
      toast.error('Story body needs at least 40 characters.');
      return;
    }
    let normalizedSource = sourceUrl.trim();
    if (normalizedSource) {
      try {
        const parsed = new URL(normalizedSource);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
        normalizedSource = parsed.toString();
      } catch {
        toast.error('Source link must be a valid http:// or https:// URL.');
        return;
      }
    } else {
      normalizedSource = '';
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const uploadRes = await uploadPostImage(imageFile);
        imageUrl = uploadRes.data.image_url;
      }
      const content = buildArticleContent(headline, summary, body);
      const res = await createPost({
        content,
        category,
        lat: location?.lat,
        lon: location?.lon,
        image_url: imageUrl || undefined,
        source_url: normalizedSource || undefined,
      });
      toast.success('Report submitted! The community will verify its credibility.');
      if (res.data?.post_id) {
        navigate(`/post/${res.data.post_id}`);
        return;
      }
      setSuccess(true);
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
          <Button variant="outlined" onClick={resetForm}>
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
          Write a headline and story. Photo and source link are optional.
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
          <TextField
            label="Headline"
            fullWidth
            required
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Clear headline summarizing what happened"
            inputProps={{ maxLength: 220 }}
          />

          <TextField
            label="Summary (optional)"
            fullWidth
            multiline
            minRows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short context — who, what, when."
          />

          <TextField
            label="Story"
            fullWidth
            required
            multiline
            minRows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full report in short paragraphs. Separate paragraphs with a blank line."
            helperText={`${body.length} characters`}
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Photo (optional)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button variant="outlined" component="label" startIcon={<ImageOutlinedIcon />} size="small">
                {imageFile ? 'Change photo' : 'Upload photo'}
                <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
              </Button>
              {imageFile && (
                <Button size="small" onClick={clearImage}>
                  Remove
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                JPEG, PNG, WebP, or GIF · max 5 MB
              </Typography>
            </Stack>
            {imagePreview && (
              <Box
                component="img"
                src={imagePreview}
                alt="Preview"
                sx={{ mt: 1.5, maxWidth: '100%', maxHeight: 220, borderRadius: 2, border: (t) => `1px solid ${t.palette.divider}` }}
              />
            )}
          </Box>

          <TextField
            label="Source link (optional)"
            fullWidth
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://example.com/article"
            InputProps={{
              startAdornment: <LinkOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            helperText="Official page, news outlet, or document — not required"
          />

          {urgencyKws.length > 0 && (
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
          )}

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
            disabled={loading || headline.trim().length < 12 || body.trim().length < 40}
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
