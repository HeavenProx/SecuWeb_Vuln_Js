const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Route pour s'inscrire
router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  try {
    const [results] = await req.db.execute(sql, [email]);
    if (results.length === 0) {
      return res.status(401).json({ error: 'Email incorrect' });
    }
    const user = results[0];
    if (user.password !== password) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    const token = generateToken(user);
    res.json({ message: 'Connexion réussie', token, user });
  } catch (err) {
    console.error('Erreur lors de la connexion :', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
