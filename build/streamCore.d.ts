import { circular_buffer as CircularBuffer } from "circular_buffer_js";
export interface StreamHandler {
    handleSegment: (streamID: string, segment: Float32Array, id: string) => void;
    onWarning: (message: string) => void;
    onFailure: (message: string) => void;
    noData: (id: string) => void;
    hasData: (id: string) => void;
    onStreamStart: (id: string) => void;
    onStreamStop: (id: string) => void;
}
export interface StreamProvider {
    validatePlaylistResponse: (items: Playlist) => Playlist;
    decodeSegment: (data: Uint8Array) => Promise<Float32Array>;
}
export interface PathProvider {
    path: () => string;
}
export declare class StreamCore implements Stream {
    type: `live` | `normal` | `random`;
    private id;
    private bufferSize;
    private handler;
    private provider;
    private path;
    private onResponseURL;
    private onFileListUpdated?;
    private segments;
    private updateLock;
    private nextLock;
    private checkTimeout;
    private noUpdateCount;
    private state;
    private continueFetch;
    private feedSize;
    private noData;
    fileList: CircularBuffer<string>;
    nextID: string;
    constructor(type: `live` | `normal` | `random`, id: string, bufferSize: number, handler: StreamHandler, provider: StreamProvider, path: PathProvider, onResponseURL: (url: string) => void, onFileListUpdated?: ((newItems: string[]) => void) | undefined);
    private bindFns;
    /**
     * Check if new segments are available
     * Add to segmentRef list
     */
    private checkNewSegments;
    private addItemsFromPlaylist;
    private noUpdate;
    /**
     * Get files from Ref, add to segments
     * array
     * Check if locked,
     * if not, check if full,
     * if not, lock and get availability
     * iterate over available count,
     * push as many available segment URL downloads
     * unlock, then call itself
     */
    private updateBuffer;
    /**
     * Reserve worker
     * Download data
     * send data to worker
     * return decoded buffer
     * push to segment circular buffer
     */
    private getBuffer;
    private evalChunk;
    nextSegments(): void;
    start(): void;
    stop(): void;
    reset(): Promise<void>;
}
//# sourceMappingURL=streamCore.d.ts.map