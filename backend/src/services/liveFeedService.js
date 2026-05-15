const axios = require('axios');
const { Match } = require('../models');

const LIVE_TEXT_RE = /(live|in\s*progress|ongoing|innings|need\s+\d+\s+runs?|trail by|lead by|powerplay|runs? in \d+ balls?)/i;
const FINAL_TEXT_RE = /(won by|defeated|match tied|drawn|abandoned|no result|finished|completed|result)/i;

const cricApiBaseURL = process.env.CRICAPI_BASE_URL || 'https://api.cricapi.com/v1';
const apiSportsBaseURL = process.env.API_SPORTS_BASE_URL || 'https://apiv2.api-cricket.com/';
const entitySportBaseURL = process.env.ENTITY_SPORT_BASE_URL || 'https://api.entitysport.com/v2';
const LIVE_FEED_CACHE_MS = Math.max(3000, Number(process.env.LIVE_FEED_CACHE_MS || 30000)); 

const globalCache = {
  fetchedAt: 0,
  matches: [],
  ready: false,
};
let globalFetchInFlight = null;

const sanitizeKey = (value) => {
  if (!value) return null;
  let key = String(value).trim().split('#')[0].trim();
  if (key.length === 38 && /^[0-9a-fA-F-]+$/.test(key)) {
    key = key.slice(0, 36);
  }
  return key;
};

