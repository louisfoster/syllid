import { PathProvider, StreamCore, StreamHandler, StreamProvider } from "./streamCore"

export class RandomStream implements Stream, PathProvider
{
	private core: StreamCore

	public location: string

	public freshLocation: boolean

	public count: number

	public type: `random`

	constructor(
		private id: string,
		private endpoint: string,
		private bufferSize: number = 10,
		private handler: StreamHandler,
		private provider: StreamProvider )
	{
		this.bindFns()

		this.type = `random`

		this.count = 0

		this.location = ``

		this.freshLocation = false

		this.endpoint = this.addSlash( this.endpoint )

		this.core = new StreamCore(
			this.type,
			this.id,
			this.bufferSize,
			this.handler,
			{
				decodeSegment: this.provider.decodeSegment,
				validatePlaylistResponse: response =>
				{
					const items = this.provider.validatePlaylistResponse( response )

					// amount of items returned is randomised
					return ( items.length > 1 )
						? items.slice( 0, this.randomInt( 1, items.length ) )
						: items
				}
			},
			this )

		// this.start()
	}

	private bindFns()
	{
		this.nextSegments = this.nextSegments.bind( this )

		this.path = this.path.bind( this )

		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )

		this.setFreshLocation = this.setFreshLocation.bind( this )

		this.setStaleLocation = this.setStaleLocation.bind( this )

		this.endpointWithQuery = this.endpointWithQuery.bind( this )

		this.addSlash = this.addSlash.bind( this )
	}

	private setFreshLocation(): void
	{
		if ( this.count > 0 ) return

		this.count = this.randomInt( 0, 5 )

		this.location = this.endpoint

		this.core.idList = []

		this.freshLocation = true
	}

	private randomInt( from: number, to: number ): number
	{
		if ( to < from ) return from
		
		return Math.floor( Math.random() * ( to - from ) + from )
	}

	public setStaleLocation( location: string ): void
	{
		if ( this.freshLocation )
		{
			this.location = location
			
			this.freshLocation = false
		}
	}

	private endpointWithQuery( endpoint: string ): string
	{
		const _url = new URL( endpoint )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `random` )

		return _url.toString()
	}

	private addSlash( url: string ): string 
	{
		return url.endsWith( `/` ) ? url : `${url}/`
	}

	public path(): string 
	{
		this.setFreshLocation()

		this.count = this.count - 1

		return this.core.idList.length > 0
			? new URL(
				`${this.core.idList[ this.core.idList.length - 1 ]}`,
				this.location
			).toString()
			: !this.location // if empty value
				? this.location
				: this.endpointWithQuery( this.location )
	}

	public nextSegments(): void
	{
		this.core.nextSegments()
	}

	public start(): void
	{
		this.core.start()
	}

	public stop(): void
	{
		this.core.stop()
		
		this.location = ``

		this.count = 0	
	}
}