const authService = require('./auth.service')
const logger = require('../../middlewares/logger.middleware')

const LOGIN_ERR = "Login failed";
const SIGNUP_ERR = "Signup failed";
const LOGOUT_ERR = "Logout failed";

async function login(req, res) {
    const { username, password } = req.body;
    try {
        const user = (await authService.login(username, password, req.query));
        req.session.user = user;
        res.json(user);
    } catch (err) {
        logger.error(LOGIN_ERR, err);
        res.status(401).send({ err: LOGIN_ERR });
    }
}

async function signup(req, res) {
    try {
        const { username, password, fullname } = req.body;
        const account = await authService.signup(username, password, fullname);
        logger.debug("New account created", JSON.stringify(account));
        const user = await authService.login(username, password, req.query);
        req.session.user = user;
        res.json(user);
    } catch (err) {
        logger.error(SIGNUP_ERR, err);
        res.status(500).send({ err: SIGNUP_ERR });
    }
}

async function logout(req, res) {
    try {
        req.session.destroy(() => { });
        res.send({ msg: "Logged out successfully" });
    } catch (err) {
        logger.error(LOGOUT_ERR, err);
        res.status(500).send({ err: LOGOUT_ERR });
    }
}

module.exports = {
    login,
    signup,
    logout
}