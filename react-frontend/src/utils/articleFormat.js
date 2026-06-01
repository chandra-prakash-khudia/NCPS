/** Split stored post text into headline, optional deck, and body paragraphs. */

export function resolveMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url;
}

export function buildArticleContent(headline, summary, body) {
  const parts = [headline.trim()];
  if (summary?.trim()) parts.push(summary.trim());
  parts.push(body.trim());
  return parts.join('\n\n');
}

export function parseArticleContent(content) {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return { headline: 'Untitled report', deck: null, paragraphs: [] };
  }

  const blocks = trimmed.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  if (blocks.length >= 3) {
    return {
      headline: blocks[0],
      deck: blocks[1],
      paragraphs: blocks.slice(2),
    };
  }

  if (blocks.length === 2) {
    const secondIsShort = blocks[1].length <= 280 && !blocks[1].includes('\n');
    if (secondIsShort && blocks[1].split(/[.!?]/).length <= 3) {
      return { headline: blocks[0], deck: blocks[1], paragraphs: [] };
    }
    return { headline: blocks[0], deck: null, paragraphs: [blocks[1]] };
  }

  const single = blocks[0] || trimmed;
  const sentenceEnd = single.search(/[.!?](\s|$)/);
  if (sentenceEnd > 20 && sentenceEnd <= 220) {
    const headline = single.slice(0, sentenceEnd + 1).trim();
    const rest = single.slice(sentenceEnd + 1).trim();
    if (rest) {
      const paras = rest.split(/\n+/).map((p) => p.trim()).filter(Boolean);
      return {
        headline,
        deck: paras.length > 1 && paras[0].length <= 280 ? paras[0] : null,
        paragraphs: paras.length > 1 && paras[0].length <= 280 ? paras.slice(1) : paras,
      };
    }
    return { headline, deck: null, paragraphs: [] };
  }

  if (single.length > 140) {
    return {
      headline: `${single.slice(0, 137).trim()}…`,
      deck: null,
      paragraphs: [single],
    };
  }

  return { headline: single, deck: null, paragraphs: [] };
}

export function formatCategoryLabel(category) {
  if (!category || category === 'other') return 'News';
  return category
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatIstDateline(iso, prefix = 'Updated') {
  if (!iso) return `${prefix} —`;
  try {
    const formatted = new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${prefix} - ${formatted} IST`;
  } catch {
    return `${prefix} —`;
  }
}

export function formatLocationTag(post) {
  if (post?.lat != null && post?.lon != null) {
    return `${Number(post.lat).toFixed(2)}°N, ${Number(post.lon).toFixed(2)}°E`;
  }
  return 'NCPS Wire';
}
