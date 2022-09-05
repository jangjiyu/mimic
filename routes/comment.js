const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth_middlewares");
const CommentController = require("../controllers/comment.controller");
const commentController = new CommentController();

// 댓글 작성 [POST] /api/comments/:todoId
router.post("/:todoId", authMiddleware, commentController.createComment);
// 댓글 삭제 [DELETE] /api/comments/:commentId
router.delete("/:commentId", authMiddleware, commentController.deleteComment);

module.exports = router;
