require('dotenv').config();

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => res.json({
    service: 'SuperM2 API',
    version: '1.0.0',
    docs: '/api/health'
}));

app.all(/.*/, (req, res) => res.status(404).json({ error: 'Route non trouvée' }));
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));