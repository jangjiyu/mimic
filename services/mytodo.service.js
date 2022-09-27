const { Op } = require("sequelize");
const { ChallengedTodo, Todo, User, Follow, sequelize } = require("../models");
const Boom = require("@hapi/boom");
const { calculateToday } = require("../utils/date");
const Query = require("../utils/query");

class myTodoController {
  query = new Query();

  // 오늘의 도전 todo 등록 [POST] /:todoId/challenged
  challengedTodoCreate = async (todoId, userId) => {
    const todayDate = calculateToday();
    //todoId가 Todos테이블에 존재하는건지 유효성 체크
    const todoData = await Todo.findOne({ where: { todoId: todoId } });
    if (!todoData) {
      throw Boom.badRequest("존재하지 않는 todo 입니다.");
    }
    if (!todoData.mbti) {
      throw Boom.badRequest("MBTI 정보 등록바랍니다.");
    }
    if (todoData.userId === userId) {
      throw Boom.badRequest("본인 글은 도전할 수 없습니다.");
    }

    //오늘 날짜 + userId(todayDate, userId),
    const todayChallengedTodoData = await ChallengedTodo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    // //이미 오늘 도전을 담았는지 challengedtodo 데이터 체크
    if (todayChallengedTodoData) {
      throw Boom.badRequest("오늘의 todo가 이미 등록되었습니다.");
    }

    //challengedTodoData에서 originTodoId의 갯수 가져오기
    const challengedTodoData = await sequelize.query(
      this.query.getChallengedTodoGroupByoriginTodoId,
      { bind: { originTodoId: todoId }, type: sequelize.QueryTypes.SELECT }
    );

    // 도전 생성하고 도전 개수 update하는 과정 트렌젝션 설정
    const onTranscation = await sequelize.transaction();
    try {
      await ChallengedTodo.create(
        {
          userId: userId,
          mbti: todoData.mbti,
          challengedTodo: todoData.todo,
          originTodoId: todoId,
          date: todayDate,
        },
        { transaction: onTranscation }
      );

      //challengedTodos에 있는 todo갯수 반영해주기
      await Todo.update(
        {
          challengedCounts: challengedTodoData[0]
            ? challengedTodoData[0].COUNT + 1
            : 1,
        },
        { where: { todoId: todoId }, transaction: onTranscation }
      );
      await onTranscation.commit();
    } catch (err) {
      await onTranscation.rollback();
    }
  };

  // 오늘의 도전 todo 등록 취소 [DELETE] /:challengedTodoId/challenged
  challengedTodoDelete = async (challengedTodoId, userId) => {
    const userChallengedTodoData = await ChallengedTodo.findOne({
      where: { challengedTodoId: challengedTodoId },
    });
    if (userChallengedTodoData === null) {
      throw Boom.badRequest("삭제되었거나 존재하지 않는 todo 입니다.");
    }

    //삭제되어지는 todoId
    const deletedTodoId = userChallengedTodoData.originTodoId;

    const onTransaction = await sequelize.transaction();
    try {
      //challengedTodoId를 기준으로 데이터 삭제
      await ChallengedTodo.destroy(
        {
          where: { challengedTodoId: challengedTodoId },
        },
        { transaction: onTransaction }
      );

      const challengedTodoData = await sequelize.query(
        this.query.getChallengedTodoGroupByoriginTodoId,
        {
          bind: { originTodoId: deletedTodoId },
          type: sequelize.QueryTypes.SELECT,
        },
        { transaction: onTransaction }
      );

      console.log(challengedTodoData);

      //Todos테이블에 도전갯수 업데이트
      await Todo.update(
        {
          challengedCounts: challengedTodoData[0]
            ? challengedTodoData[0].COUNT
            : 0,
        },
        { where: { todoId: deletedTodoId }, transaction: onTransaction }
      );

      //challengedTodo에서 userId를 기준으로 그룹을 하데 조건은 isChallenged가 true인 것들만
      const challengedData = await sequelize.query(
        this.query.getChallengedTodoGroupByuserId,
        { bind: { userId: userId }, type: sequelize.QueryTypes.SELECT },
        { transaction: onTransaction }
      );

      await User.update(
        { challengeCounts: challengedData[0] ? challengedData[0].COUNT : 0 },
        { where: { userId }, transaction: onTransaction }
      );

      await onTransaction.commit();
    } catch (err) {
      await onTransaction.rollback();
    }
  };

