import { Request, Response } from "express";
import mongoose from "mongoose";
import Post from "../models/Post";
import { assertDefined } from "../util/asserts";
import { uploadFile } from "../util/gridFs";

export const create = async (req: Request, res: Response) => {
  assertDefined(req.userId);
  const { title, link, body } = req.body;

  try {
    const post = new Post({
      title,
      link,
      body,
      author: req.userId,
    });

    if (req.file) {
      const fileId = await uploadFile(req.file.originalname, req.file.buffer, {
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      post.image = {
        mimeType: req.file.mimetype,
        size: req.file.size,
        id: fileId,
      };
    }

    const savedPost = await post.save();
    res.status(201).json(savedPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit?.toString() || "5");
  const page = parseInt(req.query.page?.toString() || "1");

  if (isNaN(page) || isNaN(limit)) {
    res.status(400).json({
      message: "Malformed query object number: " + req.query.toString(),
    });
  }

  const posts = await Post.aggregate([
    {
      $addFields: {
        sortValue: {
          $divide: [
            {
              $add: [
                { $ifNull: ["$score", 0] }, 
                1,
              ],
            },
            {
              $pow: [
                {
                  $add: [
                    1,
                    {
                      $divide: [
                        { $subtract: [new Date(), "$createdAt"] }, 
                        1000 * 60 * 60,
                      ],
                    },
                  ],
                },
                1.5,
              ],
            },
          ],
        },
      },
    },
    {
      $sort: { sortValue: -1 }, 
    },
    { $skip: limit * (page - 1) }, 
    { $limit: limit }, 
    {
      $addFields: {
        commentCount: {
          $size: {
            $ifNull: ["$comments", []], 
          },
        },
      },
    },
    {
      $lookup: {
        from: "users", 
        localField: "author", 
        foreignField: "_id", 
        pipeline: [
          {
            $project: {
              userName: 1,
            },
          },
        ],
        as: "author",
      },
    },
    { $unwind: "$author" }, 
    {
      $project: {
        _id: 1,
        title: 1,
        link: 1,
        body: 1,
        createdAt: 1,
        updatedAt: 1,
        score: 1,
        commentCount: 1,
        author: 1,
      },
    },
  ]);

  const totalCount = await Post.countDocuments();

  res.status(200).json({
    posts,
    totalPages: Math.ceil(totalCount / limit),
  });
};

export const getPost = async (req: Request, res: Response) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate("author")
    .populate("comments.author");

  if (!post) {
    return res.status(404).json({ message: "No post found for id: " + id });
  }

  res.status(200).json(post);
};

export const deletePost = async (req: Request, res: Response) => {
  assertDefined(req.userId)
  const { postId } = req.params 
  const post = await Post.findById(postId)
  console.log(post)
  if (!post) { 
    return res.status(404).json({ message: 'post not found' })
  }
  if (post.author.toString()!== req.userId) {
    return res.status(403).json({ message: 'not authorized' })
  }
  try {
    await post.deleteOne()
    return res.status(200).json({ message: 'post deleted' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete post' })
  }
}

export const editPost = async (req: Request, res: Response) => {
  assertDefined(req.userId)
  const { postId } = req.params
  const { title, link, body } = req.body
  const post = await Post.findById(postId)
  if (!post) { 
    return res.status(404).json({ message: 'post not found' })
  }
  if (post.author.toString()!== req.userId) {
    return res.status(403).json({ message: 'not authorized' })
  }

  const edits = {
    title, link, body
  }
  post.set(edits) 
  try {
    const editedPost = await post.save()
    return res.status(200).json(editedPost)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Failed to edit post' })
  }
}