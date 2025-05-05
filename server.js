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

app.get('/api/community', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, title, description, location, event_date, cost, contact_email, phone, created_at, category FROM community_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching community items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.get('/api/housing', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, title, description, location, event_date, cost, contact_email, phone, created_at, category FROM housing_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching housing items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.get('/api/job', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, title, description, location, event_date, cost, contact_email, phone, created_at, category FROM job_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching job items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.get('/api/forsale', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, title, description, location, event_date, cost, contact_email, phone, created_at, category FROM forsale_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching forsale items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.get('/api/service', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, title, description, location, event_date, cost, contact_email, phone, created_at, category FROM service_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching service items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});

app.get('/api/forsale', (req, res) => {
  connection.query('SELECT * FROM for_sale_items', (err, results) => {
    res.json(results);
  });
});

app.get('/api/housing', (req, res) => {
  connection.query('SELECT * FROM housing_items', (err, results) => {
    res.json(results);
  });
});

app.get('/api/services', (req, res) => {
  connection.query('SELECT * FROM service_items', (err, results) => {
    res.json(results);
  });
});

app.get('/api/jobs', (req, res) => {
  connection.query('SELECT * FROM job_items', (err, results) => {
    res.json(results);
  });
});

app.get('/api/community', (req, res) => {
  connection.query('SELECT * FROM community_items', (err, results) => {
    res.json(results);
  });
});