import { useRef, useState, useEffect } from 'react';
import { api } from './api';
import Password from './component/password';

/** 语音流 WebSocket 地址，默认连本地 Nest 服务 */
const WS_AUDIO_URL =
  import.meta.env.VITE_WS_AUDIO_URL ?? 'ws://localhost:3000/audio-stream';
/** 主流 ASR 服务的输入采样率通常固定为 16k */
const TARGET_SAMPLE_RATE = 16000;

/** 线性插值重采样：AudioContext 一般是 48k，需要降到 16k */
function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === TARGET_SAMPLE_RATE) return input;
  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

/** Float32 [-1, 1] → Int16 PCM */
function floatToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

export function App() {
  const [question, setQuestion] = useState('');
  const [pdfContent, setPdfContent] = useState('');
  const [answer, setAnswer] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [openPass, setOpenPass] = useState(false)
  const [listening, setListening] = useState(false);
  const [tool, setTool] = useState('weather');
  const formDataParam = useRef(new FormData())
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioWsRef = useRef<WebSocket | null>(null);
  /** 等待后端最后一次识别完成的回调 */
  const finalWaiterRef = useRef<(() => void) | null>(null);
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
  /** 释放麦克风、AudioWorklet 与 WebSocket */
  const releaseAudio = () => {
    audioWsRef.current?.close();
    audioWsRef.current = null;
    finalWaiterRef.current = null;

    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setListening(false);
  };

  /**
   * 优雅停止：WebSocket 保持连接，先停采集并发送 end；
   * 后端把缓冲区剩余音频全部识别完并回 { clear: true } 后，才真正关闭连接。
   */
  const stopListening = async () => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    void audioCtxRef.current?.close();
    audioCtxRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const ws = audioWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 15000);
        finalWaiterRef.current = () => {
          clearTimeout(timer);
          resolve();
        };
        ws.send('end');
      });
    }

    releaseAudio();
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
      releaseAudio();
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
      const docs: { summary: { content: string } } = data.result ?? {};
      console.log(docs);
      updateLastAnswer(docs.summary?.content);
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
      await stopListening();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 1. 建立 WebSocket，音频以 Int16 PCM 二进制帧持续推送
      const ws = new WebSocket(WS_AUDIO_URL);
      ws.binaryType = 'arraybuffer';
      audioWsRef.current = ws;

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        let text = '';
        try {
          const data = JSON.parse(event.data);
          // 后端确认本段音频已全部识别完，此时才关闭连接
          if (data.clear) {
            finalWaiterRef.current?.();
            finalWaiterRef.current = null;
            return;
          }
          text = data.text ?? data.result ?? data.transcript ?? '';
        } catch {
          // 非 JSON 就当成纯文本增量
          text = event.data;
        }
        if (text) setQuestion((prev) => prev + text);
      };

      ws.onclose = () => {
        if (audioWsRef.current === ws) releaseAudio();
      };

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('音频 WebSocket 连接失败'));
      });

      // 2. 加载 AudioWorklet 模块（public/pcm-worklet.js）
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      await ctx.audioWorklet.addModule('/pcm-worklet.js');

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm-collector', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        processorOptions: { chunkMs: 100 },
      });
      workletNodeRef.current = worklet;

      // Worklet 需要连到 destination 才会被持续拉取；用 0 增益避免回声
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(worklet).connect(mute).connect(ctx.destination);

      // 3. 每 100ms 收到一块 Float32，转 16k Int16 后发出
      worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const pcm = floatToInt16(resampleTo16k(event.data, ctx.sampleRate));
        ws.send(pcm.buffer as ArrayBuffer);
      };

      setListening(true);
    } catch (err) {
      console.error('语音输入启动失败:', err);
      releaseAudio();
      alert('无法访问麦克风或音频服务，请检查浏览器权限');
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
            if(response.status === 200  && response.ok){
              alert(result.message);
            }else{
              alert(result.message?.name);
            }
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

  return (
    <>
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
    </>
  );
}
