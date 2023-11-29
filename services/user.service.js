const { User, Follow, EmailAuth, sequelize } = require("../models");
const { Transaction, Op } = require("sequelize");
const bcrypt = require("bcrypt");
const multer = require("../middlewares/multer");
const CustomError = require("../errors/customError");
const createToken = require("../utils/createToken");
const sendEmail = require("../utils/nodeMailer");

class UserService {
  // 회원가입 [POST] /api/accounts/signup
  userSignup = async (email, password, confirmPassword, nickname) => {
    const checkEamilDuplicate = await User.findOne({ where: { email } });
    const authResult = await EmailAuth.findOne({
      where: { email, authCheck: true },
    });

    if (checkEamilDuplicate) {
      throw new CustomError("CONFLICT");
    }
    if (password !== confirmPassword) {
      throw new CustomError("BAD_REQUEST");
    }
    if (!authResult) {
      throw new CustomError("BAD_REQUEST");
    }

    const bcrPassword = bcrypt.hashSync(password, parseInt(parseInt(process.env.SALT)));
    const userData = await User.create({
      email,
      password: bcrPassword,
      nickname,
    });
    const token = createToken(userData);

    return token;
  };

  // mbti 등록 [POST] /api/accounts/mbti
  userMbti = async (mbti, userId) => {
    let userData = await User.findByPk(userId);
    userData = await userData.update({ mbti });
    const token = createToken(userData);

    return token;
  };

  // 로그인 [POST] /api/accounts/login
  userLogin = async (email, password) => {
    const userData = await User.findOne({ where: { email } });

    if (!userData) {
      throw new CustomError("NOT_FOUND");
    }

    const bcrCompareResult = await bcrypt.compare(password, userData.password);

    if (!bcrCompareResult) {
      throw new CustomError("UNAUTHORIZED");
    }

    const token = createToken(userData);

    return token;
  };

  // 이메일 중복 검사 + 인증메일 발송 [POST] /api/accounts/emailAuth
  authEmail = async (email) => {
    const dupCheck = await User.findOne({ where: { email } });

    if (dupCheck) {
      throw new CustomError("CONFLICT");
    }

    // 중복 아닌 경우 emailAuth 테이블에 데이터 존재하는지 확인하고 없으면 인증번호 전송 / 존재하면 삭제하고 인증번호 재전송
    const exEmailAuth = await EmailAuth.findOne({ where: { email } });

    if (exEmailAuth) {
      await EmailAuth.destroy({ where: { email } });
    }

    sendEmail(email);
  };

  // 이메일 인증확인 [POST] /api/accounts/emailAuth/check
  checkEmailAuth = async (email, emailAuthNumber) => {
    const authEmailData = await EmailAuth.findOne({ where: { email } });

    if (!authEmailData) {
      throw new CustomError("NOT_FOUND");
    }
    if (authEmailData.authNumber !== emailAuthNumber) {
      throw new CustomError("BAD_REQUEST");
    }

    await EmailAuth.update({ authCheck: true }, { where: { email } });
  };

  //회원 정보 조회 [GET] /api/accounts
  userInfoGet = async (userId) => {
    const userData = await User.findByPk(userId, { attributes: ["userId", "mbti", "nickname", "profile"], raw: true });

    const [followingCounts] = await Follow.findAll({
      attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollower")), "followingCounts"]],
      where: { userIdFollower: userId },
    });

    const [followerCounts] = await Follow.findAll({
      attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollowing")), "followerCounts"]],
      where: { userIdFollowing: userId },
    });

    userData.mimicCounts = userData.todoCounts + userData.challengeCounts;
    userData.following = followingCounts.dataValues.followingCounts;
    userData.follower = followerCounts.dataValues.followerCounts;

    return userData;
  };

  // 회원 정보 변경 [PUT] /api/accounts
  userInfoChange = async (userId, password, newPassword, confirmPassword, nickname, mbti) => {
    let userData = await User.findByPk(userId);

    if (password) {
      const bcrCompareResult = await bcrypt.compare(password, userData.password);

      if (!bcrCompareResult) {
        throw new CustomError("UNAUTHORIZED");
      }
      if (newPassword !== confirmPassword) {
        throw new CustomError("BAD_REQUEST");
      }

      const bcrPassword = bcrypt.hashSync(newPassword, parseInt(process.env.SALT));

      userData = await userData.update({ password: bcrPassword });
    }

    if (nickname) {
      userData = await userData.update({ nickname });
    }

    if (mbti) {
      userData = await userData.update({ mbti });
    }

    const token = createToken(userData);

    return token;
  };

  // 프로필 사진 변경 [PUT] /api/accounts/profile
  userProfileChange = async (userId, profile) => {
    let userData = await User.findByPk(userId);

    if (userData.profile !== "none") {
      await multer.deleteProfile(userData.profile);
    }

    userData = await userData.update({ profile });

    const token = createToken(userData);

    return token;
  };

  // 회원탈퇴 [DELETE] /api/accounts
  userInfoDelete = async (userId, password) => {
    const userData = await User.findByPk(userId);
    const bcrCompareResult = await bcrypt.compare(password, userData.password);

    if (!bcrCompareResult) {
      throw new CustomError("UNAUTHORIZED");
    }

    // 회원탈퇴 후 follow DB에서 해당 userId 데이터 삭제하는 과정 트렌젝션 설정
    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
      async (transaction) => {
        await User.destroy({ where: { userId }, transaction });
        await Follow.destroy({
          where: {
            [Op.or]: [{ userIdFollowing: userId }, { userIdFollower: userId }],
          },
          transaction,
        });
      }
    );
  };
}

module.exports = UserService;
