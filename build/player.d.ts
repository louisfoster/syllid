export declare class Player {
    channels: number;
    private ctx;
    private worklet?;
    constructor();
    private bindFns;
    private createWorkerScriptBlob;
    feed(channel: number, data: Float32Array): void;
    private bufferMessage;
    stopChannel(channel: number): void;
    private stateMessage;
    stop(): void;
    init(): Promise<void>;
}
//# sourceMappingURL=player.d.ts.map