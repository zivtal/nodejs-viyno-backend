const express = require('express');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');
const { media } = require('./upload.controller');
const { imageCache } = require('../../middlewares/cache.middleware')
const router = express.Router();

router.post('/', imageCache, media);

module.exports = router;