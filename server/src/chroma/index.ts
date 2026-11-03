// lib/chroma.ts
import { ChromaClient } from "chromadb-client";

let client: ChromaClient | null = null;

export function getChromaClient() {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }
  return client;
}

