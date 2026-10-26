import { useRef, useState, useEffect } from 'react';
import { api } from './api';
import Password from './component/password';
export function App() {
  const [question, setQuestion] = useState('');
  const [pdfContent, setPdfContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [openPass, setOpenPass] = useState(false)
  const [listening, setListening] = useState(false);
  const formDataParam = useRef(new FormData())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const maxRetries = 5;
  const retriesTime = 1000;
  const threadIdMax30 = '1234567890'+ new Date().getTime();  //管理唯一的key，后期使用userid拼接
  // 工具调用回答
  const callbackFun = async ()=>{
    let attempt = 0;
    while(attempt<maxRetries){
      try{
        const response = await api.post('/chat', { message: question, threadId: threadIdMax30   });
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            console.log(buffer);
            setAnswer(buffer);
          }
        }
        break;
      } catch{
        await new Promise((resolve)=>{
          setTimeout(()=>{
            attempt++;
            resolve(1);
          }, 5 * retriesTime)
        })
      } finally {
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const openListen = async () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await api.upload('/audio', formData);
          const data = await res.json();
          if (res.ok && data?.text) {
            setQuestion(data.text);
          } else {
            console.warn('语音识别失败:', data);
          }
        } catch (err) {
          console.error('上传音频失败:', err);
        }
      };

      mr.start();
      setListening(true);
    } catch (err) {
      console.error('麦克风权限获取失败:', err);
      alert('无法访问麦克风，请检查浏览器权限');
    }
  }
  const inputPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files[0];
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
      <div className="inputBar">
        <textarea
          rows={3}
          placeholder="请输入你的问题"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="footerButton">
        <div>
          <span 
            title='上传PDF文件'
            style={{cursor: 'pointer'}}
            onClick={inputPDF}>
            +
          </span>
        </div>
        <div className='listenBtn'>
          <span 
            title={listening ? '停止录音' : '语音输入'}
            className={listening ? 'active' : ''}
            onClick={openListen}>
            {listening ? '⏹️' : '🎤'}
          </span>
        </div>
        <div>
          <button
            disabled={loading || !question.trim()}
            onClick={callbackFun}
          >
            {loading ? '⏸️' : '⬆️'}
          </button>
        </div>
      </div>
      </div>
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