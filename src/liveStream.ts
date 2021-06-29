/**
 * When a stream is stopped,
 * its object is destroyed
 * and it will be recreated
 * with a new buffer when
 * restarted
 */



export interface LiveStreamHandler
{
	handleSegment: ( segment: Float32Array, id: string ) => void

	onWarning: ( message: string ) => void

	noData: () => void
}

export interface LiveStreamProvider
{
	validatePlaylistResponse: ( items: Playlist ) => Playlist
}

export class LiveStream
{
	// Buffered data
	private segments: Float32Array[]

	// Current index for providing segments
	private segmentCursor: number

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
		private bufferSize: number = 20,
		private handler: LiveStreamHandler,
		private provider: LiveStreamProvider )
	{
		this.bindFns()

		this.fileList = []

		this.idList = []

		this.segmentCursor = 0

		this.segments = []

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

	private endpointWithQuery(): string
	{
		const _url = new URL( this.endpoint )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `live` )

		return _url.toString()
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

			clearInterval(this.checkInterval)
		}
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

	/**
	 * Get files from Ref, add to segments
	 * array
	 */
	private updateBuffer()
	{
		// if our buffer has space
		// and we have fresh segments
		// get as many URLs as possible
		// to exhaust fresh segments
		// and fill space in buffer


		// all numbers greater than fill cursor
		// and less than used cursor

		if (this.segments[])
	}

	public nextSegments(): void
	{
		/**
		 * Send more segments
		 */
	}
}