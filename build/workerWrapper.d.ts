export interface WorkerWrapperHandler {
    onBuffer: (buffer: Float32Array, index: number) => void;
    onFailure: (error: string | Error | ErrorEvent) => void;
}
export declare class WorkerWrapper {
    private index;
    private handler;
    private worker;
    private decoding;
    private decodeFiles;
    private bufferPages;
    private pageCount;
    private bufferLength;
    constructor(index: number, handler: WorkerWrapperHandler, sampleRate: number);
    private createWorkerScriptBlob;
    private onMessage;
    private reset;
    private buildBuffer;
    /**
     * Decoded data often has a bunch of 0s at the start and end,
     * this finds the first index of non-0s or last index before 0s
     */
    private getIndex;
    /**
     * To prevent popping between uneven buffers, add a tiny fade in
     * at the beginning and fade out at the end
     */
    private fadeBuffer;
    decode(bytes: Uint8Array, file: string): Promise<void>;
    queueFile(file: string): void;
}
//# sourceMappingURL=workerWrapper.d.ts.map