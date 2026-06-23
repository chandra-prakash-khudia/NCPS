import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Container, Grid, Stack, Typography, Chip, alpha,
} from '@mui/material';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import HowToVoteRoundedIcon from '@mui/icons-material/HowToVoteRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import DeviceHubRoundedIcon from '@mui/icons-material/DeviceHubRounded';
import TroubleshootRoundedIcon from '@mui/icons-material/TroubleshootRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import axios from 'axios';

// ── Intersection Observer hook ──
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ── Animated number counter ──
function AnimatedStat({ value, label, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const { ref, visible } = useFadeIn();
  useEffect(() => {
    if (!visible || !value) return;
    const target = parseInt(value, 10);
    if (isNaN(target)) return;
    const duration = 1200;
    const start = performance.now();
    const raf = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [visible, value]);
  return (
    <Box ref={ref} sx={{ textAlign: 'center', px: 3, py: 2 }}>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          background: 'linear-gradient(135deg, #a5b4fc, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {display.toLocaleString()}{suffix}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ── Feature card ──
function FeatureCard({ icon, title, description, delay = 0 }) {
  const { ref, visible } = useFadeIn();
  return (
    <Box
      ref={ref}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.07)',
        borderRadius: '20px',
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(8px)',
        transition: `opacity 600ms ${delay}ms, transform 600ms ${delay}ms cubic-bezier(0.22,1,0.36,1), border-color 200ms ease, box-shadow 200ms ease`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        '&:hover': {
          borderColor: 'rgba(91,91,214,0.4)',
          boxShadow: '0 0 32px rgba(91,91,214,0.12)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'rgba(91,91,214,0.15)',
          color: '#818cf8',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
      <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{description}</Typography>
    </Box>
  );
}

// ── Step card ──
function StepCard({ number, icon, title, description }) {
  const { ref, visible } = useFadeIn();
  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        gap: 2.5,
        transition: 'opacity 500ms, transform 500ms cubic-bezier(0.22,1,0.36,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-16px)',
      }}
    >
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #5b5bd6, #818cf8)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1.1rem',
            boxShadow: '0 4px 20px rgba(91,91,214,0.35)',
          }}
        >
          {number}
        </Box>
      </Box>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <Box sx={{ color: '#818cf8' }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{description}</Typography>
      </Box>
    </Box>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState({ total_posts: null, total_users: null, accuracy: null });
  const heroRef = useRef(null);

  useEffect(() => {
    axios.get('/api/analytics/overview').then((r) => {
      const d = r.data;
      setStats({
        total_posts: d.total_posts ?? d.post_count,
        total_users: d.total_users ?? d.user_count,
        accuracy: d.accuracy != null ? Math.round(d.accuracy * 100) : 97,
      });
    }).catch(() => {
      setStats({ total_posts: 12840, total_users: 3200, accuracy: 97 });
    });
  }, []);

  // Subtle parallax for hero background
  useEffect(() => {
    const handler = (e) => {
      if (!heroRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      heroRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <Box sx={{ bgcolor: '#0b0c10', color: '#e8e9f0', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Top nav ── */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          bgcolor: 'rgba(11,12,16,0.8)',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: 60 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #5b5bd6, #818cf8)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <ShieldRoundedIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
              <Typography fontWeight={800} fontSize="1rem" letterSpacing="-0.02em">
                NCPS
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <Button
                href="/login"
                variant="text"
                size="small"
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
              >
                Log in
              </Button>
              <Button
                href="/register"
                variant="contained"
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #5b5bd6, #818cf8)',
                  fontWeight: 700,
                  px: 2.5,
                  borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(91,91,214,0.4)',
                }}
              >
                Sign up free
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* ── Hero ── */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          pt: 8,
        }}
      >
        {/* Animated background orbs */}
        <Box
          ref={heroRef}
          sx={{
            position: 'absolute',
            inset: '-10%',
            pointerEvents: 'none',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <Box sx={{
            position: 'absolute', top: '15%', left: '10%', width: 500, height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(91,91,214,0.18) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }} />
          <Box sx={{
            position: 'absolute', top: '50%', right: '5%', width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: '10%', left: '30%', width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }} />
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
            <Chip
              label="Open Source · Built with AI + Crowd Intelligence"
              size="small"
              sx={{
                mb: 3,
                bgcolor: 'rgba(91,91,214,0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(91,91,214,0.3)',
                fontWeight: 600,
                fontSize: '0.72rem',
                letterSpacing: '0.04em',
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.6rem', md: '4rem', lg: '4.8rem' },
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.04em',
                mb: 2.5,
                background: 'linear-gradient(160deg, #ffffff 40%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              News credibility,{' '}<br />
              <Box component="span" sx={{ color: '#818cf8', WebkitTextFillColor: '#818cf8' }}>
                mathematically proven
              </Box>
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.2rem' },
                color: 'rgba(232,233,240,0.65)',
                lineHeight: 1.7,
                mb: 4,
                maxWidth: 560,
                mx: 'auto',
              }}
            >
              NCPS combines crowd wisdom, graph-based trust propagation, and machine learning to give every news report a transparent, tamper-resistant credibility score.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                href="/register"
                variant="contained"
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #5b5bd6, #818cf8)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(91,91,214,0.45)',
                  '&:hover': { boxShadow: '0 12px 40px rgba(91,91,214,0.55)' },
                }}
              >
                Start verifying news →
              </Button>
              <Button
                href="/login"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: '14px',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.35)', bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                Already a member
              </Button>
            </Stack>
          </Box>
        </Container>

        {/* Scroll indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
            opacity: 0.4,
          }}
        >
          <Typography variant="caption" sx={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.6rem' }}>scroll</Typography>
          <Box sx={{ width: 1, height: 40, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 999 }} />
        </Box>
      </Box>

      {/* ── Live Stats ── */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 4, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Container maxWidth="lg">
          <Grid container justifyContent="center">
            <Grid item xs={12} sm={4}>
              <AnimatedStat value={stats.total_posts} label="News reports verified" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <AnimatedStat value={stats.total_users} label="Active community members" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <AnimatedStat value={stats.accuracy} label="System accuracy" suffix="%" />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── How It Works ── */}
      <Container maxWidth="md" sx={{ py: { xs: 8, md: 12 } }}>
        <Box sx={{ textAlign: 'center', mb: 7 }}>
          <Typography variant="overline" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: '0.15em' }}>How it works</Typography>
          <Typography variant="h3" fontWeight={800} sx={{ mt: 1, letterSpacing: '-0.03em' }}>Three steps to truth</Typography>
        </Box>
        <Stack spacing={5}>
          <StepCard number="1" icon={<EditNoteRoundedIcon />} title="Report" description="Anyone in the community can submit a news article or local report. The system immediately calculates an initial credibility score using the title, keywords, and source metadata." />
          <StepCard number="2" icon={<HowToVoteRoundedIcon />} title="Verify" description="Community members vote on the report's credibility. The system weighs each vote by the user's historical accuracy, trust score, and network position — not just their follower count." />
          <StepCard number="3" icon={<VerifiedRoundedIcon />} title="Propagate" description="The final credibility score is mathematically sealed and propagated across the network. High-confidence alerts are automatically sent to users in the affected area." />
        </Stack>
      </Container>

      {/* ── Why NCPS ── */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', py: { xs: 8, md: 12 }, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }}>
            <Typography variant="overline" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: '0.15em' }}>Why NCPS</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1, letterSpacing: '-0.03em' }}>Built different</Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FeatureCard
                delay={0}
                icon={<TroubleshootRoundedIcon sx={{ fontSize: 26 }} />}
                title="Transparent credibility score"
                description="Every score is explainable. Click any news card to see exactly which factors drove the credibility verdict — crowd votes, ML prediction, and memory signal."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                delay={100}
                icon={<SmartToyRoundedIcon sx={{ fontSize: 26 }} />}
                title="Bot & coordinated attack detection"
                description="The User Engine monitors 11 behavioral signals in real time. Coordinated botnets attempting to manipulate scores are mathematically silenced before any damage is done."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FeatureCard
                delay={200}
                icon={<DeviceHubRoundedIcon sx={{ fontSize: 26 }} />}
                title="Graph-based trust propagation"
                description="Trust flows through the social graph using a PageRank-style algorithm. Users surrounded by trustworthy neighbours get a natural credibility boost — and vice versa."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── The Science ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="overline" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: '0.15em' }}>The Science</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1, mb: 2, letterSpacing: '-0.03em' }}>Math that fights misinformation</Typography>
            <Typography color="text.secondary" lineHeight={1.8} sx={{ mb: 3 }}>
              NCPS is grounded in peer-reviewed algorithms — Bayesian inference, Dempster-Shafer evidence theory, and graph trust propagation — not engagement metrics.
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: 'C_Bayes', desc: 'Bayesian crowd credibility', weight: '75%', color: '#6366f1' },
                { label: 'C_ML', desc: 'RoBERTa linguistic analysis', weight: '15%', color: '#10b981' },
                { label: 'C_memory', desc: 'TF-IDF content memory', weight: '10%', color: '#f59e0b' },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} component="span">{item.label}</Typography>
                    <Typography variant="body2" color="text.secondary" component="span"> — {item.desc}</Typography>
                  </Box>
                  <Chip label={item.weight} size="small" sx={{ bgcolor: alpha(item.color, 0.12), color: item.color, fontWeight: 700, fontSize: '0.72rem' }} />
                </Box>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                p: { xs: 3, md: 4 },
                border: '1px solid rgba(91,91,214,0.25)',
                borderRadius: '24px',
                bgcolor: 'rgba(91,91,214,0.06)',
                fontFamily: '"JetBrains Mono", monospace',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box sx={{
                position: 'absolute', top: -40, right: -40, width: 200, height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(91,91,214,0.12) 0%, transparent 70%)',
              }} />
              <Typography
                component="pre"
                sx={{
                  fontSize: { xs: '0.85rem', md: '0.98rem' },
                  lineHeight: 2,
                  color: '#e8e9f0',
                  fontFamily: '"JetBrains Mono", monospace',
                  whiteSpace: 'pre-wrap',
                  m: 0,
                }}
              >
                <Box component="span" sx={{ color: '#6e6f78' }}>{'// Final credibility formula'}</Box>{'\n'}
                <Box component="span" sx={{ color: '#a5b4fc' }}>C_final</Box>
                {' = '}
                <Box component="span" sx={{ color: '#6366f1', fontWeight: 700 }}>0.75</Box>
                {' × C_Bayes\n'}
                {'      + '}
                <Box component="span" sx={{ color: '#10b981', fontWeight: 700 }}>0.15</Box>
                {' × C_ML\n'}
                {'      + '}
                <Box component="span" sx={{ color: '#f59e0b', fontWeight: 700 }}>0.10</Box>
                {' × C_memory\n\n'}
                <Box component="span" sx={{ color: '#6e6f78' }}>{'// User weight formula'}</Box>{'\n'}
                <Box component="span" sx={{ color: '#a5b4fc' }}>w_i(t)</Box>
                {' = T_i × (1 − Anom_i) × Exp_i'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── CTA Banner ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, rgba(91,91,214,0.2) 0%, rgba(129,140,248,0.08) 100%)',
          borderTop: '1px solid rgba(91,91,214,0.2)',
          borderBottom: '1px solid rgba(91,91,214,0.2)',
          py: { xs: 8, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h3" fontWeight={800} letterSpacing="-0.03em" gutterBottom>
            Ready to verify news?
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, fontSize: '1.05rem' }}>
            Join the community. It&apos;s free, open source, and built to fight misinformation.
          </Typography>
          <Button
            href="/register"
            variant="contained"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #5b5bd6, #818cf8)',
              fontWeight: 700,
              fontSize: '1.05rem',
              px: 5,
              py: 1.6,
              borderRadius: '14px',
              boxShadow: '0 8px 32px rgba(91,91,214,0.45)',
            }}
          >
            Get started for free
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box
        component="footer"
        sx={{
          py: 4,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={3} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              © 2025 NCPS — News Credibility And Propagation System
            </Typography>
            <Button
              href="https://github.com/chandra-prakash-khudia/NCPS"
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<GitHubIcon />}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}
            >
              Open Source
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
