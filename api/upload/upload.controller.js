const uploadService = require("./upload.service");
const logger = require('../../middlewares/logger.middleware');

module.exports = {
    media,
}

async function media(req, res) {
    try {
        const reply = await uploadService.media(req);
        res.json(reply);
    } catch (err) {
        logger.error('Upload media failed', err)
        res.status(500).send({ err: 'Upload media failed' })
    }
}