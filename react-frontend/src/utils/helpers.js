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

/** Get color based on credibility score (0-1) */
export function getCredibilityColor(score) {
  if (score >= 0.7) return '#00ba7c';
  if (score >= 0.4) return '#f59e0b';
  return '#f4212e';
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
  if (urgency >= 0.7) return { label: 'High Urgency', color: '#f4212e' };
  if (urgency >= 0.4) return { label: 'Medium', color: '#f59e0b' };
  if (urgency >= 0.1) return { label: 'Low', color: '#00ba7c' };
  return null;
}

/** Get indicator info */
export function getIndicatorInfo(name) {
  const map = {
    'Community Verified': { color: '#00ba7c', bg: 'rgba(0,186,124,0.12)', icon: 'OK' },
    'Trending':           { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'T' },
    'Frequently Discussed': { color: '#1d9bf0', bg: 'rgba(29,155,240,0.12)', icon: 'D' },
    'Recommended':        { color: '#1d9bf0', bg: 'rgba(29,155,240,0.12)', icon: 'R' },
    'Hyperlocal':         { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: '1km' },
    'Global':             { color: '#1d9bf0', bg: 'rgba(29,155,240,0.12)', icon: 'G' },
  };
  return map[name] || { color: '#71767b', bg: 'rgba(113,118,123,0.12)', icon: '.' };
}

/** Get trust badge for user */
export function getTrustBadge(trustScore) {
  if (trustScore >= 0.9) return { label: 'Expert', color: '#f59e0b', icon: 'Top' };
  if (trustScore >= 0.7) return { label: 'Trusted', color: '#00ba7c', icon: 'T' };
  if (trustScore >= 0.5) return { label: 'Verifier', color: '#1d9bf0', icon: 'V' };
  if (trustScore >= 0.3) return { label: 'Contributor', color: '#536471', icon: 'C' };
  return { label: 'Newcomer', color: '#71767b', icon: 'N' };
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
