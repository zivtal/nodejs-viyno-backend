const mariaDb = require("../../service/mariadb.service");
const logger = require("../../middlewares/logger.middleware");
const { cleanEmptyValue } = require("../../service/utils.service");

module.exports = {
  getPosts,
  getReplies,
  setReply,
  setReaction,
  getStructure,
  setStructure,
  getWineReviews,
  set,
  update,
  reply,
  remove,
};

const CUSTOM_KEYS = (tableKey, order) => {
  const query = {
    likes: `(SELECT COUNT(*) FROM likes WHERE likes.likeId = ${tableKey}._id AND likes.userLike = 1) ${
      order === 1 ? "ASC" : "DESC"
    }`,

    replies: `(SELECT COUNT(*) FROM posts WHERE posts.replyId = posts._id) ${
      order === 1 ? "ASC" : "DESC"
    }`,

    reactions: `SUM((SELECT COUNT(*) FROM posts WHERE posts.replyId = posts._id)
    + (SELECT COUNT(*) FROM likes WHERE likes.likeId = ${tableKey}._id AND likes.userLike = 1)) ${
      order === 1 ? "ASC" : "DESC"
    }`,
  };

  return query[tableKey];
};

async function getPosts(data, user, isLimit = true) {
  try {
    isLimit = !data.filter?.eqUserId || data.filter.eqUserId !== user?._id;
    // const filter = _where(data.filter);
    const filter = mariaDb.where(data.filter, "posts");
    const sort = mariaDb.sort(data.sort, "posts");
    const pagination = isLimit
      ? await mariaDb.pagination(data.page, filter, "posts")
      : null;

    const query = `
      SELECT posts._id, posts.vintage, posts.createdAt, posts.rate, posts.description, posts.attach,
      (SELECT COUNT(*) FROM likes WHERE likes.likeId = posts._id AND likes.userLike = 1) AS likes,
      ${
        user
          ? `(SELECT likes.userLike FROM likes WHERE likes.likeId = posts._id AND likes.userId = "${user?._id}") AS ilike,`
          : ""
      }
      COUNT(reply._id) AS replies,
      posts.userId, users.fullname AS userName, users.imageData AS userPhoto, (SELECT COUNT(*) FROM posts WHERE posts.userId = users._id) ratings,
      wines.winery AS winery, wines.name AS wine, wines.seo AS seo
      FROM posts
      LEFT JOIN posts reply ON posts._id = reply.replyId
      INNER JOIN users ON posts.userId = users._id
      LEFT JOIN wines ON posts.wineId = wines._id
      ${filter}
      GROUP BY posts._id${sort}${pagination?.query || ""}
    `;

    const res = await mariaDb.query(query);

    return {
      data: res,
      total: pagination?.total || res.length,
      page: pagination?.page || { index: 0, total: 1 },
    };
  } catch (err) {
    logger.error(`Failed to get items from 'posts'`, err);
    throw err;
  }
}

async function getReplies(id, data, user) {
  try {
    data = { ...(data || {}), filter: { eqReplyId: id } };
    return await getPosts(data, user);
  } catch (err) {
    logger.error(`Failed to get items from 'posts'`, err);
    throw err;
  }
}

async function setReply(user, reply) {
  try {
    const query =
      mariaDb.insert("posts", {
        userId: user._id,
        ...reply,
      }) +
      ` ON DUPLICATE KEY UPDATE description="${reply.description}", attach="${reply.attach}" `;

    const res = await mariaDb.query(query);

    return res.insertId ? { ...reply, _id: res.insertId } : reply;
  } catch (e) {
    console.error(e);
  }
}

async function setReaction(userId, reviewId, like) {
  try {
    const res = await mariaDb.query(
      `SELECT SETLIKE("${userId}","${reviewId}",${like ? 1 : 0})`
    );

    return res.length ? { _id: +reviewId, ilike: like } : false;
  } catch (err) {
    console.error(err);
  }
}

async function getStructure(user, id) {
  try {
    if (!user?._id) {
      return null;
    }

    const query = `SELECT bold,tannic,sweet,acidic FROM structures WHERE userId = ${user?._id} AND structures.wineId = ${id} LIMIT 1`;
    const res = await mariaDb.query(query);

    return res ? res[0] : null;
  } catch (err) {
    logger.error(`Failed to get items from 'posts'`, err);
  }
}

async function setStructure(user, id, structure) {
  if (!user?._id) {
    throw new Error(`Session missing`);
  }

  const query = `SELECT SETSTRUCTURE(${user._id}, ${id}, ${
    structure.bold || 0
  }, ${structure.tannic || 0}, ${structure.sweet || 0}, ${
    structure.acidic || 0
  })`;
  const res = await mariaDb.query(query);

  return res.length ? { ...res, _id: Object.values(res[0])[0] } : false;
}

