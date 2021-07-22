/**
 * When a stream is stopped,
 * its object is destroyed
 * and it will be recreated
 * with a new buffer when
 * restarted
 */
export interface RandomStreamHandler {
    handleSegment: (streamID: string, segment: Float32Array, id: string) => void;
    onWarning: (message: string) => void;
    onFailure: (message: string) => void;
    noData: (id: string) => void;
}
export interface RandomStreamProvider {
    randomInt: (min: number, max: number) => number;
    validatePlaylistResponse: (items: Playlist) => Playlist;
    decodeSegment: (data: Uint8Array) => Promise<Float32Array>;
}
export declare class RandomStream implements Stream {
    private id;
    private endpoint;
    private bufferSize;
    private handler;
    private provider;
    private segments;
    private updateLock;
    private nextLock;
    fileList: string[];
    idList: string[];
    private refCursor;
    private checkInterval;
    private noUpdateCount;
    private state;
    location: string;
    freshLocation: boolean;
    count: number;
    constructor(id: string, endpoint: string, bufferSize: number, handler: RandomStreamHandler, provider: RandomStreamProvider);
    private bindFns;
    /**
     * Check if new segments are available
     * Add to segmentRef list
     */
    private checkNewSegments;
    getPath(location: string): string;
    private setFreshLocation;
    setStaleLocation(location: string): void;
    private endpointWithQuery;
    private addSlash;
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
}
//# sourceMappingURL=randomStream.d.ts.map