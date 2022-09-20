const dotenv = require("dotenv");
const redis = require("redis");
const dayjs = require("dayjs");
const { Count } = require("../models");
const localDate = dayjs().format("YYYY-MM-DD");
const schedule = require("node-schedule");
dotenv.config(); // env환경변수 파일 가져오기

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
  legacyMode: true, // 반드시 설정 !!
});
redisClient.on("connect", () => console.info("🟢 Redis 연결 성공!"));
redisClient.on("error", (err) =>
  console.error("Redis Client Error", err.message)
);
redisClient.connect();

const redisCli = redisClient.v4;

visitorsCount = async (clientIp) => {
  await redisCli.PFADD(localDate, clientIp);
  console.log(redisCli);
  console.log(1);

  schedule.scheduleJob("* * */6 * * *", async () => {
    const todayCount = await redisCli.PFCOUNT(localDate);
    console.log(todayCount);
    await Count.create({
      date: localDate,
      Count: todayCount,
    });
    await redisCli.DEL(localDate);
  });
};

module.exports = visitorsCount;
