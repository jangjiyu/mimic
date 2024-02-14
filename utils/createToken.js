const jwt = require("jsonwebtoken");
const envValue = require("../config/envConfig");

const createToken = (userData) => {
  const payload = {
    userId: userData.userId,
    nickname: userData.nickname,
    mbti: userData.mbti,
    provider: userData.provider,
    profile: userData.profile,
  };

  return jwt.sign(payload, envValue.secretKey, {
    expiresIn: "2d",
  });
};

module.exports = createToken;
