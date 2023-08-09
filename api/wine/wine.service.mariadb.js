const mariaDb = require("../../service/mariadb.service");
const logger = require("../../middlewares/logger.middleware");
const postService = require("../post/post.service.mariadb");
const {
  kebabCaseToSentence,
  toKebabCase,
} = require("../../service/utils.service");

module.exports = {
  getWineKeywords,
  getWines,
  getWine,
  getWineUpdate,
  addWine,
  setWine,
  delWine,
  searchWines,
};

const WHERE_EXTERNAL_KEYS = (tableKey) => {
  const keys = {
    region: `COALESCE(wines.${tableKey},wineries.${tableKey})`,
    grapes: `COALESCE(wines.${tableKey},styles.${tableKey})`,
    pairings: `COALESCE(wines.${tableKey},styles.${tableKey})`,
  };

  return keys[tableKey];
};

const WHERE_SPEICAL_KEYS = (
  tableKey,
  condition,
  value,
  searchInKeys,
  tableName
) => {
  const map = { ne: "<>", eq: "=", gt: ">", lt: "<", gte: ">=", lte: "<=" };
  const keys = {
    rate: `(SELECT AVG(posts.rate) FROM posts WHERE posts.wineId = wines._id) ${map[condition]} "${value}"`,
    ratings: `(SELECT COUNT(posts.rate) FROM posts WHERE posts.wineId = wines._id) ${map[condition]} "${value}"`,
    winery: `(wines.winery ${map[condition]} "${value}" OR REMOVE_ASSENTS(wines.winery) ${map[condition]} "${value}")`,
    search: `(${searchInKeys
      .map((key) => {
        return `(${value
          .split(" ")
          .map((val) => `${tableName}.${key} LIKE "%${val}%"`)
          .join(" AND ")})`;
      })
      .join(" OR ")})`,
  };

  return keys[tableKey];
};

const SORT_CUSTOM = (tableKey, order) => {
  const query = {
    rate: `(SELECT AVG(posts.rate) FROM posts WHERE posts.wineId = wines._id) ${
      order === 1 ? "ASC" : "DESC"
    }`,
    ratings: `(SELECT COUNT(posts.rate) FROM posts WHERE posts.wineId = wines._id) ${
      order === 1 ? "ASC" : "DESC"
    }`,
  };

  return query[tableKey];
};

async function getWineKeywords({ section, seo }) {
  const baseSql = {
    type: `SELECT DISTINCT type AS name, (SELECT COUNT(*) FROM wines w1 WHERE w1.type = w2.type) AS count FROM wines w2 WHERE type IS NOT NULL;`,
    grapes: `SELECT DISTINCT name,seo, (SELECT COUNT(*) FROM wines WHERE wines.grapes LIKE CONCAT("%",grapes.seo,"%")) AS count FROM grapes
      ${
        section
          ? ""
          : `WHERE (SELECT COUNT(*) FROM wines WHERE wines.grapes LIKE CONCAT("%",grapes.seo,"%")) > 0`
      }
      ORDER BY count DESC;`,
    region: `SELECT DISTINCT region AS name,country FROM wineries WHERE region IS NOT NULL
      UNION SELECT DISTINCT region AS name,country FROM wines WHERE region IS NOT NULL;`,
    style: `SELECT DISTINCT name,seo,country,regional,grapes,type,(SELECT COUNT(*) FROM wines WHERE wines.style = styles.seo) AS count ${
      seo ? ",grapes,pairings,acidity,body,type " : ""
    } FROM styles
      ${
        section
          ? seo
            ? `WHERE seo = "${seo}"`
            : ""
          : `WHERE seo IS NOT NULL AND (SELECT COUNT(*) FROM wines WHERE wines.style = styles.seo) > 0`
      }
      ORDER BY count DESC;`,
    pairings: `SELECT DISTINCT food.name,food.seo,
      (SELECT COUNT(*) FROM wines LEFT JOIN styles ON wines.style = styles.seo WHERE COALESCE(wines.pairings,styles.pairings) LIKE CONCAT("%",food.seo,"%")) AS count
      FROM food
      ${
        section
          ? ""
          : `WHERE (SELECT COUNT(*) FROM wines LEFT JOIN styles ON wines.style = styles.seo WHERE COALESCE(wines.pairings,styles.pairings) LIKE CONCAT("%",food.seo,"%")) > 0`
      }
      ORDER BY count DESC;`,
    country: section
      ? `SELECT name, TO_BASE64(flagIcon) AS flag FROM country;`
      : `SELECT DISTINCT country AS name, TO_BASE64(country.flagIcon) as flag FROM wines LEFT JOIN country ON country.name = wines.country WHERE country IS NOT NULL;`,
    winery: `SELECT name, country, region FROM wineries`,
    name: `SELECT name FROM wines`,
  };
  try {
    const res = await mariaDb.query(
      baseSql[section] || Object.values(baseSql).slice(0, 7).join("")
    );

    const map = section
      ? res
      : {
          data: {
            "wine type": res[0].map(({ name }) => ({
              name: kebabCaseToSentence(name),
            })),
            grapes: res[1],
            regions: res[2],
            countries: res[5],
            "wine styles": res[3],
            "food pairings": res[4],
          },
          query: {
            "wine type": "eqType",
            grapes: "in+Grapes",
            regions: "inRegion",
            countries: "inCountry",
            "wine styles": "inStyle",
            "food pairings": "inPairings",
          },
        };

    return map;
  } catch (err) {
    console.error(err);
  }
}

