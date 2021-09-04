export interface WorkerPoolHandler {
    onFailure: (error: string | Error | ErrorEvent) => void;
}
export declare class WorkerPool {
    private workerCount;
    private handler;
    private sampleRate;
    private workers;
    private workerScript;
    private idMap;
    constructor(workerCount: number, handler: WorkerPoolHandler, sampleRate: number);
    private createWorkerScriptBlob;
    private createWorker;
    private onMessage;
    private noHandlerCompleted;
    private reset;
    private buildBuffer;
    private zeroCross;
    /**
     * method used for testing purposes
     * analyse data using program like audacity
     * float32, little-endian, 1 channel, (sample rate of output)
     * */
    /**
     * Decoded data often has a bunch of 0s at the start and end,
     * this finds the first index of non-0s or last index before 0s
     */
    /**
     * To prevent popping between uneven buffers, add a tiny fade in
     * at the beginning and fade out at the end
     */
    getWorker(): string | undefined;
    decode(id: string, bytes: Uint8Array, onCompleted: (buffer: Float32Array) => void): void;
}
//# sourceMappingURL=workerPool.d.ts.map