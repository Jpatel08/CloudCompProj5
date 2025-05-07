const session = require('express-session');
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config();
const app = express();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// SQL connection settings
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
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

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');

  connection.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, password],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Username taken or DB error');
      }
      res.send('Registration successful');
    }
  );
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  connection.query(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (results.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

      res.json({ success: true, message: 'Login successful', username });
    }
  );
});



app.get('/api/community', (req, res) => {
  const category = req.query.category;
  let baseQuery = `SELECT * FROM community_items`;
  let params = [];
  if (category && category !== 'All') {
    baseQuery += ' WHERE category = ?';
    params.push(category);
  }

  connection.query(baseQuery, params, (err, items) => {
    if (err) return res.status(500).send('Error fetching base items');

    const fetchDetails = (item, cb) => {
      const id = item.item_id;
      const cat = item.category;

      const detailTables = {
        'activities': 'activities_community',
        'artists': 'artists_community',
        'classes': 'classes_community',
        'events': 'events_community',
        'volunteers': 'volunteers_community'
      };

      const table = detailTables[cat];
      if (!table) return cb(null, item);

      connection.query(`SELECT * FROM ${table} WHERE item_id = ?`, [id], (err, rows) => {
        if (err || rows.length === 0) {
          item.details = {};
        } else {
          const { item_id, ...details } = rows[0];
          item.details = details;
        }
        cb(null, item);
      });
    };

    const async = require('async');
    async.map(items, fetchDetails, (err, enriched) => {
      if (err) return res.status(500).send('Error enriching items');
      res.json(enriched);
    });
  });
});

