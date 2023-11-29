const { Todo } = require("../models");

module.exports = {
  search: async (mbti, filter) => {
    // 전체조회 (최신 순)
    const searchAll = async () => {
      return await Todo.findAll({
        attributes: ["todoId", "mbti", "date", "todo", "challengedCounts", "commentCounts"],
        order: [["createdAt", "DESC"]],
      });
    };

    // mbti별 최신 순
    const searchByMbti = async (mbti) => {
      return await Todo.findAll({
        where: { mbti },
        attributes: ["todoId", "mbti", "date", "todo", "challengedCounts", "commentCounts"],
        order: [["createdAt", "DESC"]],
      });
    };

    // 도전 순, 댓글 순
    const searchByFilter = async (filter) => {
      return await Todo.findAll({
        attributes: ["todoId", "mbti", "date", "todo", "challengedCounts", "commentCounts"],
        order: [
          [filter, "DESC"],
          ["createdAt", "DESC"],
        ],
      });
    };

    // mbti별 도전 순, 댓글 순
    const searchByMbtiAndFilter = async (mbti, filter) => {
      return await Todo.findAll({
        where: { mbti },
        attributes: ["todoId", "mbti", "date", "todo", "challengedCounts", "commentCounts"],
        order: [
          [filter, "DESC"],
          ["createdAt", "DESC"],
        ],
      });
    };

    if (!mbti && !filter) return await searchAll();
    if (!filter) return await searchByMbti(mbti);
    if (!mbti) return await searchByFilter(filter);
    if (mbti && filter) return await searchByMbtiAndFilter(mbti, filter);
  },
};
