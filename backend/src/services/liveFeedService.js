const axios = require('axios');
const { Match } = require('../models');

const LIVE_TEXT_RE = /(live|in\s*progress|ongoing|innings|need\s+\d+\s+runs?|trail by|lead by|powerplay|runs? in \d+ balls?)/i;
const FINAL_TEXT_RE = /(won by|defeated|match tied|drawn|abandoned|no result|finished|completed|result)/i;

const cricApiBaseURL = process.env.CRICAPI_BASE_URL || 'https://api.cricapi.com/v1';
const apiSportsBaseURL = process.env.API_SPORTS_BASE_URL || 'https://apiv2.api-cricket.com/';
const LIVE_FEED_CACHE_MS = Math.max(3000, Number(process.env.LIVE_FEED_CACHE_MS || 15000));

const liveFeedCache = {
  fetchedAt: 0,
  matches: [],
  ready: false,
};
let liveFeedInFlight = null;

const sanitizeKey = (value) => String(value || '').trim().split('#')[0].trim();

const getCricApiKeys = () => {
  const keys = [
    process.env.CRICAPI_KEY,
    process.env.SPORTS_API_KEY,
    process.env.SPORTS_API_KEY_2,
    ...String(process.env.SPORTS_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  ]
    .map(sanitizeKey)
    .filter(Boolean);

  return [...new Set(keys)];
};

const getApiSportsKey = () => sanitizeKey(process.env.API_SPORTS_KEY);

const normalizeStatus = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'scheduled';

  if (LIVE_TEXT_RE.test(text)) return 'live';
  if (FINAL_TEXT_RE.test(text)) return 'completed';

  if (['live', 'in progress', 'in-progress', 'ongoing'].includes(text)) return 'live';
  if (['completed', 'finished', 'result', 'ended', 'abandoned'].includes(text)) return 'completed';
  return 'scheduled';
};

const mapProviderMatch = (raw = {}) => {
  const statusText = [raw.status, raw.ms, raw.state].filter(Boolean).join(' ');
  const status = normalizeStatus(statusText);

  const teams = Array.isArray(raw.teamInfo) && raw.teamInfo.length >= 2
    ? raw.teamInfo
    : Array.isArray(raw.teams) && raw.teams.length >= 2
      ? raw.teams.map((name) => ({ name, shortname: String(name).slice(0, 3).toUpperCase() }))
      : [];

  const scheduledAt = raw.dateTimeGMT || raw.date || null;

  return {
    id: raw.id || raw.matchId || raw.unique_id,
    externalId: raw.id || raw.matchId || raw.unique_id,
    matchNo: raw.name || raw.matchType || 'Match',
    status,
    scheduledAt,
    format: raw.matchType || raw.format || 'T20',
    venue: raw.venue || raw.ground || raw.location || 'TBD',
    team1: {
      name: teams[0]?.name || 'Team 1',
      shortName: teams[0]?.shortname || teams[0]?.shortName || 'TM1',
    },
    team2: {
      name: teams[1]?.name || 'Team 2',
      shortName: teams[1]?.shortname || teams[1]?.shortName || 'TM2',
    },
    providerStatus: statusText || null,
    source: 'live-api',
  };
};

const mapApiSportsMatch = (raw = {}) => {
  const eventStatus = [
    raw.event_status,
    raw.event_game_result,
    raw.event_status_info,
    raw.event_live,
  ].filter(Boolean).join(' ');

  const status = normalizeStatus(eventStatus);

  const homeName = raw.event_home_team || raw.home_team || raw.homeTeam || 'Team 1';
  const awayName = raw.event_away_team || raw.away_team || raw.awayTeam || 'Team 2';

  const date = raw.event_date_start || raw.event_date || raw.match_date || null;
  const time = raw.event_time || raw.match_time || '';
  const scheduledAt = date ? `${date}${time ? ` ${time}` : ''}` : null;

  return {
    id: raw.event_key || raw.match_key || raw.id,
    externalId: raw.event_key || raw.match_key || raw.id,
    matchNo: raw.event_name || raw.event_match || `${homeName} vs ${awayName}`,
    status,
    scheduledAt,
    format: raw.league_round || raw.event_type || raw.match_type || 'T20',
    venue: raw.event_venue || raw.event_stadium || raw.venue || 'TBD',
    team1: {
      name: homeName,
      shortName: String(homeName).slice(0, 3).toUpperCase(),
    },
    team2: {
      name: awayName,
      shortName: String(awayName).slice(0, 3).toUpperCase(),
    },
    providerStatus: eventStatus || null,
    source: 'api-sports',
  };
};

const mergeProviderMap = (merged, match) => {
  if (!match?.id) return;

  const existing = merged.get(match.id);
  if (!existing) {
    merged.set(match.id, match);
    return;
  }

  const weight = { live: 3, scheduled: 2, completed: 1 };
  if ((weight[match.status] || 0) >= (weight[existing.status] || 0)) {
    merged.set(match.id, { ...existing, ...match });
  }
};

