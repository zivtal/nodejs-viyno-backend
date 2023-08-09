const mariaDb = require("../../service/mariadb.service");
const logger = require("../../middlewares/logger.middleware");

const {
  kebabCaseToSentence,
  toKebabCase,
  cleanEmptyValue,
} = require("../../service/utils.service");

module.exports = {
  getWineries,
  getWinery,
  delWinery,
  addWinery,
  updateWinery,
};

async function getWineries({ filter, sort, page, lat, lng }) {
  try {
    filter = _where(filter, lat, lng);
    sort = _sort(sort, lat, lng);
    page = await _limit(page, filter);

    const query = `
    SELECT wineries.*,
      (SELECT COUNT(*) FROM wines WHERE wines.winery = wineries.name) wines,
      (SELECT COUNT(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) AS ratings,
      ROUND((SELECT AVG(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name),1) AS rate
      ${
        lat && lng
          ? `, DISTANCE(wineries.lat,wineries.lng,${lat},${lng}) AS distance`
          : ""
      }
    FROM wineries${filter}${sort}${page.cmd}`;

    const data = await mariaDb.query(query);

    return {
      data: _clean(data),
      total: page.total,
      page: page.page,
    };
  } catch (err) {
    logger.error(`Failed to get items from 'wineries'`, err);
    throw err;
  }
}

async function getWinery(seo, { lat, lng }) {
  try {
    const distance =
      lat && lng
        ? `DISTANCE(wineries.lat,wineries.lng,${lat},${lng}) AS distance,`
        : "";

    const query = `
      SELECT
      wineries.seo,
      COALESCE(wineries.name,wines.winery) AS name,
      COALESCE(wineries.country,wines.country) AS country,
      COALESCE(wineries.region,wines.region) AS region,
      wineries.address, wineries.lat, wineries.lng, wineries.image,
      COALESCE(wineries.description, wineries.overview) AS description,
      TO_BASE64(wineries.logoData) AS logoData, wineries.logoType,
      ${distance}
      (SELECT COUNT(*) FROM wines WHERE wines.winery = wineries.name OR KEBABCASE(wines.winery) = "${seo}") AS wines,
      (SELECT COUNT(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name OR KEBABCASE(wines.winery) = "${seo}") AS ratings,
      ROUND((SELECT AVG(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name OR KEBABCASE(wines.winery) = "${seo}"),1) AS rate
      FROM wines
      LEFT JOIN wineries ON (wineries.name = wines.winery)
      WHERE KEBABCASE(wines.winery) = "${seo}" OR wineries._id = "${seo}" LIMIT 1
      `;
    const data = await mariaDb.query(query);

    return data.length
      ? { ..._clean(data[0]), seo }
      : { name: kebabCaseToSentence(seo), seo };
  } catch (err) {
    console.error(err);
  }
}

// DELETE
async function delWinery(seo) {
  try {
    const query = `DELETE FROM wineries WHERE wineries.seo = ${seo}`;

    return mariaDb
      .query(query)
      .then((okPacket) =>
        okPacket.affectedRows === 1
          ? okPacket
          : Promise.reject(new Error(`Failed removing '${seo}'`))
      );
  } catch (err) {
    console.error(err);
  }
}

// POST
async function addWinery(wine) {
  try {
    const query = `INSERT INTO wineries ${_insert(wine)}`;
    const okPacket = await mariaDb.query(query);

    return { ...wine, id: okPacket.insertId };
  } catch (err) {
    console.error(err);
  }
}

// PUT
async function updateWinery(wine) {
  const { seo } = wine;
  const query = `UPDATE wineries ${_set(wine)} ${_where({ eqSeo: seo })};`;
  const okPacket = await mariaDb.query(query);

  if (okPacket.affectedRows !== 0) {
    return okPacket;
  }

  throw new Error(`Failed removing ${seo}`);
}

