import { PathProvider, StreamHandler, StreamProvider } from "./streamCore";
export interface RandomStreamProvider {
    randomInt: (min: number, max: number) => number;
}
export declare class RandomStream implements Stream, PathProvider {
    private id;
    private endpoint;
    private bufferSize;
    private handler;
    private provider;
    private random;
    private core;
    location: string;
    freshLocation: boolean;
    count: number;
    constructor(id: string, endpoint: string, bufferSize: number, handler: StreamHandler, provider: StreamProvider, random: RandomStreamProvider);
    private bindFns;
    private setFreshLocation;
    setStaleLocation(location: string): void;
    private endpointWithQuery;
    private addSlash;
    path(): string;
    nextSegments(): void;
    start(): void;
    stop(): void;
}
//# sourceMappingURL=randomStream.d.ts.map