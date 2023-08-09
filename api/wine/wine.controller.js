const wineService = require("./wine.service.mariadb");
const logger = require("../../middlewares/logger.middleware");

const QUERY_ERR = "Loading wines failed";
const GETBYID_ERR = "Loading wine failed";
const ADD_ERR = "Adding wine failed";
const UPDATE_ERR = "Updating wine failed";
const REMOVE_ERR = "Removing wine failed";
const KEYWORD_ERR = "Loading keywords failed";

module.exports = {
  getWine,
  addWine,
  setWine,
  delWine,
  getWineUpdate,
  getWineKeywords,
  getWines,
  searchWines,
};

async function getWineKeywords(req, res) {
  try {
    const { section } = req.query;
    if (section && (!req.session || !req.session.user)) {
      res.status(401).end("Unauthorized!");
    } else {
      res.json(await wineService.getWineKeywords(req.query));
    }
  } catch (err) {
    res.status(500).send({ err: KEYWORD_ERR });
  }
}

async function getWines(req, res) {
  try {
    res.json(await wineService.getWines(req.body));
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}
async function searchWines(req, res) {
  try {
    res.json(await wineService.searchWines(req.body));
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function getWine(req, res) {
  try {
    const { id } = req.params;
    const { vintage = "" } = req.body;
    const data = await wineService.getWine(id, vintage);
    if (!data) res.status(404).send({ err: GETBYID_ERR });
    else res.json(data);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}

async function getWineUpdate(req, res) {
  try {
    const { id } = req.params;
    const { vintage = "" } = req.query;
    const data = await wineService.getWineUpdate(id, vintage);
    if (!data) res.status(404).send({ err: GETBYID_ERR });
    else res.json(data);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}

async function addWine(req, res) {
  try {
    const data = req.body;
    const { user } = req.session;
    res.json(await wineService.addWine({ ...data, userId: user?._id }));
  } catch (err) {
    res.status(500).send({ err: ADD_ERR });
  }
}

async function setWine(req, res) {
  try {
    const { id } = req.params;
    const { user } = req.session;
    const data = req.body;
    res.send(await wineService.delWine(id, user, data));
  } catch (err) {
    res.status(500).send({ err: UPDATE_ERR });
  }
}

async function delWine(req, res) {
  try {
    const { id } = req.params;
    res.send(await wineService.remove(id));
  } catch (err) {
    res.status(500).send({ err: REMOVE_ERR });
  }
}
