require("dotenv").config();
const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { AIMessage, HumanMessage } = require("@langchain/core/messages");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { StateGraph } = require("@langchain/langgraph");
const { Annotation } = require("@langchain/langgraph");
const { tool } = require("@langchain/core/tools");
const { ToolNode } = require("@langchain/langgraph/prebuilt");
const { MongoDBSaver } = require("@langchain/langgraph-checkpoint-mongodb");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { MongoClient } = require("mongodb");
const { z } = require("zod");
const { exec } = require("child_process");

// MongoDB client
const client = new MongoClient(process.env.MONGODB_ATLAS_URI);

// Helper: retry for rate-limits
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try { return await fn(); } 
    catch (error) {
      if (error.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Rate limit hit. Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

// Main agent function
async function callAgent(client, query, thread_id) {
  try {
    // QUICK REPLY HANDLER
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes("discount")) return "🎉 We’re offering 20% off on all accessories and 40% off on Men's T-shirts and 55% off on Women's Clothing!";
    if (lowerQuery.includes("delivery")) return "🚚 Free delivery on orders above ₹500. Standard delivery: 3–5 business days.";
    if (lowerQuery.includes("return")) return "🔁 You can return any item within 7 days for a full refund or exchange.";
    if (lowerQuery.includes("contact")) return "📞 Reach us at support@ecommercebot.com or call +91-9876543210.";

    const dbName = "fashionStoreDB";
    const db = client.db(dbName);
    const collection = db.collection("items");

    const GraphState = Annotation.Root({ messages: Annotation({ reducer: (x, y) => x.concat(y) }) });

    // --- Vector Search Tool ---
    const itemLookupTool = tool(
      async ({ query, n = 10 }) => {
        console.log("Item lookup tool called with query:", query);
        const totalCount = await collection.countDocuments();
        if (totalCount === 0) return JSON.stringify({ error: "No items found", count: 0 });

        const vectorStore = new MongoDBAtlasVectorSearch(
          new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GOOGLE_API_KEY, model: "text-embedding-004" }),
          { collection, indexName: "vector_index", textKey: "embedding_text", embeddingKey: "embedding" }
        );

        const result = await vectorStore.similaritySearchWithScore(query, n);

        // fallback text search
        if (result.length === 0) {
          const textResults = await collection
            .find({ $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
              { brand: { $regex: query, $options: "i" } },
              { categories: { $regex: query, $options: "i" } },
              { embedding_text: { $regex: query, $options: "i" } },
            ] })
            .limit(n)
            .toArray();
          return { results: textResults, searchType: "text", query, count: textResults.length };
        }

        return { results: result, searchType: "vector", query, count: result.length };
      },
      {
        name: "item_lookup",
        description: "Gathers fashion product details from the Fashion Store database",
        schema: z.object({ query: z.string(), n: z.number().optional().default(10) }),
      }
    );

    // --- Model setup ---
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      maxRetries: 0,
      apiKey: process.env.GOOGLE_API_KEY,
    }).bindTools([itemLookupTool]);

    // --- Core model call ---
    async function callModel(state) {
      return retryWithBackoff(async () => {
        const prompt = ChatPromptTemplate.fromMessages([
          ["system", "You are a helpful E-commerce Chatbot Agent for a fashion store. Use item_lookup tool when needed. Current time: {time}"],
          new MessagesPlaceholder("messages"),
        ]);
        const formattedPrompt = await prompt.formatMessages({ time: new Date().toISOString(), messages: state.messages });
        const result = await model.invoke(formattedPrompt);
        return { messages: [result] };
      });
    }

    // --- Graph workflow ---
    const workflow = new StateGraph(GraphState)
      .addNode("agent", callModel)
      .addNode("tools", new ToolNode([itemLookupTool]))
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", (state) => state.messages[state.messages.length - 1].tool_calls?.length ? "tools" : "__end__")
      .addEdge("tools", "agent");

    // --- Checkpointing ---
    const checkpointer = new MongoDBSaver({ client, dbName });
    const app = workflow.compile({ checkpointer });

    // --- Run the agent ---
    const finalState = await app.invoke({ messages: [new HumanMessage(query)] }, { recursionLimit: 15, configurable: { thread_id } });

    // --- Format response for customer-friendly output ---
    const rawResponse = finalState.messages[finalState.messages.length - 1].content;
    let responseText = "";

    const categoryEmoji = { Women: "👩", Men: "👨", Boys: "🧒", Girls: "👧" };

    if (Array.isArray(rawResponse)) {
      responseText = rawResponse.map(item => item.text || JSON.stringify(item)).join("\n");
    } else if (typeof rawResponse === "object") {
      const { results } = rawResponse;
      if (results && results.length > 0) {
        responseText = results.map(r => {
          let text = `⭐ **${r.title}** by ${r.brand}\n`;
          text += `• Price: $${r.price.sale} (Original: $${r.price.actual})\n`;
          text += `• Sizes: ${r.size_options.join(", ")}\n`;
          text += `• Colors: ${r.color_options.join(", ")}\n`;
          text += `• Material: ${r.material}\n`;
          text += `• Target Audience: ${categoryEmoji[r.target_audience] || ""} ${r.target_audience}\n`;
          if (r.user_reviews && r.user_reviews.length > 0) {
            text += `• Reviews:\n`;
            r.user_reviews.slice(0, 2).forEach(rev => {
              text += `   - ${rev.rating}/5: "${rev.comment}" (${rev.review_date})\n`;
            });
          }
          text += `\n`;
          return text;
        }).join("\n");
      } else {
        responseText = rawResponse.message || JSON.stringify(rawResponse);
      }
    } else {
      responseText = String(rawResponse);
    }

    console.log("Agent response (formatted):", responseText);
    return responseText;

  } catch (error) {
    console.error("Error in callAgent:", error.message);
    if (error.status === 429) throw new Error("Service temporarily unavailable due to rate limits.");
    if (error.status === 401) throw new Error("Authentication failed. Please check your API configuration.");
    throw new Error(`Agent failed: ${error.message}`);
  }
}

module.exports = { callAgent };
