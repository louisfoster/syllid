import { circular_buffer as CircularBuffer } from "circular_buffer_js"

enum State
{
	stopped = `stopped`,
	running = `running`,
	buffering = `buffering`
}

export interface StreamHandler
{
	handleSegment: ( streamID: string, segment: Float32Array, id: string ) => void

	onWarning: ( message: string ) => void

	onFailure: ( message: string ) => void

	noData: ( id: string ) => void

	hasData: ( id: string ) => void

	onStreamStart: ( id: string ) => void

	onStreamStop: ( id: string ) => void

	onStreamBuffering: ( id: string ) => void
}

export interface StreamProvider
{
	validatePlaylistResponse: ( items: Playlist ) => Playlist

	decodeSegment: ( data: Uint8Array ) => Promise<Float32Array>
}

export interface PathProvider
{
	path: () => string
}

export class StreamCore implements Stream
{
	// Buffered data
	private segments: CircularBuffer<Segment>

	// Buffer update semaphore
	private updateLock: boolean

	// Feed segments semaphore
	private nextLock: boolean

	// Get URLs interval
	private checkTimeout: number

	// Times checked for URLs without update
	private noUpdateCount: number

	// Active state
	private state: State

	// Get more segments
	private continueFetch: boolean

	// Segment feed size
	private feedSize: number

	// Flag: no data returned by endpoint
	private noData: boolean

	// Segment URLs
	public fileList: CircularBuffer<string>

	// Segment IDs
	public nextID: string

	constructor(
		public type: `live` | `normal` | `random`,
		private id: string,
		private bufferSize: number = 10,
		private handler: StreamHandler,
		private provider: StreamProvider,
		private path: PathProvider,
		private onResponseURL: ( url: string ) => void,
		private onFileListUpdated?: ( newItems: string[] ) => void )
	{
		this.bindFns()

		this.fileList = new CircularBuffer( this.bufferSize * 2 )

		this.nextID = ``

		this.segments = new CircularBuffer( this.bufferSize )

		this.updateLock = false

		this.nextLock = false

		this.noUpdateCount = 0

		this.checkTimeout = 0

		this.state = State.stopped

		this.continueFetch = false

		this.feedSize = 5

		this.noData = false
	}

