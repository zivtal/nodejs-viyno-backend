const express = require("express");
const {
  requireAuth,
  requireAdmin,
} = require("../../middlewares/auth.middleware");
const {
  getPosts,
  getReplies,
  setReply,
  setReaction,
  getStructure,
  setStructure,
  getWineReviews,
  getMyReviews,
  getCommunityReviews,
  set,
  update,
  remove,
  reply,
} = require("./post.controller");
const router = express.Router();

router.post("/getPosts", getPosts);
router.post("/getReplies/:id", getReplies);
router.post("/setReply", requireAuth, setReply);
router.post("/getReviewStructure/:id", requireAuth, getStructure);
router.post("/updateReviewStructure/:id", requireAuth, setStructure);
router.post("/setReaction/:id", requireAuth, setReaction);
router.post("/getMyWineReviews/:id", getMyReviews);
router.post("/getWineRecentReviews/:id", getCommunityReviews);
router.post("/getWineHelpfulReviews/:id", getCommunityReviews);
router.post("/getWineReviews", getWineReviews);

// router.put('/like/:id', requireAuth, like);

router.post("/:id?", requireAuth, set);
router.put("/reply/:id", requireAuth, reply);
router.put("/:id", requireAuth, update);
router.delete("/:id", requireAuth, requireAdmin, remove);

module.exports = router;
