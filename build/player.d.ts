import "audioworklet-polyfill";
export interface PlayerHandler {
    bufferSource: (id: string) => void;
    onPlayingBuffers: (ids: IDMessageItem[]) => void;
    onWarning: (message: string | Error | ErrorEvent) => void;
    onStartSource: (id: string) => void;
    onStopSource: (id: string) => void;
}
export declare class Player {
    private handler;
    channels: number;
    private ctx?;
    private worklet?;
    private connectors;
    private sources;
    private sourceIndexMap;
    private outputMerger?;
    constructor(handler: PlayerHandler);
    private bindFns;
    private createWorkerScriptBlob;
    private setupCtx;
    private bufferMessage;
    private stateMessage;
    private addMessage;
    init(): Promise<void>;
    private handleWorkletMessage;
    private addSource;
    feed(sourceID: string, bufferID: string, data: Float32Array): void;
    startSource(id: string): void;
    private getAvailableIndex;
    stopSource(sourceID: string): void;
    startSourceChannel(sourceID: string, channel: number): void;
    stopSourceChannel(sourceID: string, channel: number): void;
    private fadeOutChannel;
    sampleRate(): number;
    stop(): void;
}
//# sourceMappingURL=player.d.ts.map