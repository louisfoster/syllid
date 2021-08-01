import __SNOWPACK_ENV__ from './__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

import worker from "./modules/opus-recorder/dist/decoder/decoderWorker.min.js";
export class WorkerWrapper {
  constructor(index, handler, sampleRate) {
    this.index = index;
    this.handler = handler;
    this.worker = new Worker(this.createWorkerScriptBlob(worker), {
      name: `decode-worker`,
      type: `module`
    });
    this.decodeFiles = {};
    this.decoding = [];
    this.bufferPages = [];
    this.pageCount = 0;
    this.bufferLength = 0;
    this.onMessage = this.onMessage.bind(this);
    this.worker.onmessage = (e) => this.onMessage(e);
    this.worker.onerror = (err) => this.handler.onFailure(err);
    this.worker.postMessage({
      command: `init`,
      decoderSampleRate: 48e3,
      outputBufferSampleRate: sampleRate
    });
  }
  createWorkerScriptBlob(script) {
    const blob = new Blob([script], {type: `text/javascript`});
    return new URL(URL.createObjectURL(blob), import.meta.url);
  }
  onMessage({data}) {
    if (data === null) {
      this.handler.onBuffer(this.buildBuffer(), this.index);
      this.reset();
    } else {
      for (const buffer of data) {
        this.bufferPages[this.pageCount] = buffer;
        this.pageCount += 1;
        this.bufferLength += buffer.length;
      }
    }
  }
  reset() {
    this.pageCount = 0;
    this.bufferLength = 0;
    this.decodeFiles[this.decoding[this.decoding.length - 1]] = true;
  }
  buildBuffer() {
    const firstPage = this.bufferPages[0];
    const lastPage = this.bufferPages[this.pageCount - 1];
    const offsetStart = this.getIndex(firstPage, `start`);
    const offsetEnd = this.getIndex(lastPage, `end`);
    const reduceEnd = lastPage.length - 1 - offsetEnd;
    const buffer = new Float32Array(this.bufferLength - offsetStart - reduceEnd);
    let offset = 0;
    for (let i = 0; i < this.pageCount; i += 1) {
      const page = i === 0 ? firstPage.subarray(offsetStart) : i === this.pageCount - 1 ? lastPage.subarray(0, offsetEnd + 1) : this.bufferPages[i];
      buffer.set(page, offset);
      offset += page.length;
    }
    this.fadeBuffer(buffer);
    return buffer;
  }
  getIndex(buffer, direction) {
    let seqCount = 0;
    let seqStart = -1;
    for (let i = 0; i < buffer.length; i += 1) {
      const index = direction === `start` ? i : buffer.length - 1 - i;
      if (buffer[index] === 0) {
        seqCount = 0;
        seqStart = -1;
        continue;
      } else if (seqCount === 9) {
        break;
      } else {
        seqCount += 1;
        seqStart = seqStart === -1 ? index : seqStart;
      }
    }
    return seqStart;
  }
  fadeBuffer(buffer) {
    const milli = 2e3;
    for (let i = 0; i < milli; i += 1) {
      buffer[i] = buffer[i] * i / milli;
      const j = buffer.length - 1 - i;
      buffer[j] = buffer[j] - buffer[j] * (milli - i) / milli;
    }
  }
  decode(bytes, file) {
    return new Promise((resolve) => {
      this.worker.postMessage({
        command: `decode`,
        pages: bytes
      }, [bytes.buffer]);
      const interval = window.setInterval(() => {
        if (!this.decodeFiles[file])
          return;
        resolve();
        clearInterval(interval);
      }, 50);
    });
  }
  queueFile(file) {
    this.decoding.push(file);
    this.decodeFiles[file] = false;
  }
}
