export interface IDMessageItem {
    sourceID: string;
    bufferID: string;
}
export interface Position {
    id: string;
    position: number;
}
export interface SyllidContextInterface {
    onWarning: (message: string | Error | ErrorEvent) => void;
    onFailure: (error: string | Error | ErrorEvent) => void;
    onPlayingSegments: (idList: IDMessageItem[]) => void;
    onBuffering: (id: string) => void;
    onPlaying: (id: string) => void;
    onStopped: (id: string) => void;
    onNoData: (id: string) => void;
    onHasData: (id: string) => void;
    onUnmuteChannel: (streamID: string, channelIndex: number) => void;
    onMuteChannel: (streamID: string, channelIndex: number) => void;
    onLengthUpdate: (id: string, length: number) => void;
    onSegmentPositions: (id: string, positions: Position[]) => void;
    onEndStreams: (ids: string[]) => void;
    onSetPosition: (id: string, position: number) => void;
}
export declare class Syllid {
    private context;
    private core;
    /**
     * Syllid Lib Interface
     * @param context Interface to the context importing this lib
     */
    constructor(context: SyllidContextInterface);
    getChannels(): number;
    init(): Promise<this>;
    startStream(id: string): this;
    stopStream(id: string): this;
    startStreamChannel(streamID: string, channelIndex: number): this;
    stopStreamChannel(streamID: string, channelIndex: number): this;
    addLiveStream(id: string, endpoint: string): this;
    addRandomStream(id: string, endpoint: string): this;
    addNormalStream(id: string, endpoint: string): this;
    stop(): this;
    setPosition(id: string, position: number): this;
    emitStreamLength(id: string): this;
}
//# sourceMappingURL=syllid.d.ts.map