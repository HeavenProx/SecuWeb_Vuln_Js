const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middlewares/authMiddleware');
const sanitizeHtml = require('sanitize-html');
const { body, validationResult } = require('express-validator');

// Route pour récupérer tous les articles
router.get('/', async (req, res) => {
  const sql = 'SELECT * FROM articles';
  try {
    const [results] = await req.db.execute(sql);
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la récupération des articles :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
  }
});

// Route pour chercher un article par titre
router.post('/search', async (req, res) => {
  const { title } = req.body;
  const sql = 'SELECT * FROM articles WHERE title LIKE ?';

  try {
    const [results] = await req.db.execute(sql, [`${title}%`]);
    res.json(results);
  } catch (err) {
    console.error('Erreur lors de la recherche des articles :', err);
    res.status(500).json({ error: 'Erreur lors de la recherche des articles' });
  }
});

// Route pour récupérer un article spécifique
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM articles WHERE id = ?';
  try {
    const [results] = await req.db.execute(sql, [id]);
    if (results.length === 0) {
      res.status(404).json({ error: 'Article introuvable' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'article :', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'article' });
  }
});

// Route pour créer un article
router.post('/', [
  body('title').isLength({ min: 3, max: 200 }).withMessage('Le titre doit contenir entre 3 et 200 caractères').trim().escape(),
  body('content').isLength({ min: 1, max: 5000 }).withMessage('Le contenu doit contenir entre 1 et 5000 caractères'),
  body('author_id').isInt().withMessage('author_id invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, content, author_id } = req.body;
  const cleanContent = sanitizeHtml(content, {
    allowedTags: ['p', 'a', 'b', 'i', 'em', 'strong', 'h2', 'h3', 'section', 'ul', 'ol', 'li'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        return { tagName: 'a', attribs: { href, target: attribs.target || '_blank', rel: 'noopener noreferrer' } };
      }
    }
  }).trim();
  const sql = 'INSERT INTO articles (title, content, author_id) VALUES (?, ?, ?)';
  try {
    const [results] = await req.db.execute(sql, [title, cleanContent, author_id]);
    const newArticle = {
      id: results.insertId,
      title,
      content: cleanContent,
      author_id
    };
    res.status(201).json({ message: 'Article créé avec succès', article: newArticle });
  } catch (err) {
    console.error('Erreur lors de la création de l\'article :', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
  }
});

// Route pour modifier un article
router.put('/:id', [
  body('title').optional().isLength({ min: 3, max: 200 }).withMessage('Le titre doit contenir entre 3 et 200 caractères').trim().escape(),
  body('content').optional().isLength({ min: 1, max: 5000 }).withMessage('Le contenu doit contenir entre 1 et 5000 caractères'),
  body('author_id').optional().isInt().withMessage('author_id invalide')
], async (req, res) => {
  const { id } = req.params;
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const [existing] = await req.db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Article introuvable' });

    const title = req.body.title !== undefined ? req.body.title : existing[0].title;
    const author_id = req.body.author_id !== undefined ? req.body.author_id : existing[0].author_id;
    let content = existing[0].content;
    if (req.body.content) {
      content = sanitizeHtml(req.body.content, {
        allowedTags: ['p', 'a', 'b', 'i', 'em', 'strong', 'h2', 'h3', 'section', 'ul', 'ol', 'li'],
        allowedAttributes: { a: ['href', 'target', 'rel'] },
        transformTags: {
          'a': (tagName, attribs) => {
            const href = attribs.href || '';
            return { tagName: 'a', attribs: { href, target: attribs.target || '_blank', rel: 'noopener noreferrer' } };
          }
        }
      }).trim();
    }

    const sql = 'UPDATE articles SET title = ?, content = ?, author_id = ? WHERE id = ?';
    const [results] = await req.db.execute(sql, [title, content, author_id, id]);
    if (results.affectedRows === 0) return res.status(404).json({ error: 'Article introuvable' });

    const updatedArticle = { id, title, content, author_id };
    res.json({ message: 'Article modifié avec succès', article: updatedArticle });
  } catch (err) {
    console.error('Erreur lors de la modification de l\'article :', err);
    res.status(500).json({ error: 'Erreur lors de la modification de l\'article' });
  }
});

// Route pour supprimer un article
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM articles WHERE id = ?';
  try {
    const [results] = await req.db.execute(sql, [id]);
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Article introuvable' });
    }
    res.json({ message: 'Article supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression de l\'article :', err);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'article' });
  }
});

module.exports = router; 
