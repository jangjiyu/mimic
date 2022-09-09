const { ChallengedTodo, Todo, User, Follow } = require("../models");
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../models/index");
const Boom = require("@hapi/boom");

const KoreanTime = require("../advice/date");
const todayDate = KoreanTime(); //YYYYMMDD

class myTodoController {
  // 오늘의 도전 todo 등록 [POST] /:todoId/challenged
  challengedTodoCreate = async (todoId, userId) => {
    //Todo 테이블에 isTodo가 false이면 이용불가===ok
    //my todo테이블 ChallengeTodo에 <userId+ 날짜 date + todoId >입력===ok
    //todo테이블 challengcount count는 mytodo 테이블에서 challengedtodo 갯수로 보내주기====ok
    const todoData = await Todo.findOne({ where: { todoId: todoId } });
    if (!todoData.mbti) {
      throw Boom.badRequest("MBTI 정보 등록바랍니다.");
    }

    if (!todoData || !todoData.isTodo) {
      throw Boom.badRequest("존재 하지않거나 삭제된 todo 입니다.");
    }

    const challengeTodoData = await ChallengedTodo.findOne({
      where: { challengedTodo: todoId },
    });

    if (challengeTodoData !== null) {
      if (challengeTodoData.userId === userId) {
        throw Boom.badRequest("이미 등록된 todo 입니다.");
      }
    }

    await ChallengedTodo.create({
      userId: userId,
      challengedTodo: todoId,
    });

    const challengedTodo = await ChallengedTodo.findAll({
      where: { challengedTodo: todoId },
    });
    const challengCount = challengedTodo.length;

    await Todo.update(
      { challengedCounts: challengCount },
      { where: { todoId: todoId } }
    );
  };

  // 오늘의 도전 todo 등록 취소 [DELETE] /:todoId/challenged
  challengedTodoDelete = async (date, userId, todoId) => {
    if (date !== todayDate) {
      throw Boom.badRequest("오늘 날짜가 아닙니다.");
    }
    //challengedTodos 테이블에서 <userId + 날짜 date>에 맞는 데이터 삭제
    //todo테이블 challengcount count는 mytodo 테이블에서 challengedtodo 갯수로 보내주기====ok
    const deleteQuery = `DELETE FROM challengedTodos
    WHERE DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d')AND userId ='${userId}'`;
    //사용자별로 먼저 범위를 찾는게 찾는 법위를 줄여서
    await sequelize.query(deleteQuery, {
      type: QueryTypes.DELETE,
    });

    const challengedTodo = await ChallengedTodo.findAll({
      where: { challengedTodo: todoId },
    });

    const challengCount = challengedTodo.length;
    await Todo.update(
      { challengedCounts: challengCount },
      { where: { todoId: todoId } }
    );
  };

  // 오늘의 도전 todo 완료/진행중 처리 [PUT] /:todoId/challenged
  challengedTodoComplete = async (date, userId, todoId) => {
    if (date !== todayDate) {
      throw Boom.badRequest("오늘 날짜가 아닙니다.");
    }
    const query = `SELECT *
      FROM challengedTodos
      WHERE userId = ${userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d');`;
    const checktodoId = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    if (!checktodoId.length) {
      throw Boom.badRequest("오늘 도전한 todo가 없습니다.");
    }
    const updateQuery = `UPDATE challengedTodos 
    SET isCompleted = IF (isCompleted = true ,false ,true) 
    WHERE DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d')AND userId ='${userId}'`;
    await sequelize.query(updateQuery, {
      type: QueryTypes.UPDATE,
    });
  };

  // 오늘의 제안 todo 작성 [POST] /api/mytodos
  todoCreate = async (todo, userId) => {
    //todo 테이블에 todo, user의mbti,nickname,userId,를 넣어야함
    //mytodo테이블에도 동시에 담기(서버단에서 작성된 날짜기준으로 넣는다.)
    const UserData = await User.findOne({ where: { userId: userId } });
    if (!UserData) {
      throw Boom.badRequest("사용자 정보가 없습니다.");
    }
    if (!UserData.mbti) {
      throw Boom.badRequest("mbti 정보를 입렵후 사용바랍니다.");
    }
    const query = `SELECT *
      FROM todos
      WHERE userId = ${userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${todayDate}', '%Y-%m-%d');`;
    const checkTodoData = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    if (checkTodoData.length) {
      throw Boom.badRequest("오늘의 todo 작성을 이미 하셨습니다.");
    }
    await Todo.create({
      todo: todo,
      mbti: UserData.mbti,
      nickname: UserData.nickname,
      userId: userId,
    });
  };

