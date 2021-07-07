/**
 * When a stream is stopped,
 * its object is destroyed
 * and it will be recreated
 * with a new buffer when
 * restarted
 */

import { circular_buffer as CircularBuffer } from "circular_buffer_js"


export interface LiveStreamHandler
{
	handleSegment: ( segment: Float32Array, id: string ) => void

	onWarning: ( message: string ) => void

	onFailure: ( message: string ) => void

	noData: () => void
}

export interface LiveStreamProvider
{
	validatePlaylistResponse: ( items: Playlist ) => Playlist

	decodeSegment: ( data: Uint8Array ) => Promise<Float32Array>
}

export class LiveStream implements Stream
{
	// Buffered data
	private segments: CircularBuffer<Float32Array>

	// Buffer update semafore
	private updateLock: boolean

	// Segment URLs
	public fileList: string[]

	// Segment IDs
	public idList: string[]

	// Current index for fetching segments
	private refCursor: number

	// Get URLs interval
	private checkInterval: number

	// Times checked for URLs without update
	private noUpdateCount: number

	constructor(
		private endpoint: string,
		private bufferSize: number = 100,
		private handler: LiveStreamHandler,
		private provider: LiveStreamProvider )
	{
		this.bindFns()

		this.fileList = []

		this.idList = []

		this.segments = new CircularBuffer( this.bufferSize )

		this.updateLock = false

		this.refCursor = 0

		this.noUpdateCount = 0

		// Get more segment URLs
		this.checkNewSegments()

		this.checkInterval = window.setInterval( () => this.checkNewSegments(), 3000 )
	}

	private bindFns()
	{
		this.checkNewSegments = this.checkNewSegments.bind( this )
	}

	/**
	 * Check if new segments are available
	 * Add to segmentRef list
	 */
	private checkNewSegments()
	{
		const path: string = this.getPath()

		if ( !path ) return

		// start=live query required to hint server
		// to return the most recent segments
		fetch( path )
			.then( response =>
			{
				if ( response.status !== 200 )
				{
					throw Error( `Invalid response from endpoint.` )
				}

				/**
				 * Because of redirects, the actual url we want
				 * to store is the one that fulfilled our request,
				 * this is why response.url is passed to this method
				 */
				this.endpoint = this.addSlash( response.url )

				return response.json()
			} )
			.then( ( items: Playlist ) => this.provider.validatePlaylistResponse( items ) )
			.then( items => this.addItemsFromPlaylist( items ) )
			.then( () => this.updateBuffer() )
			.catch( ( e: Error ) => this.handler.onWarning( e.message ) )
	}

	private getPath(): string 
	{
		return this.idList.length > 0
			? new URL(
				`${this.idList[ this.idList.length - 1 ]}`,
				this.endpoint
			).toString()
			: this.endpointWithQuery()
	}

	private endpointWithQuery(): string
	{
		const _url = new URL( this.endpoint )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `live` )

		return _url.toString()
	}

	private addSlash( url: string ): string 
	{
		return url.endsWith( `/` ) ? url : `${url}/`
	}

	private addItemsFromPlaylist( playlist: Playlist ): void
	{
		if ( playlist.length === 0 )
		{
			this.noUpdate()
		}
		else
		{
			this.noUpdateCount = 0
		}

		for ( const { segmentID, segmentURL } of playlist )
		{
			this.fileList.push( segmentURL )

			this.idList.push( segmentID )
		}
	}

	private noUpdate()
	{
		this.noUpdateCount += 1

		if ( this.noUpdateCount > 5 )
		{
			this.handler.noData()

			clearInterval( this.checkInterval )
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
		if ( this.updateLock || this.segments.full() ) return

		this.updateLock = true

		const count = this.segments.available()

		for ( let i = 0; i < count; i += 1 )
		{
			const url = this.fileList[ this.refCursor ]

			if ( !url ) break

			await this.getBuffer( url )

			this.refCursor += 1
		}

		this.updateLock = false

		this.updateBuffer()
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

			this.segments.push( decoded )
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

	public nextSegments(): Float32Array[]
	{
		// Maximum segments to load is 10
		// This is also the limit of segments returned
		// When requesting latest audio
		const count = Math.min( 10, this.segments.available() )

		const items: Float32Array[] = []

		for ( let i = 0; i < count; i += 1 )
		{
			const segment = this.segments.pop()

			if ( !segment ) continue

			items.push( segment )
		}

		return items
	}
}