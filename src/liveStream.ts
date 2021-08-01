import { PathProvider, StreamCore, StreamHandler, StreamProvider } from "./streamCore"

export class LiveStream implements Stream, PathProvider
{
	private core: StreamCore

	// Flag: indicate base redirect URL is set
	private endpointSet: boolean

	public type: `live`

	constructor(
		private id: string,
		private endpoint: string,
		private bufferSize: number = 10,
		private handler: StreamHandler,
		private provider: StreamProvider )
	{
		this.bindFns()

		this.type = `live`

		this.endpoint = this.addSlash( this.endpoint )

		this.endpointSet = false

		this.core = new StreamCore(
			this.type,
			this.id,
			this.bufferSize,
			this.handler,
			this.provider,
			this,
			url => this.handleResponseURL( url ) )
	}

	private bindFns()
	{
		this.nextSegments = this.nextSegments.bind( this )

		this.path = this.path.bind( this )

		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )

		this.endpointWithQuery = this.endpointWithQuery.bind( this )

		this.addSlash = this.addSlash.bind( this )

		this.handleResponseURL = this.handleResponseURL.bind( this )
	}

	private handleResponseURL( _url: string )
	{
		if ( this.endpointSet ) return

		this.endpointSet = true

		const url = new URL( _url )

		const redirectURL = this.addSlash( `${url.origin}${url.pathname}` )

		this.endpoint = redirectURL
	}

	private endpointWithQuery(): string
	{
		const _url = new URL( this.endpoint )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `latest` )

		return _url.toString()
	}

	private addSlash( url: string ): string 
	{
		return url.endsWith( `/` ) ? url : `${url}/`
	}

	public nextSegments(): void
	{
		this.core.nextSegments()
	}

	public path(): string 
	{
		return this.core.nextID
			? new URL( this.core.nextID, this.endpoint ).toString()
			: this.endpointWithQuery()
	}

	public start(): void
	{
		this.core.start()
	}

	public stop(): void
	{
		this.core.stop()
	}
}