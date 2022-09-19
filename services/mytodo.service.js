const { ChallengedTodo, Todo, User, Follow, sequelize } = require("../models");
const { QueryTypes } = require("sequelize");

const dayjs = require("dayjs");
const Boom = require("@hapi/boom");
const localDate = dayjs().format("YYYY-MM-DD");

class myTodoController {
  // 도전 todo 등록 [POST] /:todoId/challenged
  challengedTodoCreate = async (todoId, userId) => {
    //todoId가 Todos테이블에 존재하는건지 유효성 체크
    const todoData = await Todo.findOne({ where: { todoId: todoId } });
    if (!todoData) {
      throw Boom.badRequest("존재하지 않는 todo 입니다.");
    }
    //내가 오늘 날짜에 작성한게 있는지 체크
    //userId + 오늘 날짜가 필요
    const query = `SELECT *
      FROM challengedTodos
      WHERE userId = ${userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${localDate}', '%Y-%m-%d');`;
    const challengeTodoData = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    //이미 오늘 도전을 답았는지 challengedtodo 데이터 체크
    if (challengeTodoData.length) {
      throw Boom.badRequest("오늘의 todo가 이미 등록되었습니다.");
    }

    // 도전 생성하고 도전 개수 update하는 과정 트렌젝션 설정
    const onTranscation = await sequelize.transaction();
    try {
      //ChallengedTodo애 들어갈내용(userId,mbti,challengedTodo,originTodoId)생성
      await ChallengedTodo.create(
        {
          userId: userId,
          mbti: todoData.mbti,
          challengedTodo: todoData.todo,
          originTodoId: todoId,
        },
        { transaction: onTranscation }
      );
      //Todos의 todoId가 몇번 도전되었는지 체크 하여 업데이트
      const challengedTodo = await ChallengedTodo.findAll({
        where: { originTodoId: todoId },
        transaction: onTranscation,
      });
      const challengCount = challengedTodo.length;

      await Todo.update(
        { challengedCounts: challengCount },
        { where: { todoId: todoId }, transaction: onTranscation }
      );
      await onTranscation.commit();
    } catch (err) {
      await onTranscation.rollback();
    }
  };

  // 오늘의 도전 todo 등록 취소 [DELETE] /:challengedTodoId/challenged
  challengedTodoDelete = async (challengedTodoId) => {
    const onTranscation = await sequelize.transaction();
    try {
      const challengedTodoData = await ChallengedTodo.findOne({
        where: { challengedTodoId: challengedTodoId },
        transaction: onTranscation,
      });
      if (challengedTodoData === null) {
        throw Boom.badRequest("삭제되었거나 존재하지 않는 todo 입니다.");
      }

      //삭제되어지는 todoId
      const deletedTodoId = challengedTodoData.originTodoId;

      //challengedTodoId를 기준으로 데이터 삭제
      await ChallengedTodo.destroy({
        where: { challengedTodoId: challengedTodoId },
        transaction: onTranscation,
      });

      //삭제된 todoId의 갯수
      const deletedTodoData = await ChallengedTodo.findAll({
        where: { originTodoId: deletedTodoId },
        transaction: onTranscation,
      });
      const deletedTodoIdCount = deletedTodoData.length;

      //Todos테이블에 도전갯수 업데이트
      await Todo.update(
        { challengedCounts: deletedTodoIdCount },
        { where: { todoId: deletedTodoId }, transaction: onTranscation }
      );
      await onTranscation.commit();
    } catch (err) {
      await onTranscation.rollback();
    }
  };

