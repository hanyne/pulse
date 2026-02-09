// backend/routes/signature.js

const express = require('express');
const router = express.Router();
const Emargement = require('../models/Emargement');
const { signatureSchema } = require('../utils/validation'); // Joi schema
const auth = require('../middleware/auth');               // JWT + role check

// ────────────────────────────────────────────────
// POST /api/signature
// Submit new emargement (signature)
// Protected – mainly for learners, but also allowed for higher roles
// ────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  // Only certain roles can sign presence
  const allowedRoles = ['learner', 'admin', 'lead', 'front_dev', 'back_dev', 'data_dev', 'test_expert'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé – vous ne pouvez pas émarger'
    });
  }

  // Important: apprenant_id comes from JWT → we do NOT expect it in req.body
  // So we validate ONLY session_id + signature_data
  const { error } = signatureSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { session_id, signature_data } = req.body;
  const apprenant_id = req.user.id; // ← taken from JWT (secure!)

  // Safety net (should never happen if auth middleware is correct)
  if (!apprenant_id) {
    return res.status(401).json({
      success: false,
      message: 'Identifiant apprenant manquant – authentification incomplète'
    });
  }

  try {
    // ─── Duplicate check (Qualiopi constraint) ───
    // Same learner + same session + same calendar day = forbidden
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await Emargement.findOne({
      apprenant_id,
      session_id,
      timestamp: { $gte: todayStart, $lte: todayEnd },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Vous avez déjà émargé pour cette session aujourd\'hui',
      });
    }

    // Create new record – timestamp is ALWAYS server-side
    const newEmargement = new Emargement({
      apprenant_id,
      session_id,
      signature_data,           // base64 PNG string
      timestamp: new Date(),    // ← critical for Qualiopi traceability
    });

    await newEmargement.save();

    res.status(201).json({
      success: true,
      message: 'Émargement validé et enregistré',
      data: {
        id: newEmargement._id,
        timestamp: newEmargement.timestamp.toISOString(),
      },
    });
  } catch (err) {
    console.error('[POST /signature] Erreur:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'enregistrement de l\'émargement'
    });
  }
});

// ────────────────────────────────────────────────
// GET /api/signature  (unchanged)
// ────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const allowedRoles = ['admin', 'lead', 'test_expert'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Accès non autorisé – consultation interdite' });
  }

  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const query = search
      ? {
          $or: [
            { apprenant_id: { $regex: search, $options: 'i' } },
            { session_id: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const signatures = await Emargement.find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const total = await Emargement.countDocuments(query);

    res.json({
      success: true,
      data: signatures,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[GET /signature] Erreur:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des émargements' });
  }
});

// ────────────────────────────────────────────────
// GET /api/signature/validate/:apprenant_id/:session_id  (unchanged)
// ────────────────────────────────────────────────
router.get('/validate/:apprenant_id/:session_id', auth, async (req, res) => {
  if (req.user.role !== 'test_expert') {
    return res.status(403).json({ success: false, message: 'Seuls les experts Test/Qualiopi peuvent utiliser cet endpoint' });
  }

  const { apprenant_id, session_id } = req.params;

  try {
    const entry = await Emargement.findOne({ apprenant_id, session_id })
      .sort({ timestamp: -1 })
      .lean();

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Aucun émargement trouvé pour cet apprenant et cette session',
      });
    }

    const isValidTimestamp = entry.timestamp instanceof Date && !isNaN(entry.timestamp.getTime());

    res.json({
      success: isValidTimestamp,
      message: isValidTimestamp ? 'Signature validée' : 'Horodatage invalide détecté',
      data: {
        timestamp: entry.timestamp.toISOString(),
        serverTimeAtCreation: entry.timestamp,
        apprenant_id: entry.apprenant_id,
        session_id: entry.session_id,
      },
    });
  } catch (err) {
    console.error('[GET /validate] Erreur:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la validation' });
  }
});

module.exports = router;