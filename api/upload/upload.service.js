const cloudinaryService = require("../../service/cloudinary.service");

module.exports = {
    media,
}

async function media(req) {
    try {
        const file = req.files.image || req.files.video;
        const { url: http, secure_url: https } = await cloudinaryService(file);
        return { http, https };
    } catch (err) {
        throw err
    }
}