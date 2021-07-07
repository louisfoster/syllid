import worker from "worker!/opus-recorder/dist/decoder/decoderWorker.min.js"

export interface WorkerWrapperHandler
{
	onFailure: ( error: string | Error | ErrorEvent ) => void
}

enum WorkerState
{
	free = `free`,
	reserved = `reserved`,
	decoding = `decoding`
}

interface WorkerData
{
	index: number
	timeout: number
	state: WorkerState
	worker: Worker
	pageCount: number
	bufferLength: number
	bufferPages: Float32Array[]
	onCompleted: ( buffer: Float32Array ) => void 
}

export class WorkerWrapper
{
	private workers: WorkerData[]

	private workerScript: URL

	private idMap: Record<string, number | undefined>

	constructor(
		private workerCount: number,
		private handler: WorkerWrapperHandler,
		private sampleRate: number )
	{
		this.onMessage = this.onMessage.bind( this )

		this.noHandlerCompleted = this.noHandlerCompleted.bind( this )

		this.workerScript = this.createWorkerScriptBlob( worker )

		this.workers = []

		this.idMap = {}

		for ( let w = 0; w < this.workerCount; w += 1 )
		{
			this.workers[ w ] = this.createWorker( w )
		}
	}

	private createWorkerScriptBlob( script: string ): URL
	{
		const blob = new Blob( [ script ], { type: `text/javascript` } )

		return new URL( URL.createObjectURL( blob ), import.meta.url )
	}

	private createWorker( index: number ): WorkerData
	{
		const worker = new Worker( this.workerScript, {
			name: `decode-worker`,
			type: `module`,
		} )

		worker.onmessage = e => this.onMessage( e, index )

		worker.onerror = err => this.handler.onFailure( err )

		worker.postMessage( { 
			command: `init`,
			decoderSampleRate: 48000,
			outputBufferSampleRate: this.sampleRate
		} )

		return {
			index,
			timeout: 0,
			worker,
			bufferPages: [],
			pageCount: 0,
			bufferLength: 0,
			onCompleted: this.noHandlerCompleted,
			state: WorkerState.free
		}
	}

	private onMessage( { data }: MessageEvent<Float32Array[]>, workerIndex: number ): void
	{
		// null means decoder is finished
		if ( data === null )
		{
			this.workers[ workerIndex ].onCompleted( this.buildBuffer( workerIndex ) )

			this.reset( workerIndex )
		}
		else
		{
			// data contains decoded buffers as float32 values
			for( const buffer of data )
			{
				this.workers[ workerIndex ].bufferPages[ this.workers[ workerIndex ].pageCount ] = buffer

				this.workers[ workerIndex ].pageCount += 1

				this.workers[ workerIndex ].bufferLength += buffer.length
			}
		}
	}

	private noHandlerCompleted(): void
	{
		this.handler.onFailure( `Received completed buffer for non-attached worker.` )
	}

	private reset( index: number )
	{
		this.workers[ index ].pageCount = 0

		this.workers[ index ].bufferLength = 0

		this.workers[ index ].onCompleted = this.noHandlerCompleted
	}

	private buildBuffer( index: number ): Float32Array
	{
		const firstPage = this.workers[ index ].bufferPages[ 0 ]

		const lastPage = this.workers[ index ].bufferPages[ this.workers[ index ].pageCount - 1 ]

		const offsetStart = this.getIndex( firstPage, `start` )

		const offsetEnd = this.getIndex( lastPage, `end` )

		const reduceEnd = lastPage.length - 1 - offsetEnd

		const buffer = new Float32Array( this.workers[ index ].bufferLength - offsetStart - reduceEnd )

		let offset = 0

		for( let i = 0; i < this.workers[ index ].pageCount; i += 1 )
		{
			const page = i === 0
				? firstPage.subarray( offsetStart )
				: i === this.workers[ index ].pageCount - 1
					? lastPage.subarray( 0, offsetEnd + 1 )
					: this.workers[ index ].bufferPages[ i ]

			buffer.set( page, offset )

			offset += page.length
		}

		this.fadeBuffer( buffer )

		return buffer
	}

	/**
	 * Decoded data often has a bunch of 0s at the start and end,
	 * this finds the first index of non-0s or last index before 0s
	 */
	private getIndex( buffer: Float32Array, direction: `start` | `end` ): number
	{
		let seqCount = 0

		let seqStart = -1

		for ( let i = 0; i < buffer.length; i += 1 )
		{
			const index = direction === `start` ? i : buffer.length - 1 - i

			if ( buffer[ index ] === 0 )
			{
				seqCount = 0

				seqStart = -1

				continue
			}
			else if ( seqCount === 9 )
			{
				break
			}
			else
			{
				seqCount += 1

				seqStart = seqStart === -1 ? index : seqStart
			}
		}

		return seqStart
	}

	/**
	 * To prevent popping between uneven buffers, add a tiny fade in
	 * at the beginning and fade out at the end
	 */
	private fadeBuffer( buffer: Float32Array )
	{
		const milli = 2000

		for( let i = 0; i < milli; i += 1 )
		{
			// FADE IN
			buffer[ i ] = ( buffer[ i ] * i / milli )

			// FADE OUT
			const j = buffer.length - 1 - i

			buffer[ j ] = buffer[ j ] - ( buffer[ j ] * ( milli - i ) / milli )
		}
	}

	public getWorker(): string | undefined
	{
		for ( const worker of this.workers )
		{
			if ( worker.state === WorkerState.free )
			{
				worker.state = WorkerState.reserved

				const id = `${Math.round( Math.random() * 100000 )}`

				this.idMap[ id ] = worker.index

				worker.timeout = window.setTimeout( () =>
				{
					worker.state = WorkerState.free

					this.idMap[ id ] = undefined
				}, 1000 )

				return id
			}
		}
	}

	public decode( id: string, bytes: Uint8Array, onCompleted: ( buffer: Float32Array ) => void ): void
	{
		const index = this.idMap[ id ]

		if ( index === undefined ) throw Error( `No worker available for ID: ${id}.` )

		if ( this.workers[ index ].state !== WorkerState.reserved ) throw Error( `Worker not in correct state.` )

		this.workers[ index ].state = WorkerState.decoding

		this.workers[ index ].onCompleted = buffer => onCompleted( buffer )

		this.workers[ index ].worker.postMessage( {
			command: `decode`,
			pages: bytes
		}, [ bytes.buffer ] )
	}
}