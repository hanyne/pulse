const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Emargement = require('./models/Emargement');

dotenv.config();

async function validateSignature(apprenant_id, session_id) {
  await mongoose.connect(process.env.MONGO_URI);
  const entry = await Emargement.findOne({ apprenant_id, session_id }).sort({ timestamp: -1 });
  if (entry && entry.timestamp instanceof Date && !isNaN(entry.timestamp)) {
    console.log(`Server timestamp: ${entry.timestamp}`);
    console.log('Signature validée');
  } else {
    console.log('Invalid or no signature');
  }
  mongoose.disconnect();
}

// Usage: node test.js
validateSignature('hanine_benali', 'IT_IA');