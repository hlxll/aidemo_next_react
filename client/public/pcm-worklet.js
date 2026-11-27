/**
 * 麦克风 PCM 采集器（AudioWorklet）。
 * 运行在 AudioWorkletGlobalScope：sampleRate 是 AudioContext 的采样率。
 * 按固定时长（默认 100ms）切块，把 Float32Array 转移给主线程，避免主线程处理音频线程的抖动。
 */
class PcmCollector extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const chunkMs = options?.processorOptions?.chunkMs ?? 100;
    this.chunkSize = Math.max(128, Math.round((sampleRate * chunkMs) / 1000));
    this.pending = new Float32Array(0);
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    // 把新数据拼到残留尾部，凑够 chunkSize 再切片发出
    const merged = new Float32Array(this.pending.length + channel.length);
    merged.set(this.pending, 0);
    merged.set(channel, this.pending.length);

    let offset = 0;
    while (merged.length - offset >= this.chunkSize) {
      const chunk = merged.slice(offset, offset + this.chunkSize);
      this.port.postMessage(chunk, [chunk.buffer]);
      offset += this.chunkSize;
    }

    this.pending = merged.slice(offset);
    return true;
  }
}

registerProcessor('pcm-collector', PcmCollector);
