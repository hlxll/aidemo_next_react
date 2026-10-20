import { useRef, useState } from 'react';
import { api } from './api';
import Password from './component/password';

export function App() {
  const [question, setQuestion] = useState('');
  const [pdfContent, setPdfContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [openPass, setOpenPass] = useState(false)
  const formDataParam = useRef(new FormData())
  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/', { param: question });
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
    } catch (err){
      console.log(err);
      setAnswer('请求失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  const inputPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const formData = new FormData();
        const sizeLimit = 10 * 1024 * 1024; // 10MB
        const fileLength = Math.ceil(file.size / sizeLimit);
        for (let i = 0; i < fileLength; i++) {
          const start = i * sizeLimit;
          const end = Math.min(start + sizeLimit, file.size);
          const chunk = file.slice(start, end);
          formData.append('file', chunk, `${file.name}.part${i}`);
        }
        try {
          const response = await api.upload('/upload', formData);
          const result = await response.json();
          if (!response.ok) {
            if(result && result.message) {
              if(result.message.includes('PasswordException: No password given')) {
                setOpenPass(true);
                formDataParam.current = formData;
              }
            }
            return;
          }
          let extarctedText = "";
          result.extractedText.split('\n').forEach((line: string) => {
            extarctedText += line.trim() + '\n';
          });
          setPdfContent(extarctedText);
          setAnswer(`文件上传成功，总结：${result.summary}`);
        } catch (err) {
          console.error(err);
        }
      }
    };
    input.click();
  };
  const submitPassword=async (password:string)=>{
    if(password){
      try{
        formDataParam.current.append('password', password);
        const response = await api.upload('/upload', formDataParam.current);
        const result = await response.json();
        let extarctedText = "";
        result.extractedText.split('\n').forEach((line: string) => {
          extarctedText += line.trim() + '\n';
        });
        setPdfContent(extarctedText);
        setAnswer(`文件上传成功，总结：${result.summary}`);
      }catch(err){
        console.log(err);
      }
      setOpenPass(false)
    }
  }
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
      <button 
        disabled={loading}
        onClick={inputPDF}>
        上传PDF
      </button>
      {pdfContent && (
        <div style={{ marginTop: 20 }}>
          <h3>PDF内容：</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{pdfContent}</pre>
        </div>
      )}
      {answer && <p style={{ marginTop: 16 }}>{answer}</p>}
      {
        openPass?<Password callback={submitPassword} open={openPass}/>:""
      }
    </div>
  );
}