const express = require("express");
const {
  requireAuth,
  requireAdmin,
} = require("../../middlewares/auth.middleware");
const {
  query,
  get,
  addWinery,
  updateWinery,
  delWinery,
  getWinery,
  getWineries,
} = require("./winery.controller");
const {
  GET_WINERIES,
  GET_WINERY,
  ADD_WINERY,
  UPDATE_WINERY,
  DEL_WINERY,
} = require("./winery.types");
const router = express.Router();

router.post("/" + GET_WINERY + "/:seo", getWinery);
router.post("/" + GET_WINERIES, getWineries);
router.post("/" + ADD_WINERY, requireAuth, addWinery);
router.post("/" + DEL_WINERY + "/:seo", requireAuth, requireAdmin, delWinery);
router.post(
  "/" + UPDATE_WINERY + "/:seo",
  requireAuth,
  requireAdmin,
  updateWinery
);

router.get("/", query);
router.get("/:id", get);

module.exports = router;
