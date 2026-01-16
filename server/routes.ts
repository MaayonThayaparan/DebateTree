import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { insertTopicSchema, insertNodeSchema, updateTopicSchema, updateNodeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get topics with optional sort and country filter
  app.get("/api/topics", async (req, res) => {
    try {
      const sort = (req.query.sort as "latest" | "trending" | "top") || "latest";
      const country = req.query.country as string | undefined;
      const topics = await storage.getTopics(sort, country);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      res.status(500).json({ message: "Failed to fetch topics" });
    }
  });

  // Search topics
  app.get("/api/topics/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.json([]);
        return;
      }
      const topics = await storage.searchTopics(query);
      res.json(topics);
    } catch (error) {
      console.error("Error searching topics:", error);
      res.status(500).json({ message: "Failed to search topics" });
    }
  });

  // Get single topic
  app.get("/api/topics/:id", async (req, res) => {
    try {
      const topic = await storage.getTopic(req.params.id);
      if (!topic) {
        res.status(404).json({ message: "Topic not found" });
        return;
      }
      res.json(topic);
    } catch (error) {
      console.error("Error fetching topic:", error);
      res.status(500).json({ message: "Failed to fetch topic" });
    }
  });

  // Create topic (requires auth)
  app.post("/api/topics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const schema = insertTopicSchema.extend({
        title: z.string().min(1).max(500),
        content: z.string().max(5000),
      });

      const parsed = schema.safeParse({
        ...req.body,
        authorId: userId,
      });

      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        return;
      }

      const topic = await storage.createTopic(parsed.data);
      res.status(201).json(topic);
    } catch (error) {
      console.error("Error creating topic:", error);
      res.status(500).json({ message: "Failed to create topic" });
    }
  });

  // Edit topic (requires auth)
  app.patch("/api/topics/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const parsed = updateTopicSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        return;
      }

      const topic = await storage.updateTopic(req.params.id, parsed.data, userId);
      if (!topic) {
        res.status(403).json({ message: "Not authorized to edit this topic" });
        return;
      }

      res.json(topic);
    } catch (error) {
      console.error("Error editing topic:", error);
      res.status(500).json({ message: "Failed to edit topic" });
    }
  });

  // Delete topic (requires auth)
  app.delete("/api/topics/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const result = await storage.deleteTopic(req.params.id, userId);
      if (!result.deleted) {
        res.status(403).json({ message: "Not authorized to delete this topic" });
        return;
      }

      res.json({ success: true, softDeleted: result.softDeleted });
    } catch (error) {
      console.error("Error deleting topic:", error);
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  // Get nodes for a topic
  app.get("/api/nodes/:topicId", async (req, res) => {
    try {
      const nodes = await storage.getTopicNodes(req.params.topicId);
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching nodes:", error);
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  // Create node (requires auth)
  app.post("/api/nodes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const schema = insertNodeSchema.extend({
        content: z.string().min(1).max(5000),
        type: z.enum(["agree", "disagree", "neutral"]),
      });

      const parsed = schema.safeParse({
        ...req.body,
        authorId: userId,
      });

      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        return;
      }

      const node = await storage.createNode(parsed.data);
      res.status(201).json(node);
    } catch (error) {
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  // Edit node (requires auth)
  app.patch("/api/nodes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const parsed = updateNodeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        return;
      }

      const node = await storage.updateNode(req.params.id, parsed.data.content, userId);
      if (!node) {
        res.status(403).json({ message: "Not authorized to edit this response" });
        return;
      }

      res.json(node);
    } catch (error) {
      console.error("Error editing node:", error);
      res.status(500).json({ message: "Failed to edit response" });
    }
  });

  // Delete node (requires auth)
  app.delete("/api/nodes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const result = await storage.deleteNode(req.params.id, userId);
      if (!result.deleted) {
        res.status(403).json({ message: "Not authorized to delete this response" });
        return;
      }

      res.json({ success: true, softDeleted: result.softDeleted });
    } catch (error) {
      console.error("Error deleting node:", error);
      res.status(500).json({ message: "Failed to delete response" });
    }
  });

  // Promote node to topic (any authenticated user can do this)
  app.post("/api/nodes/:id/promote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const { title } = req.body;
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({ message: "Title is required" });
        return;
      }

      const topic = await storage.promoteNodeToTopic(req.params.id, title.trim(), userId);
      if (!topic) {
        res.status(404).json({ message: "Node not found or cannot be promoted" });
        return;
      }

      res.status(201).json(topic);
    } catch (error) {
      console.error("Error promoting node:", error);
      res.status(500).json({ message: "Failed to promote node to discussion" });
    }
  });

  // Get user's reactions for a topic
  app.get("/api/reactions/:topicId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const reactions = await storage.getUserReactions(userId, req.params.topicId);
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ message: "Failed to fetch reactions" });
    }
  });

  // Toggle reaction (requires auth)
  app.post("/api/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const schema = z.object({
        topicId: z.string().optional(),
        nodeId: z.string().optional(),
        type: z.enum(["like", "dislike"]),
      }).refine(data => data.topicId || data.nodeId, {
        message: "Either topicId or nodeId must be provided",
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        return;
      }

      const reaction = await storage.toggleReaction({
        userId,
        topicId: parsed.data.topicId ?? "",
        nodeId: parsed.data.nodeId ?? null,
        type: parsed.data.type,
      });

      res.json(reaction);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  });

  // Get current user's topics
  app.get("/api/users/me/topics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const topics = await storage.getUserTopics(userId);
      res.json(topics);
    } catch (error) {
      console.error("Error fetching user topics:", error);
      res.status(500).json({ message: "Failed to fetch user topics" });
    }
  });

  return httpServer;
}
