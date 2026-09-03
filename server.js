import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the dist folder (Vite build output)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For any route that doesn't match a static file, serve index.html
// This enables React Router clean URLs (no # needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
