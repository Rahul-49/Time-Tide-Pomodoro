import React, { useEffect, useState } from 'react';
import { getWeather } from '../services/api';

// Weather component: asks for location permission, fetches weather, and renders
// a compact navbar-friendly block. Falls back gracefully if permission denied.
function Weather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(false); // controls inline search visibility in compact view

  const fetchWeather = async (lat, lon) => {
    try {
      const data = await getWeather(lat, lon);
      setWeather(data);
      setError(null);
      setEditing(false); // auto-hide inline search after success
      setQuery('');
    } catch (err) {
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    setLoading(true);
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('Geolocation not available');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather(latitude, longitude);
      },
      (geoErr) => {
        console.warn('Geolocation error:', geoErr);
        setError('Location permission denied');
        setLoading(false);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  };

  const searchCity = async (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;
    try {
      setSearching(true);
      setLoading(true);
      setError(null);
      // Use Nominatim (OpenStreetMap) for geocoding without API key
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const best = results[0];
        const lat = parseFloat(best.lat);
        const lon = parseFloat(best.lon);
        await fetchWeather(lat, lon);
      } else {
        setError('City not found');
        setLoading(false);
      }
    } catch (err) {
      setError('Search failed');
      setLoading(false);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    // Try to detect current permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((res) => {
        setPermission(res.state);
        res.onchange = () => setPermission(res.state);
        // Do not auto-request; show search if denied, otherwise try location once
        if (res.state === 'granted') requestLocation();
        else { setLoading(false); setError('Location off'); }
      }).catch(() => {
        // Fallback: just request
        setLoading(false);
        setError('Location off');
      });
    } else {
      setLoading(false);
      setError('Location off');
    }
  }, []);

  if (loading) {
    return (
      <div className="text-white me-4 d-none d-md-flex align-items-center">
        <span className="spinner-border spinner-border-sm me-2" role="status" />
        <small>Locating...</small>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="d-none d-md-flex align-items-center gap-2">
        <form className="d-flex" onSubmit={searchCity}>
          <input
            type="text"
            className="form-control form-control-sm bg-transparent text-white border-secondary"
            style={{ width: 180 }}
            placeholder="Search city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-sm btn-primary ms-2" type="submit" disabled={searching}>
            {searching ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-search" />}
          </button>
        </form>
        <button className="btn btn-sm btn-outline-light" onClick={requestLocation} title="Use my location">
          <i className="bi bi-geo-alt" />
        </button>
        {permission === 'denied' && (
          <small className="text-white-50">Enable location in browser settings</small>
        )}
      </div>
    );
  }

  const tempC = Math.round(weather.main?.temp || 0);
  const desc = weather.weather?.[0]?.description || '';
  const city = weather.name || '';
  const iconCode = weather.weather?.[0]?.icon;
  const iconUrl = iconCode ? `https://openweathermap.org/img/wn/${iconCode}@2x.png` : null;

  return (
    <div className="text-white me-4 d-none d-md-flex align-items-center gap-2">
      {iconUrl ? (
        <img src={iconUrl} alt={desc} style={{ width: 28, height: 28 }} />
      ) : (
        <i className="bi bi-thermometer-half" />
      )}
      <span>{tempC}°C</span>
      {city ? <span className="ms-1">{city}</span> : null}
      <span className="text-capitalize ms-1">{desc}</span>
      {/* Toggle inline search */}
      {!editing ? (
        <button className="btn btn-sm btn-outline-light ms-2" type="button" onClick={() => setEditing(true)} title="Change city">
          <i className="bi bi-search" />
        </button>
      ) : (
        <form className="d-flex ms-3" onSubmit={searchCity}>
          <input
            type="text"
            className="form-control form-control-sm bg-transparent text-white border-secondary"
            style={{ width: 160 }}
            placeholder="Type city and Enter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button className="btn btn-sm btn-outline-light ms-2" type="submit" disabled={searching} title="Search city">
            <i className="bi bi-check" />
          </button>
          <button className="btn btn-sm btn-outline-light ms-1" type="button" onClick={() => { setEditing(false); setQuery(''); }} title="Cancel">
            <i className="bi bi-x" />
          </button>
        </form>
      )}
    </div>
  );
}

export default Weather;
