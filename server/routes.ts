import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertConversationSchema } from "@shared/schema";
import { getMedicalAssistantResponse, getQuickActionResponse } from "./services/openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  // Get conversation by ID
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message and get AI response
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content: content.trim(),
      });

      // Get conversation history for context
      const previousMessages = await storage.getMessagesByConversation(conversationId);
      const chatHistory = previousMessages
        .filter(msg => msg.id !== userMessage.id) // Exclude the message we just added
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Add the current user message
      chatHistory.push({ role: 'user', content: content.trim() });

      // Get AI response
      const aiResponse = await getMedicalAssistantResponse(chatHistory);

      // Save AI response
      const assistantMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Error in message endpoint:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process message" });
    }
  });

  // Handle quick actions
  app.post("/api/quick-actions", async (req, res) => {
    try {
      const { action } = req.body;
      if (!action || typeof action !== 'string') {
        return res.status(400).json({ error: "Action is required" });
      }

      const response = await getQuickActionResponse(action);
      res.json({ content: response });
    } catch (error) {
      console.error("Error in quick action endpoint:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process quick action" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
