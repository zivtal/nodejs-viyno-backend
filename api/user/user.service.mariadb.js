const mariaDb = require("../../service/mariadb.service");
const logger = require("../../middlewares/logger.middleware");

const usersDb = "users";

module.exports = {
  remove,
  query,
  get,
  add,
  update,
  login,
  follow,
};

// GET
async function query({ filter, sort, page }) {
  try {
    filter = _where(filter);
    sort = _sort(sort);
    const limit = await _limit(page, sort, filter);
    const query = `SELECT * FROM ${usersDb}${filter}${sort}${limit.cmd}`;
    const users = await mariaDb.query(query);
    return {
      data: users.map((user) => {
        delete user.password;
        return user;
      }),
      total: limit?.total || users.length,
      page: limit?.page || { index: 0, total: 1 },
    };
  } catch (err) {
    logger.error(`Failed to get items from '${usersDb}'`, err);
    throw err;
  }
}

// GET BY
async function get({ _id, username }) {
  const filter = _where({ eqId: _id, eqUsername: username });
  const query = `SELECT * FROM ${usersDb} ${filter}`;
  const users = await mariaDb.query(query);

  if (users.length === 1) {
    return users[0];
  }

  throw new Error(`user was either not found or matched too many results`);
}

// DELETE
async function remove(_id) {
  const query = `DELETE FROM ${usersDb} WHERE ${usersDb}._id = ${_id}`;

  return mariaDb
    .query(query)
    .then((okPacket) =>
      okPacket.affectedRows === 1
        ? okPacket
        : Promise.reject(new Error(`No user deleted - user id ${_id}`))
    );
}

// POST
async function add(user, location) {
  const query = `INSERT INTO ${usersDb} ${_insert(user)}`;
  const okPacket = await mariaDb.query(query);

  return { ...user, ...location, id: okPacket.insertId };
}

// PUT
async function update(user, queries) {
  const query = `UPDATE ${usersDb} ${_set(queries)} ${_where({
    eq_id: user._id,
  })}`;
  const okPacket = await mariaDb.query(query);

  if (okPacket.affectedRows !== 0) {
    return okPacket;
  }

  throw new Error(`No user updated - user id ${user._id}`);
}

// LOGIN
async function login(id, queries) {
  const query = `UPDATE ${usersDb} SET lastLogin=CURRENT_TIMESTAMP${_set(
    queries,
    ","
  )} WHERE _id = ${id}`;

  const okPacket = await mariaDb.query(query);
  if (!okPacket.affectedRows) {
    throw new Error(`Can't update last login ${id}`);
  }
}

// FOLLOW
async function follow(user, followId) {
  try {
    const res = await mariaDb.query(
      `SELECT SETFOLLOW("${user?._id}","${followId}")`
    );

    return res ? { follow: Object.values(res[0])[0] } : false;
  } catch (err) {
    console.error(err);
  }
}

// SQL WHERE COMMAND
function _where(filter, rule = "AND") {
  if (!filter) {
    return "";
  }

  if (typeof filter === "string") {
    filter = JSON.parse(filter);
  }

  const conditions = [];
  for (const cKey in filter) {
    if (filter[cKey]) {
      const { key, condition } = _extract(cKey);
      switch (condition) {
        case "in": // includes
          conditions.push(`${key} LIKE "%${filter[cKey]}%"`);
          break;
        case "sw": // start with
          conditions.push(`${key} LIKE "${filter[cKey]}%"`);
          break;
        case "ew": // end with
          conditions.push(`${key} LIKE "%${filter[cKey]}"`);
          break;
        case "ne": // not equal
          conditions.push(`${key}<>"${filter[cKey]}"`);
          break;
        case "eq": // equal
          conditions.push(`${key}="${filter[cKey]}"`);
          break;
        case "gt": // great then
          conditions.push(`${key}>${filter[cKey]}`);
          break;
        case "lt": // lower then
          conditions.push(`${key}<${filter[cKey]}`);
          break;
      }
    }
  }
  return conditions.length ? ` WHERE ${conditions.join(` ${rule} `)}` : "";
}

// SQL INSERT PARAMETERS
function _insert(map = {}) {
  const keys = [];
  const values = [];

  for (const key in map) {
    keys.push(key);
    values.push(`"${map[key]}"`);
  }

  return `(${keys.join(",")}) VALUES(${values.join(",")})`;
}

// SQL SET COMMAND
function _set(map = {}, prefix = "SET ") {
  const cmd = [];
  for (const key in map) {
    if (key !== "_id" && key !== "id" && map[key])
      cmd.push(`${key}=${isNaN(map[key]) ? `"${map[key]}"` : map[key]}`);
  }

  return cmd.length ? prefix + cmd.join(",") : "";
}

// SQL ORDER BY COMMAND
function _sort(sort) {
  if (!sort) {
    return "";
  }

  if (typeof sort === "string") {
    sort = JSON.parse(sort);
  }

  const cmd = [];
  for (const key in sort) {
    cmd.push(`${key} ${sort[key] === 1 ? "ASC" : "DESC"}`);
  }

  return cmd.length ? " ORDER BY " + cmd.join(",") : "";
}

// SQL LIMIT COMMAND
async function _limit({ page }, sort, filter) {
  if (page) {
    let count = await mariaDb.query(
      `SELECT COUNT(*) FROM ${usersDb} ${filter} ${sort}`
    );
    count = count[0]["COUNT(*)"];
    page = JSON.parse(page);
    page.size ??= 20;
    page.index ??= 0;
    page.total = Math.ceil(count / page.size);
    return {
      cmd: ` LIMIT ${page.index * page.size}, ${page.size}`,
      total: count,
      page,
    };
  } else return { cmd: "", page };
}

function _extract(cKey) {
  const idx = /([A-Z]|\_)/g.exec(cKey)?.index;
  let key = cKey.slice(idx);
  key = key.charAt(0).toLowerCase() + key.slice(1);
  let condition = cKey.slice(0, idx);
  return { key, condition };
}
