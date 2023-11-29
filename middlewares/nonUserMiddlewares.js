const jwt = require("jsonwebtoken");
const { User } = require("../models");
const CustomError = require("../errors/customError");

module.exports = (req, res, next) => {
  try {
    const { authorization } = req.headers;

    if (authorization) {
      const [authType, authToken] = (authorization || "").split(" ");

      if (authType !== "Bearer") throw new CustomError("UNAUTHORIZED");

      jwt.verify(
        authToken,
        process.env.MYSECRET_KEY,

        async (error, decoded) => {
          try {
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
    } else {
      res.locals.user = { userId: "none" };
      next();
    }
  } catch (err) {
    next(err);
  }
};
