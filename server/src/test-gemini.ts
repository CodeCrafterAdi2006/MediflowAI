import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the server directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function verifyGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY is not defined in your environment variables.");
    process.exit(1);
  }

  console.log("⏳ Connecting to Gemini API...");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Hello Gemini! Respond in exactly 3 words.");
    const response = await result.response;
    const text = response.text().trim();
    
    console.log(`✅ Success! Gemini response: "${text}"`);
  } catch (error) {
    console.error("❌ Error connecting to Gemini API:", error);
    process.exit(1);
  }
}

verifyGemini();
