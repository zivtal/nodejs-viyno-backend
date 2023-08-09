const path = require("path");
const DatauriParser = require("datauri/parser");

module.exports = {
  cleanEmptyValue,
  deepCopy,
  sortByIds,
  makeId,
  typeOf,
  dataURI,
  sentenceToCamelCase,
  sentenceToKebabCase,
  camelCaseToSentence,
  kebabCaseToSentence,
  toKebabCase,
};

function cleanEmptyValue(obj) {
  if (!obj) return;
  return Object.entries(obj).reduce((q, p) => {
    const key = p[0];
    const val = p[1];

    if (val !== null) {
      q = { ...q, [key]: val };
    }

    return q;
  }, {});
}

function dataURI(file, ext) {
  const dup = new DatauriParser();
  const res = file.name
    ? dup.format(path.extname(file.name).toString(), file.data)
    : dup.format(
        `.${ext}`,
        Buffer.from(file.data, "binary").toString("base64")
      );
  return res;
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function sortByIds(arr, ids, key = "id") {
  return arr.sort((val1, val2) => {
    return ids.indexOf(val1[key]) - ids.indexOf(val2[key]);
  });
}

function makeId(length = 8) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function typeOf(obj) {
  return /[\s-]\w+(|\])/.exec(Object.prototype.toString.call(obj))[0].trim();
}

function sentenceToKebabCase(str) {
  if (!str) return;
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((word) => word.toLowerCase())
    .join("-");
}

function sentenceToCamelCase(str) {
  if (!str) return;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

function camelCaseToSentence(input, isOnlyFirst = true) {
  if (!input) return;
  if (typeof input === "string") input = [input];
  return input
    .map((key) =>
      key
        .replace(/[A-Z]/g, (letter) =>
          isOnlyFirst ? ` ${letter.toLowerCase()}` : ` ${letter}`
        )
        .replace(/[a-z]/, (letter) => letter.toUpperCase())
    )
    .join(" » ");
}

function kebabCaseToSentence(str) {
  if (!str) return;
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toKebabCase(str) {
  if (!str) return;
  try {
    return str
      .replaceAll("&", "and")
      .replace(/(.*?)\s([\d]{4}\s)/gi, "")
      .replace(/\s\((.*?)\)/gi, "")
      .replace(/\-/g, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      .map((w) => w.toLowerCase())
      .join("-");
  } catch (err) {
    return null;
  }
}
