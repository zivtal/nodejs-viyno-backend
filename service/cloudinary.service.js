const config = require('../config');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { dataURI } = require("../service/utils.service");

module.exports = cloudinaryUpload;

const { CLOUDINARY_NAME: NAME, CLOUDINARY_API: API, CLOUDINARY_SECRET: SECRET, CLOUDINARY_PRESET: PRESET } = config;

cloudinary.config({
    cloud_preset: PRESET,
    cloud_name: NAME,
    api_key: API,
    api_secret: SECRET,
    secure: true
});

const uploadStream = (file) => {
    const data = dataURI(file);
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            (err, res) => {
                if (res) resolve(res);
                else reject(err);
            }
        );
        streamifier.createReadStream(data.buffer).pipe(stream);
    });
};

async function cloudinaryUpload(file) {
    try {
        const res = await uploadStream(file);
        return res;
    } catch (err) {
        throw err;
    }
}
