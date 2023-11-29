const { Follow, User, sequelize } = require("../models");
const CustomError = require("../errors/customError");
const Query = require("../utils/query");

class FollowService {
  query = new Query();

  // 팔로우 목록 조회 [GET] /api/follows/:userId
  followListGet = async (userId) => {
    const checkUserId = await User.findByPk(userId);

    if (!checkUserId) {
      throw new CustomError("NOT_FOUND");
    }

    const myFollowerlist = await sequelize.query(this.query.getFollwerlist, {
      bind: { userIdFollowing: userId },
      type: sequelize.QueryTypes.SELECT,
    });

    const myFollowinglist = await sequelize.query(this.query.getFollwinglist, {
      bind: { userIdFollower: userId },
      type: sequelize.QueryTypes.SELECT,
    });

    return {
      following: myFollowinglist,
      follower: myFollowerlist,
    };
  };

  // 팔로우 추가 및 삭제 [PUT] /api/follows/:userId
  followListEdit = async (userId, elseUserId) => {
    const checkUserId = await User.findByPk(elseUserId);

    if (!checkUserId) {
      throw new CustomError("NOT_FOUND");
    }
    if (userId === elseUserId) {
      throw new CustomError("BAD_REQUEST");
    }

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
