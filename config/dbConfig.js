const envValue = require("./envConfig");

module.exports = {
  development: {
    username: envValue.mysqlUser,
    password: envValue.mysqlPw,
    database: envValue.mysqlDb,
    host: envValue.mysqlHost,
    dialect: "mysql",
    logging: true,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
  test: {
    username: envValue.mysqlUser,
    password: envValue.mysqlPw,
    database: envValue.mysqlDb,
    host: envValue.mysqlHost,
    dialect: "mysql",
    logging: false,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
  production: {
    username: envValue.mysqlUser,
    password: envValue.mysqlPw,
    database: envValue.mysqlDb,
    host: envValue.mysqlHost,
    dialect: "mysql",
    logging: false,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
};
