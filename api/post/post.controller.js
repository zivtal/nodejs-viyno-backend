const postService = require("./post.service.mariadb");
const logger = require("../../middlewares/logger.middleware");

const QUERY_ERR = "Loading review failed";
const GETBYID_ERR = "Loading review failed";
const REPLIES_ERR = "Loading reply failed";
const ADD_ERR = "Adding review failed";
const UPDATE_ERR = "Updating review failed";
const REMOVE_ERR = "Removing review failed";
const LIKE_ERR = "Set like failed";
const REPLY_ERR = "Post reply failed";

module.exports = {
  getPosts,
  getReplies,
  setReply,
  getStructure,
  setStructure,
  setReaction,
  getWineReviews,
  getMyReviews,
  getCommunityReviews,
  set,
  update,
  reply,
  remove,
};

async function getPosts(req, res) {
  try {
    const user = req?.session?.user;
    req.body.filter = { ...(req.body.filter || {}), eqReplyId: null };
    const send = await postService.getPosts(req.body, user);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function getReplies(req, res) {
  const { id } = req.params;
  const user = req?.session?.user;
  try {
    const result = await postService.getReplies(id, req.body, user);
    res.json(result);
  } catch (err) {
    res.status(500).send({ err: REPLIES_ERR });
  }
}

async function setReply(req, res) {
  const { user } = req.session;
  try {
    const result = await postService.setReply(user, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).send({ err: REPLY_ERR });
  }
}

async function getStructure(req, res) {
  try {
    const { id } = req.params;
    const user = req?.session?.user;
    const send = await postService.getStructure(user, id);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function setStructure(req, res) {
  try {
    const { id } = req.params;
    const user = req?.session?.user;
    const send = await postService.setStructure(user, id, req.body);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function setReaction(req, res) {
  const { id } = req.params;
  const { user } = req.session;
  const { like } = req.body;

  try {
    const result = await postService.setReaction(user?._id, id, like);
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ err: LIKE_ERR });
  }
}

async function getWineReviews(req, res) {
  try {
    req.body.filter = { ...(req.body.filter || {}), eqReplyId: null };
    const send = await postService.getPosts(req.body);
    res.json(send);
  } catch (err) {
    res.status(500).send({ err: QUERY_ERR });
  }
}

async function getMyReviews(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = req?.session?.user;
    const result = await postService.getWineReviews(
      user,
      id,
      data,
      data?.filter?.eqUserId !== user?._id
    );
    res.json(result);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}

async function getCommunityReviews(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const user = req?.session?.user;
    const result = await postService.getWineReviews(user, id, data);
    res.json(result);
  } catch (err) {
    res.status(500).send({ err: GETBYID_ERR });
  }
}

async function set(req, res) {
  try {
    const { id } = req.params;
    const { user } = req.session;
    const { type } = req.query;
    const data = { wineId: id, ...req.body };
    res.json(await postService.set(user, type, data));
  } catch (err) {
    res.status(500).send({ err: ADD_ERR });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { user } = req.session;
    const data = req.body;
    res.send(await postService.update(id, user, data));
  } catch (err) {
    res.status(500).send({ err: UPDATE_ERR });
  }
}

async function reply(req, res) {
  const { id } = req.params;
  const { user } = req.session;
  try {
    const result = await postService.reply({
      ...req.body,
      reviewId: id,
      userId: user?._id,
    });
    res.json(result);
  } catch (err) {
    res.status(500).send({ err: REPLY_ERR });
  }
}

// DELETE
async function remove(req, res) {
  try {
    const { id } = req.params;
    res.send(await postService.remove(id));
  } catch (err) {
    res.status(500).send({ err: REMOVE_ERR });
  }
}
