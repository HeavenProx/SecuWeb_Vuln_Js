const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const initializeDbConnection = require('./db');

const app = express();

// Configure CORS to whitelist allowed origins
const { csrfProtection, allowedOrigins } = require('./middlewares/csrfProtection');
const corsOptions = {
  origin: function(origin, callback) {
    // allow requests with no origin (like curl/postman) - treat them separately
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Add CSRF protection for mutating requests
app.use(csrfProtection);

const startServer = async () => {
  try {
    // Attente que la base de données soit prête
    const db = await initializeDbConnection();
    console.log('Base de données initialisée avec succès.');

    // Injection de la connexion DB dans les routes
    app.use((req, res, next) => {
      req.db = db; // Ajout de la connexion à l'objet requête
      next();
    });

    // Importation des routes
    const authRoutes = require('./routes/auth');
    const userRoutes = require('./routes/users');
    const articleRoutes = require('./routes/articles');
    const commentRoutes = require('./routes/comments');

    // Utilisation des routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/articles', articleRoutes);
    app.use('/api/', commentRoutes);

    const PORT = 5100;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  } catch (error) {
    console.error('Erreur lors de l\'initialisation du serveur :', error);
    process.exit(1); // Arrêt en cas d'erreur critique
  }
};

startServer();