const rateLimit = require('express-rate-limit');

// Limiteur pour tentative de connexion (brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 essai par 15 minutes par IP
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur pour la création de comptes
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // max 5 compte par heure par IP
  message: { error: 'Trop de créations de compte depuis cette IP. Réessayez dans une heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur ajouts de commentaires (anti-spam)
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 commentaires par minute par IP
  message: { error: 'Trop de commentaires. Réessayez dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, createAccountLimiter, commentLimiter };