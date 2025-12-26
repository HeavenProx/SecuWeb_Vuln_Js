const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const SALT_ROUNDS = 10;

// Route pour s'inscrire
const { createAccountLimiter, loginLimiter } = require('../middlewares/rateLimit');

router.post('/register', createAccountLimiter, [
  body('username')
    .isLength({ min: 3, max: 30 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères')
    .trim().escape(),
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)/).withMessage('Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    const [existingUsers] = await req.db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [results] = await req.db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    res.status(201).json({ message: 'Utilisateur créé avec succès', id: results.insertId });
  } catch (err) {
    console.error('Erreur lors de l\'inscription :', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Route pour se connecter
router.post('/login', loginLimiter, [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').exists().withMessage('Mot de passe requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  try {
    const [results] = await req.db.execute(sql, [email]);
    if (results.length === 0) {
      return res.status(401).json({ error: 'Email incorrect' });
    }
    const user = results[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Do not expose password
    const { password: _pwd, ...userSafe } = user;

    const token = generateToken(userSafe);
    res.json({ message: 'Connexion réussie', token, user: userSafe });
  } catch (err) {
    console.error('Erreur lors de la connexion :', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
