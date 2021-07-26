import { PathProvider, StreamHandler, StreamProvider } from "./streamCore";
export declare class RandomStream implements Stream, PathProvider {
    private id;
    private endpoint;
    private bufferSize;
    private handler;
    private provider;
    private core;
    location: string;
    freshLocation: boolean;
    count: number;
    type: `random`;
    constructor(id: string, endpoint: string, bufferSize: number, handler: StreamHandler, provider: StreamProvider);
    private bindFns;
    private setFreshLocation;
    private randomInt;
    setStaleLocation(location: string): void;
    private endpointWithQuery;
    private addSlash;
    path(): string;
    nextSegments(): void;
    start(): void;
    stop(): void;
}
//# sourceMappingURL=randomStream.d.ts.map