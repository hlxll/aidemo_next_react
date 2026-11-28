| 必须 | SSE 流式、RAG Demo、Prompt 工程 |  |
| 必须 | FastAPI + MySQL + Redis + Docker | |
| 加分 | Agent 工具调用、LangGraph 编排 | |
| 加分 | 可部署项目 + README + 架构图 | |
# Python
启动脚本： .venv/bin/uvicorn main:app --reload --port 8000

全局安装包，使用中国镜像
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple numpy
https://mirrors.aliyun.com/pypi/simple
https://pypi.mirrors.ustc.edu.cn/simple
虚拟环境安装包
.venv/bin/python3 -m pip install -r requirements.txt:用项目文件更新虚拟环境
.venv/bin/python3 -m pip install backName:安装后端依赖包

## MySQL


# AI 对话项目
## 语音解析
AI 对话项目，建议直接走 Web Audio API + WebSocket + FastAPI 后端；
如果只是普通语音输入，MediaRecorder + HTTP 就够。
MediaRecorder 获取二进制数据 或者 AudioWorklet获取原始PCM 都可以实现语音解析。
这里选择AudioWorklet，因为可以实时处理音频数据，而MediaRecorder 是异步的，需要等待数据可用。

| 概念 | 是什么 | 特点 |
|---|---|---|
| **Blob** | 浏览器里的二进制对象 | 前端拿到录音后，数据通常先变成 Blob；它不是音频编码，只是“文件/二进制数据”的包装 |
| **PCM** | 原始音频采样数据 | 没有压缩、没有文件头，就是一串采样值；ASR 最终真正“吃”的是它<websource>source_group_web_2</websource> |
| **WAV** | 带文件头的 PCM 容器 | 最常见就是在 PCM 前面加一个头，写明采样率、位深、声道数，所以播放器能直接识别<websource>source_group_web_3</websource> |









