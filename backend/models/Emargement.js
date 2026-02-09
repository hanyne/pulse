const mongoose = require('mongoose');

const emargementSchema = new mongoose.Schema({
  apprenant_id: { type: String, required: true },
  session_id: { type: String, required: true },
  signature_data: { type: String, required: true }, // Base64 image
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Emargement', emargementSchema);