/**
 * 纯 JS 自生成 embedding：字符 n-gram → 哈希投影 → 单位向量
 *
 * 零依赖、零外部服务、纯同步。两个文本越相似（字面/n-gram 重叠越多），
 * 输出向量的余弦相似度越高。
 *
 * 实现思路：
 *  1. 把文本按字符滑动窗口切成 n-gram
 *  2. 每个 n-gram 用 FNV-1a 哈希映射到 [0, dimension)，再用哈希高位决定符号
 *  3. 在对应维度累加 1 / -1
 *  4. L2 归一化后输出
 *
 * 注意：这是「启发式 embedding」，不具备语义泛化能力（同义词、近义词
 * 不会被拉近）。如果需要真正的语义向量，还是要换成模型调用。
 */

/** FNV-1a 32-bit 字符串哈希（确定性，同输入必同输出） */
function fnv1a(str: string, seed = 0): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // 转无符号 32-bit
}

/** 简单分词：按字符切 n-gram，中英文都能跑 */
function charNgrams(text: string, n = 3): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= n) return [normalized];
  const grams: string[] = [];
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.push(normalized.slice(i, i + n));
  }
  return grams;
}

export interface EmbeddingOptions {
  /** 输出向量维度，默认 384（Chroma 常用，可按需调整） */
  dimension?: number;
  /** n-gram 窗口大小，默认 3；中文可设 2-4，英文建议 3-5 */
  ngramSize?: number;
  /** 每个 n-gram 哈希一次即可，多哈希投影可让向量更稠密（默认 2） */
  hashCount?: number;
}

/**
 * 生成 embedding。
 * 确定性函数：同一份 text + 同一份 options 每次返回完全相同的向量。
 */
export function getEmbedding(
  text: string,
  opts: EmbeddingOptions = {},
): number[] {
  const { dimension = 384, ngramSize = 3, hashCount = 2 } = opts;
  const vec = new Array<number>(dimension).fill(0);
  const grams = charNgrams(text ?? '', ngramSize);

  for (const gram of grams) {
    for (let i = 0; i < hashCount; i++) {
      const seed = i * 0x9e3779b9;
      const h = fnv1a(gram, seed);
      const idx = h % dimension;
      const sign = (h & 0x80000000) ? -1 : 1;
      vec[idx] += sign;
    }
  }

  // L2 归一化
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dimension; i++) vec[i] /= norm;

  return vec;
}

/** 批量生成，自动并发、保留顺序 */
export function getEmbeddings(
  texts: string[],
  opts: EmbeddingOptions = {},
): number[][] {
  return texts.map((t) => getEmbedding(t, opts));
}

/** 余弦相似度（两个同维度单位向量直接点积即可） */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
