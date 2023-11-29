const { User, Todo, Comment, ChallengedTodo, Follow, Mbti } = require("../models");
const { Op } = require("sequelize");
const { calculateToday, calculateYesterdayMidnight } = require("../utils/date");
const CustomError = require("../errors/customError");
const { search } = require("../query/todo.query");

class TodoListService {
  // todo 피드 조회 [GET] /api/todolists
  todoListsGet = async (userId, mbti, filter) => {
    const myChallengedTodos = await ChallengedTodo.findAll({
      where: { userId },
    });
    const result = (todos, myChallengedTodos) =>
      todos.map((todo) => {
        return {
          todoInfo: todo,
          isChallenged:
            myChallengedTodos.findIndex(
              (myChallengedTodo) =>
                myChallengedTodo.originTodoId === todo.todoId && myChallengedTodo.isCompleted === true
            ) !== -1
              ? true
              : false,
        };
      });

    // 전체조회 (최신 순)
    if (!mbti && !filter) {
      const todos = await Todo.findAll({
        order: [["createdAt", "DESC"]],
      });
      return result(todos, myChallengedTodos);
    }

    // mbti별 최신 순
    if (!filter) {
      const todos = await Todo.findAll({
        where: { mbti },
        order: [["createdAt", "DESC"]],
      });

      return result(todos, myChallengedTodos);
    }

    // 도전 순, 댓글 순
    if (!mbti) {
      // 도전 순
      if (filter === "challengedCounts") {
        const todos = await Todo.findAll({
          order: [
            ["challengedCounts", "DESC"],
            ["createdAt", "DESC"],
          ],
        });

        return result(todos, myChallengedTodos);
      }
      // 댓글 순
      if (filter === "commentCounts") {
        const todos = await Todo.findAll({
          order: [
            ["commentCounts", "DESC"],
            ["createdAt", "DESC"],
          ],
        });

        return result(todos, myChallengedTodos);
      }
    }

    // mbti별 도전 순, 댓글 순
    if (mbti && filter) {
      // 도전 순
      if (filter === "challengedCounts") {
        const todos = await Todo.findAll({
          where: { mbti },
          order: [
            ["challengedCounts", "DESC"],
            ["createdAt", "DESC"],
          ],
        });

        return result(todos, myChallengedTodos);
      }
      // 댓글 순
      if (filter === "commentCounts") {
        const todos = await Todo.findAll({
          where: { mbti },
          order: [
            ["commentCounts", "DESC"],
            ["createdAt", "DESC"],
          ],
        });

        return result(todos, myChallengedTodos);
      }
    }
  };

  todoListsGet2 = async (userId, mbti, filter) => {
    const myChallengedTodos = await ChallengedTodo.findAll({
      where: { userId, isCompleted: true },
      attributes: ["originTodoId"],
      raw: true,
    });

    const challengedTodoIds = myChallengedTodos.map((myChallengedTodo) => myChallengedTodo.originTodoId);
    const todos = await search(mbti, filter);

    return {
      todos,
      challengedTodoIds,
    };
  };

  // 상세 todo 조회 [GET] /api/todolists/:todoId
  todoGet = async (userId, profile, todoId) => {
    const todo = await Todo.findByPk(todoId);

    if (!todo) throw new CustomError("NOT_FOUND");

    const today = calculateToday();

    const [todoInfo, comments, todaysChallenge, isFollowed] = await Promise.all([
      Todo.findOne({
        where: { todoId },
        attributes: ["todoId", "mbti", "date", "todo", "challengedCounts", "commentCounts"],
        include: [
          {
            model: User,
            attributes: ["nickname", "profile", "todoCounts", "challengeCounts"],
            required: true,
          },
        ],
      }),
      Comment.findAll({
        where: { todoId },
        attributes: ["commentId", "userId", "comment", "createdAt"],
        include: [
          {
            model: User,
            attributes: ["nickname", "profile", "todoCounts", "challengeCounts"],
            required: false,
          },
        ],
      }),
      ChallengedTodo.findOne({
        where: {
          userId,
          date: today,
        },
      }),
      Follow.findOne({
        where: { userIdFollower: userId, userIdFollowing: todo.userId },
      }),
    ]);

    return {
      todoInfo,
      comments,
      isTodayDone: todaysChallenge ? true : false,
      isFollowed: isFollowed ? true : false,
      loginUserProfile: profile,
    };
  };

  // mbti 알고리즘 [GET] /api/todolists/mbti/:mbti
  mbtiGet = async (userId, mbti) => {
    if (userId === "none") return { mbti: null };

    return await Mbti.findOne({
      where: { mbti },
      attributes: { exclude: ["mbtiId"] },
    });
  };

  // 현재 인기있는 피드 top5 [GET] /api/todolists/ranking
  rankingGet = async () => {
    const yesterday = calculateYesterdayMidnight();

    const challengeRanking = await Todo.findAll({
      where: {
        createdAt: { [Op.gte]: yesterday },
      },
      order: [
        ["challengedCounts", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 5,
    });

    const commentRanking = await Todo.findAll({
      where: {
        createdAt: { [Op.gte]: yesterday },
      },
      order: [
        ["commentCounts", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 5,
    });

    return { challenge: challengeRanking, comment: commentRanking };
  };
}

module.exports = TodoListService;
