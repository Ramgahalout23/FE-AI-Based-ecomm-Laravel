const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// For any route that doesn't match a static file, serve index.html
// This enables React Router clean URLs
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
