export interface WorkerPoolHandler {
    onFailure: (error: string | Error | ErrorEvent) => void;
}
export declare class WorkerPool {
    private workerCount;
    private handler;
    private sampleRate;
    private workers;
    private workerScript;
    private idMap;
    constructor(workerCount: number, handler: WorkerPoolHandler, sampleRate: number);
    private createWorkerScriptBlob;
    private createWorker;
    private onMessage;
    private noHandlerCompleted;
    private reset;
    private buildBuffer;
    /**
     * method used for testing purposes
     * analyse data using program like audacity
     * float32, little-endian, 1 channel, (sample rate of output)
    private download( buffer: ArrayBuffer )
    {
        const saveByteArray = ( function ()
        {
            const a = document.createElement( `a` )

            document.body.appendChild( a )

            a.style.display = `none`

            return ( data: BlobPart[], name: string ) =>
            {
                const blob = new Blob( data, { type: `octet/stream` } ),
                    url = window.URL.createObjectURL( blob )

                a.href = url

                a.download = name

                a.click()

                window.URL.revokeObjectURL( url )
            }
        }() )

        saveByteArray( [ buffer ], `${~~( Math.random() * 10000000 )}` )
    }
    */
    /**
     * Decoded data often has a bunch of 0s at the start and end,
     * this finds the first index of non-0s or last index before 0s
     */
    /**
     * To prevent popping between uneven buffers, add a tiny fade in
     * at the beginning and fade out at the end
     */
    private fadeBuffer;
    getWorker(): string | undefined;
    decode(id: string, bytes: Uint8Array, onCompleted: (buffer: Float32Array) => void): void;
}
//# sourceMappingURL=workerPool.d.ts.map