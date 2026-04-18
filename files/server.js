const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Use persistent path for database - works with Render's disk storage
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'database.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Clients table
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            portfolioValue REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            joinDate TEXT,
            btcAddress TEXT,
            usdtAddress TEXT,
            password TEXT,
            dailyGrowthRate REAL DEFAULT 1.57,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Withdrawals table
        db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            walletAddress TEXT,
            requestDate TEXT,
            processedDate TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

        // Transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT,
            description TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

        // Messages/Chat table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientId INTEGER NOT NULL,
            senderType TEXT,
            message TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clientId) REFERENCES clients(id)
        )`);

        // Admin Users table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('Database tables initialized');
    });
}

// ===== CLIENT ENDPOINTS =====

// Get all clients
app.get('/api/clients', (req, res) => {
    db.all('SELECT * FROM clients ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Get single client
app.get('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(row);
    });
});

// Add new client
app.post('/api/clients', (req, res) => {
    const { name, email, phone, portfolioValue, status, password, btcAddress, usdtAddress, dailyGrowthRate } = req.body;
    const joinDate = new Date().toISOString();

    db.run(
        'INSERT INTO clients (name, email, phone, portfolioValue, status, joinDate, password, btcAddress, usdtAddress, dailyGrowthRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone, portfolioValue || 0, status || 'active', joinDate, password, btcAddress, usdtAddress, dailyGrowthRate || 1.57],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, name, email, phone, portfolioValue, status, joinDate, password, btcAddress, usdtAddress, dailyGrowthRate });
        }
    );
});

// Update client
app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, phone, portfolioValue, status, btcAddress, usdtAddress, dailyGrowthRate } = req.body;
    const updatedAt = new Date().toISOString();

    db.run(
        'UPDATE clients SET name = ?, email = ?, phone = ?, portfolioValue = ?, status = ?, btcAddress = ?, usdtAddress = ?, dailyGrowthRate = ?, updatedAt = ? WHERE id = ?',
        [name, email, phone, portfolioValue, status, btcAddress, usdtAddress, dailyGrowthRate, updatedAt, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Client updated' });
        }
    );
});

// Delete client
app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    
    db.serialize(() => {
        db.run('DELETE FROM withdrawals WHERE clientId = ?', [id]);
        db.run('DELETE FROM transactions WHERE clientId = ?', [id]);
        db.run('DELETE FROM messages WHERE clientId = ?', [id]);
        db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Client deleted' });
        });
    });
});

// ===== WITHDRAWAL ENDPOINTS =====

// Get all withdrawals
app.get('/api/withdrawals', (req, res) => {
    db.all('SELECT * FROM withdrawals ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Get withdrawals for specific client
app.get('/api/clients/:clientId/withdrawals', (req, res) => {
    const { clientId } = req.params;
    db.all('SELECT * FROM withdrawals WHERE clientId = ? ORDER BY createdAt DESC', [clientId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Add withdrawal request
app.post('/api/withdrawals', (req, res) => {
    const { clientId, amount, walletAddress } = req.body;
    const requestDate = new Date().toISOString();

    db.run(
        'INSERT INTO withdrawals (clientId, amount, walletAddress, requestDate, status) VALUES (?, ?, ?, ?, ?)',
        [clientId, amount, walletAddress, requestDate, 'pending'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, clientId, amount, walletAddress, status: 'pending', requestDate });
        }
    );
});

// Update withdrawal status
app.put('/api/withdrawals/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedAt = new Date().toISOString();
    const processedDate = status === 'completed' ? new Date().toISOString() : null;

    db.run(
        'UPDATE withdrawals SET status = ?, processedDate = ?, updatedAt = ? WHERE id = ?',
        [status, processedDate, updatedAt, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Withdrawal updated' });
        }
    );
});

// ===== TRANSACTION ENDPOINTS =====

// Get all transactions
app.get('/api/transactions', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Get transactions for specific client
app.get('/api/clients/:clientId/transactions', (req, res) => {
    const { clientId } = req.params;
    db.all('SELECT * FROM transactions WHERE clientId = ? ORDER BY date DESC', [clientId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Add transaction
app.post('/api/transactions', (req, res) => {
    const { clientId, type, amount, description } = req.body;
    const date = new Date().toISOString();

    db.run(
        'INSERT INTO transactions (clientId, type, amount, date, description) VALUES (?, ?, ?, ?, ?)',
        [clientId, type, amount, date, description],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, clientId, type, amount, date, description });
        }
    );
});

// ===== MESSAGE ENDPOINTS =====

// Get messages for client
app.get('/api/clients/:clientId/messages', (req, res) => {
    const { clientId } = req.params;
    db.all('SELECT * FROM messages WHERE clientId = ? ORDER BY timestamp ASC', [clientId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Add message
app.post('/api/messages', (req, res) => {
    const { clientId, senderType, message } = req.body;
    const timestamp = new Date().toISOString();

    db.run(
        'INSERT INTO messages (clientId, senderType, message, timestamp) VALUES (?, ?, ?, ?)',
        [clientId, senderType, message, timestamp],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, clientId, senderType, message, timestamp });
        }
    );
});

// ===== ADMIN ENDPOINTS =====

// Get dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    db.serialize(() => {
        let stats = {};

        // Get total clients
        db.get('SELECT COUNT(*) as count FROM clients', (err, row) => {
            stats.totalClients = row.count;
        });

        // Get total AUM
        db.get('SELECT SUM(portfolioValue) as total FROM clients', (err, row) => {
            stats.totalAum = row.total || 0;
        });

        // Get pending withdrawals count
        db.get("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'", (err, row) => {
            stats.pendingWithdrawals = row.count;
        });

        // Get pending messages count
        db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
            stats.totalMessages = row.count;

            // Return all stats
            setTimeout(() => {
                res.json(stats);
            }, 100);
        });
    });
});

// Get recent clients
app.get('/api/dashboard/recent-clients', (req, res) => {
    db.all('SELECT * FROM clients ORDER BY createdAt DESC LIMIT 5', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Get recent activity
app.get('/api/dashboard/recent-activity', (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY createdAt DESC LIMIT 5', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database path: ${dbPath}`);
    console.log(`Node environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});