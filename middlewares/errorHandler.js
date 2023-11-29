const { logger } = require("../utils/logger");
const errorCodes = require("../errors/errorCodes");

module.exports = {
  errorHandler: (err, req, res, next) => {
    logger.error(err.message);

    const codeName = (err && err.codeName) || null;
    let error = errorCodes[codeName] || errorCodes["INTERNAL_SERVER_ERROR"];

    //* joi 라이브러리 사용한 validation 검사 에러
    if (err.name === "ValidationError") error = errorCodes["BAD_REQUEST"];

    return res.status(error.statusCode).json({ errorMessage: error.message });
  },
  //controllers부분 try catch 생략 미들웨어
  wrapAsyncController: function tryCatch(fn) {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  },
};
