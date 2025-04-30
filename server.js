const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// SQL connection settings
const connection = mysql.createConnection({
  host: '35.192.196.215',  // Use your public IP or 127.0.0.1 if using proxy
  user: 'root',             // Change if you have a custom user
  password: 'gaffartrippin',
  database: 'classifieds',
  connectTimeout: 5000
});

// Test route
app.get('/test-connection', (req, res) => {
  connection.connect(err => {
    if (err) {
      console.error('Connection failed:', err.message);
      res.json({ success: false, message: err.message });
    } else {
      res.json({ success: true, message: 'Connected to MySQL successfully!' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
