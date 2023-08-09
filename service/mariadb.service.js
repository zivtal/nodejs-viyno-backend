const mysql = require("mysql");
const logger = require("../middlewares/logger.middleware");
const config = require("../config");
const { cleanEmptyValue } = require("./utils.service");

const { SQL_HOST, SQL_PORT, SQL_USER, SQL_PWD, DB_NAME } = config;

const mariaDb = {
  query,
  insert,
  pagination,
  sort,
  where,
  update,
};

module.exports = mariaDb;

const connection = mysql.createPool({
  host: SQL_HOST,
  port: SQL_PORT,
  user: SQL_USER,
  password: SQL_PWD,
  database: DB_NAME,
  connectionLimit: 10,
  insecureAuth: true,
  multipleStatements: true,
});

const _clean = (sqlResult) => {
  return Array.isArray(sqlResult)
    ? sqlResult.map((item) =>
        Array.isArray(item) ? _clean(item) : cleanEmptyValue(item)
      )
    : cleanEmptyValue(sqlResult);
};

function query(query) {
  return new Promise((resolve, reject) => {
    connection.query(query, function (err, res) {
      if (err) {
        logger.error("MariaDB", "Cannot execute command", err);
        reject(err);
      } else {
        logger.debug("MariaDB", query);
        resolve(_clean(res));
      }
    });
  });
}

function insert(tableName, map = {}) {
  const keys = [];
  const values = [];
  for (const key in map) {
    if (!map[key]) {
      continue;
    }

    const base64 = ["imageSmall", "imageLarge", "logoData"];

    const value = base64.includes(key)
      ? `FROM_BASE64("${map[key]}")`
      : `"${map[key]}"`;

    keys.push(_extract(key)?.condition === "base64" ? _extract(key).key : key);
    values.push(!map[key] ? "NULL" : value);
  }

  return `INSERT INTO ${tableName} (${keys.join(",")}) VALUES(${values.join(
    ","
  )})`;
}

function update(tableName, map = {}) {
  const values = [];
  for (const key in map) {
    if (!map[key] || key === "_id" || key === "id") {
      continue;
    }

    const base64 = ["imageSmall", "imageLarge", "logoData"];

    const value = base64.includes(key)
      ? `FROM_BASE64("${map[key]}")`
      : `"${map[key]}"`;

    values.push(`${key} = "${value || map[key]}"`);
  }
  return `UPDATE ${tableName} SET ${values.join(",")}`;
}

function pagination(page, filter = "", db = "posts", defaultLimit = 8) {
  return new Promise((resolve, reject) => {
    const baseQuery = `SELECT COUNT(*) AS total FROM ${db} `;

    const pagination = {
      page: { ...(page || { index: 0 }) },
    };

    if (!pagination.page.index || !pagination.page.size) {
      query(baseQuery + filter)
        .then((count) => {
          pagination.total = count.pop().total;

          pagination.page.size = pagination.page.size
            ? Math.min(pagination.page.size, defaultLimit)
            : defaultLimit;

          if (pagination.total) {
            pagination.page.total = Math.ceil(
              pagination.total / pagination.page.size
            );
          }

          resolve({
            ...pagination,
            query: ` LIMIT ${pagination.page.index * pagination.page.size}, ${
              pagination.page.size
            }`,
          });
        })
        .catch((err) => reject(err));
    } else {
      resolve({
        ...pagination,
        query: ` LIMIT ${pagination.page.index * pagination.page.size}, ${
          pagination.page.size
        }`,
      });
    }
  });
}

function sort(sort, tableName, customSort) {
  sort ??= { _id: 0 };

  if (typeof sort === "string") {
    sort = JSON.parse(sort);
  }

  const cmd = [];
  for (const tableKey in sort) {
    const custom = customSort?.(tableKey, sort[tableKey]);
    cmd.push(
      custom ||
        `${tableName}.${tableKey} ${sort[tableKey] === 1 ? "ASC" : "DESC"}`
    );
  }

  return cmd.length ? " ORDER BY " + cmd.join(",") : "";
}

function where(
  filter,
  tableName,
  externalKeys,
  specialKeys,
  searchInKeys = [],
  rule = "AND"
) {
  if (!filter) {
    return "";
  }

  if (typeof filter === "string") {
    filter = JSON.parse(filter);
  }

  const conditions = [];
  for (const cKey in filter) {
    const value = filter[cKey] == null ? null : "" + filter[cKey];
    if (value !== undefined) {
      const { tableKey, condition } = _extract(cKey);
      const table = externalKeys?.(tableKey) || `${tableName}.${tableKey}`;
      const valueRule = condition.slice(-1) === "+" ? " AND " : " OR ";

      conditions.push(
        specialKeys?.(tableKey, condition, value, searchInKeys, tableName) ||
          _conditionMap(condition.slice(0, 2), value, table, valueRule)
      );
    }
  }

  return conditions.length ? ` WHERE ${conditions.join(` ${rule} `)}` : "";
}

const _conditionMap = (condition, value, table, rule = "AND") => {
  const template = {
    in:
      "(" +
      value
        ?.split("|")
        .map((value) => `${table} LIKE "%${value}%"`)
        .join(rule) +
      ")",
    sw:
      "(" +
      value
        ?.split("|")
        .map((value) => `${table} LIKE "%${value}"`)
        .join(rule) +
      ")",
    ew:
      "(" +
      value
        ?.split("|")
        .map((value) => `${table} LIKE "${value}%"`)
        .join(rule) +
      ")",
    ne:
      "(" +
      (value === null
        ? `${table} IS NOT NULL`
        : value
            ?.split("|")
            .map((value) => `${table} <> "${value}"`)
            .join(rule)) +
      ")",
    eq:
      "(" +
      (value === null
        ? `${table} IS NULL`
        : value
            ?.split("|")
            .map((value) => `${table} = "${value}"`)
            .join(rule)) +
      ")",
    gt:
      "(" +
      value
        ?.split("|")
        .map((value) => `${table} > "${value}"`)
        .join(rule) +
      ")",
    lt:
      "(" +
      value
        ?.split("|")
        .map((value) => `${table} < "${value}"`)
        .join(rule) +
      ")",
  };

  return template[condition] || "";
};

const _extract = (cKey) => {
  const idx = /([A-Z]|\_)/g.exec(cKey)?.index;
  let key = cKey.slice(idx);
  key = key.charAt(0).toLowerCase() + key.slice(1);
  let condition = cKey.slice(0, idx);

  return { tableKey: key, condition };
};
