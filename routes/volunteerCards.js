const express = require('express');
const {
  createVolunteerCard,
  getVolunteerCards,
  getVolunteerCard,
  verifyVolunteerCard,
  updateVolunteerCard,
  revokeVolunteerCard,
  generateVolunteerCardPDF,
  createVolunteerCertificate,
  getVolunteerCertificates,
  updateVolunteerCertificate,
  verifyCertificate
} = require('../controllers/volunteerCardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getVolunteerCards);
router.get('/verify/:token', verifyVolunteerCard);
router.get('/certificates', getVolunteerCertificates);
router.get('/certificates/verify/:token', verifyCertificate);
router.get('/:id/pdf', generateVolunteerCardPDF);
router.get('/:id', getVolunteerCard);

// Admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', createVolunteerCard);
router.put('/:id/revoke', revokeVolunteerCard);
router.put('/:id', updateVolunteerCard);
router.post('/certificates', createVolunteerCertificate);
router.put('/certificates/:id', updateVolunteerCertificate);

module.exports = router;

