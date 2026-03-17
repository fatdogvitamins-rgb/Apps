const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/hello', (req, res) => {
  res.json({message: 'Hello from the sample web app!'});
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