  // 오늘의 도전 todo 완료/진행중 처리 [PUT] /:challengedTodoId/challenged
  challengedTodoComplete = async (challengedTodoId, userId) => {
    //이용자가 오늘 등록한 challengedTodoId를 진행완료 했는지 못했는지 반영
    //isCompleted boolean값을 변경시켜주어야함
    //이용자가 오늘 도전한 todo가 있는 없는지 체크
    //오늘 날짜 + userId(todayDate, userId),
    const todayDate = calculateToday();
    const todaychallengedTodoData = await ChallengedTodo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    if (!todaychallengedTodoData) {
      throw Boom.badRequest("오늘 도전한 todo가 없습니다.");
    }

    const isCompletedCheck = todaychallengedTodoData.isCompleted;
    const onTransaction = await sequelize.transaction();
    try {
      //오늘 도전한 todo가 있다면 isCompleted의 값을 바꿔 준다.
      await ChallengedTodo.update(
        { isCompleted: isCompletedCheck ? false : true },
        { where: { challengedTodoId } },
        { transaction: onTransaction }
      );

      //이용자가 오늘 작성한 todo는 있지만 프론트에서 보낸 challengedTodoId가 올바르지 않는경우 에러처리
      //params는 문자열로 들어오기에 숫자열로 변경후 비교
      if (
        Number(challengedTodoId) !== todaychallengedTodoData.challengedTodoId
      ) {
        throw Boom.badRequest("challengedTodoId가 올바르지 않습니다.");
      }

      //challengedTodo에서 userId를 기준으로 그룹을 하데 조건은 isChallenged가 true인 것들만
      const challengedTodoData = await sequelize.query(
        this.query.getChallengedTodoGroupByuserId,
        { bind: { userId: userId }, type: sequelize.QueryTypes.SELECT },
        { transaction: onTransaction }
      );

      await User.update(
        {
          challengeCounts: challengedTodoData[0]
            ? challengedTodoData[0].COUNT
            : 0,
        },
        { where: { userId }, transaction: onTransaction }
      );

      await onTransaction.commit();

      const isCompleted = !isCompletedCheck;
      return isCompleted;
    } catch (err) {
      await onTransaction.rollback();
    }
  };

  // 오늘의 제안 todo 작성 [POST] /api/mytodos
  todoCreate = async (todo, userId) => {
    //todo 테이블에 todo, user의mbti,nickname,userId,를 넣어야함
    //mytodo테이블에도 동시에 담기(서버단에서 작성된 날짜기준으로 넣는다.)
    const todayDate = calculateToday();
    const userData = await User.findOne({ where: { userId } });
    if (!userData) {
      throw Boom.badRequest("사용자 정보가 없습니다.");
    }
    if (!userData.mbti) {
      throw Boom.badRequest("mbti 정보를 등록후 작성바랍니다.");
    }

    const checkTodoData = await Todo.findOne({
      where: {
        [Op.and]: [{ date: todayDate }, { userId }],
      },
    });

    if (checkTodoData) {
      throw Boom.badRequest("오늘의 todo 작성을 이미 하셨습니다.");
    }

    const onTransaction = await sequelize.transaction();
    try {
      await Todo.create({
        todo,
        mbti: userData.mbti,
        nickname: userData.nickname,
        userId,
        date: todayDate,
      });

      const [userTodoData] = await sequelize.query(
        this.query.getTodoGroupByuserId,
        { bind: { userId: userId }, type: sequelize.QueryTypes.SELECT },
        { transaction: onTransaction }
      );
      //값이 있다면 그 카운터를 반영 없다면 0으a로

      let todoCounts = 0;
      //값이 있는 경우에만 배열에서 count를 사용해서 반영
      if (userTodoData !== undefined) {
        todoCounts = userTodoData.COUNT;
      }

      await User.update(
        { todoCounts },
        { where: { userId }, transaction: onTransaction }
      );

      await onTransaction.commit();
    } catch (err) {
      await onTransaction.rollback();
    }
  };