  // 오늘의 도전 todo 완료/진행중 처리 [PUT] /:challengedTodoId/challenged
  challengedTodoComplete = async (challengedTodoId, userId) => {
    //이용자가 오늘 등록한 challengedTodoId를 진행완료 했는지 못했는지 반영
    //isCompleted boolean값을 변경시켜주어야함
    //이용자가 오늘 도전한 todo가 있는 없는지 체크
    const selectQuery = `SELECT isCompleted
      FROM challengedTodos
      WHERE challengedTodoId = ${challengedTodoId} 
      AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT('${localDate}', '%Y-%m-%d') 
      AND userId = ${userId};`;
    const challengedTodoData = await sequelize.query(selectQuery, {
      type: QueryTypes.SELECT,
    });

    if (!challengedTodoData.length) {
      throw Boom.badRequest("오늘 도전한 todo가 없습니다.");
    }

    //오늘 도전한 todo가 있다면 isCompleted의 값을 바꿔 준다.
    const updateQuery = `UPDATE challengedTodos 
    SET isCompleted = IF (isCompleted = true ,false ,true) 
    WHERE challengedTodoId = ${challengedTodoId} 
    AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT('${localDate}', '%Y-%m-%d') 
    AND userId = ${userId};`;
    await sequelize.query(updateQuery, {
      type: QueryTypes.UPDATE,
    });

    const updatedChallengedTodoData = await sequelize.query(selectQuery, {
      type: QueryTypes.SELECT,
    });

    let isCompleted = updatedChallengedTodoData[0].isCompleted;
    console.log(isCompleted);
    return isCompleted;
  };

  // 오늘의 제안 todo 작성 [POST] /api/mytodos
  todoCreate = async (todo, userId) => {
    //todo 테이블에 todo, user의mbti,nickname,userId,를 넣어야함
    //mytodo테이블에도 동시에 담기(서버단에서 작성된 날짜기준으로 넣는다.)
    const userData = await User.findOne({ where: { userId: userId } });
    if (!userData) {
      throw Boom.badRequest("사용자 정보가 없습니다.");
    }
    if (!userData.mbti) {
      throw Boom.badRequest("mbti 정보를 등록후 작성바랍니다.");
    }
    const query = `SELECT *
      FROM todos
      WHERE userId = ${userId} AND DATE_FORMAT(createdAt, '%Y-%m-%d') = DATE_FORMAT( '${localDate}', '%Y-%m-%d');`;
    const checkTodoData = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    if (checkTodoData.length) {
      throw Boom.badRequest("오늘의 todo 작성을 이미 하셨습니다.");
    }
    await Todo.create({
      todo: todo,
      mbti: userData.mbti,
      nickname: userData.nickname,
      userId: userId,
    });
  };

  // todo 삭제 [DELETE] /api/mytodos/:todoId
  todoDelete = async (todoId, userId) => {
    //====ok
    //todo테이블에 istodo false로 변경

    const todoData = await Todo.findOne({
      where: { todoId: todoId, userId: userId },
    });

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

    const query2 = `SELECT *
      FROM challengedTodos
      LEFT OUTER JOIN todos ON challengedTodos.challengedTodo = todos.todoId 
      WHERE challengedTodos.userId = ${user.userId} AND DATE_FORMAT(challengedTodos.createdAt, '%Y-%m-%d') = DATE_FORMAT( '${date}', '%Y-%m-%d');`;
    const challenge = await sequelize.query(query2, {
      type: QueryTypes.SELECT,
    });

    let challengedTodo = "";
    if (challenge.length === 0) {
      challengedTodo = [];
    } else {
      challengedTodo = {
        todoId: challenge[0].todoId,
        userId: challenge[0].userId,
        todo: challenge[0].todo,
        mbti: challenge[0].mbti,
        nickname: challenge[0].nickname,
        commentCounts: challenge[0].commentCounts,
        challengedCounts: challenge[0].challengedCounts,
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

    // return {
    //   userInfo: {
    //     userId,
    //     nickname: userInfo.nickname,
    //     profile: userInfo.profile,
    //     mbti: userInfo.mbti,
    //     followingCount: following.length,
    //     followerCount: follower.length,
    //     isFollowed:
    //       follower.findIndex((f) => f.userIdFollower === user.userId) !== -1
    //         ? true
    //         : false,
    //   },
    //   challengedTodos: challenges.map((c) => {
    //     return {
    //       todoId: c.Todo.todoId,
    //       userId: c.Todo.userId,
    //       todo: c.Todo.todo,
    //       mbti: c.Todo.mbti,
    //       nickname: c.Todo.nickname,
    //       commentCounts: c.Todo.commentCounts,
    //       challengCounts: c.Todo.challengCounts,
    //     };
    //   }),
    //   createdTodo,
    // };
  };
}

module.exports = myTodoController;
