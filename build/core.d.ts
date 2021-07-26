import { NormalStreamHandler } from "./normalStream";
import { PlayerHandler } from "./player";
import type { StreamHandler, StreamProvider } from "./streamCore";
import type { SyllidContextInterface } from "./syllid";
export declare class Core implements PlayerHandler, StreamHandler, StreamProvider, NormalStreamHandler {
    private context;
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
    private isNormalStream;
    /**
     *
     *
     * Player handlers
     *
     *
     */
    bufferSource(id: string): void;
    onPlayingBuffers(idList: IDMessageItem[]): void;
    onStartSource(id: string): void;
    onStopSource(id: string): void;
    onStartSourceChannel(id: string, channel: number): void;
    onStopSourceChannel(id: string, channel: number): void;
    onSourcesEnded(ids: string[]): void;
    /**
     *
     *
     * Stream providers
     *
     *
     */
    decodeSegment(data: Uint8Array): Promise<Float32Array>;
    private getWorkerID;
    validatePlaylistResponse(items: Playlist): Playlist;
    /**
     *
     *
     *  Stream handler
     *
     *
     */
    handleSegment(streamID: string, data: Float32Array, segmentID: string): void;
    onStreamStart(id: string): void;
    onStreamStop(id: string): void;
    onWarning(message: string | Error | ErrorEvent): void;
    onFailure(error: string | Error | ErrorEvent): void;
    noData(id: string): void;
    /**
     *
     *
     *  Normal stream handler
     *
     *
     */
    onLengthUpdate(id: string, length: number): void;
    onSegmentPositions(id: string, positions: Position[]): void;
    onSetPosition(id: string, position: number): void;
    /**
     *
     *
     *  Core API
     *
     *
     */
    init(): Promise<void>;
    startStream(id: string): void;
    stopStream(id: string): void;
    startStreamChannel(streamID: string, channelIndex: number): void;
    stopStreamChannel(streamID: string, channelIndex: number): void;
    stop(): this;
    addLiveStream(id: string, endpoint: string): void;
    addRandomStream(id: string, endpoint: string): void;
    addNormalStream(id: string, endpoint: string): void;
    setPosition(id: string, position: number): void;
    getChannels(): number;
}
//# sourceMappingURL=core.d.ts.map