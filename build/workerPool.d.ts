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
    getWorker(): string | undefined;
    decode(id: string, bytes: Uint8Array, onCompleted: (buffer: Float32Array) => void): void;
}
//# sourceMappingURL=workerPool.d.ts.map