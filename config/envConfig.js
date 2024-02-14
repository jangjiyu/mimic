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
    MYSQL_USER: joi.string().required(),
    MYSQL_PW: joi.string().required(),
    MYSQL_DB: joi.string().required(),
    MYSQL_HOST: joi.string().required(),
    MYSQL_USER_DEV: joi.string().required(),
    MYSQL_PW_DEV: joi.string().required(),
    MYSQL_DB_DEV: joi.string().required(),
    MYSQL_HOST_DEV: joi.string().required(),
    MYSQL_USER_PD: joi.string().required(),
    MYSQL_PW_PD: joi.string().required(),
    MYSQL_DB_PD: joi.string().required(),
    MYSQL_HOST_PD: joi.string().required(),
    REDIS_URI: joi.string().required(),
  })
  .unknown();

const { value: envValue, error } = envSchema.validate(process.env);

if (error) throw new Error(`[환경변수 확인 필요] ${error.message}`);

module.exports = {
  port: envValue.PORT,
  nodeEnv: envValue.NODE_ENV,
  logDir: envValue.LOGDIR,
  secretKey: envValue.MYSECRET_KEY,
  salt: envValue.SALT,
  nodemailerService: envValue.NODEMAILER_SERVICE,
  nodemailerHost: envValue.NODEMAILER_HOST,
  nodemailerPort: envValue.NODEMAILER_PORT,
  nodemailerUser: envValue.NODEMAILER_USER,
  nodemailerPassword: envValue.NODEMAILER_PASSWORD,
  kakaoKey: envValue.KAKAO,
  kakaoUrl: envValue.KAKAO_URL,
  s3KeyId: envValue.S3_ACCESS_KEY_ID,
  s3SecretKey: envValue.S3_SECRET_ACCESS_KEY,
  s3Bucket: envValue.S3_BUCKET,
  s3BucketFolder: envValue.S3_BUCKET_FOLDER,
  mysqlUser: envValue.MYSQL_USER,
  mysqlPw: envValue.MYSQL_PW,
  mysqlDb: envValue.MYSQL_DB,
  mysqlHost: envValue.MYSQL_HOST,
  redisUrl: envValue.REDIS_URI,
};
