import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Node type enum for discussion nodes
export const nodeTypeEnum = pgEnum("node_type", ["agree", "disagree", "neutral"]);

// Reaction type enum
export const reactionTypeEnum = pgEnum("reaction_type", ["like", "dislike"]);

// Topics - the main discussion starters
export const topics = pgTable("topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id"), // nullable for deleted authors
  imageUrl: text("image_url"),
  country: varchar("country", { length: 100 }), // for location filtering
  promotedFromNodeId: varchar("promoted_from_node_id"), // if this topic was promoted from a node
  promotedFromTopicId: varchar("promoted_from_topic_id"), // original topic the node belonged to
  agreeCount: integer("agree_count").default(0).notNull(),
  disagreeCount: integer("disagree_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  dislikeCount: integer("dislike_count").default(0).notNull(),
  nodeCount: integer("node_count").default(0).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Discussion nodes - agree/disagree/neutral responses
export const nodes = pgTable("nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topicId: varchar("topic_id").notNull(),
  parentId: varchar("parent_id"), // null for top-level nodes
  authorId: varchar("author_id"), // nullable for deleted authors
  type: nodeTypeEnum("type").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  agreeCount: integer("agree_count").default(0).notNull(),
  disagreeCount: integer("disagree_count").default(0).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  dislikeCount: integer("dislike_count").default(0).notNull(),
  replyCount: integer("reply_count").default(0).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reactions - likes/dislikes on topics and nodes
export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  topicId: varchar("topic_id").notNull(),
  nodeId: varchar("node_id"),
  type: reactionTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const topicsRelations = relations(topics, ({ many }) => ({
  nodes: many(nodes),
  reactions: many(reactions),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  topic: one(topics, {
    fields: [nodes.topicId],
    references: [topics.id],
  }),
  parent: one(nodes, {
    fields: [nodes.parentId],
    references: [nodes.id],
    relationName: "nodeReplies",
  }),
  replies: many(nodes, {
    relationName: "nodeReplies",
  }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  topic: one(topics, {
    fields: [reactions.topicId],
    references: [topics.id],
  }),
  node: one(nodes, {
    fields: [reactions.nodeId],
    references: [nodes.id],
  }),
}));

// Insert schemas
export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  promotedFromNodeId: true,
  promotedFromTopicId: true,
  agreeCount: true,
  disagreeCount: true,
  likeCount: true,
  dislikeCount: true,
  nodeCount: true,
  isDeleted: true,
  editedAt: true,
  createdAt: true,
});

export const promoteNodeSchema = z.object({
  nodeId: z.string(),
  title: z.string().min(1).max(200),
});

export const insertNodeSchema = createInsertSchema(nodes).omit({
  id: true,
  agreeCount: true,
  disagreeCount: true,
  likeCount: true,
  dislikeCount: true,
  replyCount: true,
  isDeleted: true,
  editedAt: true,
  createdAt: true,
});

// Update schemas for editing
export const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
});

export const updateNodeSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["like", "dislike"]),
});

// Types
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactions.$inferSelect;
export type NodeType = "agree" | "disagree" | "neutral";
