const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const signatureRoutes = require('./routes/signature');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Logging

app.use('/api/signature', signatureRoutes);

// Demo login route (for testing; use real auth in prod)
app.post('/api/login', (req, res) => {
  const { username } = req.body; // e.g., 'hanine_benali'
  const token = jwt.sign({ id: username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.use('/api/auth', require('./routes/auth'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));