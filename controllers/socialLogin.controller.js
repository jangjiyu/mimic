const { User, Follow, sequelize } = require("../models");
const { Transaction } = require("sequelize");
const { Op } = require("sequelize");
const Joi = require("../utils/joi");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const CustomError = require("../errors/customError");
require("dotenv").config();
joi = new Joi();

// Kakao callback Controller
exports.kakaoLogin = (req, res, next) => {
  passport.authenticate("kakao", { failureRedirect: "/" }, (err, user, info) => {
    if (err) return next(err);
    const { userId, mbti, nickname, provider, profile } = user;
    const token = jwt.sign({ userId, mbti, nickname, provider, profile }, process.env.MYSECRET_KEY, {
      expiresIn: "2d",
    });
    res.redirect(`https://www.todaysmimic.today/mbti?token=${token}`);
  })(req, res, next);
};

// passport-kakao 연결끊기 콜백 API
exports.deleteKakao = async (req, res) => {
  const user_id = await joi.kakaoLeaveQuerySchema.validateAsync(req.query.user_id);

  const user = await User.findOne({
    where: { snsId: user_id, provider: "kakao" },
  });
  if (!user) throw new CustomError("NOT_FOUND");

  // 카카오 탈퇴 후 follow DB에서 해당 userId 데이터 삭제하는 과정 트렌젝션 설정
  await sequelize.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    },
    async (transaction) => {
      await User.destroy({ where: { snsId: user_id }, transaction });
      await Follow.destroy({
        where: {
          [Op.or]: [{ userIdFollowing: user.userId }, { userIdFollower: user.userId }],
        },
        transaction,
      });
    }
  );

  console.log("카카오 연결끊기 완료");

  res.status(200).json({
    message: "success",
  });
};
