import { useRef, useState, useEffect } from 'react';
import { api } from './api';
import Password from './component/password';
import AddEmbeddPage from './component/AddEmbeddPage';

/** 极简路径路由（零依赖）。Vite SPA 下配合 history API 工作 */
function useRoute() {
  const [path, setPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPath(to);
  };

  return { path, navigate };
}

function NavBar({ path, navigate }: { path: string; navigate: (p: string) => void }) {
  const items = [
    { to: '/', label: 'FAQ 助手' },
    { to: '/addEmbedd', label: '入库 Embedding' },
  ];
  return (
    <nav className="navBar">
      {items.map((it) => (
        <button
          key={it.to}
          className={path === it.to ? 'nav-active' : ''}
          onClick={() => navigate(it.to)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const { path, navigate } = useRoute();
  const [question, setQuestion] = useState('');
  const [pdfContent, setPdfContent] = useState('');
  const [answer, setAnswer] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [openPass, setOpenPass] = useState(false)
  const [listening, setListening] = useState(false);
  const [tool, setTool] = useState('weather');
  const formDataParam = useRef(new FormData())
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const maxRetries = 5;
  const retriesTime = 1000;
  const threadIdMax30 = '1234567890';  //管理唯一的key，后期使用userid拼接

  /** 往列表末尾追加一条新内容 */
  const appendAnswer = (text: string) => {
    setAnswer((prev) => [...prev, text]);
  };
  /** 流式输出时，持续更新最后一条内容 */
  const updateLastAnswer = (text: string) => {
    setAnswer((prev) => {
      if (prev.length === 0) return [text];
      const next = prev.slice();
      next[next.length - 1] = text;
      return next;
    });
  };
  useEffect(() => {
    api.post('/getChatHistory', { threadId: threadIdMax30 }).then(async (res) => {
      const data = await res.json();
      const list: Array<{ role: string; content: string }> = data.history ?? [];
      setAnswer(
        list
          .filter((m) => m.role !== 'system')
          .map((m) => `${m.role === 'user' ? '我' : 'AI'}: ${m.content}`)
      );
    }); 
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  // 工具调用回答
  const callbackFun = async ()=>{
    setLoading(true);
    appendAnswer('');
    if(tool === 'knowledge'){
      // 非流式接口 → 直接 res.json()
      const res = await api.post('/search', { query: question });
      const data = await res.json();
      const docs: string[] = data.result?.documents ?? [];
      updateLastAnswer(docs.join('\n'));
      setLoading(false);
      return;
    }
    let attempt = 0;
    
    abortController.current = new AbortController();
    while(attempt<maxRetries && abortController.current){
      try{
        const response = await api.post('/chat', { message: question, threadId: threadIdMax30, tool },
          {
            signal: abortController.current.signal,
          }
        );
        console.log(response)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            updateLastAnswer(buffer);
          }
        }
        break;
      } catch(err){
        if(err instanceof Error && err.name.includes('AbortError')){
          // console.log("手动停止")
          break;
        }else{
          await new Promise((resolve)=>{
            setTimeout(()=>{
              attempt++;
              resolve(1);
            }, 5 * retriesTime)
          })
        }
      } finally {
        setLoading(false);
      }
    }
  }
  const stopCallback =()=>{
    setLoading(false);
    // 停止时把还没产出内容的空条目去掉，已输出的部分保留在列表中
    setAnswer((prev) =>
      prev.length > 0 && prev[prev.length - 1] === '' ? prev.slice(0, -1) : prev,
    );
    abortController.current?.abort();
    abortController.current = null;
  }
  
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
    input.accept = '.pdf, .docx';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files[0];
      if (file) {
        const formData = new FormData();
        const sizeLimit = 4 * 1024;
        const fileLength = Math.ceil(file.size / sizeLimit);
        console.log(fileLength)
        for (let i = 0; i < fileLength; i++) {
          const start = i * sizeLimit;
          const end = Math.min(start + sizeLimit, file.size);
          const chunk = file.slice(start, end);
          formData.append('file', chunk, `${file.name}.part${i}`);
        }
        try {
          const response = await api.upload('/upload', formData);
          if(file.name.endsWith('.docx')){
            const result = await response.json();
            console.log(result)
            return;
          }
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
          appendAnswer(`文件上传成功，总结：${result.summary}`);
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
        appendAnswer(`文件上传成功，总结：${result.summary}`);
      }catch(err){
        console.log(err);
      }
      setOpenPass(false)
    }
  }

  // 路由出口
  if (path === '/addEmbedd') {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
        <NavBar path={path} navigate={navigate} />
        <AddEmbeddPage />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <NavBar path={path} navigate={navigate} />
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
        <select
          className="toolSelect"
          title='选择工具'
          value={tool}
          onChange={(e) => setTool(e.target.value)}
        >
          <option value='weather'>天气</option>
          <option value='web'>联网</option>
          <option value='canvas'>canvas</option>
          <option value='knowledge'>知识库</option>
        </select>
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
            disabled={!question.trim()}
            onClick={()=>loading? stopCallback() : callbackFun()}
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
      {answer.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {answer.map((item, index) => (
            <p
              key={index}
              style={{ margin: '6px 0', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
            >
              {item}
            </p>
          ))}
        </div>
      )}
      {
        openPass?<Password callback={submitPassword} open={openPass}/>:""
      }
    </div>
  );
}