  // todo 삭제 [DELETE] /api/mytodos/:todoId
  todoDelete = async (todoId) => {
    //====ok
    //todo테이블에 istodo false로 변경

    const todoData = await Todo.findOne({ where: { todoId: todoId } });

    if (todoData !== null) {
      if (todoData.isTodo === false) {
        throw Boom.badRequest("이미 삭제된 todo입니다.");
      }
    } else {
      throw Boom.badRequest("삭제할 todo가 없습니다.");
    }

    await Todo.update({ isTodo: false }, { where: { todoId: todoId } });
  };

  // 나의 todo 피드 조회 [GET] /api/mytodos
  getMyTodo = async (user, date) => {
    if (!date) {
      throw Boom.badRequest("날짜를 입력해 주세요.");
    }
    const userInfo = await User.findOne({
      where: { userId: user.userId },
      include: [{ model: ChallengedTodo }],
    });
    const myfolloing = await Follow.findAll({
      where: { userIdFollower: user.userId },
    });
    const myfollower = await Follow.findAll({
      where: { userIdFollowing: user.userId },
    });

    const query = `SELECT todoId, userId, todo, mbti, nickname, commentCounts, challengedCounts
      FROM todos
      WHERE isTodo = true AND userId = ${user.userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d');`;
    const createdTodo = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    const query2 = `SELECT challengedTodo, isCompleted
      FROM challengedTodos
      WHERE userId = ${user.userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d');`;
    const challenge = await sequelize.query(query2, {
      type: QueryTypes.SELECT,
    });

    let challengedTodo = "";
    if (challenge.length === 0) {
      challengedTodo = [];
    } else {
      const getChall = await Todo.findOne({
        where: { todoId: challenge[0].challengedTodo },
        attributes: { exclude: ["isTodo"] },
      });
      challengedTodo = {
        todoId: getChall.todoId,
        userId: getChall.userId,
        todo: getChall.todo,
        mbti: getChall.mbti,
        nickname: getChall.nickname,
        commentCounts: getChall.commentCounts,
        challengedCounts: getChall.challengedCounts,
        isCompleted: challenge[0].isCompleted,
      };
    }

    return {
      userInfo: {
        userId: user.userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        followingCount: myfolloing.length,
        followerCount: myfollower.length,
      },
      challengedTodo,
      createdTodo: createdTodo[0] ? createdTodo[0] : [],
      date,
    };
  };

  // 타인의 todo 피드 조회 [GET] /api/mytodos/:userId
  getUserTodo = async (user, userId) => {
    const userInfo = await User.findOne({
      where: { userId },
      include: [{ model: ChallengedTodo }],
    });
    if (!userInfo) {
      throw Boom.badRequest("존재하지 않거나 탈퇴한 회원입니다.");
    }

    const following = await Follow.findAll({
      where: { userIdFollower: userId },
    });
    const follower = await Follow.findAll({
      where: { userIdFollowing: userId },
    });
    // 제안 todo 최신 20개
    const createdTodo = await Todo.findAll({
      where: { isTodo: true, userId },
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["isTodo"] },
      limit: 20,
    });
    // 도전 todo 최신 20개
    const challenges = await ChallengedTodo.findAll({
      where: { userId },
      attributes: ["challengedTodo"],
      order: [["createdAt", "DESC"]],
      limit: 20,
    });
    const challengesArr = challenges.map((c) => c.challengedTodo);
    const challengedTodos = await Todo.findAll({
      where: { todoId: challengesArr },
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["isTodo"] },
      limit: 20,
    });

    return {
      userInfo: {
        userId,
        nickname: userInfo.nickname,
        profile: userInfo.profile,
        mbti: userInfo.mbti,
        followingCount: following.length,
        followerCount: follower.length,
        isFollowed:
          follower.findIndex((f) => f.userIdFollower === user.userId) !== -1
            ? true
            : false,
      },
      challengedTodos,
      createdTodo,
    };
  };
}

module.exports = myTodoController;
