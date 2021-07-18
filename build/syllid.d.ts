import { LiveStreamHandler, LiveStreamProvider } from "./liveStream";
import { PlayerHandler } from "./player";
export interface SyllidContextInterface {
    onWarning: (message: string | Error | ErrorEvent) => void;
    onFailure: (error: string | Error | ErrorEvent) => void;
    onPlayingSegments: (idList: IDMessageItem[]) => void;
    onPlaying: (id: string) => void;
    onStopped: (id: string) => void;
    onNoData: (id: string) => void;
}
export declare class Syllid implements PlayerHandler, LiveStreamHandler, LiveStreamProvider {
    private context;
    validatePlaylistResponse: (items: Playlist) => Playlist;
    private streams;
    private player;
    private initialised;
    private workerPool?;
    /**
     *
     * @param context Interface to the context importing this lib
     */
    constructor(context: SyllidContextInterface);
    private bindFns;
    getChannels(): number;
    randomInt(from: number, to: number): number;
    private validatePlaylist;
    bufferSource(id: string): void;
    onPlayingBuffers(idList: IDMessageItem[]): void;
    onStartSource(id: string): void;
    onStopSource(id: string): void;
    decodeSegment(data: Uint8Array): Promise<Float32Array>;
    private getWorkerID;
    init(): Promise<void>;
    startStream(id: string): void;
    stopStream(id: string): void;
    startStreamChannel(streamID: string, channelIndex: number): void;
    stopStreamChannel(streamID: string, channelIndex: number): void;
    stop(): this;
    onWarning(message: string | Error | ErrorEvent): void;
    onFailure(error: string | Error | ErrorEvent): void;
    addLiveStream(id: string, endpoint: string): void;
    handleSegment(streamID: string, data: Float32Array, segmentID: string): void;
    noData(id: string): void;
}
//# sourceMappingURL=syllid.d.ts.map