// SQL WHERE COMMAND
function _where(filter, lat, lng, rule) {
  rule ??= "AND";
  if (!filter) {
    return "";
  }

  if (typeof filter === "string") {
    filter = JSON.parse(filter);
  }

  const conditions = [];
  for (const cKey in filter) {
    const value = filter[cKey];
    if (value) {
      const { key, condition } = _extract(cKey);
      const table = `wines.${key}`;
      const map = { ne: "<>", eq: "=", gt: ">", lt: "<", gte: ">=", lte: "<=" };
      const template = {
        in: `${table} LIKE "%${value}%"`,
        sw: `${table} LIKE "%${value}"`,
        ew: `${table} LIKE "${value}%"`,
        ne: `${table} <> "${value}"`,
        eq: `${table} = "${value}"`,
        gt: `${table} > "${value}"`,
        lt: `${table} < "${value}"`,
      };

      const specialKeys = {
        rate: `(SELECT AVG(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) ${map[condition]}" ${value}"`,
        ratings: `(SELECT COUNT(*) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) ${map[condition]}" ${value}"`,
        wines: `(SELECT COUNT(*) FROM wines WHERE wines.winery = wineries.name) ${map[condition]}" ${value}"`,
        distance:
          lat && lng
            ? `DISTANCE(wineries.lat,wineries.lng,${lat},${lng}) ${map[condition]} "${value}"`
            : "",
      };

      conditions.push(
        specialKeys[key] ? specialKeys[key] : template[condition]
      );
    }
  }

  return conditions.length ? ` WHERE ${conditions.join(` ${rule} `)}` : "";
}

// SQL INSERT PARAMETERS
function _insert(map = {}) {
  map = { ...map, seo: toKebabCase(map.name) };
  const keys = [];
  const values = [];
  for (const key in map) {
    keys.push(key);
    values.push(`"${map[key]}"`);
  }

  return `(${keys.join(",")}) VALUES(${values.join(",")})`;
}

// SQL SET COMMAND
function _set(map = {}) {
  const cmd = [];
  for (const key in map) {
    if (key !== "_id" && key !== "id") cmd.push(`${key}="${map[key]}"`);
  }

  return cmd.length ? "SET " + cmd.join(",") : "";
}

// SQL ORDER BY COMMAND
function _sort(sort, lat, lng) {
  if (!sort) {
    return "";
  }

  if (typeof sort === "string") {
    sort = JSON.parse(sort);
  }

  const cmd = [];
  for (const key in sort) {
    switch (key) {
      case "rate":
        cmd.push(
          `(SELECT AVG(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) ${
            sort[key] === 1 ? "ASC" : "DESC"
          } `
        );
        break;
      case "ratings":
        cmd.push(
          `(SELECT COUNT(*) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) ${
            sort[key] === 1 ? "ASC" : "DESC"
          } `
        );
        break;
      case "wines":
        cmd.push(
          `(SELECT COUNT(*) FROM wines WHERE wines.winery = wineries.name) ${
            sort[key] === 1 ? "ASC" : "DESC"
          } `
        );
        break;
      case "distance":
        if (lat && lng) {
          cmd.push(
            `DISTANCE(wineries.lat,wineries.lng,${lat},${lng}) ${
              sort[key] === 1 ? "ASC" : "DESC"
            } `
          );
        }
        break;
      default:
        cmd.push(`wineries.${key} ${sort[key] === 1 ? "ASC" : "DESC"} `);
        break;
    }
  }

  return cmd.length ? " ORDER BY " + cmd.join(",") : "";
}

// SQL LIMIT COMMAND
async function _limit(page, filter = "") {
  page ??= {};
  let count = await mariaDb.query(
    `SELECT COUNT(*) AS total FROM wineries ${filter} `
  );
  count = count[0].total;

  if (typeof page === "string") {
    page = JSON.parse(page);
  }

  page.size = page.size ? Math.min(page.size, 8) : 8;
  page.index ??= 0;
  page.total = Math.ceil(count / page.size);

  return {
    cmd: ` LIMIT ${page.index * page.size}, ${page.size} `,
    total: count,
    page,
  };
}

function _extract(cKey) {
  const idx = /([A-Z]|\_)/g.exec(cKey)?.index;
  let key = cKey.slice(idx);
  key = key.charAt(0).toLowerCase() + key.slice(1);
  let condition = cKey.slice(0, idx);
  return { key, condition };
}

const _clean = (sqlResult) => {
  return Array.isArray(sqlResult)
    ? sqlResult.map((item) => cleanEmptyValue(item))
    : cleanEmptyValue(sqlResult);
};
