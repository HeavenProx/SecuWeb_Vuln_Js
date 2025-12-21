const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Route pour lister les utilisateurs
router.get('/', async (req, res) => {
  const sql = 'SELECT * FROM users';
  try {
    const [results] = await req.db.execute(sql);
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Route pour récupérer un utilisateur spécifique
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM users WHERE id = ?';
  try {
    const [results] = await req.db.execute(sql, [id]);
    if (results.length === 0) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'utilisateur :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// Route pour supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM users WHERE id = ?';
  try {
    await req.db.execute(sql, [id]);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'utilisateur :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// Route pour modifier un utilisateur
router.put('/:id', authenticate, [
  body('username').optional().isLength({ min: 3, max: 30 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères').trim().escape(),
  body('email').optional().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères').matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W)/).withMessage('Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractère spécial')
], async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // - admin : peut modifier n'importe quel user
  // - user normal : ne peut modifier que son compte
  if (req.user.role !== 'admin' && String(req.user.id) !== String(id)) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    // Fetch existing user
    const [existing] = await req.db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    const current = existing[0];

    const username = req.body.username !== undefined ? req.body.username : current.username;
    const email = req.body.email !== undefined ? req.body.email : current.email;
    let password = current.password;

    if (req.body.password) {
      password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }

    const sql = 'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?';

    await req.db.execute(sql, [username, email, password, id]);

    const updatedUser = {
      id,
      username,
      email,
    };
    res.json({
      message: 'Utilisateur modifié avec succès',
      user: updatedUser,
    });
  } catch (err) {
    console.error("Erreur lors de la modification de l'utilisateur :", err);
    res.status(500).json({ error: "Erreur lors de la modification de l'utilisateur" });
  }
});

// Route pour modifier le rôle d'un utilisateur (admin uniquement)
router.put('/:id/role', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Whitelist des rôles autorisés
  const allowedRoles = ['user', 'admin'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  const sql = 'UPDATE users SET role = ? WHERE id = ?';

  try {
    await req.db.execute(sql, [role, id]);
    res.json({
      message: 'Rôle mis à jour avec succès',
      user: { id, role },
    });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du rôle :', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
  }
});

module.exports = router;
