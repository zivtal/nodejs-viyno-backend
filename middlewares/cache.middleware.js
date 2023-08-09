const multer = require('multer');
const storage = multer.memoryStorage();
const imageCache = multer({ storage }).single('image');

module.exports = {
    imageCache
};