app.post('/api/community', (req, res) => {
  let {
    category, title, location,
    contact_email, phone, description, details
  } = req.body;

  if (!category || !details || typeof details !== 'object') {
    console.error('Missing or invalid data:', req.body);
    return res.status(400).send('Missing category or details');
  }

  const insertMain = `INSERT INTO community_items
    (category, title, location, contact_email, phone, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const mainParams = [category, title, location, contact_email, phone, description];

  connection.query(insertMain, mainParams, (err, result) => {
    if (err) {
      console.error('Error inserting into community_items:', err);
      return res.status(500).send('Error inserting base item');
    }

    const itemId = result.insertId;
    let insertDetail = '', detailParams = [];

    switch (category) {
      case 'activities':
        insertDetail = `INSERT INTO activities_community (item_id, date, age_group, cost)
                        VALUES (?, ?, ?, ?)`;
        detailParams = [itemId, details.date, details.age_group, details.cost];
        break;
      case 'artists':
        insertDetail = `INSERT INTO artists_community (item_id, pay, needed_by, experience_level)
                        VALUES (?, ?, ?, ?)`;
        detailParams = [itemId, details.pay, details.needed_by, details.experience_level];
        break;
      case 'classes':
        insertDetail = `INSERT INTO classes_community (item_id, itinerary, duration, cost)
                        VALUES (?, ?, ?, ?)`;
        detailParams = [itemId, details.itinerary, details.duration, details.cost];
        break;
      case 'events':
        insertDetail = `INSERT INTO events_community (item_id, date, time, cost)
                        VALUES (?, ?, ?, ?)`;
        detailParams = [itemId, details.date, details.time, details.cost];
        break;
      case 'volunteers':
        insertDetail = `INSERT INTO volunteers_community (item_id, date, time, requirements)
                        VALUES (?, ?, ?, ?)`;
        detailParams = [itemId, details.date, details.time, details.requirements];
        break;
      default:
        console.error('Unsupported category:', category);
        return res.status(400).send('Unsupported category');
    }

    if (detailParams.includes(undefined)) {
      console.error('Missing required detail values for category:', category, detailParams);
      return res.status(400).send('Missing required detail fields');
    }

    connection.query(insertDetail, detailParams, (err2) => {
      if (err2) {
        console.error('Error inserting detail row:', err2);
        return res.status(500).send('Error inserting details');
      }
      res.status(201).send('Item inserted successfully');
    });
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

  connection.query(sql, params, (err, results) => {
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

  connection.query(sql, params, (err, results) => {
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
  let baseQuery = `SELECT * FROM for_sale_items`;
  let params = [];
  if (category && category !== 'All') {
    baseQuery += ' WHERE category = ?';
    params.push(category);
  }
  baseQuery += ' ORDER BY created_at DESC';

  connection.query(baseQuery, params, (err, items) => {
    if (err) return res.status(500).send('Error fetching base items');

    const fetchDetails = (item, cb) => {
      const id = item.item_id;
      const cat = item.category;

      const detailTables = {
        'cars + trucks': 'cars_trucks_forsale',
        'motorcycles': 'motorcycles_forsale',
        'boats': 'boats_forsale',
        'books': 'books_forsale',
        'furniture': 'furniture_forsale'
      };

      const table = detailTables[cat];
      if (!table) return cb(null, item);

      connection.query(`SELECT * FROM ${table} WHERE item_id = ?`, [id], (err, rows) => {
        if (err || rows.length === 0) {
          item.details = {};
        } else {
          const { item_id, ...details } = rows[0];
          item.details = details;
        }
        cb(null, item);
      });
    };

    const async = require('async');
    async.map(items, fetchDetails, (err, enriched) => {
      if (err) return res.status(500).send('Error enriching items');
      res.json(enriched);
    });
  });
});

app.post('/api/forsale', (req, res) => {
  let {
    category, title, item_condition, price,
    city, phone, description, details
  } = req.body;

  if (!category || !details || typeof details !== 'object') {
    console.error('Missing or invalid data:', req.body);
    return res.status(400).send('Missing category or details');
  }

  // Clean numeric strings with commas in details
  const numericFields = ['mileage', 'year_built', 'length', 'year_published', 'year_purchased', 'engine_size'];
  numericFields.forEach(field => {
    if (details[field] && typeof details[field] === 'string') {
      details[field] = parseInt(details[field].replace(/,/g, ''));
    }
  });

  const insertMain = `INSERT INTO for_sale_items
    (category, title, item_condition, price, city, phone, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

  const mainParams = [category, title, item_condition, price, city, phone, description];

  connection.query(insertMain, mainParams, (err, result) => {
    if (err) {
      console.error('Error inserting into for_sale_items:', err);
      return res.status(500).send('Error inserting base item');
    }

    const itemId = result.insertId;
    let insertDetail = '', detailParams = [];

    switch (category) {
      case 'cars + trucks':
        insertDetail = `INSERT INTO cars_trucks_forsale (item_id, year_built, color, type, mileage, fuel, transmission)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`;
        detailParams = [itemId, details.year_built, details.color, details.type, details.mileage, details.fuel, details.transmission];
        break;
      case 'motorcycles':
        insertDetail = `INSERT INTO motorcycles_forsale (item_id, year_built, color, type, engine_size, mileage)
                        VALUES (?, ?, ?, ?, ?, ?)`;
        detailParams = [itemId, details.year_built, details.color, details.type, details.engine_size, details.mileage];
        break;
      case 'boats':
        insertDetail = `INSERT INTO boats_forsale (item_id, year_built, color, type, description, length)
                        VALUES (?, ?, ?, ?, ?, ?)`;
        detailParams = [itemId, details.year_built, details.color, details.type, details.description, details.length];
        break;
      case 'books':
        insertDetail = `INSERT INTO books_forsale (item_id, author, genre, format, language, year_published)
                        VALUES (?, ?, ?, ?, ?, ?)`;
        detailParams = [itemId, details.author, details.genre, details.format, details.language, details.year_published];
        break;
      case 'furniture':
        insertDetail = `INSERT INTO furniture_forsale (item_id, type, color, material, dimensions, year_purchased)
                        VALUES (?, ?, ?, ?, ?, ?)`;
        detailParams = [itemId, details.type, details.color, details.material, details.dimensions, details.year_purchased];
        break;
      default:
        console.error('Unsupported category:', category);
        return res.status(400).send('Unsupported category');
    }

    if (detailParams.includes(undefined)) {
      console.error('Missing required detail values for category:', category, detailParams);
      return res.status(400).send('Missing required detail fields');
    }

    connection.query(insertDetail, detailParams, (err2) => {
      if (err2) {
        console.error('Error inserting detail row:', err2);
        return res.status(500).send('Error inserting details');
      }
      res.status(201).send('Item inserted successfully');
    });
  });
});



app.get('/api/service', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT item_id, category, service_name, rates, licensed, insured, city, phone, details, created_at FROM service_items';
  let params = [];

  if (category && category !== 'All') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  connection.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching service items:', err);
      res.status(500).send('Database error');
    } else {
      res.json(results);
    }
  });
});

app.post('/api/service', (req, res) => {
  const {
    category,
    service_name,
    rates,
    city,
    phone,
    details,
    licensed,
    insured
  } = req.body;

  if (!category || !service_name || !rates || !city || !phone || !details) {
    return res.status(400).send('Missing required fields');
  }

  const sql = `
    INSERT INTO service_items 
    (category, service_name, rates, city, phone, details, licensed, insured, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const params = [category, service_name, rates, city, phone, details, licensed, insured];

  connection.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error inserting service listing:', err);
      return res.status(500).send('Database insert error');
    }

    res.status(201).json({ success: true, id: result.insertId });
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