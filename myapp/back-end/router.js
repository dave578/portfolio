const express = require('express');
const router = express.Router();
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt =require ('jsonwebtoken');

async function DBErr(res, err) {
  console.error(err);
  await res.status(500).json({ error: 'Internal server error' });
}

//POST /api/login
const SECRET_KEY = 'ilsupersegretosegretissimissimo!!!';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const results = await new Promise((resolve, reject) => {
      db.query('SELECT userId, password FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
          reject(err);
        res.status(500).json({message : 'errore usernsame o password errati'})  ;
        } else {
          resolve(results);
        }
      });
    });

    const user = results[0];
    const isMatch = await new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          res.status(500).json({message : 'internal server errror'})  ;
        } else {
          resolve(isMatch);
        }
      });
    });

    if (isMatch) {
      const userId = user.userId;
      const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: '3h' });
      res.status(200).json({ message: "Login avvenuto con successo!", userId, token });
    } else {
      res.status(401).json({ message: "Username o password non valide." });
    }
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  jwt.verify(token, SECRET_KEY, (err, payload) => {
    if (err) {
      return res.status(401).json({ error: 'Token non valido' });
    }
    req.userId = payload.userId;
    next();
  });
};

// GET /api/elencoall
router.get('/elencoall', authenticateToken, async (req, res) => {
  try {
    const results = await new Promise((resolve, reject) => {
      db.query('SELECT id, username, name, email FROM users', (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    res.json(results);
  } catch (err) {
    DBErr(res, err);
  }
});

// GET /api/eleuser/:username
router.get('/elenco/:username', authenticateToken,(req, res) =>{
  console.log(req.params);
  db.query('SELECT id, username, name, email FROM users WHERE username = ? ', [req.params.username], function(err, results) {

    if (err) throw err;
    res.json(results);
  });
});

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const user = req.body;
    const existingUser = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM users WHERE username = ?', [user.username], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash(user.password, 10, (err, hash) => {
        if (err) {
          res.status(500).json({ message: 'Errore del server' });
        } else {
          resolve(hash);
        }
      });
    });

    const insertResult = await new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO users (username, name, email, password) VALUES (?, ?, ?, ?)',
        [user.username, user.name, user.email, hashedPassword],
        (err, results) => {
          if (err) {
           res.status(500).json({ message: 'Errore del server' });
          } else {
            resolve(results);
          }
        }
      );
    });

    res.json({ userId: insertResult.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});

// PUT /api/changeuser/:username
router.put('/changes/:username', authenticateToken, async (req, res) => {
  try {
    const user = req.body;
    const hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash(user.password, 10, (err, hashed) => {
        if (err) {
          reject(err);
        } else {
          resolve(hashed);
        }
      });
    });

    await new Promise((resolve, reject) => {
      db.query(
        'UPDATE users SET username = ?, name = ?, email = ?, password = ? WHERE username = ?',
        [user.username, user.name, user.email, hashedPassword, req.params.username],
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    res.json({ message: 'Utente modificato correttamente.' });
  } catch (err) {
    DBErr(res, err);
  }
});

//DELETE /api/deluser/:userId
router.delete('/deluser/:userId', authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM messages WHERE userId = ?', [req.params.userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await new Promise((resolve, reject) => {
      db.query('DELETE FROM users WHERE userId = ?', [req.params.userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.json({ message: 'Utente eliminato correttamente.' });
  } catch (err) {
    DBErr(res, err);
  }
});

// GET /api/elenco
router.get('/elencomsg/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const results = await new Promise((resolve, reject) => {
      db.query('SELECT message, idMex FROM MESSAGES WHERE userId = ?', [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});

// GET /api/selectmsg/:id
router.get('/selectmsg/:idMex', authenticateToken, async (req, res) => {
  try {
    const idMex = req.params.idMex;
    const results = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM MESSAGES WHERE IDMEX = ?', [idMex], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    res.json(results);
  } catch (err) {
    DBErr(res, err);
  }
});

//POST /api/inviomsg
router.post('/inviomsg/', authenticateToken, async (req, res) => {
  try {
    const message = req.body.message;
    const userId = req.body.userId;
    
    const insertResult = await new Promise((resolve, reject) => {
      db.query('INSERT INTO MESSAGES (userId, message, date) VALUES (?, ?, NOW())', [userId, message], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    res.json({ idMex: insertResult.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});

// PUT /api/changemsg/:id
router.put('/changemsg/:idMex', authenticateToken, async (req, res) => {
  try {
    const message = req.body;
    const idMex = req.params.idMex;
    
    await new Promise((resolve, reject) => {
      db.query('UPDATE MESSAGES SET message = ?, date = now() WHERE idMex = ?', [message.message, idMex], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.json({ message: 'Messaggio modificato correttamente.' });
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});

// DELETE /api/delmsg/:idMex
router.delete('/delmsg/:idMex', authenticateToken, async (req, res) => {
  try {
    const idMex = parseInt(req.params.idMex);
    await new Promise((resolve, reject) => {
      db.query('DELETE FROM MESSAGES WHERE idMex = ?', [idMex], function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.json({ message: 'Messaggio eliminato correttamente.' });
  } catch (err) {
    res.status(500).json({ message: 'Errore del server' });
  }
});
module.exports = router;