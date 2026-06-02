import { formatDistanceToNow, parseISO } from 'date-fns';

/** Format ISO date string to relative time */
export function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  try {
    const date = typeof isoStr === 'string' ? parseISO(isoStr) : new Date(isoStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

// Shared semantic hues — mid-tone values chosen to stay legible on both the
// near-black dark surface and the off-white light surface.
export const CRED_GREEN = '#10b981';
export const CRED_AMBER = '#f59e0b';
export const CRED_RED = '#ef4456';
export const BRAND_INDIGO = '#6366f1';
export const CYAN = '#06b6d4';

/** Get color based on credibility score (0-1) */
export function getCredibilityColor(score) {
  if (score >= 0.7) return CRED_GREEN;
  if (score >= 0.4) return CRED_AMBER;
  return CRED_RED;
}

/** Get label for credibility score */
export function getCredibilityLabel(score) {
  if (score >= 0.8) return 'Highly Credible';
  if (score >= 0.6) return 'Likely Credible';
  if (score >= 0.4) return 'Uncertain';
  if (score >= 0.2) return 'Likely False';
  return 'Low Credibility';
}

/** Format distance in meters to human-readable */
export function formatDistance(meters) {
  if (!meters && meters !== 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Get radius tier label */
export function getRadiusTierLabel(km) {
  if (km <= 1) return 'Hyperlocal';
  if (km <= 5) return 'Local';
  if (km <= 10) return 'District';
  if (km <= 25) return 'Regional';
  return 'Wide';
}

/** Get urgency badge info */
export function getUrgencyInfo(urgency) {
  if (urgency >= 0.7) return { label: 'High urgency', color: CRED_RED };
  if (urgency >= 0.4) return { label: 'Medium', color: CRED_AMBER };
  if (urgency >= 0.1) return { label: 'Low', color: CRED_GREEN };
  return null;
}

/** Get indicator info */
export function getIndicatorInfo(name) {
  const map = {
    'Community Verified':   { color: CRED_GREEN, bg: 'rgba(16,185,129,0.12)', icon: 'OK' },
    'Trending':             { color: CRED_AMBER, bg: 'rgba(245,158,11,0.12)', icon: 'T' },
    'Frequently Discussed': { color: BRAND_INDIGO, bg: 'rgba(99,102,241,0.12)', icon: 'D' },
    'Recommended':          { color: BRAND_INDIGO, bg: 'rgba(99,102,241,0.12)', icon: 'R' },
    'Hyperlocal':           { color: CYAN, bg: 'rgba(6,182,212,0.12)', icon: '1km' },
    'Global':               { color: BRAND_INDIGO, bg: 'rgba(99,102,241,0.12)', icon: 'G' },
  };
  return map[name] || { color: '#8b8d98', bg: 'rgba(139,141,152,0.12)', icon: '.' };
}

/** Get trust badge for user */
export function getTrustBadge(trustScore) {
  if (trustScore >= 0.9) return { label: 'Expert', color: CRED_AMBER, icon: 'Top' };
  if (trustScore >= 0.7) return { label: 'Trusted', color: CRED_GREEN, icon: 'T' };
  if (trustScore >= 0.5) return { label: 'Verifier', color: BRAND_INDIGO, icon: 'V' };
  if (trustScore >= 0.3) return { label: 'Contributor', color: '#8b8d98', icon: 'C' };
  return { label: 'Newcomer', color: '#8b8d98', icon: 'N' };
}

export const categoryOptions = [
  { value: 'all', label: 'All' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'crime', label: 'Crime' },
  { value: 'weather', label: 'Weather' },
  { value: 'politics', label: 'Politics' },
  { value: 'sports', label: 'Sports' },
  { value: 'health', label: 'Health' },
  { value: 'business', label: 'Business' },
  { value: 'education', label: 'Education' },
  { value: 'civic', label: 'Civic' },
  { value: 'other', label: 'Other' },
];

/** Urgency keywords for report form */
export const urgencyKeywords = {
  fire: 1.0, accident: 0.9, urgent: 0.8, help: 0.7,
  emergency: 1.0, danger: 0.9, flood: 0.95, earthquake: 1.0,
  explosion: 1.0, shooting: 1.0, traffic: 0.4, disruption: 0.5,
  blocked: 0.5, delayed: 0.4,
};

/** Detect urgency from text */
export function detectUrgency(text) {
  const words = text.toLowerCase().split(/\s+/);
  let maxUrg = 0;
  const found = [];
  words.forEach((w) => {
    if (urgencyKeywords[w] && !found.includes(w)) {
      found.push(w);
      maxUrg = Math.max(maxUrg, urgencyKeywords[w]);
    }
  });
  return { maxUrgency: maxUrg, keywords: found };
}
