require("dotenv").config();
const joi = require("joi");

const envSchema = joi
  .object({
    PORT: joi.number().required(),
    NODE_ENV: joi.string().required(),
    LOGDIR: joi.string().required(),
    MYSECRET_KEY: joi.string().required(),
    SALT: joi.number().required(),
    NODEMAILER_SERVICE: joi.string().required(),
    NODEMAILER_HOST: joi.string().required(),
    NODEMAILER_PORT: joi.number().required(),
    NODEMAILER_USER: joi.string().required(),
    NODEMAILER_PASSWORD: joi.string().required(),
    KAKAO: joi.string().required(),
    KAKAO_URL: joi.string().required(),
    S3_ACCESS_KEY_ID: joi.string().required(),
    S3_SECRET_ACCESS_KEY: joi.string().required(),
    S3_BUCKET: joi.string().required(),
    S3_BUCKET_FOLDER: joi.string().required(),
    MYSQL_USER_DEV: joi.string().required(),
    MYSQL_PW_DEV: joi.string().required(),
    MYSQL_DB_DEV: joi.string().required(),
    MYSQL_HOST_DEV: joi.string().required(),
    MYSQL_USER_DEV2: joi.string().required(),
    MYSQL_PW_DEV2: joi.string().required(),
    MYSQL_DB_DEV2: joi.string().required(),
    MYSQL_HOST_DEV2: joi.string().required(),
    MYSQL_USER_PD: joi.string().required(),
    MYSQL_PW_PD: joi.string().required(),
    MYSQL_DB_PD: joi.string().required(),
    MYSQL_HOST_PD: joi.string().required(),
    REDIS_URI: joi.string().required(),
  })
  .unknown();

const { value: envValue, error } = envSchema.validate(process.env);

if (error) throw new Error(`[환경변수 확인 필요] ${error.message}`);

module.exports = envValue;