	private bindFns()
	{
		this.checkNewSegments = this.checkNewSegments.bind( this )

		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )
	}

	/**
	 * Check if new segments are available
	 * Add to segmentRef list
	 */
	private checkNewSegments()
	{
		if ( this.state === State.stopped ) return

		if ( this.fileList.isFull )
		{
			this.checkTimeout = window.setTimeout(
				() => this.checkNewSegments(),
				this.bufferSize * 1000 )

			return
		}

		const path: string = this.path.path()

		if ( !path )
		{
			this.noUpdate()

			return
		}

		// start=live query required to hint server
		// to return the most recent segments
		fetch( path )
			.then( response =>
			{
				if ( response.status !== 200 )
				{
					this.noUpdate()

					throw Error( `Invalid response from endpoint.` )
				}

				this.onResponseURL( response.url )

				return response.json()
			} )
			.then( ( items: Playlist ) => this.provider.validatePlaylistResponse( items ) )
			.then( items => this.addItemsFromPlaylist( items ) )
			.then( () => this.updateBuffer() )
			.catch( ( e: Error ) => 
			{
				this.handler.onWarning( e.message )

				this.noUpdate()
			} )
	}

	private addItemsFromPlaylist( playlist: Playlist ): void
	{
		if ( playlist.length === 0 )
		{
			this.noUpdate()

			return
		}
		else
		{
			this.noUpdateCount = 0

			if ( this.noData )
			{
				this.noData = false

				this.handler.hasData( this.id )
			}
		}

		const len = Math.min( playlist.length, this.fileList.available )

		this.checkTimeout = window.setTimeout(
			() => this.checkNewSegments(),
			Math.max( 0.5, len - 1 ) * 1000 )

		const items: string[] = []

		for ( let i = 0; i < len; i += 1 )
		{
			this.fileList.push( playlist[ i ].segmentURL )

			items.push( playlist[ i ].segmentURL )

			if ( i === len - 1 )
			{
				this.nextID = playlist[ i ].segmentID
			}
		}

		if ( len ) this.onFileListUpdated?.( items )
	}

	private noUpdate()
	{
		this.noUpdateCount += 1

		if ( !this.noData ) this.handler.noData( this.id )

		this.noData = true

		if ( this.noUpdateCount < 6 )
		{	
			this.checkTimeout = window.setTimeout(
				() => this.checkNewSegments(),
				Math.round( Math.exp( this.noUpdateCount ) * ( 100 / this.noUpdateCount ) ) )
		}
	}

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
	private async updateBuffer()
	{
		if ( this.updateLock || this.segments.isFull ) return

		this.updateLock = true

		while( this.segments.available && this.fileList.length > 0 )
		{
			const url = this.fileList.pop()

			if ( !url ) break

			await this.getBuffer( url )

			this.checkBuffering()
		}

		this.updateLock = false

		if ( this.continueFetch )
		{
			this.nextSegments()

			this.continueFetch = false
		}
	}

	/**
	 * Reserve worker
	 * Download data
	 * send data to worker
	 * return decoded buffer
	 * push to segment circular buffer
	 */
	private async getBuffer( url: string )
	{
		try
		{
			const response = await fetch( url )

			if ( !response.ok )
				throw Error(
					`Invalid Response: ${response.status} ${response.statusText}`
				)

			if ( !response.body ) throw Error( `ReadableStream not supported.` )
		
			const reader = response.body.getReader()
		
			const data = await reader.read().then( res => this.evalChunk( reader, res, 0, [] ) )
			
			const decoded = await this.provider.decodeSegment( data )

			this.segments.push( { buffer: decoded, id: url } )
		}
		catch ( e )
		{
			this.handler.onFailure( e )
		}
	}

	private async evalChunk(
		reader: Reader,
		{ done, value }: Result,
		totalSize: number,
		chunks: Uint8Array[] ): Promise<Uint8Array> 
	{
		if ( done )
		{
			const data = new Uint8Array( totalSize )

			let offset = 0

			for ( const chunk of chunks )
			{
				data.set( chunk, offset )

				offset += chunk.length
			}

			return data
		}

		if ( value )
		{
			totalSize += value.length

			chunks.push( value )
		}

		return reader.read().then( res => this.evalChunk( reader, res, totalSize, chunks ) )
	}

	private checkBuffering()
	{
		if ( this.state !== State.buffering || this.segments.length < 3 ) return

		this.state = State.buffering

		this.handler.onStreamStart( this.id )
	}

	public nextSegments(): void
	{
		if ( this.nextLock )
		{
			this.continueFetch = true

			return
		}

		this.nextLock = true

		// Maximum segments to load is 10
		// This is also the limit of segments returned
		// When requesting latest audio
		const count = Math.min( this.feedSize, this.segments.length )

		for ( let i = 0; i < count; i += 1 )
		{
			const segment = this.segments.pop()

			if ( !segment ) continue

			this.handler.handleSegment( this.id, segment.buffer, segment.id )
		}

		this.nextLock = false

		this.updateBuffer()
	}

	public start(): void
	{
		if ( this.state !== State.stopped ) return

		this.state = State.buffering

		this.checkNewSegments()
	}

	public stop(): void
	{
		if ( this.state === State.stopped ) return

		this.state = State.stopped

		this.handler.onStreamStop( this.id )

		clearTimeout( this.checkTimeout )
	}

	public reset(): Promise<void>
	{
		return new Promise( resolve => 
		{
			const isRunning = this.state !== State.running
	
			if ( isRunning ) this.stop()
	
			this.nextID = ``
	
			this.fileList.clear()
	
			this.noUpdateCount = 0
	
			this.segments.clear()

			resolve()
		} )
	}
}