import { 
  topics, nodes, reactions,
  type Topic, type InsertTopic,
  type Node, type InsertNode,
  type Reaction, type InsertReaction
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";

export interface IStorage {
  // Topics
  getTopics(sort: "latest" | "trending" | "top", country?: string): Promise<(Topic & { author?: User | null })[]>;
  getTopic(id: string): Promise<(Topic & { author?: User | null }) | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, data: { title?: string; content?: string }, userId: string): Promise<Topic | null>;
  deleteTopic(id: string, userId: string): Promise<{ deleted: boolean; softDeleted: boolean }>;
  searchTopics(query: string): Promise<(Topic & { author?: User | null })[]>;
  getUserTopics(userId: string): Promise<Topic[]>;
  updateTopicCounts(id: string): Promise<void>;

  // Nodes
  getTopicNodes(topicId: string): Promise<(Node & { author?: User | null })[]>;
  getNode(id: string): Promise<Node | undefined>;
  createNode(node: InsertNode): Promise<Node>;
  updateNode(id: string, content: string, userId: string): Promise<Node | null>;
  deleteNode(id: string, userId: string): Promise<{ deleted: boolean; softDeleted: boolean }>;
  updateNodeCounts(id: string): Promise<void>;
  promoteNodeToTopic(nodeId: string, title: string, userId: string): Promise<Topic | null>;

  // Reactions
  getUserReactions(userId: string, topicId: string): Promise<Reaction[]>;
  toggleReaction(reaction: InsertReaction): Promise<Reaction | null>;

  // Users
  getUser(id: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Topics
  async getTopics(sort: "latest" | "trending" | "top", country?: string): Promise<(Topic & { author?: User | null })[]> {
    let orderBy;
    switch (sort) {
      case "trending":
        orderBy = desc(sql`${topics.likeCount} + ${topics.nodeCount} * 2`);
        break;
      case "top":
        orderBy = desc(topics.likeCount);
        break;
      case "latest":
      default:
        orderBy = desc(topics.createdAt);
    }
    
    const conditions = [eq(topics.isDeleted, false)];
    if (country) {
      conditions.push(eq(topics.country, country));
    }
    
    const result = await db
      .select({
        topic: topics,
        author: users,
      })
      .from(topics)
      .leftJoin(users, eq(topics.authorId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(50);
    
    return result.map(r => ({ ...r.topic, author: r.author }));
  }

  async getTopic(id: string): Promise<(Topic & { author?: User | null }) | undefined> {
    const [result] = await db
      .select({
        topic: topics,
        author: users,
      })
      .from(topics)
      .leftJoin(users, eq(topics.authorId, users.id))
      .where(eq(topics.id, id));
    
    if (!result) return undefined;
    return { ...result.topic, author: result.author };
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [created] = await db.insert(topics).values(topic).returning();
    return created;
  }

  async updateTopic(id: string, data: { title?: string; content?: string }, userId: string): Promise<Topic | null> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    if (!topic || topic.authorId !== userId) return null;
    
    const [updated] = await db
      .update(topics)
      .set({ ...data, editedAt: new Date() })
      .where(eq(topics.id, id))
      .returning();
    return updated;
  }

  // Patch .001: Always soft delete to maintain thread integrity
  async deleteTopic(id: string, userId: string): Promise<{ deleted: boolean; softDeleted: boolean }> {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    if (!topic || topic.authorId !== userId) return { deleted: false, softDeleted: false };
    
    // Always soft delete to preserve thread integrity
    await db
      .update(topics)
      .set({ authorId: null, isDeleted: true })
      .where(eq(topics.id, id));
    return { deleted: true, softDeleted: true };
  }

  async searchTopics(query: string): Promise<(Topic & { author?: User | null })[]> {
    const searchPattern = `%${query}%`;
    const result = await db
      .select({
        topic: topics,
        author: users,
      })
      .from(topics)
      .leftJoin(users, eq(topics.authorId, users.id))
      .where(or(
        ilike(topics.title, searchPattern),
        ilike(topics.content, searchPattern)
      ))
      .orderBy(desc(topics.createdAt))
      .limit(50);
    
    return result.map(r => ({ ...r.topic, author: r.author }));
  }

  async getUserTopics(userId: string): Promise<Topic[]> {
    return db
      .select()
      .from(topics)
      .where(eq(topics.authorId, userId))
      .orderBy(desc(topics.createdAt));
  }

  async updateTopicCounts(id: string): Promise<void> {
    // Count agrees and disagrees from nodes
    const nodeStats = await db
      .select({
        type: nodes.type,
        count: sql<number>`count(*)::int`,
      })
      .from(nodes)
      .where(eq(nodes.topicId, id))
      .groupBy(nodes.type);
    
    const agreeCount = nodeStats.find(s => s.type === "agree")?.count || 0;
    const disagreeCount = nodeStats.find(s => s.type === "disagree")?.count || 0;
    const nodeCount = nodeStats.reduce((sum, s) => sum + s.count, 0);

    // Count likes and dislikes on topic
    const reactionStats = await db
      .select({
        type: reactions.type,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(and(eq(reactions.topicId, id), sql`${reactions.nodeId} IS NULL`))
      .groupBy(reactions.type);
    
    const likeCount = reactionStats.find(s => s.type === "like")?.count || 0;
    const dislikeCount = reactionStats.find(s => s.type === "dislike")?.count || 0;

    await db
      .update(topics)
      .set({ agreeCount, disagreeCount, likeCount, dislikeCount, nodeCount })
      .where(eq(topics.id, id));
  }

  // Nodes
  async getTopicNodes(topicId: string): Promise<(Node & { author?: User | null })[]> {
    const result = await db
      .select({
        node: nodes,
        author: users,
      })
      .from(nodes)
      .leftJoin(users, eq(nodes.authorId, users.id))
      .where(eq(nodes.topicId, topicId))
      .orderBy(desc(nodes.likeCount));
    
    return result.map(r => ({ ...r.node, author: r.author }));
  }

  async getNode(id: string): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    return node;
  }

  async createNode(node: InsertNode): Promise<Node> {
    const [created] = await db.insert(nodes).values(node).returning();
    
    // Update parent node reply count if this is a reply
    if (node.parentId) {
      await this.updateNodeCounts(node.parentId);
    }
    
    // Update topic counts
    await this.updateTopicCounts(node.topicId);
    
    return created;
  }

  async updateNode(id: string, content: string, userId: string): Promise<Node | null> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    if (!node || node.authorId !== userId) return null;
    
    const [updated] = await db
      .update(nodes)
      .set({ content, editedAt: new Date() })
      .where(eq(nodes.id, id))
      .returning();
    return updated;
  }

  // Patch .001: Always soft delete to maintain thread integrity
  async deleteNode(id: string, userId: string): Promise<{ deleted: boolean; softDeleted: boolean }> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    if (!node || node.authorId !== userId) return { deleted: false, softDeleted: false };
    
    // Always soft delete to preserve thread integrity
    await db
      .update(nodes)
      .set({ authorId: null, isDeleted: true })
      .where(eq(nodes.id, id));
    return { deleted: true, softDeleted: true };
  }

  async updateNodeCounts(id: string): Promise<void> {
    // Count replies
    const [{ count: replyCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(nodes)
      .where(eq(nodes.parentId, id));

    // Count reactions
    const reactionStats = await db
      .select({
        type: reactions.type,
        count: sql<number>`count(*)::int`,
      })
      .from(reactions)
      .where(eq(reactions.nodeId, id))
      .groupBy(reactions.type);
    
    const likeCount = reactionStats.find(s => s.type === "like")?.count || 0;
    const dislikeCount = reactionStats.find(s => s.type === "dislike")?.count || 0;

    await db
      .update(nodes)
      .set({ replyCount, likeCount, dislikeCount })
      .where(eq(nodes.id, id));
  }

  async promoteNodeToTopic(nodeId: string, title: string, userId: string): Promise<Topic | null> {
    // Get the node to promote
    const [node] = await db.select().from(nodes).where(eq(nodes.id, nodeId));
    if (!node || node.isDeleted) return null;
    
    // Create a new topic from the node content
    const [newTopic] = await db
      .insert(topics)
      .values({
        title,
        content: node.content,
        authorId: userId,
        imageUrl: node.imageUrl,
        promotedFromNodeId: nodeId,
        promotedFromTopicId: node.topicId,
      })
      .returning();
    
    return newTopic;
  }

  // Reactions
  async getUserReactions(userId: string, topicId: string): Promise<Reaction[]> {
    return db
      .select()
      .from(reactions)
      .where(and(
        eq(reactions.userId, userId),
        eq(reactions.topicId, topicId)
      ));
  }

  async toggleReaction(reaction: InsertReaction): Promise<Reaction | null> {
    // Check if user already has a reaction
    const conditions = [eq(reactions.userId, reaction.userId)];
    
    if (reaction.topicId && !reaction.nodeId) {
      conditions.push(eq(reactions.topicId, reaction.topicId));
      conditions.push(sql`${reactions.nodeId} IS NULL`);
    } else if (reaction.nodeId) {
      conditions.push(eq(reactions.nodeId, reaction.nodeId));
    }
    
    const [existing] = await db
      .select()
      .from(reactions)
      .where(and(...conditions));
    
    if (existing) {
      if (existing.type === reaction.type) {
        // Remove reaction if same type
        await db.delete(reactions).where(eq(reactions.id, existing.id));
        
        // Update counts
        if (reaction.nodeId) {
          await this.updateNodeCounts(reaction.nodeId);
        } else if (reaction.topicId) {
          await this.updateTopicCounts(reaction.topicId);
        }
        
        return null;
      } else {
        // Update reaction type
        const [updated] = await db
          .update(reactions)
          .set({ type: reaction.type })
          .where(eq(reactions.id, existing.id))
          .returning();
        
        // Update counts
        if (reaction.nodeId) {
          await this.updateNodeCounts(reaction.nodeId);
        } else if (reaction.topicId) {
          await this.updateTopicCounts(reaction.topicId);
        }
        
        return updated;
      }
    }
    
    // Create new reaction
    const [created] = await db.insert(reactions).values(reaction).returning();
    
    // Update counts
    if (reaction.nodeId) {
      await this.updateNodeCounts(reaction.nodeId);
    } else if (reaction.topicId) {
      await this.updateTopicCounts(reaction.topicId);
    }
    
    return created;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
}

export const storage = new DatabaseStorage();