const fetchCricApiMatchesForKey = async (apiKey) => {
  if (!apiKey) return [];

  const endpoints = ['/currentMatches', '/matches'];
  const merged = new Map();

  for (const endpoint of endpoints) {
    try {
      const { data } = await axios.get(`${cricApiBaseURL}${endpoint}`, {
        params: { apikey: apiKey, offset: 0 },
        timeout: 12000,
      });

      const rows = Array.isArray(data?.data) ? data.data : [];
      rows.forEach((item) => {
        const match = mapProviderMatch(item);
        mergeProviderMap(merged, match);
      });
    } catch (_) {
      // Keep partial data when one provider endpoint fails.
    }
  }

  return Array.from(merged.values());
};

const fetchCricApiMatches = async () => {
  const keys = getCricApiKeys();
  if (keys.length === 0) return [];

  const merged = new Map();
  for (const key of keys) {
    const rows = await fetchCricApiMatchesForKey(key);
    rows.forEach((row) => mergeProviderMap(merged, row));
  }

  return Array.from(merged.values());
};

const fetchApiSportsMatches = async () => {
  const apiKey = getApiSportsKey();
  if (!apiKey) return [];

  const methods = ['get_livescore', 'get_fixtures'];
  const merged = new Map();

  for (const method of methods) {
    try {
      const { data } = await axios.get(apiSportsBaseURL, {
        params: {
          method,
          APIkey: apiKey,
        },
        timeout: 12000,
      });

      const rows = Array.isArray(data?.result) ? data.result : [];
      rows.forEach((item) => {
        const mapped = mapApiSportsMatch(item);
        mergeProviderMap(merged, mapped);
      });
    } catch (_) {
      // Keep partial data if one API-Sports method fails.
    }
  }

  return Array.from(merged.values());
};

const mapDbMatch = (m) => ({
  id: String(m._id),
  matchNo: m.matchNo || 'Match',
  status: normalizeStatus(m.status),
  scheduledAt: m.scheduledAt || null,
  format: m.oversLimit === 50 ? 'ODI' : 'T20',
  venue: m.venue || 'TBD',
  team1: { name: m.homeTeamId?.name || 'Team 1', shortName: m.homeTeamId?.shortCode || 'TM1' },
  team2: { name: m.awayTeamId?.name || 'Team 2', shortName: m.awayTeamId?.shortCode || 'TM2' },
  source: 'db',
});

const fetchDatabaseMatches = async () => {
  const rows = await Match.find({})
    .populate('homeTeamId', 'name shortCode')
    .populate('awayTeamId', 'name shortCode')
    .sort({ scheduledAt: 1 })
    .limit(300);

  return rows.map(mapDbMatch);
};

const fetchMergedMatches = async () => {
  const age = Date.now() - liveFeedCache.fetchedAt;
  if (liveFeedCache.ready && age < LIVE_FEED_CACHE_MS) {
    return liveFeedCache.matches;
  }

  if (liveFeedInFlight) {
    return liveFeedInFlight;
  }

  liveFeedInFlight = (async () => {
  const [cricApiMatches, apiSportsMatches, dbMatches] = await Promise.all([
    fetchCricApiMatches(),
    fetchApiSportsMatches(),
    fetchDatabaseMatches(),
  ]);

  const providerMatches = [...cricApiMatches, ...apiSportsMatches];

  const merged = new Map();
  dbMatches.forEach((m) => merged.set(String(m.id), m));

  providerMatches.forEach((m) => {
    const key = String(m.id || m.externalId);
    if (!key) return;
    if (!merged.has(key)) {
      merged.set(key, m);
      return;
    }

    const existing = merged.get(key);
    if (existing.source === 'db' && (m.source === 'live-api' || m.source === 'api-sports')) {
      merged.set(key, { ...existing, ...m, source: existing.source });
    }
  });

  const result = Array.from(merged.values()).sort((a, b) => {
    const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return at - bt;
  });

  liveFeedCache.matches = result;
  liveFeedCache.fetchedAt = Date.now();
  liveFeedCache.ready = true;
  return result;
  })();

  try {
    return await liveFeedInFlight;
  } finally {
    liveFeedInFlight = null;
  }
};

const fetchMatchDetailsById = async (matchId) => {
  const keys = getCricApiKeys();
  if (keys.length === 0) return null;

  for (const key of keys) {
    try {
      const { data } = await axios.get(`${cricApiBaseURL}/match_scorecard`, {
        params: { apikey: key, id: matchId },
        timeout: 12000,
      });

      const match = data?.data;
      if (!match) continue;

      const mapped = mapProviderMatch(match);
      const batting = Array.isArray(match?.score) ? match.score : [];

      return {
        match: mapped,
        scorecard: {
          runs: Number(batting[0]?.r || 0),
          wickets: Number(batting[0]?.w || 0),
          overs: Number(batting[0]?.o || 0),
        },
        events: [],
        decisions: [],
        providerRaw: match,
      };
    } catch (_) {
      // Try next key.
    }
  }

  return null;
};

module.exports = {
  fetchMergedMatches,
  fetchMatchDetailsById,
  normalizeStatus,
};
