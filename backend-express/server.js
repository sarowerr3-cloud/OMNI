const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.EXPRESS_PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api/products', productsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OMNI Express AI Vision API',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 OMNI Express Vision server running on http://localhost:${PORT}`);
    console.log(`📸 Screenshot Extractor endpoint ready at POST http://localhost:${PORT}/api/products/analyze-screenshot`);
  });
}

module.exports = app;
