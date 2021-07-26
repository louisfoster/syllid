import { PathProvider, StreamHandler, StreamProvider } from "./streamCore";
export interface NormalStreamHandler {
    onLengthUpdate: (id: string, length: number) => void;
    onResetPlayback: (id: string) => void;
    onSegmentPositions: (id: string, positions: Position[]) => void;
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
    type: `normal`;
    constructor(id: string, endpoint: string, bufferSize: number, handler: StreamHandler, provider: StreamProvider, normalHandler: NormalStreamHandler);
    private bindFns;
    private addSlash;
    private updateLength;
    private length;
    private endpointWithQuery;
    private updateFilePositionReference;
    nextSegments(): void;
    path(): string;
    start(): void;
    stop(): void;
    setPosition(position: number): void;
}
//# sourceMappingURL=normalStream.d.ts.map