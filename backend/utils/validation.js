// backend/utils/validation.js

const Joi = require('joi');

const signatureSchema = Joi.object({
  session_id: Joi.string()
    .required()
    .messages({
      'any.required': 'Veuillez sélectionner un cours/module',
      'string.empty': 'Le cours est obligatoire',
    }),
  signature_data: Joi.string()
    .required()
    .min(100) // pour éviter les signatures vides
    .messages({
      'any.required': 'La signature est obligatoire',
      'string.empty': 'Veuillez dessiner votre signature',
      'string.min': 'La signature semble trop courte ou vide',
    }),
  // ← ON NE DEMANDE PLUS apprenant_id ICI !
  // Il est pris automatiquement depuis le token JWT
});

module.exports = { signatureSchema };