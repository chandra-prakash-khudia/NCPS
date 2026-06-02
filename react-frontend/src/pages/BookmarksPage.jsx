import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Grid, InputAdornment, MenuItem, Stack, TextField,
} from '@mui/material';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import NewsCard from '../components/NewsCard';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMyBookmarks } from '../services/api';
import { categoryOptions } from '../utils/helpers';

const sortOptions = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'credible', label: 'Most credible' },
  { value: 'discussed', label: 'Most discussed' },
];

const BookmarksPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyBookmarks();
      setPosts(res.data.bookmarks || res.data.posts || []);
    } catch {
      setError('Could not load your bookmarks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    let list = posts.map((p) => ({ ...p, is_bookmarked: true }));
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.content || '').toLowerCase().includes(q));
    if (category !== 'all') list = list.filter((p) => (p.category || 'other') === category);
    const sorted = [...list];
    if (sort === 'credible') sorted.sort((a, b) => (b.credibility || 0) - (a.credibility || 0));
    else if (sort === 'discussed') sorted.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    else sorted.sort((a, b) => new Date(b.bookmarked_at || b.created_at) - new Date(a.bookmarked_at || a.created_at));
    return sorted;
  }, [posts, search, category, sort]);

  const availableCategories = useMemo(() => {
    const present = new Set(posts.map((p) => p.category || 'other'));
    return categoryOptions.filter((c) => c.value === 'all' || present.has(c.value));
  }, [posts]);

  return (
    <Box className="rise-in">
      <PageHeader
        eyebrow="Saved"
        title="Bookmarks"
        subtitle="Reports you saved to revisit. Their credibility keeps updating as the community votes."
        actions={
          <Button size="small" variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={load}>
            Refresh
          </Button>
        }
      />

      {!loading && !error && posts.length > 0 && (
        <Box className="glass-surface" sx={{ p: 1.5, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved reports…"
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ maxWidth: { md: 340 } }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {availableCategories.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  size="small"
                  variant={category === c.value ? 'filled' : 'outlined'}
                  color={category === c.value ? 'primary' : 'default'}
                  onClick={() => setCategory(c.value)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
            <TextField select size="small" label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 160 }}>
              {sortOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Stack>
        </Box>
      )}

      {loading ? (
        <LoadingSpinner text="Loading your bookmarks…" />
      ) : error ? (
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={load}>Retry</Button>}>{error}</Alert>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BookmarkRoundedIcon />}
          title={posts.length ? 'No saved reports match' : 'Nothing saved yet'}
          description={posts.length ? 'Try clearing the filter.' : 'Tap the bookmark icon on any report to keep it here for later.'}
          action={!posts.length && <Button variant="contained" href="/">Browse feed</Button>}
        />
      ) : (
        <Grid container spacing={2}>
          {visible.map((post) => (
            <Grid key={post.post_id} size={{ xs: 12, md: 6, xl: 4 }}>
              <NewsCard post={post} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default BookmarksPage;
