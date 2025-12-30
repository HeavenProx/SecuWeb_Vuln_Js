const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');
const sanitizeHtml = require('sanitize-html');
const { body, validationResult } = require('express-validator');

// Route pour lister les commentaires d'un article
router.get('/articles/:id/comments', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM comments WHERE article_id = ?';

  try {
    const [results] = await req.db.execute(sql, [id]);
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des commentaires :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
});

// Route pour récupérer un commentaire
router.get('/comments/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM comments WHERE id = ?';
  try {
    const [results] = await req.db.execute(sql, [id]);
    if (results.length === 0) {
      res.status(404).json({ error: 'Commentaire introuvable' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Erreur lors de la récupération du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du commentaire' });
  }
});

// Route pour ajouter un commentaire (auth et rate limit)
const { commentLimiter } = require('../middlewares/rateLimit');
router.post('/articles/:id/comments', authenticate, commentLimiter, [
  body('content').isLength({ min: 1, max: 1000 }).withMessage('Le commentaire doit contenir entre 1 et 1000 caractères'),
  body('user_id').isInt().withMessage('user_id invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { content, user_id } = req.body;
  const cleanContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();

  if (Number(req.user.id) !== Number(user_id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit : user_id ne correspond pas au token' });
  }

  const sql = 'INSERT INTO comments (user_id, article_id, content) VALUES (?, ?, ?)';
  try {
    const [results] = await req.db.execute(sql, [user_id, id, cleanContent]);
    const newComment = {
      id: results.insertId,
      content: cleanContent,
      user_id,
      article_id: id
    };
    res.status(201).json({ message: "Commentaire ajouté à l'article", comment: newComment });
  } catch (err) {
    console.error('Erreur lors de la création du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la création du commentaire' });
  }
});

// Route pour supprimer un commentaire (admin seulement)
router.delete('/comments/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM comments WHERE id = ?';
  try {
    await req.db.execute(sql, [id]);
    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du commentaire :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire' });
  }
});

module.exports = router; 
