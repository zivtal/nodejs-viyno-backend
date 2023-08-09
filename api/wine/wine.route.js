const express = require("express");
const {
  requireAuth,
  requireAdmin,
} = require("../../middlewares/auth.middleware");
const {
  getWines,
  getWine,
  addWine,
  setWine,
  delWine,
  getWineKeywords,
  getWineUpdate,
  searchWines,
} = require("./wine.controller");
const {
  GET_WINE_KEYWORDS,
  GET_WINE,
  ADD_WINE,
  SET_WINE,
  DEL_WINE,
  GET_WINES,
  GET_WINE_UPDATE,
  SEARCH_WINES,
} = require("./wine.types");
const router = express.Router();

router.get("/" + GET_WINE_KEYWORDS, getWineKeywords);
router.post("/" + GET_WINES, getWines);
router.post("/" + SEARCH_WINES, searchWines);
router.post("/" + GET_WINE + "/:id", getWine);
router.get("/" + GET_WINE_UPDATE + "/:id", getWineUpdate);
router.post("/" + ADD_WINE, requireAuth, addWine);
router.put("/" + SET_WINE + "/:id", requireAuth, requireAdmin, setWine);
router.delete("/" + DEL_WINE + "/:id", requireAuth, requireAdmin, delWine);

module.exports = router;
