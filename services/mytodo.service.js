const { ChallengedTodo, Todo, User, Follow, sequelize } = require("../models");
const { Transaction, Op } = require("sequelize");
const CustomError = require("../errors/customError");
const { calculateToday } = require("../utils/date");

class MyTodoController {
  // 오늘의 도전 todo 등록 [POST] /:todoId/challenged
  challengedTodoCreate = async (todoId, userId) => {
    const todayDate = calculateToday();
    //todoId가 Todos테이블에 존재하는건지 유효성 체크
    const todoData = await Todo.findOne({ where: { todoId } });

    if (!todoData) throw new CustomError("NOT_FOUND");
    if (!todoData.mbti) throw new CustomError("BAD_REQUEST");
    if (todoData.userId === userId) throw new CustomError("BAD_REQUEST");

    //오늘 날짜 + userId(todayDate, userId),
    const todayChallengedTodoData = await ChallengedTodo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    //이미 오늘 도전을 담았는지 challengedtodo 데이터 체크
    if (todayChallengedTodoData) throw new CustomError("BAD_REQUEST");

    // 도전 생성하고 도전 개수 update하는 과정 트렌젝션 설정
    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED },
      async (transaction) => {
        await ChallengedTodo.create(
          {
            userId,
            mbti: todoData.mbti,
            challengedTodo: todoData.todo,
            originTodoId: todoId,
            date: todayDate,
          },
          { transaction }
        );
        //challengedTodoData에서 originTodoId의 갯수 가져오기
        const [challengedTodoData] = await ChallengedTodo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            originTodoId: todoId,
          },
          transaction,
        });
        //challengedTodos에 있는 todo갯수 반영해주기
        await Todo.update(
          {
            challengedCounts: challengedTodoData.dataValues.COUNT,
          },
          { where: { todoId }, transaction }
        );
      }
    );
  };

  // 오늘의 도전 todo 등록 취소 [DELETE] /:challengedTodoId/challenged
  challengedTodoDelete = async (challengedTodoId, userId) => {
    const userChallengedTodoData = await ChallengedTodo.findOne({
      where: { challengedTodoId },
    });

    if (!userChallengedTodoData) throw new CustomError("NOT_FOUND");

    //삭제되어지는 todoId
    const deletedTodoId = userChallengedTodoData.originTodoId;

    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED },
      async (transaction) => {
        //challengedTodoId를 기준으로 데이터 삭제
        await ChallengedTodo.destroy({
          where: { challengedTodoId },
          transaction,
        });
        const [challengedTodoData] = await ChallengedTodo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            originTodoId: deletedTodoId,
          },
          transaction,
        });
        //Todos테이블에 도전갯수 업데이트
        await Todo.update(
          {
            challengedCounts: challengedTodoData.dataValues.COUNT,
          },
          { where: { todoId: deletedTodoId }, transaction }
        );
        //challengedTodo에서 userId를 기준으로, 조건은 isCompleted가 true인 것들만
        const [challengedTodoDatas] = await ChallengedTodo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            [Op.and]: [{ isCompleted: true }, { userId }],
          },
          transaction,
        });
        await User.update(
          { challengeCounts: challengedTodoDatas.dataValues.COUNT },
          { where: { userId }, transaction }
        );
      }
    );
  };

  // 오늘의 도전 todo 완료/진행중 처리 [PUT] /:challengedTodoId/challenged
  challengedTodoComplete = async (challengedTodoId, userId) => {
    // 이용자가 오늘 등록한 challengedTodoId를 진행완료 했는지 못했는지 반영
    // isCompleted boolean값을 변경시켜주어야함
    // 이용자가 오늘 도전한 todo가 있는 없는지 체크
    const todayDate = calculateToday();
    const todaychallengedTodoData = await ChallengedTodo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    if (!todaychallengedTodoData) throw new CustomError("NOT_FOUND");

    const isCompletedCheck = todaychallengedTodoData.isCompleted;

    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED },
      async (transaction) => {
        //오늘 도전한 todo가 있다면 isCompleted의 값을 바꿔 준다.
        await ChallengedTodo.update(
          { isCompleted: isCompletedCheck ? false : true },
          { where: { challengedTodoId } },
          { transaction }
        );

        //이용자가 오늘 작성한 todo는 있지만 프론트에서 보낸 challengedTodoId가 올바르지 않는경우 에러처리
        //params는 문자열로 들어오기에 숫자열로 변경후 비교
        if (Number(challengedTodoId) !== todaychallengedTodoData.challengedTodoId) throw new CustomError("BAD_REQUEST");

        const [challengedTodoData] = await ChallengedTodo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            [Op.and]: [{ isCompleted: true }, { userId }],
          },
          transaction,
        });

        await User.update(
          {
            challengeCounts: challengedTodoData.dataValues.COUNT,
          },
          { where: { userId } },
          { transaction }
        );

        const isCompleted = !isCompletedCheck;

        return isCompleted;
      }
    );
  };

  // 오늘의 제안 todo 작성 [POST] /api/mytodos
  todoCreate = async (todo, userId) => {
    // todo 테이블에 todo, user의 mbti,nickname,userId를 넣어야 함
    // mytodo 테이블에도 동시에 담기 (서버단에서 작성된 날짜기준으로 넣는다)
    const todayDate = calculateToday();
    const userData = await User.findOne({ where: { userId } });

    if (!userData) throw new CustomError("NOT_FOUND");
    if (!userData.mbti) throw new CustomError("BAD_REQUEST");

    const checkTodoData = await Todo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    if (checkTodoData) throw new CustomError("BAD_REQUEST");

    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED },
      async (transaction) => {
        await Todo.create(
          {
            todo,
            mbti: userData.mbti,
            nickname: userData.nickname,
            userId,
            date: todayDate,
          },
          { transaction }
        );

        const [userTodoData] = await Todo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            userId,
          },
          transaction,
        });

        await User.update(
          {
            todoCounts: userTodoData.dataValues.COUNT,
          },
          { where: { userId }, transaction }
        );
      }
    );
  };

  // 오늘의 제안 todo 삭제 [DELETE] /api/mytodos/:todoId
  todoDelete = async (todoId, userId) => {
    const todoData = await Todo.findOne({
      where: { todoId, userId },
    });

    if (!todoData) throw new CustomError("NOT_FOUND");

    await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED },
      async (transaction) => {
        await Todo.destroy({
          where: { todoId },
          transaction,
        });

        const [userTodoData] = await Todo.findAll({
          attributes: [[sequelize.fn("COUNT", sequelize.col("userId")), "COUNT"]],
          where: {
            userId,
          },
          transaction,
        });

        await User.update(
          {
            todoCounts: userTodoData.dataValues.COUNT,
          },
          { where: { userId }, transaction }
        );
      }
    );
  };

  // 나의 todo 피드 조회 [GET] /api/mytodos
  getMyTodo = async (userId, date) => {
    const [userInfo, [followingCounts], [followerCounts]] = await Promise.all([
      User.findOne({
        where: { userId },
        include: [
          { model: Todo, where: { userId, date }, required: false },
          { model: ChallengedTodo, where: { userId, date }, required: false },
        ],
      }),
      Follow.findAll({
        attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollower")), "followingCounts"]],
        where: { userIdFollower: userId },
      }),
      Follow.findAll({
        attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollowing")), "followerCounts"]],
        where: { userIdFollowing: userId },
      }),
    ]);

    return {
      userInfo: {
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        followingCount: followingCounts.dataValues.followingCounts,
        followerCount: followerCounts.dataValues.followerCounts,
      },
      challengedTodo: userInfo?.ChallengedTodos[0] ?? [],
      createdTodo: userInfo?.Todos[0] ?? [],
      date,
    };
  };

  // 타인의 todo 피드 조회 [GET] /api/mytodos/:userId
  getUserTodo = async (userId, elseUserId) => {
    const [userInfo, [followingCounts], [followerCounts], challengedTodos, isFollowed] = await Promise.all([
      User.findOne({
        where: { userId: elseUserId },
        include: [{ model: Todo, order: [["createdAt", "DESC"]], limit: 20 }],
      }),
      Follow.findAll({
        attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollower")), "followingCounts"]],
        where: { userIdFollower: elseUserId },
      }),
      Follow.findAll({
        attributes: [[sequelize.fn("COUNT", sequelize.col("userIdFollowing")), "followerCounts"]],
        where: { userIdFollowing: elseUserId },
      }),
      ChallengedTodo.findAll({
        where: { userId: elseUserId },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: Todo,
            where: { todoId: sequelize.col("originTodoId") },
            attributes: ["challengedCounts", "commentCounts"],
          },
        ],
      }),
      Follow.findOne({
        where: { userIdFollower: userId, userIdFollowing: elseUserId },
      }),
    ]);

    if (!userInfo) throw new CustomError("NOT_FOUND");

    return {
      userInfo: {
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        mimicCounts: userInfo.todoCounts + userInfo.challengeCounts,
        followingCount: followingCounts.dataValues.followingCounts,
        followerCount: followerCounts.dataValues.followerCounts,
        isFollowed: isFollowed ? true : false,
      },
      challengedTodos,
      createdTodos: userInfo.Todos,
    };
  };
}

module.exports = MyTodoController;
