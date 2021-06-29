export interface StreamHandler {
    bufferSegmentData: (fileList: string[], index: number) => Promise<void>;
    onWarning: (message: string | Error | ErrorEvent) => void;
}
export interface StreamProvider {
    randomInt: (min: number, max: number) => number;
    getSegmentURLs: (stream: ChannelStream) => Promise<number>;
}
export declare class ChannelStream {
    private index;
    private handler;
    private provider;
    fileList: string[];
    idList: string[];
    processedIndex: number;
    location: string;
    freshLocation: boolean;
    count: number;
    running: boolean;
    interval: number;
    fetchInterval: number;
    private errors;
    constructor(index: number, handler: StreamHandler, provider: StreamProvider);
    private addQuery;
    private segmentInterval;
    private getSegments;
    start(): void;
    private processURLs;
    stop(): void;
    getPath(location: string): string;
    private setFreshLocation;
    setStaleLocation(location: string): void;
    addItemsFromPlaylist(playlist: Playlist): Promise<number>;
}
//# sourceMappingURL=channelStream.d.ts.map