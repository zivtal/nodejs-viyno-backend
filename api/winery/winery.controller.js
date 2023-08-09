const wineryService = require("./winery.service.mariadb");

const QUERY_ERR = "Loading winery failed";
const GETBYID_ERR = "Loading winery failed";
const ADD_ERR = "Adding winery failed";
const UPDATE_ERR = "Updating winery failed";
const REMOVE_ERR = "Removing winery failed";

module.exports = {
  getWineries,
  getWinery,
  addWinery,
  delWinery,
  updateWinery,

  query,
  get,
};

async function getWineries(req, res) {
  try {
    const send = await wineryService.getWineries(req.body);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function getWinery(req, res) {
  const user = req?.session?.user;
  try {
    const { seo } = req.params;
    const data = await wineryService.getWinery(seo, { ...user, ...req.body });

    if (!data) {
      res.status(404).send({ err: GETBYID_ERR });
    } else res.json(data);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}

async function addWinery(req, res) {
  try {
    const data = req.body;
    res.json(await wineryService.addWinery(data));
  } catch (err) {
    res.status(500).send({ err: ADD_ERR });
  }
}

async function delWinery(req, res) {
  try {
    const { seo } = req.params;
    res.send(await wineryService.delWinery(seo));
  } catch (err) {
    res.status(500).send({ err: REMOVE_ERR });
  }
}

async function updateWinery(req, res) {
  try {
    const data = req.body;
    const savedData = await wineryService.updateWinery(data);
    // res.json(ret);
    res.send(savedData);
  } catch (err) {
    res.status(500).send({ err: UPDATE_ERR });
  }
}

// GET LIST
async function query(req, res) {
  try {
    var params = req.query;
    const send = await wineryService.getWineries(params);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

// GET BY ID
async function get(req, res) {
  try {
    const { id } = req.params;
    const data = await wineryService.getWinery(id, req.query);
    if (!data) res.status(404).send({ err: GETBYID_ERR });
    else res.json(data);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}
