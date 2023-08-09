const express = require('express');
const { requireAuth, requireAdmin } = require('../../middlewares/auth.middleware');
const { query, get, add, update, remove, follow } = require('./user.controller');
const router = express.Router();

// middleware that is specific to this router
// router.use(requireAuth, requireAdmin);

// router.get('/', log, requireAdmin, query)
// router.get('/:id', requireAdmin, get)
// router.post('/', requireAdmin, add)
// router.put('/:id', requireAdmin, update)
// router.delete('/:id', requireAdmin, remove)

router.get('/', _log, query)
router.get('/:id', get)
router.post('/', add)
router.put('/', requireAuth, update)
router.put('/follow/:id', requireAuth, follow)
router.put('/:id', requireAuth, update)
router.delete('/:id', requireAuth, remove)

module.exports = router;

async function _log(req, res, next) {
    if (req.session?.user) logger.info("Req from: " + req.session.user.fullname);
    next();
}