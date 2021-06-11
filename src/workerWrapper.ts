import worker from "worker!/opus-recorder/dist/decoder/decoderWorker.min.js"

export interface WorkerWrapperHandler
{
	onBuffer: ( buffer: Float32Array, index: number ) => void

	onFailure: ( error: string | Error | ErrorEvent ) => void
}

export class WorkerWrapper
{
	private worker: Worker

	private decoding: string[]

	private decodeFiles: Record<string, boolean>

	private bufferPages: Float32Array[]

	private pageCount: number

	private bufferLength: number

	constructor( private index: number, private handler: WorkerWrapperHandler, sampleRate: number )
	{
		this.worker = new Worker( this.createWorkerScriptBlob( worker ), {
			name: `decode-worker`,
			type: `module`,
		} )

		this.decodeFiles = {}

		this.decoding = []

		this.bufferPages = []

		this.pageCount = 0

		this.bufferLength = 0

		this.onMessage = this.onMessage.bind( this )

		this.worker.onmessage = e => this.onMessage( e )

		this.worker.onerror = err => this.handler.onFailure( err )

		this.worker.postMessage( { 
			command: `init`,
			decoderSampleRate: sampleRate,
			outputBufferSampleRate: sampleRate
		} )
	}

	private createWorkerScriptBlob( script: string ): URL
	{
		const blob = new Blob( [ script ], { type: `text/javascript` } )

		return new URL( URL.createObjectURL( blob ), import.meta.url )
	}

	private onMessage( { data }: MessageEvent<Float32Array[]> ): void
	{
		// null means decoder is finished
		if ( data === null )
		{
			this.handler.onBuffer( this.buildBuffer(), this.index )

			this.reset()
		}
		else
		{
			// data contains decoded buffers as float32 values
			for( const buffer of data )
			{
				this.bufferPages[ this.pageCount ] = buffer

				this.pageCount += 1

				this.bufferLength += buffer.length
			}
		}
	}

	private reset()
	{
		this.pageCount = 0

		this.bufferLength = 0

		this.decodeFiles[ this.decoding[ this.decoding.length - 1 ] ] = true
	}

	private buildBuffer(): Float32Array
	{
		const firstPage = this.bufferPages[ 0 ]

		const lastPage = this.bufferPages[ this.pageCount - 1 ]

		const offsetStart = this.getIndex( firstPage, `start` )

		const offsetEnd = this.getIndex( lastPage, `end` )

		const reduceEnd = lastPage.length - 1 - offsetEnd

		const buffer = new Float32Array( this.bufferLength - offsetStart - reduceEnd )

		let offset = 0

		for( let i = 0; i < this.pageCount; i += 1 )
		{
			const page = i === 0
				? firstPage.subarray( offsetStart )
				: i === this.pageCount - 1
					? lastPage.subarray( 0, offsetEnd + 1 )
					: this.bufferPages[ i ]

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

	public decode( bytes: Uint8Array, file: string ): Promise<void>
	{
		return new Promise( resolve =>
		{
			this.worker.postMessage( {
				command: `decode`,
				pages: bytes
			}, [ bytes.buffer ] )

			const interval: number = window.setInterval( (): void =>
			{
				if ( !this.decodeFiles[ file ] ) return
				
				resolve()
				
				clearInterval( interval )
			}, 50 )
		} )
	}

	public queueFile( file: string ): void
	{
		this.decoding.push( file )
			
		this.decodeFiles[ file ] = false
	}
}