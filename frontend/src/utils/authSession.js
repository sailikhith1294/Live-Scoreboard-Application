const ACCOUNT_TYPES = ['match-centre', 'tournament-manager'];

const ACTIVE_ACCOUNT_TYPE_KEY = 'auth.activeAccountType';

const getSessionKey = (accountType, field) => `auth:${accountType}:${field}`;

const normalizeAccountType = (accountType) => {
  const value = String(accountType || '').trim().toLowerCase();
  return ACCOUNT_TYPES.includes(value) ? value : 'match-centre';
};

const getStoredActiveAccountType = () => {
  try {
    return normalizeAccountType(sessionStorage.getItem(ACTIVE_ACCOUNT_TYPE_KEY) || sessionStorage.getItem('activeAccountType'));
  } catch {
    return 'match-centre';
  }
};

const getStoredSession = (accountType = getStoredActiveAccountType()) => {
  const normalized = normalizeAccountType(accountType);
  try {
    const token = sessionStorage.getItem(getSessionKey(normalized, 'token'));
    const rawUser = sessionStorage.getItem(getSessionKey(normalized, 'user'));
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { accountType: normalized, token, user };
  } catch {
    return { accountType: normalizeAccountType(accountType), token: null, user: null };
  }
};

const storeSession = (accountType, token, user) => {
  const normalized = normalizeAccountType(accountType);
  if (!token || !user) return;

  sessionStorage.setItem(getSessionKey(normalized, 'token'), token);
  sessionStorage.setItem(getSessionKey(normalized, 'user'), JSON.stringify(user));
  sessionStorage.setItem(ACTIVE_ACCOUNT_TYPE_KEY, normalized);
  sessionStorage.setItem('activeAccountType', normalized);
};

const clearSession = (accountType = getStoredActiveAccountType()) => {
  const normalized = normalizeAccountType(accountType);
  sessionStorage.removeItem(getSessionKey(normalized, 'token'));
  sessionStorage.removeItem(getSessionKey(normalized, 'user'));
  sessionStorage.removeItem(ACTIVE_ACCOUNT_TYPE_KEY);
  sessionStorage.removeItem('activeAccountType');
};

const getDashboardRouteForAccountType = (accountType) => {
  return normalizeAccountType(accountType) === 'tournament-manager'
    ? '/tournament-dashboard'
    : '/match-centre-dashboard';
};

export {
  ACCOUNT_TYPES,
  normalizeAccountType,
  getStoredActiveAccountType,
  getStoredSession,
  storeSession,
  clearSession,
  getDashboardRouteForAccountType
};
