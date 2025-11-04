import axios from 'axios';
import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';

export interface HuggingFaceEmbeddingsParams extends EmbeddingsParams {
  apiUrl: string;
  model?: string;
}

/**
 * Custom embeddings implementation for Hugging Face Text Embeddings Inference (TEI)
 * Compatible with the API format used by ghcr.io/huggingface/text-embeddings-inference
 */
export class HuggingFaceEmbeddings extends Embeddings {
  private apiUrl: string;
  private model: string;

  constructor(params: HuggingFaceEmbeddingsParams) {
    super(params);
    this.apiUrl = params.apiUrl;
    this.model = params.model || 'BAAI/bge-small-en-v1.5';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/embed`,
        { inputs: texts },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}