// GET BY
async function getWineReviews(user, id, data, isLimit = true) {
  data.filter = data.filter
    ? { eqWineId: id, ...data.filter }
    : { eqWineId: id };
  // const filter = _where(data.filter);
  const filter = mariaDb.where(data.filter, "posts");
  const sort = mariaDb.sort(data.sort, "posts", CUSTOM_KEYS);
  const pagination = isLimit
    ? await mariaDb.pagination(data.page, filter, "posts", 3)
    : null;
  const query = `
    SELECT posts._id, posts.vintage, posts.createdAt, posts.rate, posts.description, posts.attach,
    (SELECT COUNT(*) FROM likes WHERE likes.likeId = posts._id AND likes.userLike = 1) AS likes,
    ${
      user
        ? `(SELECT likes.userLike FROM likes WHERE likes.likeId = posts._id AND likes.userId = "${user?._id}") AS ilike,`
        : ""
    }
    (SELECT COUNT(*) FROM posts WHERE posts.replyId = posts._id) AS replies,
    posts.userId, users.fullname AS userName, users.imageData AS photoData, users.imageType AS photoType, (SELECT COUNT(*) FROM posts WHERE posts.userId = users._id) ratings
    FROM posts
    INNER JOIN users ON posts.userId = users._id
    ${filter}
    GROUP BY posts._id${sort}${pagination ? pagination.query : ""}
  `;

  try {
    const res = await mariaDb.query(query);
    if (res.length)
      return {
        data: res,
        total: pagination?.total || res.length,
        page: pagination?.page || { index: 0, total: 1 },
      };
  } catch (err) {
    console.error(err);
  }
}

// DELETE
async function remove(id) {
  const query = `DELETE FROM posts WHERE posts._id = ${id}`;
  return mariaDb
    .query(query)
    .then((okPacket) =>
      okPacket.affectedRows === 1
        ? okPacket
        : Promise.reject(new Error(`Failed removing review ${id}`))
    );
}

// POST
async function set(user, type, post) {
  if (!user?._id) {
    throw new Error(`Session missing`);
  }

  try {
    let query;
    switch (type) {
      case "review": {
        query = `SELECT SETREVIEW(${user._id}, ${post.wineId}, ${post.rate}, "${
          post.description
        }", ${post.vintage}, ${user.lat || post.lat || 0}, ${
          user.lng || post.lng || 0
        },"${post.attach}","${user.country || post.country || ""}")`;
        const rev = await mariaDb.query(query);

        return rev.length ? { ...post, _id: Object.values(rev[0])[0] } : false;
      }

      case "structure": {
        query = `SELECT SETSTRUCTURE(${user._id}, ${post.wineId}, ${
          post.bold || 0
        }, ${post.tannic || 0}, ${post.sweet || 0}, ${post.acidic || 0})`;
        const structure = await mariaDb.query(query);

        return structure.length
          ? { ...post, _id: Object.values(structure[0])[0] }
          : false;
      }

      case "post": {
        const data = {
          _id: post._id,
          userId: user._id,
          description: post.description,
          attach: post.attach,
        };
        query = `
          INSERT INTO posts (${
            post._id ? "_id," : ""
          }userId,description,attach) VALUES(${post._id ? `${post._id},` : ""}${
          user._id
        },"${post.description}","${
          post.attach
        }") ON DUPLICATE KEY UPDATE description="${
          post.description
        }", attach="${post.attach}"`;
        const res = await mariaDb.query(query);

        return res.insertId ? { ...data, _id: res.insertId } : data;
      }

      case "reply": {
        const data = {
          _id: post._id,
          replyId: post.replyId,
          userId: user._id,
          description: post.description,
          attach: post.attach,
        };
        query = `
          INSERT INTO posts (${
            post._id ? "_id," : ""
          }userId,replyId,description,attach) VALUES(${
          post._id ? `${post._id},` : ""
        }${user._id},${post.replyId},"${post.description}","${
          post.attach
        }") ON DUPLICATE KEY UPDATE description="${
          post.description
        }", attach="${post.attach}"`;
        const res = await mariaDb.query(query);

        return res.insertId ? { ...data, _id: res.insertId } : data;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function reply(reply) {
  try {
    const query =
      mariaDb.insert(reply, "posts") +
      ` ON DUPLICATE KEY UPDATE content="${reply.description}"`;

    const res = await mariaDb.query(query);
    return { ...reply, _id: res.insertId };
  } catch (err) {
    console.error(err);
  }
}

// PUT
async function update(id, user, review) {
  try {
    const query =
      mariaDb.update("review", review) +
      mariaDb.where({
        eq_id: id,
        eqUserId: user?._id,
      });
    // const query = `UPDATE review ${_set(review)} ${_where({
    //   eq_id: id,
    //   eqUserId: user?._id,
    // })};`;
    const okPacket = await mariaDb.query(query);
    return {
      update: !!okPacket?.affectedRows,
      _id: id,
      userId: user._id,
      ...review,
    };
  } catch (err) {
    console.error(err);
  }
}
