export interface StreamHandler
{
	bufferSegmentData: ( fileList: string[], index: number ) => Promise<void>

	onWarning: ( message: string | Error | ErrorEvent ) => void
}

export interface StreamProvider
{
	randomInt: ( min: number, max: number ) => number

	getSegmentURLs: ( stream: ChannelStream ) => Promise<number>
}

export class ChannelStream
{
	public fileList: string[]

	public idList: string[]

	public processedIndex: number

	public location: string

	public freshLocation: boolean

	public count: number

	public running: boolean

	public interval: number

	public fetchInterval: number

	private errors: number

	constructor(
		private index: number,
		private handler: StreamHandler,
		private provider: StreamProvider )
	{
		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )

		this.processURLs = this.processURLs.bind( this )

		this.errors = 0
		
		this.count = 0

		this.fileList = []

		this.idList = []

		this.location = ``

		this.processedIndex = 0

		this.running = false

		this.freshLocation = false

		this.interval = 0

		this.fetchInterval = 0
	}

	private addQuery( url: string ): string
	{
		const _url = new URL( url )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `random` )

		return _url.toString()
	}

	private getSegments()
	{
		this.provider.getSegmentURLs( this )
			.then( count =>
			{
				this.errors = 0

				this.interval = window.setTimeout( () => 
					this.getSegments(), Math.max( 0, count * 1000 - 1000 ) )
			} )
			.catch( e =>
			{
				this.errors += 1

				this.handler.onWarning( e )

				this.interval = window.setTimeout( () => 
					this.getSegments(), Math.round( Math.exp( this.errors ) * 100 ) )
			} )
	}

	public start(): void
	{
		if ( this.running ) return
		
		this.running = true

		this.getSegments()

		this.processURLs()

		this.fetchInterval = window.setInterval( () => 
			this.processURLs(), 1000 )
	}

	private processURLs()
	{
		// All queued files have been or are being processed for this stream
		if ( this.fileList.length === this.processedIndex )
			return

		const fetchList = this.fileList.slice(
			this.processedIndex
		)

		this.processedIndex += fetchList.length

		this.handler.bufferSegmentData( fetchList, this.index )
	}
	
	public stop(): void
	{
		clearInterval( this.interval )

		clearInterval( this.fetchInterval )

		this.fileList = []

		this.idList = []

		this.processedIndex = 0

		this.location = ``

		this.count = 0

		this.running = false
	}

	public getPath( location: string ): string 
	{
		this.setFreshLocation( location )

		this.count = this.count - 1

		return this.idList.length > 0
			? new URL(
				`${this.idList[ this.idList.length - 1 ]}`,
				this.location
			).toString()
			: !this.location // if empty value
				? this.location
				: this.addQuery( this.location )
	}

	private setFreshLocation( location: string ): void
	{
		if ( this.count > 0 ) return

		this.count = this.provider.randomInt( 0, 5 )

		this.location = location

		this.idList = []

		this.freshLocation = true
	}

	public setStaleLocation( location: string ): void
	{
		if ( this.freshLocation )
		{
			this.location = location
			
			this.freshLocation = false
		}
	}

	public async addItemsFromPlaylist( playlist: Playlist ): Promise<number>
	{
		for ( const { segmentID, segmentURL } of playlist )
		{
			this.fileList.push( segmentURL )

			this.idList.push( segmentID )
		}

		return playlist.length
	}
}