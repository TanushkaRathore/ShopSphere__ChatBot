require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");
const { callAgent } = require("./agent");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_ATLAS_URI);

async function startServer() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB");

    app.get("/", (req, res) => {
      res.send("LangGraph Agent Server is running.");
    });
   
    app.post("/chat", async (req, res) => {
      const initialMessage = req.body.message;
      const threadId = Date.now().toString(); 
      console.log(`Received initial message: ${initialMessage}`);
      try {
        const response = await callAgent(client, initialMessage, threadId);
        res.json({ threadId, response });
      } catch (error) {
        console.error("Error starting conversation:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    app.post("/chat/:threadId", async (req, res) => {
      const { threadId } = req.params;
      const { message } = req.body;
      console.log(`Received message for thread ${threadId}: ${message}`);
      try {
        const response = await callAgent(client, message, threadId);
        res.json({ threadId, response });
      } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

startServer();