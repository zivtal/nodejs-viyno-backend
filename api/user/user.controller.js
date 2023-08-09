const userService = require('./user.service.mariadb');
const logger = require('../../middlewares/logger.middleware');

const QUERY_ERR = "Loading users failed";
const GETBYID_ERR = "Get user failed";
const ADD_ERR = "User adding failed";
const UPDATE_ERR = "Update user failed";
const REMOVE_ERR = "Remove user failed";

module.exports = {
    query,
    get,
    add,
    update,
    follow,
    remove
}

// GET LIST
async function query(req, res) {
    try {
        var params = req.query;
        const send = await userService.query(params);
        res.json(send);
    } catch (err) {
        res.status(500).send({ err: QUERY_ERR });
    }
}

// GET BY ID
async function get(req, res) {
    try {
        const { id } = req.params;
        res.json(await userService.get({ _id: id }));
    } catch (err) {
        res.status(500).send({ err: GETBYID_ERR });
    }
}

// POST
async function add(req, res) {
    try {
        const user = req.body;
        res.json(await userService.add(user));
    } catch (err) {
        res.status(500).send({ err: ADD_ERR });
    }
}

// PUT
async function update(req, res) {
    const user = req?.session?.user;
    try {
        const re = await userService.update(user, req.body)
        res.send(re);
    } catch (err) {
        res.status(500).send({ err: UPDATE_ERR });
    }
}

// FOLLOW
async function follow(req, res) {
    const { id } = req.params;
    const user = req?.session?.user || { _id: 29 };
    try {
        const re = await userService.follow(user, id);
        res.send(re);
    } catch (err) {
        res.status(500).send({ err: UPDATE_ERR });
    }
}

// DELETE
async function remove(req, res) {
    const user = req?.session?.user;
    try {
        const { _id } = user;
        res.send(await userService.remove(_id));
    } catch (err) {
        res.status(500).send({ err: REMOVE_ERR });
    }
}