const getSportsApiKeys = () => {
  const keys = [
    process.env.SPORTS_API_KEY,
    process.env.SPORTS_API_KEY_2,
    process.env.CRICAPI_KEY,
    ...String(process.env.SPORTS_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  ]
    .map(sanitizeKey)
    .filter(k => k && k.length >= 32);

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

const mapProviderMatch = (raw = {}, source = 'live-api') => {
  const statusText = [raw.status, raw.ms, raw.state].filter(Boolean).join(' ');
  const status = normalizeStatus(statusText);

  const teams = Array.isArray(raw.teamInfo) && raw.teamInfo.length >= 2
    ? raw.teamInfo
    : Array.isArray(raw.teams) && raw.teams.length >= 2
      ? raw.teams.map((name) => ({ name, shortname: String(name).slice(0, 3).toUpperCase() }))
      : (raw.name || '').includes(' vs ')
        ? (raw.name.split(',')[0].split(' vs ').map(n => ({ name: n.trim(), shortname: n.trim().slice(0, 3).toUpperCase() })))
        : [];

  const scheduledAt = raw.dateTimeGMT || raw.date || raw.scheduledAt || null;
  const t1 = {
    name: teams[0]?.name || teams[0]?.shortname || raw.team1?.name || 'Team 1',
    shortName: teams[0]?.shortname || teams[0]?.shortName || raw.team1?.shortName || 'TM1',
  };
  const t2 = {
    name: teams[1]?.name || teams[1]?.shortname || raw.team2?.name || 'Team 2',
    shortName: teams[1]?.shortname || teams[1]?.shortName || raw.team2?.shortName || 'TM2',
  };

  // Score extraction for CricAPI
  const score = Array.isArray(raw.score) ? raw.score : [];
  const scoreText = score.map(s => `${s.inning}: ${s.r}/${s.w} (${s.o})`).join(' | ');

  return {
    id: raw.id || raw.matchId || raw.unique_id,
    externalId: raw.id || raw.matchId || raw.unique_id,
    matchNo: raw.name || raw.matchType || 'Match',
    status,
    scheduledAt,
    format: raw.matchType || raw.format || 'T20',
    venue: raw.venue || raw.ground || raw.location || 'TBD',
    team1: t1,
    team2: t2,
    scorecard: {
      runs: score[0]?.r || 0,
      wickets: score[0]?.w || 0,
      overs: score[0]?.o || 0,
      text: scoreText || raw.status || ''
    },
    result: raw.status || '',
    source,
    providerStatus: statusText || null,
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
  const homeName = raw.event_home_team || raw.home_team || 'Team 1';
  const awayName = raw.event_away_team || raw.away_team || 'Team 2';

  const date = raw.event_date_start || raw.event_date || null;
  const time = raw.event_time || '';
  const scheduledAt = date ? `${date}${time ? ` ${time}` : ''}` : null;

  // Score extraction for API-Sports (Cricket API usually has these fields)
  const homeScore = raw.event_home_final_score || raw.event_home_team_score || '0';
  const awayScore = raw.event_away_final_score || raw.event_away_team_score || '0';
  
  // Extract runs/wickets if possible (format: "150/5")
  const parseScore = (s) => {
    const parts = String(s).split('/');
    return { runs: parseInt(parts[0]) || 0, wickets: parseInt(parts[1]) || 0 };
  };

  const hScore = parseScore(homeScore);
  const aScore = parseScore(awayScore);

  return {
    id: raw.event_key || raw.match_key || raw.id,
    externalId: raw.event_key || raw.match_key || raw.id,
    matchNo: raw.event_name || `${homeName} vs ${awayName}`,
    status,
    scheduledAt,
    format: raw.league_round || 'T20',
    venue: raw.event_venue || 'TBD',
    team1: { name: homeName, shortName: String(homeName).slice(0, 3).toUpperCase() },
    team2: { name: awayName, shortName: String(awayName).slice(0, 3).toUpperCase() },
    scorecard: {
      runs: hScore.runs || aScore.runs, // Default to showing one team's score in list
      wickets: hScore.wickets || aScore.wickets,
      text: `${homeName} ${homeScore} - ${awayName} ${awayScore}`
    },
    result: raw.event_final_result || raw.event_status_info || '',
    source: 'api-sports',
    providerStatus: eventStatus || null,
  };
};

const fetchSportsApiMatches = async () => {
  const keys = getSportsApiKeys();
  if (keys.length === 0) return [];

  for (const apiKey of keys) {
    const merged = new Map();
    const endpoints = ['/currentMatches', '/matches'];
    let keyWorked = false;

    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.get(`${cricApiBaseURL}${endpoint}`, {
          params: { apikey: apiKey, offset: 0 },
          timeout: 10000,
        });

        if (data?.status === 'success') {
          keyWorked = true;
          const rows = Array.isArray(data?.data) ? data.data : [];
          rows.forEach((item) => {
            const match = mapProviderMatch(item, 'cricapi');
            if (match.id) merged.set(String(match.id), match);
          });
        } else if (data?.status === 'failure' && (data.reason === 'Invalid API Key' || data.message === 'Invalid API Key')) {
          break; // Try next key
        }
      } catch (err) {
        console.error(`CricAPI Error (${endpoint}):`, err.message);
      }
    }

    if (keyWorked) {
      return Array.from(merged.values());
    }
  }

  return [];
};

const fetchApiSportsMatches = async () => {
  const apiKey = getApiSportsKey();
  if (!apiKey) return [];

  const merged = new Map();
  const methods = ['get_livescore', 'get_fixtures'];

  for (const method of methods) {
    try {
      const { data } = await axios.get(apiSportsBaseURL, {
        params: { method, APIkey: apiKey },
        timeout: 8000,
      });

      if (data && !data.error) {
        const rows = Array.isArray(data.result) ? data.result : [];
        rows.forEach((item) => {
          const match = mapApiSportsMatch(item);
          if (match.id) merged.set(String(match.id), match);
        });
      }
    } catch (err) {
      console.error(`API-Sports Error (${method}):`, err.message);
    }
  }

  return Array.from(merged.values());
};

const fetchGlobalMatches = async (force = false) => {
  try {
    const existingMatches = await Match.find({ 
      source: { $in: ['cricapi', 'api-sports'] },
      externalId: { $ne: null } 
    });
    console.log(`[GlobalFeed] Found ${existingMatches.length} existing global matches in DB`);
    
    const now = Date.now();
    const liveMatches = existingMatches.filter(m => m.status === 'live');
    const scheduledMatches = existingMatches.filter(m => m.status === 'scheduled');
    const completedMatches = existingMatches.filter(m => m.status === 'completed');

    // 2. Determine if we need a fresh API fetch
    // Live: fetch if cache > 30s
    const needsLiveFetch = force || liveMatches.length === 0 || (now - globalCache.fetchedAt > 30000);
    // Scheduled: fetch if cache > 1h
    const needsScheduledFetch = force || scheduledMatches.length === 0 || (now - globalCache.fetchedAt > 3600000);
    // Completed: fetch if cache > 6h (to get latest results)
    const needsCompletedFetch = force || completedMatches.length === 0 || (now - globalCache.fetchedAt > 21600000);

    if (!needsLiveFetch && !needsScheduledFetch && !needsCompletedFetch && globalCache.ready) {
      return globalCache.matches;
    }

    if (globalFetchInFlight) return globalFetchInFlight;

    globalFetchInFlight = (async () => {
      try {
        const [cricapi, apisports] = await Promise.all([
          fetchSportsApiMatches().catch(() => []),
          fetchApiSportsMatches().catch(() => []),
        ]);

        const allApiMatches = [...cricapi, ...apisports];
        console.log(`[GlobalFeed] Fetched ${allApiMatches.length} fresh matches from providers`);
        
        // 3. Upsert into DB to persist
        for (const m of allApiMatches) {
          await Match.findOneAndUpdate(
            { externalId: String(m.externalId) },
            {
              status: m.status,
              scheduledAt: m.scheduledAt,
              format: m.format,
              venue: m.venue,
              source: m.source,
              team1Data: m.team1,
              team2Data: m.team2,
              scorecardData: m.scorecard,
              lastFetchedAt: new Date(),
              providerStatus: m.providerStatus
            },
            { upsert: true, new: true }
          );
        }

        // 4. Cleanup: Maintain only the latest 30 COMPLETED API matches
        const completedGlobalMatches = await Match.find({ 
          source: { $ne: 'organized' },
          status: 'completed'
        }).sort({ scheduledAt: -1 });
        
        if (completedGlobalMatches.length > 30) {
          const idsToDelete = completedGlobalMatches.slice(30).map(m => m._id);
          await Match.deleteMany({ _id: { $in: idsToDelete } });
        }

        // 5. Return unified list from DB (to ensure consistency)
        const updatedMatches = await Match.find({ source: { $ne: 'organized' } }).sort({ scheduledAt: 1 });
        
        const result = updatedMatches.map(m => ({
          id: String(m._id),
          externalId: m.externalId,
          matchNo: m.matchNo,
          status: m.status,
          scheduledAt: m.scheduledAt,
          format: m.format,
          venue: m.venue,
          team1: m.team1Data || { name: 'T1', shortName: 'T1' },
          team2: m.team2Data || { name: 'T2', shortName: 'T2' },
          scorecard: m.scorecardData || { text: m.providerStatus },
          source: m.source,
          providerStatus: m.providerStatus
        }));

        globalCache.matches = result;
        globalCache.fetchedAt = Date.now();
        globalCache.ready = true;
        return result;
      } catch (err) {
        console.error('Global Persistence Fetch Error:', err.message);
        return globalCache.matches;
      } finally {
        globalFetchInFlight = null;
      }
    })();

    return globalFetchInFlight;
  } catch (err) {
    console.error('Cache Layer Error:', err.message);
    return [];
  }
};

const fetchOrganizedMatches = async () => {
  try {
    const matches = await Match.find({ 
      source: { $nin: ['cricapi', 'api-sports'] } 
    })
      .populate('homeTeamId', 'name shortCode')
      .populate('awayTeamId', 'name shortCode')
      .populate('tossWinnerTeamId', 'name shortCode')
      .sort({ scheduledAt: 1 })
      .limit(100)
      .lean();

    return matches.map((m) => {
      const hTeam = m.homeTeamId || {};
      const aTeam = m.awayTeamId || {};
      
      return {
        id: String(m._id),
        matchNo: m.matchNo,
        status: m.status,
        scheduledAt: m.scheduledAt,
        format: m.oversLimit === 50 ? 'ODI' : 'T20',
        venue: m.venue || 'Platform Venue',
        team1: { 
          name: hTeam.name || 'Team 1', 
          shortName: hTeam.shortCode || 'TM1',
          shortCode: hTeam.shortCode || 'TM1' 
        },
        team2: { 
          name: aTeam.name || 'Team 2', 
          shortName: aTeam.shortCode || 'TM2',
          shortCode: aTeam.shortCode || 'TM2'
        },
        homeTeamId: hTeam,
        awayTeamId: aTeam,
        tossWinnerTeamId: m.tossWinnerTeamId,
        tossDecision: m.tossDecision,
        source: 'organized',
        currentRuns: m.currentRuns || 0,
        currentWickets: m.currentWickets || 0,
        currentOver: m.currentOver || 0,
        currentBall: m.currentBall || 0,
        activeStrikerData: m.activeStrikerData,
        activeNonStrikerData: m.activeNonStrikerData,
        activeBowlerData: m.activeBowlerData,
      };
    });
  } catch (err) {
    console.error('DB Fetch Error:', err.message);
    return [];
  }
};

const fetchMatchDetailsById = async (matchId) => {
  const mongoose = require('mongoose');
  const isObjectId = mongoose.Types.ObjectId.isValid(matchId);

  let dbMatch = null, scorecard = null, events = [], decisions = [];

  if (isObjectId) {
    const results = await Promise.all([
      Match.findById(matchId).populate('homeTeamId', 'name shortCode').populate('awayTeamId', 'name shortCode').populate('tossWinnerTeamId', 'name shortCode'),
      require('../models').Scorecard.findOne({ matchId }),
      require('../models').BallEvent.find({ matchId }).sort({ createdAt: 1 }),
      require('../models').UmpireDecision.find({ matchId }).sort({ createdAt: 1 }),
    ]);
    dbMatch = results[0];
    scorecard = results[1];
    events = results[2];
    decisions = results[3];
  }

  if (dbMatch) {
    const isApiMatch = dbMatch.source === 'api';
    return {
      match: {
        id: String(dbMatch._id),
        homeTeamId: dbMatch.homeTeamId,
        awayTeamId: dbMatch.awayTeamId,
        externalId: dbMatch.externalId,
        status: dbMatch.status,
        team1: isApiMatch ? dbMatch.team1Data : { name: dbMatch.homeTeamId?.name, shortName: dbMatch.homeTeamId?.shortCode, id: dbMatch.homeTeamId?._id },
        team2: isApiMatch ? dbMatch.team2Data : { name: dbMatch.awayTeamId?.name, shortName: dbMatch.awayTeamId?.shortCode, id: dbMatch.awayTeamId?._id },
        venue: dbMatch.venue,
        format: dbMatch.format,
        tossWinnerTeamId: dbMatch.tossWinnerTeamId,
        tossDecision: dbMatch.tossDecision,
        oversLimit: dbMatch.oversLimit,
        powerplayOvers: dbMatch.powerplayOvers,
        activeStrikerData: dbMatch.activeStrikerData,
        activeNonStrikerData: dbMatch.activeNonStrikerData,
        activeBowlerData: dbMatch.activeBowlerData,
      },
      scorecard: isApiMatch ? {
        runs: dbMatch.scorecardData?.runs || 0,
        wickets: dbMatch.scorecardData?.wickets || 0,
        overs: dbMatch.scorecardData?.overs || 0,
        text: dbMatch.scorecardData?.text || dbMatch.providerStatus || 'Match Completed'
      } : {
        runs: scorecard?.runs || 0,
        wickets: scorecard?.wickets || 0,
        overs: scorecard?.overs || 0,
        text: `${scorecard?.runs || 0}/${scorecard?.wickets || 0} (${scorecard?.overs || 0})`
      },
      events: events || [],
      decisions: decisions || []
    };
  }

  // Logic for Global API matches (either found by ObjectId or externalId)
  const apiMatch = dbMatch?.source === 'api' ? dbMatch : await Match.findOne({ externalId: String(matchId) });
  
  if (apiMatch) {
    const now = new Date();
    const isLive = apiMatch.status === 'live';
    const isStale = !apiMatch.lastFetchedAt || (now - apiMatch.lastFetchedAt > (isLive ? 30000 : 3600000));
    const hasNoScore = !apiMatch.scorecardData || (apiMatch.scorecardData.runs === 0 && apiMatch.scorecardData.wickets === 0);

    // If live or stale or has no score, try to fetch fresh data from API
    if (isLive || isStale || hasNoScore) {
      const freshDetails = await getFreshApiScore(String(apiMatch.externalId || matchId));
      if (freshDetails) return freshDetails;
    }

    // Fallback to DB data
    return {
      match: {
        id: String(apiMatch._id),
        externalId: apiMatch.externalId,
        status: apiMatch.status,
        team1: apiMatch.team1Data,
        team2: apiMatch.team2Data,
        venue: apiMatch.venue,
        format: apiMatch.format,
        scheduledAt: apiMatch.scheduledAt,
        providerStatus: apiMatch.providerStatus,
        source: apiMatch.source
      },
      scorecard: {
        runs: apiMatch.scorecardData?.runs || 0,
        wickets: apiMatch.scorecardData?.wickets || 0,
        overs: apiMatch.scorecardData?.overs || 0,
        text: apiMatch.scorecardData?.text || apiMatch.providerStatus || 'Match Details'
      },
      events: [],
      decisions: [],
      source: apiMatch.source
    };
  }
  return null;
};

const getFreshApiScore = async (matchId) => {
  const sportsKeys = getSportsApiKeys();
  for (const key of sportsKeys) {
    try {
      const { data } = await axios.get(`${cricApiBaseURL}/match_scorecard`, {
        params: { apikey: key, id: matchId },
        timeout: 10000,
      });

      if (data?.status === 'success' && data.data) {
        const match = mapProviderMatch(data.data, 'cricapi');
        const scores = Array.isArray(data.data.score) ? data.data.score : [];
        const latest = scores[0] || {};
        const scoreText = scores.map(s => `${s.inning}: ${s.r}/${s.w} (${s.o})`).join(' | ') || data.data.status;
        
        // Persist the detail update
        await Match.findOneAndUpdate(
           { externalId: String(matchId) },
           { 
             scorecardData: { runs: latest.r || 0, wickets: latest.w || 0, overs: latest.o || 0, text: scoreText }, 
             lastFetchedAt: new Date() 
           }
        );

        return {
          match,
          scorecard: {
            runs: latest.r || 0,
            wickets: latest.w || 0,
            overs: latest.o || 0,
            text: scoreText
          },
          events: [],
          decisions: [],
          source: 'cricapi'
        };
      }
    } catch (err) { /* Try next key */ }
  }

  const apiSportsKey = getApiSportsKey();
  if (apiSportsKey) {
    try {
      const { data } = await axios.get(apiSportsBaseURL, {
        params: { method: 'get_fixtures', APIkey: apiSportsKey, event_key: matchId },
        timeout: 8000,
      });

      if (data && !data.error && data.result?.length > 0) {
        const raw = data.result[0];
        const match = mapApiSportsMatch(raw);
        
        // Persist for API-Sports too
        await Match.findOneAndUpdate(
          { externalId: String(matchId) },
          { 
            scorecardData: match.scorecard,
            lastFetchedAt: new Date() 
          }
        );

        return {
          match,
          scorecard: match.scorecard,
          events: [],
          decisions: [],
          source: 'api-sports'
        };
      }
    } catch (err) { console.error('API-Sports Detail Error:', err.message); }
  }
  return null;
};

// Backward compatibility wrapper
const fetchMergedMatches = async (force = false) => {
  const [globalRaw, organized] = await Promise.all([
    fetchGlobalMatches(force),
    fetchOrganizedMatches(),
  ]);

  const organizedKeys = new Set(organized.map(m => {
    const timeKey = m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0;
    return `${String(m.team1.name).toLowerCase()}-${String(m.team2.name).toLowerCase()}-${timeKey}`;
  }));

  const filteredGlobal = globalRaw.filter(m => {
    const timeKey = m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0;
    const fuzzyKey = `${String(m.team1.name).toLowerCase()}-${String(m.team2.name).toLowerCase()}-${timeKey}`;
    return !organizedKeys.has(fuzzyKey);
  });

  return [...organized, ...filteredGlobal];
};

module.exports = {
  fetchGlobalMatches,
  fetchOrganizedMatches,
  fetchMatchDetailsById,
  fetchMergedMatches, // Kept for compatibility but we should update controllers
  normalizeStatus,
  getSportsApiKeys,
};
