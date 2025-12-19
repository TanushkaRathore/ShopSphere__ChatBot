require("dotenv").config();

const {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} = require("@langchain/google-genai");

const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { MongoClient } = require("mongodb");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const { z } = require("zod");

const client = new MongoClient(process.env.MONGODB_ATLAS_URI);

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
});

const itemSchema = z.object({
  item_id: z.string(),
  title: z.string(),
  description: z.string(),
  brand: z.string(),
  price: z.object({
    actual: z.number(),
    sale: z.number(),
  }),
  categories: z.array(z.string()),
  images: z.array(z.string()),
  size_options: z.array(z.string()),
  color_options: z.array(z.string()),
  material: z.string(),
  target_audience: z.enum(["Men", "Women", "Boys", "Girls"]),
  user_reviews: z.array(
    z.object({
      review_date: z.string(),
      rating: z.number().min(0).max(5),
      comment: z.string(),
    })
  ),
  notes: z.string(),
});

const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema));

async function setupDatabaseAndCollection() {
  const db = client.db("fashionStoreDB");
  const collections = await db.listCollections({ name: "items" }).toArray();

  if (collections.length === 0) {
    await db.createCollection("items");
    console.log("Created 'items' collection");
  } else {
    console.log("'items' collection already exists");
  }
}

async function createVectorSearchIndex() {
  try {
    const db = client.db("fashionStoreDB");
    const collection = db.collection("items");

    await collection.dropIndexes().catch(() => {});

    const vectorSearchIdx = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 768,
            similarity: "cosine",
          },
        ],
      },
    };

    await collection.createSearchIndex(vectorSearchIdx);
    console.log("Vector search index created");
  } catch (err) {
    console.error("Failed to create vector index:", err);
  }
}

async function generateSyntheticData() {
  const prompt = `
    You are a helpful assistant that generates fashion store product data. 
    Generate 50 product items. Each record should include: 
    item_id, title, description, brand, price, categories, images, 
    size_options, color_options, material, target_audience, user_reviews, notes. 
    Ensure realistic and diverse data. 
    ${parser.getFormatInstructions()}
  `;

  console.log("Generating synthetic data...");
  const response = await llm.invoke(prompt);
  return parser.parse(response.content);
}

async function createItemSummary(item) {
  return new Promise((resolve) => {
    const reviewsText = item.user_reviews
      .map((r) => `Rated ${r.rating}/5 on ${r.review_date}: ${r.comment}`)
      .join(" ");

    const summary = `
      ${item.title} by ${item.brand}. 
      Description: ${item.description}. 
      Material: ${item.material}. 
      Sizes: ${item.size_options.join(", ")}; 
      Colors: ${item.color_options.join(", ")}. 
      Categories: ${item.categories.join(", ")}. 
      For: ${item.target_audience}. 
      Price: ${item.price.actual} USD (Sale: ${item.price.sale} USD). 
      Reviews: ${reviewsText}. 
      Notes: ${item.notes}.
    `.replace(/\s+/g, " ");

    resolve(summary);
  });
}

async function seedDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    await setupDatabaseAndCollection();
    await createVectorSearchIndex();

    const db = client.db("fashionStoreDB");
    const collection = db.collection("items");

    await collection.deleteMany({});
    console.log("Cleared existing items");

    const syntheticData = await generateSyntheticData();

    const recordsWithSummaries = await Promise.all(
      syntheticData.map(async (record) => ({
        pageContent: await createItemSummary(record),
        metadata: { ...record },
      }))
    );

    for (const record of recordsWithSummaries) {
      await MongoDBAtlasVectorSearch.fromDocuments(
        [record],
        new GoogleGenerativeAIEmbeddings({
          apiKey: process.env.GOOGLE_API_KEY,
          modelName: "text-embedding-004",
        }),
        {
          collection,
          indexName: "vector_index",
          textKey: "embedding_text",
          embeddingKey: "embedding",
        }
      );
      console.log("Saved record:", record.metadata.item_id);
    }

    console.log("Database seeding completed");
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

seedDatabase().catch(console.error);
