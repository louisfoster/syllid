import "audioworklet-polyfill";
export interface PlayerHandler {
    bufferSource: (id: string) => void;
    onPlayingBuffers: (ids: IDMessageItem[]) => void;
    onWarning: (message: string | Error | ErrorEvent) => void;
    onStartSource: (id: string) => void;
    onStopSource: (id: string) => void;
    onStartSourceChannel: (id: string, channel: number) => void;
    onStopSourceChannel: (id: string, channel: number) => void;
    onSourcesEnded: (ids: string[]) => void;
}
export declare class Player {
    private handler;
    channels: number;
    private ctx?;
    /**
     * Outputs audio from buffers,
     * each buffer source === node output
     * All outputs have 1 channel
     */
    private worklet?;
    /**
     * Each output channel has a connector
     * A connector has n inputs.
     * A connector connects to the output merger.
     */
    private connectors;
    /**
     * A source contains reference to a buffer
     */
    private sources;
    /**
     * Source index map associates the source ID
     * with its index in the worklet node outputs
     */
    private sourceIndexMap;
    /**
     * The output merger connects the connectors
     * to the destination channels.
     */
    private outputMerger?;
    private streamCount;
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
    private getAvailableIndex;
    feed(sourceID: string, bufferID: string, data: Float32Array): void;
    startSource(id: string): void;
    stopSource(sourceID: string): void;
    startSourceChannel(sourceID: string, channel: number): void;
    stopSourceChannel(sourceID: string, channel: number, onActive?: () => void): void;
    sampleRate(): number;
    stop(): void;
}
//# sourceMappingURL=player.d.ts.map