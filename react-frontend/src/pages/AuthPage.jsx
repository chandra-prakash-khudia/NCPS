import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { NCPS_FULL_NAME, NCPS_NAME } from '../constants/branding';

const valueProps = [
  { Icon: ShieldRoundedIcon, title: 'Credibility, not clicks', body: 'Every report carries a live trust score from weighted community votes.' },
  { Icon: HowToVoteRoundedIcon, title: 'Your judgement counts', body: 'Reliable voters gain influence; coordinated manipulation is detected and discounted.' },
  { Icon: NearMeRoundedIcon, title: 'Hyperlocal first', body: 'See what is happening within a kilometre, then zoom out to the world.' },
  { Icon: InsightsRoundedIcon, title: 'Transparent by design', body: 'Open any report to see exactly how its credibility was decided.' },
];

const AuthPage = ({ mode = 'login' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, register } = useAuth();
  const isRegister = mode === 'register';
  const googleButtonRef = useRef(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const destination = useMemo(() => {
    const from = location.state?.from?.pathname;
    return from && !from.startsWith('/login') && !from.startsWith('/register') ? from : '/';
  }, [location.state]);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setError('');
          setLoading(true);
          try {
            await loginWithGoogle(response.credential);
            toast.success('Signed in with Google.');
            navigate(destination, { replace: true });
          } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Google sign-in failed.');
          } finally {
            setLoading(false);
          }
        },
      });
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: theme.palette.mode === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        width: 390,
        text: isRegister ? 'signup_with' : 'signin_with',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', renderGoogleButton, { once: true });
      return () => existing.removeEventListener('load', renderGoogleButton);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [destination, googleClientId, isRegister, loginWithGoogle, navigate, theme.palette.mode]);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegister && form.name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    if (!form.email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (form.password.length < (isRegister ? 8 : 1)) {
      setError(isRegister ? 'Password must be at least 8 characters.' : 'Enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        toast.success('Account created.');
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
        toast.success('Welcome back.');
      }
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      {/* Brand / value panel */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          backgroundImage: `linear-gradient(155deg, ${theme.palette.primary.dark}, ${alpha(theme.palette.primary.main, 0.92)} 55%, ${theme.palette.primary.light})`,
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.18, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative' }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.16)', backdropFilter: 'blur(4px)' }}>
            <ShieldRoundedIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.2rem' }}>{NCPS_NAME}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{NCPS_FULL_NAME}</Typography>
          </Box>
        </Stack>

        <Box sx={{ position: 'relative', my: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 760, mb: 1.5, fontSize: '2.1rem', lineHeight: 1.15 }}>
            Know what to believe, and who to trust.
          </Typography>
          <Typography sx={{ opacity: 0.9, maxWidth: 420, mb: 4 }}>
            A trust-aware feed for local news — resistant to bots, spoofing, and coordinated manipulation.
          </Typography>
          <Stack spacing={2.5} sx={{ maxWidth: 440 }}>
            {valueProps.map(({ Icon, title, body }) => (
              <Stack key={title} direction="row" spacing={1.75} alignItems="flex-start">
                <Box sx={{ width: 38, height: 38, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', flexShrink: 0 }}>
                  <Icon fontSize="small" />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>{body}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Typography variant="caption" sx={{ opacity: 0.7, position: 'relative' }}>
          14 trust signals · graph-based propagation · spatial verification
        </Typography>
      </Box>

      {/* Form panel */}
      <Box sx={{ display: 'grid', placeItems: 'center', px: { xs: 2.5, sm: 5 }, py: 5 }}>
        <Stack spacing={2.5} sx={{ width: 'min(100%, 420px)' }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', textAlign: 'left' }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '11px',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                backgroundImage: `linear-gradient(150deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
              }}
            >
              <ShieldRoundedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{NCPS_NAME}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
                {NCPS_FULL_NAME}
              </Typography>
            </Box>
          </Stack>

          <Card className="glass-surface" sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', sm: '1.8rem' }, mb: 0.75 }}>
                {isRegister ? 'Create your account' : 'Welcome back'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {isRegister
                  ? 'Start reporting and voting on local credibility in minutes.'
                  : `Sign in to your ${NCPS_NAME} trust profile to continue.`}
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            {googleClientId && (
              <Stack spacing={1.5}>
                <Box ref={googleButtonRef} sx={{ minHeight: 44, display: 'grid', placeItems: 'center' }} />
                <Divider sx={{ '&::before, &::after': { borderColor: 'divider' } }}>
                  <Typography variant="caption" color="text.secondary">or with email</Typography>
                </Divider>
              </Stack>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {isRegister && (
                  <TextField
                    label="Full name"
                    value={form.name}
                    onChange={updateField('name')}
                    autoComplete="name"
                    fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineOutlinedIcon fontSize="small" /></InputAdornment> }}
                  />
                )}
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={updateField('email')}
                  autoComplete="email"
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlinedIcon fontSize="small" /></InputAdornment> }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={updateField('password')}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" onClick={() => setShowPassword((c) => !c)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                          {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText={isRegister ? 'At least 8 characters · stored as a salted PBKDF2 hash' : ' '}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={isRegister ? <PersonAddAltOutlinedIcon /> : <LoginOutlinedIcon />}
                  sx={{ py: 1.25 }}
                >
                  {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {isRegister ? 'Already have an account?' : `New to ${NCPS_NAME}?`}{' '}
              <Box component={RouterLink} to={isRegister ? '/login' : '/register'} sx={{ color: 'primary.main', fontWeight: 700 }}>
                {isRegister ? 'Sign in' : 'Create one'}
              </Box>
            </Typography>
          </Stack>
        </Card>
        </Stack>
      </Box>
    </Box>
  );
};

export default AuthPage;
