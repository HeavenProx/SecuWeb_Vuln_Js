// Simple CSRF protection middleware based on Origin/Referer and X-Requested-With header
// Note: this is a pragmatic server-side protection for SPA + token authentication

const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

function isRefererAllowed(referer) {
  if (!referer) return false;
  return allowedOrigins.some(origin => referer.startsWith(origin));
}

const csrfProtection = (req, res, next) => {
  // only apply to mutating methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const xRequestedWith = req.get('x-requested-with');
  const authHeader = req.get('authorization');

  const originOk = isOriginAllowed(origin);
  const refererOk = isRefererAllowed(referer);
  const ajaxHeaderOk = xRequestedWith && xRequestedWith.toLowerCase() === 'xmlhttprequest';
  const hasAuthHeader = authHeader && authHeader.toLowerCase().startsWith('bearer ');

  // Allow if request comes from allowed origin, allowed referer, ajax header (XHR), or contains Authorization bearer token
  if (!originOk && !refererOk && !ajaxHeaderOk && !hasAuthHeader) {
    return res.status(403).json({ error: 'Requête bloquée (CSRF protection)' });
  }

  next();
};

module.exports = { csrfProtection, allowedOrigins };