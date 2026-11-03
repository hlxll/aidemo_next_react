import { useState } from 'react';
import { api } from '../../api';

interface SubmitResult {
  message: string;
  id?: string;
  dimension?: number;
}

export default function AddEmbeddPage() {
  const [text, setText] = useState('');
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) {
      setError('请输入要入库的文本');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body: Record<string, string> = { text: text.trim() };
      if (id.trim()) body.id = id.trim();

      const res = await api.post('/addEmbedd', body);
      const data = (await res.json()) as SubmitResult;
      setResult(data);
      setText('');
      setId('');
    } catch (e: any) {
      // 从 api.post 拿不到 response body（它 throw 了），这里只能显示通用错误
      const msg = e?.message ?? String(e);
      if (msg.includes('400')) {
        setError('请求参数或后端服务异常：400，请检查后端日志');
      } else if (msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setError('无法连接后端服务，请确认 http://localhost:3000 正在运行');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pageWrap">
      <h1>入库 Embedding</h1>
      <p className="hint">
        输入一段文本，后端会用自定义哈希 embedding 生成向量并存入 ChromaDB。
      </p>

      <label className="field">
        <span>文本内容 <em>*</em></span>
        <textarea
          rows={5}
          placeholder="例如：杭州今天多云，气温 18°C"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <label className="field">
        <span>文档 ID（可选，留空自动生成）</span>
        <input
          type="text"
          placeholder="例如：knowledge_001"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      </label>

      <div className="actions">
        <button onClick={submit} disabled={loading || !text.trim()}>
          {loading ? '提交中...' : '生成并入库'}
        </button>
      </div>

      {error && <div className="result result-error">❌ {error}</div>}

      {result && (
        <div className="result result-ok">
          ✅ {result.message}
          {result.id && <div>ID：<code>{result.id}</code></div>}
          {result.dimension && <div>向量维度：<code>{result.dimension}</code></div>}
        </div>
      )}
    </div>
  );
}
