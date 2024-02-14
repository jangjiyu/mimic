const jwt = require("jsonwebtoken");
const { User } = require("../models");
const CustomError = require("../errors/customError");
const envValue = require("../config/envConfig");

module.exports = (req, res, next) => {
  try {
    // 헤더의 토큰을 authorization으로 읽어들여서, 공백을 기준으로 두 조각으로 나눔
    const { authorization } = req.headers;
    const [authType, authToken] = (authorization || "").split(" ");

    // 전달받은 인증값이 Bearer로 시작하지 않으면 인증 실패
    if (authType !== "Bearer") throw new CustomError("UNAUTHORIZED");

    // 뒤쪽 'authToken'을 우리 MYSECRET_KEY를 가지고 인증해보고 에러 없으면, user 정보를 토근으로 다음 next으로 넘겨줌
    jwt.verify(
      authToken,
      envValue.secretKey,

      async (error, decoded) => {
        try {
          // 인증 결과 에러가 나타나면 클라이언트와 서버에 모두 에러를 던지고 미들웨어 종료
          if (error) throw new CustomError("UNAUTHORIZED");

          const user = await User.findOne({
            where: { userId: decoded.userId },
          });
          res.locals.user = user;
          next();
        } catch (err) {
          next(err);
        }
      }
    );
  } catch (err) {
    next(err);
  }
};
