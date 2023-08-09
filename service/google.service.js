const axios = require("axios").default;
const config = require('../config');
const logger = require('../middlewares/logger.middleware');

module.exports = {
    getLocation,
    getMapImage,
    getYoutube,
}


const { GOOGLE_API: API } = config;

// getLocation();

async function getMapImage(lat, lng, height = 160, width = 512, zoom = 12, scale = 2, color = 'red') {
    try {
        const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&markers=color:${color}|size:mid|label:|${lat},${lng}&sensor=false&key=${API}&scale=${scale}`;
        const res = await axios.get(url);
        logger.debug("GOOGLE API", url);
        return res?.data;
    } catch (err) {
        logger.error("GOOGLE API", `Can't get map image`, err);
        throw err;
    }
}

async function getYoutube(query) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&videoEmbeddable=true&type=video&key=${API}&q=${query}`;
        const res = await axios.get(url);
        logger.debug("GOOGLE API", url);
        return res?.data;
    } catch (err) {
        logger.error("GOOGLE API", `Can't get video list from youtube`, err);
        throw err;
    }
}

async function getLocation(lat = 45.4429, lng = 10.6694) {
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API}`;
        const res = await axios.get(url);
        logger.debug("GOOGLE API", url);
        return res?.data;
    } catch (err) {
        logger.error("GOOGLE API", `Can't get location`, err);
        throw err;
    }
}