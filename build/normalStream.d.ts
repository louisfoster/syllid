import { PathProvider, StreamHandler, StreamProvider } from "./streamCore";
export interface NormalStreamHandler {
    onLengthUpdate: (id: string, length: number) => void;
    onSegmentPositions: (id: string, positions: Position[]) => void;
    onSetPosition: (id: string, position: number) => void;
}
export declare class NormalStream implements Stream, PathProvider {
    private id;
    private endpoint;
    private bufferSize;
    private handler;
    private provider;
    private normalHandler;
    private core;
    private position;
    private lengthURL;
    private lengthPoll;
    private fileIndexRef;
    private segmentPosition;
    private positionSetState;
    private currentLength;
    private endpointSet;
    type: `normal`;
    constructor(id: string, endpoint: string, bufferSize: number, handler: StreamHandler, provider: StreamProvider, normalHandler: NormalStreamHandler);
    private bindFns;
    private handleResponseURL;
    private addSlash;
    private updateLength;
    private length;
    private endpointWithLengthQuery;
    private endpointWithQuery;
    private updateFilePositionReference;
    nextSegments(): void;
    path(): string;
    start(): void;
    stop(): void;
    setPosition(position: number): void;
}
//# sourceMappingURL=normalStream.d.ts.map