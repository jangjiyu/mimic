const { User, Follow, EmailAuth } = require("../models");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const Boom = require("@hapi/boom");
const schedule = require("node-schedule");

//이메일 형식
const regexEmail = /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,4})+$/;
//비밀번호 글자수 8~20 & 필수 포함 영어, 숫자, 특수문자 2개 이상 혼합
const regexPassword =
  /^(?!((?:[A-Za-z]+)|(?:[~!@#$%^&()_+=]+)|(?=[0-9]+))$)[A-Za-z\d~!@#$%^&()_+=]{8,20}$/;

class UserService {
  // 회원가입 [POST] /api/accounts/signup
  userSignup = async (email, password, confirmPassword, nickname) => {
    const emailCheck = regexEmail.test(email);
    const passwordCheck = regexPassword.test(password);
    const duplicateCheck = await User.findOne({ where: { email: email } });

    if (duplicateCheck) {
      throw Boom.badRequest("중복된 이메일 입니다.");
    }
    if (!emailCheck && !passwordCheck) {
      throw Boom.badRequest("이메일 비밀번호 형식이 알맞지 않습니다");
    }
    if (password !== confirmPassword) {
      throw Boom.badRequest("비밀번호와 비밀번호 확인값이 일치 하지 않습니다.");
    }

    const bcr_password = bcrypt.hashSync(
      password,
      parseInt(parseInt(process.env.SALT))
    ); //비밀번호 암호화

    await User.create({
      email,
      password: bcr_password,
      nickname,
    });

    const userData = await User.findOne({ where: { email: email } });
    const userId = userData.userId;
    const mbti = userData.mbti;

    const payload = {
      userId: userId,
      nickname: nickname,
      mbti: mbti,
    };

    const token = jwt.sign(payload, process.env.MYSECRET_KEY, {
      expiresIn: "2d",
    });

    return token;
  };

  // mbti 등록 [POST] /api/accounts/mbti
  userMbti = async (mbti, userId) => {
    await User.update({ mbti: mbti }, { where: { userId: userId } });
    return;
  };

  // 로그인 [POST] /api/accounts/login
  userLogin = async (email, password) => {
    const userData = await User.findOne({ where: { email: email } });
    if (!userData) {
      throw Boom.badRequest("이메일 또는 비번을 잘못 입력하셨습니다.");
    }

    const userId = userData.userId;
    const nickname = userData.nickname;
    const mbti = userData.mbti;

    if (!email || !password) {
      throw Boom.badRequest("빈칸을 채워주세요");
    }

    if (!userData) {
      throw Boom.badRequest("회원정보가 없습니다.");
    }

    const passwordSame = await bcrypt.compare(password, userData.password); //비밀번호 암호화 비교

    if (!passwordSame) {
      throw Boom.badRequest("아이디나 비번이 올바르지 않습니다.");
    }

    const payload = {
      userId: userId,
      nickname: nickname,
      mbti: mbti,
    };

    const token = jwt.sign(payload, process.env.MYSECRET_KEY, {
      expiresIn: "2d",
    });

    return token;
  };

  // 이메일 중복 검사 + 인증메일 발송 [POST] /api/accounts/emailAuth
  authEmail = async (email) => {
    // 중복인 경우 (isUser:false인 경우도 있으니 에러메시지는 "이미 존재하거나 탈퇴한 이메일입니다")
    const dupCheck = await User.findOne({ where: { email } });
    if (dupCheck) {
      throw Boom.unauthorized("이미 존재하거나 탈퇴한 이메일입니다.");
    }

    // 6자리의 난수
    const authNumber = Math.floor(Math.random() * 1000000);

    // 중복 아닌 경우 emailAuth 테이블에 데이터 존재하는지 확인하고 없으면 인증번호 전송
    // 존재하면 삭제하고 인증번호 재전송
    const exEmailAuth = await EmailAuth.findOne({ where: { email } });
    if (exEmailAuth) {
      await EmailAuth.destroy({ where: { email } });
    }

    // 인증번호 전송
    const configOptions = {
      service: process.env.NODEMAILER_SERVICE,
      host: process.env.NODEMAILER_HOST,
      port: process.env.NODEMAILER_PORT,
      maxConnections: 50,
      auth: {
        user: process.env.NODEMAILER_USER, // generated ethereal user
        pass: process.env.NODEMAILER_PASSWORD, // generated ethereal password
      },
    };
    const emailForm = {
      from: process.env.NODEMAILER_USER, // sender address
      to: email, // list of receivers
      subject: "MIMIC 이메일 인증", // Subject line
      text: "MIMIC", // plain text body
      html: `<h2><b>당신의 하루, 나의 하루. MIMIC</b></h2><b>인증번호는 ${authNumber} 입니다</b><p>본 인증 번호는 2시간 동안만 유효합니다.</p>`, // html body
    };

    const transporter = nodemailer.createTransport(configOptions);
    transporter.sendMail(emailForm);

    await EmailAuth.create({ email, authNumber });

    // create 후 2시간 지나면 DB에서 삭제
    const end = new Date();
    end.setHours(end.getHours() + 2); // 2시간 후로 스케쥴링
    schedule.scheduleJob(end, async () => {
      // 1시간 후에 삭제
      await EmailAuth.destroy({ where: { email } });
    });
  };

  // 이메일 인증확인 [POST] /api/accounts/emailAuth/check
  checkEmailAuth = async (email, emailAuthNumber) => {
    const authNumber = await EmailAuth.findOne({ where: { email } });
    if (!authNumber) {
      throw Boom.unauthorized(
        "email 정보가 존재하지 않습니다. 다시 인증 바랍니다."
      );
    }

    if (authNumber.authNumber !== emailAuthNumber) {
      throw Boom.unauthorized("인증번호가 일치하지 않습니다.");
    }
  };

  // 회원 정보 조회 [GET] /api/accounts
  userInfoGet = async (userId) => {
    const userData = await User.findByPk(userId);

    const myfolloing = await Follow.findAll({
      where: { userIdFollower: userId },
    });

    const myfollower = await Follow.findAll({
      where: { userIdFollowing: userId },
    });

    return {
      userId: userData.userId,
      mbti: userData.mbti,
      nickname: userData.nickname,
      profile: userData.profile,
      following: myfolloing.length,
      follower: myfollower.length,
    };
  };

  // 회원 정보 변경 [PUT] /api/accounts
  userInfoChange = async (
    userId,
    password,
    newPassword,
    confirmPassword,
    nickname,
    profile,
    mbti
  ) => {
    const userData = await User.findByPk(userId);

    if (password) {
      const compareResult = await bcrypt.compare(password, userData.password);
      if (!compareResult) {
        throw Boom.unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
      }
      if (newPassword !== confirmPassword) {
        throw Boom.unauthorized(
          "비밀번호와 비밀번호 확인값이 일치 하지 않습니다."
        );
      }
      const hash = bcrypt.hashSync(newPassword, parseInt(process.env.SALT));
      await User.update({ password: hash }, { where: { userId } });
    }

    if (nickname) {
      await User.update({ nickname }, { where: { userId } });
    }

    if (profile) {
      await User.update({ profile }, { where: { userId } });
    }

    if (mbti) {
      await User.update({ mbti }, { where: { userId } });
    }

    // token 새로 보내주기
    const payload = {
      userId: userId,
      nickname: nickname,
      mbti: mbti,
    };

    const token = jwt.sign(payload, process.env.MYSECRET_KEY, {
      expiresIn: "2d",
    });

    return token;
  };

  // 회원탈퇴 [DELETE] /api/accounts
  userInfoDelete = async (userId, password) => {
    const userData = await User.findByPk(userId);

    const compareResult = await bcrypt.compare(password, userData.password);
    if (!compareResult) {
      throw Boom.unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    await User.update({ isUser: false }, { where: { userId } });
  };
}

module.exports = UserService;
