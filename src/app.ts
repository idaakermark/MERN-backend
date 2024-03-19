import express from "express";
import cors from "cors";
import multer from "multer";
import * as authController from "./controllers/auth";
import * as postsController from "./controllers/posts";
import * as commentsController from "./controllers/comments";
import * as votesController from "./controllers/votes";
import * as filesController from "./controllers/files";
import validateToken from "./middleware/validateToken";

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer();

app.post("/register", authController.register);
app.post("/login", authController.logIn);
app.post("/token/refresh", authController.refreshJWT);
app.get("/profile", validateToken, authController.profile);

app.post(
  "/posts",
  validateToken,
  upload.single("image"),
  postsController.create,
);
app.get("/posts", postsController.getAllPosts);
app.delete(
  '/posts/:postId', 
  validateToken, 
  postsController.deletePost
)
app.get("/posts/:id", postsController.getPost);
app.put('/posts/:postId/edit', validateToken, postsController.editPost)
app.post("/posts/:postId/upvote", validateToken, votesController.upvote);
app.post("/posts/:postId/downvote", validateToken, votesController.downvote);

app.post(
  "/posts/:postId/comments",
  validateToken,
  commentsController.createComment,
);


app.delete(
  "/posts/:postId/comments/:commentId",
  validateToken,
  commentsController.deleteComment,
);

app.get("/files/:id", filesController.getFileById);

export default app;