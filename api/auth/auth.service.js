const bcrypt = require("bcrypt");
const userService = require("../user/user.service.mariadb");
const logger = require("../../middlewares/logger.middleware");

async function login(username, password, query) {
  logger.debug("Login", `username: ${username}`);
  const user = await userService.get({ username });

  if (!user) {
    return Promise.reject("Invalid username or password");
  }

  if (!bcrypt.compare(password, user.password)) {
    return Promise.reject("Invalid password");
  }

  delete user.password;
  await userService.login(user._id, query);

  return { ...user };
}

async function signup(username, password, fullname) {
  const saltRounds = 10;
  logger.debug("Signup", `username: ${username}`, `fullname: ${fullname}`);

  if (!username || !password || !fullname)
    return Promise.reject("fullname, username and password are required!");

  const hash = await bcrypt.hash(password, saltRounds);

  return userService.add({ username, password: hash, fullname });
}

module.exports = {
  signup,
  login,
};
