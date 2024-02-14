const redis = require("redis");
const envValue = require("./envConfig");

const url = envValue.redisUrl;

const redisClient = redis.createClient({
  url,
  legacyMode: true,
});
redisClient.on("connect", () => console.info("🟢 Redis 연결 성공!"));
redisClient.on("error", (err) => console.error("Redis Client Error", err.message));
redisClient.connect();

module.exports = redisClient;
