import React, { useEffect, useRef, useState } from 'react';
import {
  Box, Card, Stack, Typography,
} from '@mui/material';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchFeed, updateLocation } from '../services/api';
import { getCredibilityColor, getRadiusTierLabel } from '../utils/helpers';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>';

const MapPage = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if (window.L) return Promise.resolve();
      return new Promise((resolve) => {
        if (document.querySelector('script[src*="leaflet"]')) {
          const check = setInterval(() => {
            if (window.L) { clearInterval(check); resolve(); }
          }, 100);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      await loadLeaflet();

      // Get location
      let lat = 28.6139, lon = 77.2090;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        updateLocation({ lat, lon }).catch(() => {});
      } catch {}

      // Load feed
      try {
        const res = await fetchFeed({ lat, lon, limit: 100 });
        setPosts(res.data.posts || []);
      } catch {}

      setLoading(false);

      // Init map
      if (mapRef.current && !mapInstanceRef.current) {
        const L = window.L;
        const map = L.map(mapRef.current).setView([lat, lon], 13);
        mapInstanceRef.current = map;

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

        // User marker
        const userIcon = L.divIcon({
          html: '<div style="width:16px;height:16px;border-radius:50%;background:#6366f1;border:3px solid rgba(99,102,241,0.3);box-shadow:0 0 12px rgba(99,102,241,0.5);"></div>',
          iconSize: [16, 16],
          className: '',
        });
        L.marker([lat, lon], { icon: userIcon })
          .addTo(map)
          .bindPopup('<strong>Your Location</strong>');
      }
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Add post markers when posts load
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !posts.length) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    posts.forEach((p) => {
      if (!p.lat || !p.lon) return;
      const color = getCredibilityColor(p.credibility);
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid ${color}40;box-shadow:0 0 8px ${color}60;"></div>`,
        iconSize: [12, 12],
        className: '',
      });

      const marker = L.marker([p.lat, p.lon], { icon }).addTo(map);

      const popup = `
        <div style="max-width:240px;font-family:Inter,sans-serif;font-size:12px;">
          <div style="font-weight:600;margin-bottom:4px;">${p.content?.slice(0, 100)}${p.content?.length > 100 ? '...' : ''}</div>
          <div style="color:${color};font-weight:700;font-family:'JetBrains Mono',monospace;">
            Credibility: ${(p.credibility * 100).toFixed(1)}%
          </div>
          <div style="color:#94a3b8;margin-top:2px;">
            ${getRadiusTierLabel((p.radius || 1000) / 1000)} · ${p.vote_count || 0} votes
          </div>
        </div>
      `;
      marker.bindPopup(popup);

      // Propagation radius circle
      if (p.radius) {
        L.circle([p.lat, p.lon], {
          radius: p.radius,
          color,
          fillColor: color,
          fillOpacity: 0.06,
          weight: 1,
          opacity: 0.3,
        }).addTo(map);
      }
    });
  }, [posts]);

  return (
    <Stack spacing={0}>
      {/* Map Legend */}
      <Card
        className="glass-surface"
        sx={{
          position: 'absolute',
          bottom: 90,
          left: 24,
          zIndex: 1000,
          p: 2,
          width: 'auto',
          minWidth: 180,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
          Legend
        </Typography>
        <Stack spacing={0.8} sx={{ mt: 1 }}>
          {[
            { color: '#10b981', label: 'High Credibility (≥70%)' },
            { color: '#f59e0b', label: 'Medium (40-70%)' },
            { color: '#ef4444', label: 'Low Credibility (<40%)' },
            { color: '#6366f1', label: 'Your Location' },
          ].map((item) => (
            <Stack key={item.label} direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* Map container */}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: 'calc(100vh - 80px)',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(10,14,23,0.8)',
          }}>
            <LoadingSpinner text="Loading map..." />
          </Box>
        )}
      </Box>
    </Stack>
  );
};

export default MapPage;
