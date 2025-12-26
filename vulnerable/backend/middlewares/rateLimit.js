const rateLimit = require('express-rate-limit');

// Limiteur pour les tentatives de connexion (brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts per 15 minutes per IP
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur pour la création de comptes
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // max 5 accounts per hour per IP
  message: { error: 'Trop de créations de compte depuis cette IP. Réessayez dans une heure.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur pour les ajouts de commentaires (anti-spam)
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 commentaires par minute par IP
  message: { error: 'Trop de commentaires. Réessayez dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, createAccountLimiter, commentLimiter };