import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

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
        placeItems: 'center',
        px: 2,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Card
        className="glass-surface"
        sx={{
          width: 'min(100%, 460px)',
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={2.5}>
          <Stack spacing={1} alignItems="flex-start">
            <Chip
              icon={<SecurityOutlinedIcon />}
              label="NCPS secure workspace"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="h4" sx={{ fontSize: { xs: '1.65rem', sm: '2rem' } }}>
              {isRegister ? 'Create your account' : 'Sign in to NCPS'}
            </Typography>
            <Typography color="text.secondary">
              {isRegister
                ? 'Your votes, reports, trust score, and activity are kept under your own account.'
                : 'Use your account to report local news and cast weighted credibility votes.'}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to="/login"
              fullWidth
              variant={!isRegister ? 'contained' : 'outlined'}
              startIcon={<LoginOutlinedIcon />}
            >
              Login
            </Button>
            <Button
              component={RouterLink}
              to="/register"
              fullWidth
              variant={isRegister ? 'contained' : 'outlined'}
              startIcon={<PersonAddAltOutlinedIcon />}
            >
              Register
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {googleClientId && (
            <Stack spacing={1}>
              <Box ref={googleButtonRef} sx={{ minHeight: 44, display: 'grid', placeItems: 'center' }} />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                Google sign-in links to the same NCPS trust profile.
              </Typography>
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                autoComplete="email"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField('password')}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {isRegister && (
                <Typography variant="caption" color="text.secondary">
                  Passwords are stored as salted PBKDF2 hashes on the API server.
                </Typography>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={isRegister ? <PersonAddAltOutlinedIcon /> : <LoginOutlinedIcon />}
                sx={{ py: 1.35 }}
              >
                {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {isRegister ? 'Already registered?' : 'New to NCPS?'}{' '}
            <Box
              component={RouterLink}
              to={isRegister ? '/login' : '/register'}
              sx={{ color: theme.palette.primary.main, fontWeight: 800 }}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Box>
          </Typography>
        </Stack>
      </Card>
    </Box>
  );
};

export default AuthPage;
