import "audioworklet-polyfill";
export declare class Player {
    channels: number;
    private ctx?;
    private worklet?;
    private splitter?;
    private merger?;
    private gain;
    private channelState;
    constructor();
    private bindFns;
    private createWorkerScriptBlob;
    feed(channel: number, data: Float32Array): void;
    private bufferMessage;
    stopChannel(channel: number): void;
    private stateMessage;
    private setupCtx;
    stop(): void;
    init(): Promise<void>;
}
//# sourceMappingURL=player.d.ts.map