async function getWines(reqQuery) {
  const baseSql = `SELECT wines.name, wines.winery, wines.seo, TO_BASE64(COALESCE(wines.imageSmall,wines.imageLarge)) as imageData,
  COALESCE(wines.country,wineries.country) AS country,
  COALESCE(wines.region,wineries.region) AS region,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id) ratings,
  ROUND((SELECT AVG(posts.rate) FROM posts WHERE posts.wineId = wines._id),1) rate,
  COALESCE((SELECT AVG(structures.acidic) FROM structures WHERE structures.wineId = wines._id),wines.acidic,styles.acidity) AS acidic,
  COALESCE((SELECT AVG(structures.bold) FROM structures WHERE structures.wineId = wines._id),wines.bold,styles.body) AS bold,
  COALESCE((SELECT AVG(structures.tannic) FROM structures WHERE structures.wineId = wines._id),wines.tannic) AS tannic,
  COALESCE((SELECT AVG(structures.sweet) FROM structures WHERE structures.wineId = wines._id),wines.sweet) AS sweet,    
  wineries.image AS background
  FROM wines
  LEFT JOIN styles ON styles.seo = wines.style
  LEFT JOIN wineries ON (wineries.name = wines.winery)`;

  try {
    const filter = mariaDb.where(
      reqQuery.filter,
      "wines",
      WHERE_EXTERNAL_KEYS,
      WHERE_SPEICAL_KEYS,
      ["name", "winery"]
    );

    const sort = mariaDb.sort(
      reqQuery.sort || { ratings: 0, rate: 0 },
      "wines",
      SORT_CUSTOM
    );

    const limit = await mariaDb.pagination(reqQuery.page, filter, "wines", 8);
    const query = baseSql + filter + sort + (limit?.query || "");
    const res = await mariaDb.query(query);

    return {
      data: res,
      total: limit?.total || res.length,
      page: limit?.page || { index: 0, total: 1 },
    };
  } catch (err) {
    logger.error(`Failed to get items from 'wines'`, err);
    throw err;
  }
}

async function searchWines(reqQuery) {
  const baseSql = `SELECT wines.name, wines.winery, wines.seo, TO_BASE64(wines.imageSmall) as imageData, wines.imageType FROM wines`;

  try {
    const filter = mariaDb.where(
      reqQuery.filter,
      "wines",
      WHERE_EXTERNAL_KEYS,
      WHERE_SPEICAL_KEYS,
      ["name"]
    );
    const sort = mariaDb.sort({ ratings: 0 }, "wines", SORT_CUSTOM);
    const query = baseSql + filter + sort + "  LIMIT 8";

    return { data: await mariaDb.query(query) };
  } catch (err) {
    logger.error(`Failed to get items from 'wines'`, err);
    throw err;
  }
}

