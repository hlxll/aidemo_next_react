import { useState } from 'react';
import { api } from './api';

export function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/', { question });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setAnswer(buffer);
        }
      }
      console.log(buffer)
    } catch (err){
      console.log(err);
      setAnswer('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1>FAQ 智能问答助手</h1>
      <textarea
        rows={3}
        style={{ width: '100%', padding: 10 }}
        placeholder="请输入你的问题"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        disabled={loading}
        onClick={handleAsk}
        style={{ marginTop: 10, padding: '8px 16px' }}
      >
        {loading ? '正在回答…' : '发送'}
      </button>
      {answer && <p style={{ marginTop: 16 }}>{answer}</p>}
    </div>
  );
}