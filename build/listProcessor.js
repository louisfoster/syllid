import {WorkerWrapper} from "./workerWrapper.js";
export class ListProcessor {
  constructor(handler, sampleRate = 48e3) {
    this.handler = handler;
    this.sampleRate = sampleRate;
    this.workers = [];
    this.onBuffer = this.handler.onBuffer;
    this.onFailure = this.handler.onFailure;
  }
  createWorkerForIndex(index) {
    this.workers[index] = new WorkerWrapper(index, this, this.sampleRate);
  }
  async evalChunk(reader, file, {done, value}, index) {
    if (done)
      return;
    if (value)
      await this.workers[index].decode(value, file);
    return reader.read().then((res) => this.evalChunk(reader, file, res, index));
  }
  async processURLList(fileList, index) {
    if (!this.workers[index])
      this.createWorkerForIndex(index);
    for (const file of fileList) {
      try {
        const response = await fetch(file);
        if (!response.ok)
          throw Error(`Invalid Response: ${response.status} ${response.statusText}`);
        if (!response.body)
          throw Error(`ReadableStream not supported.`);
        const reader = response.body.getReader();
        this.workers[index].queueFile(file);
        await reader.read().then((res) => this.evalChunk(reader, file, res, index));
      } catch (e) {
        this.handler.onFailure(e);
      }
    }
  }
}