async function getWine(id, vintage) {
  vintage = vintage ? ` AND posts.vintage = "${vintage}"` : "";

  const baseSql = `SELECT wines._id, wines.name, wines.winery, wines.seo, TO_BASE64(wines.imageLarge) as imageData, wines.imageType,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage}) ratings,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate = 5)) rate5,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 4 AND 4.5)) rate4,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 3 AND 3.5)) rate3,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 2 AND 2.5)) rate2,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 1 AND 1.5)) rate1,
  ROUND((SELECT AVG(posts.rate) FROM posts WHERE posts.wineId = wines._id),1) rate,
    COALESCE(wines.region,wineries.region) AS region,
    COALESCE(wines.country,wineries.country) AS country,
    COALESCE((SELECT AVG(structures.acidic) FROM structures WHERE structures.wineId = wines._id),wines.acidic,styles.acidity) AS acidic,
    COALESCE((SELECT AVG(structures.bold) FROM structures WHERE structures.wineId = wines._id),wines.bold,styles.body) AS bold,
    COALESCE((SELECT AVG(structures.tannic) FROM structures WHERE structures.wineId = wines._id),wines.tannic) AS tannic,
    COALESCE((SELECT AVG(structures.sweet) FROM structures WHERE structures.wineId = wines._id),wines.sweet) AS sweet,
    COALESCE(wines.grapes,styles.grapes) AS grapes,
    COALESCE(wines.pairings,styles.pairings) AS pairings,
    COALESCE(wines.type,styles.type) AS type,
    REPLACE(styles.seo,'-',' ') AS style, wineries.image AS background,
    wineries.overview AS wineryOverview,
    TO_BASE64(wineries.logoData) AS wineryLogo,
    (SELECT COUNT(*) FROM wines WHERE wines.winery = wineries.name) wineryProducts,
    (SELECT COUNT(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name) AS wineryRatings,
    ROUND((SELECT AVG(posts.rate) FROM wines LEFT JOIN posts ON posts.wineId = wines._id WHERE wines.winery = wineries.name),1) AS wineryRate
  FROM wines
  LEFT JOIN styles ON styles.seo = wines.style
  LEFT JOIN wineries ON (wineries.name = wines.winery)
  WHERE wines._id = "${id}" OR wines.seo = "${id}"`;

  const getTastes = async (id) => {
    try {
      const tastes = require("../../json/taste-mentions.en.json");
      const reviews = await postService.getWineReviews(null, id, {}, false);
      if (!reviews) return [];
      return tastes
        .map((taste) => {
          let total = 0;
          const mentions = taste.mentions
            .map((keyword) => {
              const count = reviews?.data?.reduce((sum, review) => {
                const re = new RegExp(
                  `\\b(${keyword}|${keyword.replace(" ", "")})\\b`,
                  `gi`
                );
                const found = review.description.match(re) || [];
                total += found.length;
                sum += found.length;
                return sum;
              }, 0);
              return { keyword, count };
            })
            .filter((mention) => mention.count)
            .sort((a, b) => b.count - a.count);
          return {
            ...taste,
            mentions,
            total,
          };
        })
        .filter((taste) => taste.total)
        .sort((a, b) => b.total - a.total);
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  try {
    const res = await mariaDb.query(baseSql);

    if (!res.length) {
      return null;
    }

    const wine = {
      ...res[0],
      grapes: res[0].grapes?.split("|"),
      pairings: res[0].pairings?.split("|"),
    };

    try {
      const tastes = await getTastes(wine._id);

      return { ...wine, tastes };
    } catch (err) {
      return wine;
    }
  } catch (err) {
    console.error(err);
  }
}

async function getWineUpdate(id, vintage = "") {
  if (vintage) {
    vintage = ` AND posts.vintage = "${vintage}"`;
  }

  const baseSql = `
  SELECT 
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage}) ratings,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate = 5)) rate5,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 4 AND 4.5)) rate4,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 3 AND 3.5)) rate3,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 2 AND 2.5)) rate2,
  (SELECT COUNT(*) FROM posts WHERE posts.wineId = wines._id ${vintage} AND (posts.rate BETWEEN 1 AND 1.5)) rate1,
  ROUND((SELECT AVG(posts.rate) FROM posts WHERE posts.wineId = wines._id),1) rate,
    COALESCE((SELECT AVG(structures.acidic) FROM structures WHERE structures.wineId = wines._id),wines.acidic,styles.acidity) AS acidic,
    COALESCE((SELECT AVG(structures.bold) FROM structures WHERE structures.wineId = wines._id),wines.bold,styles.body) AS bold,
    COALESCE((SELECT AVG(structures.tannic) FROM structures WHERE structures.wineId = wines._id),wines.tannic) AS tannic,
    COALESCE((SELECT AVG(structures.sweet) FROM structures WHERE structures.wineId = wines._id),wines.sweet) AS sweet
  FROM wines
  LEFT JOIN styles ON styles.seo = wines.style
  WHERE wines.seo = "${id}"
`;

  try {
    return await mariaDb.query(baseSql);
  } catch (err) {
    console.error(err);
  }
}

async function delWine(id) {
  const baseSql = `DELETE FROM wines WHERE wines._id = ${id}`;

  try {
    return mariaDb
      .query(baseSql)
      .then((okPacket) =>
        okPacket.affectedRows === 1
          ? okPacket
          : Promise.reject(new Error(`Failed removing ${id}`))
      );
  } catch (err) {
    console.error(err);
  }
}

async function addWine(wine) {
  try {
    const query = mariaDb.insert("wines", wine);
    const okPacket = await mariaDb.query(query);

    return { _id: okPacket.insertId, ...wine };
  } catch (err) {
    console.error(err);
  }
}

async function setWine(id, user, wine) {
  try {
    const query =
      mariaDb.update("wines", wine) +
      mariaDb.where({ eq_id: id, eqUserId: user._id });
    const okPacket = await mariaDb.query(query);

    return {
      update: !!okPacket.affectedRows,
      _id: id,
      userId: user._id,
      ...wine,
    };
  } catch (err) {
    console.error(err);
  }
}
