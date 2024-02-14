const envValue = require("./envConfig");

module.exports = {
  development: {
    username: envValue.MYSQL_USER_DEV2,
    password: envValue.MYSQL_PW_DEV2,
    database: envValue.MYSQL_DB_DEV2,
    host: envValue.MYSQL_HOST_DEV2,
    dialect: "mysql",
    logging: true,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
  test: {
    username: envValue.MYSQL_USER_TEST,
    password: envValue.MYSQL_PW_TEST,
    database: envValue.MYSQL_DB_TEST,
    host: envValue.MYSQL_HOST_TEST,
    dialect: "mysql",
    logging: false,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
  production: {
    username: envValue.MYSQL_USER_PD,
    password: envValue.MYSQL_PW_PD,
    database: envValue.MYSQL_DB_PD,
    host: envValue.MYSQL_HOST_PD,
    dialect: "mysql",
    logging: false,
    timezone: "+09:00",
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
};
