const { Follow, User, sequelize } = require("../models");
const CustomError = require("../errors/customError");

class FollowService {
  // 팔로우 목록 조회 [GET] /api/follows/:userId
  followListGet = async (userId) => {
    const checkUserId = await User.findByPk(userId);

    if (!checkUserId) throw new CustomError("NOT_FOUND");

    const myFollowerlist = await User.findAll({
      include: [
        {
          model: Follow,
          as: "follower",
          where: { userIdFollowing: userId },
          attributes: [],
        },
      ],
      attributes: ["userId", "nickname", "profile", "mbti"],
    });

    const myFollowinglist = await User.findAll({
      include: [
        {
          model: Follow,
          as: "following",
          where: { userIdFollower: userId },
          attributes: [],
        },
      ],
      attributes: ["userId", "nickname", "profile", "mbti"],
    });

    return {
      following: myFollowinglist,
      follower: myFollowerlist,
    };
  };

  // 팔로우 추가 및 삭제 [PUT] /api/follows/:userId
  followListEdit = async (userId, elseUserId) => {
    const checkUserId = await User.findByPk(elseUserId);

    if (!checkUserId) throw new CustomError("NOT_FOUND");

    if (userId === elseUserId) throw new CustomError("BAD_REQUEST");

    const checkFollow = await Follow.findOne({
      where: { userIdFollowing: elseUserId, userIdFollower: userId },
    });

    if (!checkFollow) {
      await Follow.create({
        userIdFollowing: elseUserId,
        userIdFollower: userId,
      });
    } else {
      await Follow.destroy({
        where: { userIdFollowing: elseUserId, userIdFollower: userId },
      });
    }
  };
}

module.exports = FollowService;