  // todo 삭제 [DELETE] /api/mytodos/:todoId
  todoDelete = async (todoId, userId) => {
    const todoData = await Todo.findOne({
      where: { todoId, userId },
    });

    if (todoData === null) {
      throw Boom.badRequest("이미 삭제되었거나 없는 todo입니다.");
    }

    const onTransaction = await sequelize.transaction();
    try {
      await Todo.destroy(
        {
          where: { todoId: todoId },
        },
        { transaction: onTransaction }
      );

      const [userTodoData] = await sequelize.query(
        this.query.getTodoGroupByuserId,
        { bind: { userId: userId }, type: sequelize.QueryTypes.SELECT },
        { transaction: onTransaction }
      );
      //값이 있다면 그 카운터를 반영 없다면 0으a로
      let todoCounts = 0;
      //값이 있는 경우에만 배열에서 count를 사용해서 반영
      if (userTodoData !== undefined) {
        todoCounts = userTodoData.COUNT;
      }

      await User.update(
        { todoCounts },
        { where: { userId } },
        { transaction: onTransaction }
      );

      await onTransaction.commit();
    } catch (error) {
      await onTransaction.rollback();
    }
  };

  // 나의 todo 피드 조회 [GET] /api/mytodos
  getMyTodo = async (userId, date) => {
    const [userInfo, followings, followers] = await Promise.all([
      User.findOne({
        where: { userId },
        include: [
          { model: Todo, where: { userId, date }, required: false },
          { model: ChallengedTodo, where: { userId, date }, required: false },
        ],
      }),
      sequelize.query(this.query.getFollowingCountsQuery, {
        bind: { userId },
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(this.query.getFollowerCountsQuery, {
        bind: { userId },
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    return {
      userInfo: {
        userId: userInfo.userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        followingCount: followings[0] ? followings[0].followingCount : 0,
        followerCount: followers[0] ? followers[0].followerCount : 0,
      },
      challengedTodo: userInfo.ChallengedTodos[0]
        ? {
            challengedTodoId: userInfo.ChallengedTodos[0].challengedTodoId,
            challengedTodo: userInfo.ChallengedTodos[0].challengedTodo,
            isCompleted: userInfo.ChallengedTodos[0].isCompleted,
            originTodoId: userInfo.ChallengedTodos[0].originTodoId,
          }
        : [],
      createdTodo: userInfo.Todos[0]
        ? {
            todoId: userInfo.Todos[0].todoId,
            todo: userInfo.Todos[0].todo,
            commentCounts: userInfo.Todos[0].commentCounts,
            challengedCounts: userInfo.Todos[0].challengedCounts,
          }
        : [],
      date,
    };
  };

  // 타인의 todo 피드 조회 [GET] /api/mytodos/:userId
  getUserTodo = async (user, userId) => {
    const [userInfo, followings, followers, challengedTodos, isFollowed] =
      await Promise.all([
        User.findOne({
          where: { userId },
          include: [{ model: Todo, order: [["createdAt", "DESC"]], limit: 20 }],
        }),
        sequelize.query(this.query.getFollowingCountsQuery, {
          bind: { userId },
          type: sequelize.QueryTypes.SELECT,
        }),
        sequelize.query(this.query.getFollowerCountsQuery, {
          bind: { userId },
          type: sequelize.QueryTypes.SELECT,
        }),
        sequelize.query(this.query.getChallengedTodosQuery, {
          bind: { userId },
          type: sequelize.QueryTypes.SELECT,
        }),
        Follow.findOne({
          where: { userIdFollower: user.userId, userIdFollowing: userId },
        }),
      ]);

    if (!userInfo) {
      throw Boom.badRequest("존재하지 않거나 탈퇴한 회원입니다.");
    }

    return {
      userInfo: {
        userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        mimicCounts: userInfo.todoCounts + userInfo.challengeCounts,
        followingCount: followings[0] ? followings[0].followingCount : 0,
        followerCount: followers[0] ? followers[0].followerCount : 0,
        isFollowed: isFollowed ? true : false,
      },
      challengedTodos,
      createdTodos: userInfo.Todos,
    };
  };
}

module.exports = myTodoController;
