export interface IDMessageItem {
    sourceID: string;
    bufferID: string;
}
export interface SyllidContextInterface {
    onWarning: (message: string | Error | ErrorEvent) => void;
    onFailure: (error: string | Error | ErrorEvent) => void;
    onPlayingSegments: (idList: IDMessageItem[]) => void;
    onPlaying: (id: string) => void;
    onStopped: (id: string) => void;
    onNoData: (id: string) => void;
    onUnmuteChannel: (streamID: string, channelIndex: number) => void;
    onMuteChannel: (streamID: string, channelIndex: number) => void;
}
export declare class Syllid {
    private context;
    private core;
    getChannels: () => number;
    init: () => Promise<void>;
    startStream: (id: string) => void;
    stopStream: (id: string) => void;
    startStreamChannel: (streamID: string, channelIndex: number) => void;
    stopStreamChannel: (streamID: string, channelIndex: number) => void;
    addLiveStream: (id: string, endpoint: string) => void;
    addRandomStream: (id: string, endpoint: string) => void;
    /**
     * Syllid Lib Interface
     * @param context Interface to the context importing this lib
     */
    constructor(context: SyllidContextInterface);
    stop(): this;
}
//# sourceMappingURL=syllid.d.ts.map