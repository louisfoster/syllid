import worker from "worker!/opus-recorder/dist/decoder/decoderWorker.min.js"

export interface WorkerPoolHandler
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

export class WorkerPool
{
	private workers: WorkerData[]

	private workerScript: URL

	private idMap: Record<string, number | undefined>

	constructor(
		private workerCount: number,
		private handler: WorkerPoolHandler,
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
			outputBufferSampleRate: this.sampleRate,
			resampleQuality: 10
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
		const buffer = new Float32Array( this.sampleRate )

		let offset = 0

		const pad = this.sampleRate * 0.08

		let incr = 0

		for( let i = 0; i < this.workers[ index ].pageCount; i += 1 )
		{
			const page = this.workers[ index ].bufferPages[ i ]

			if ( incr < pad )
			{
				// length of current page
				const len = page.length

				// rem of pad to skip
				const rem = pad - incr

				// if len is less than pad - incr, add to incr and continue
				if ( len <= rem )
				{
					incr += len

					continue
				}

				buffer.set( page.subarray( rem ) )

				incr = pad

				offset += ( len - rem )
			}
			else
			{
				const rem = buffer.length - offset

				const p = page.length > rem
					? page.subarray( 0, rem )
					: page

				buffer.set( p, offset )

				offset += p.length
			}

			if ( offset >= buffer.length ) break
		}

		const outBuffer = this.zeroCross( buffer )

		return outBuffer
	}

	private zeroCross( buffer: Float32Array )
	{
		const samplesToCheck = Math.min( this.sampleRate * 0.05 - 1, buffer.length - 1 )

		let start = undefined

		let end = undefined

		for ( let i = 0; i < samplesToCheck; i += 1 )
		{
			if ( start === undefined )
			{
				const pre = buffer[ i ] === 0
					? -1
					: buffer[ i ] / Math.abs( buffer[ i ] )
	
				const post = buffer[ i + 1 ] === 0
					? 1
					: buffer[ i + 1 ] / Math.abs( buffer[ i + 1 ] )
				
				if ( pre < post )
				{
					start = i + 1
				}
			}

			if ( end === undefined )
			{
				// - 2 because checking 1 before last
				const index = buffer.length - 2 - i

				const pre = buffer[ index ] === 0
					? -1
					: buffer[ index ] / Math.abs( buffer[ index ] )
	
				const post = buffer[ index + 1 ] === 0
					? 1
					: buffer[ index + 1 ] / Math.abs( buffer[ index + 1 ] )
				
				if ( pre < post )
				{
					end = index + 1
				}
			}

			if ( start !== undefined && end !== undefined )
			{
				break
			}
		}

		const e = end === undefined ? buffer.length - 1 : end

		const s = start === undefined ? 0 : start

		return buffer.subarray( s, e )
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