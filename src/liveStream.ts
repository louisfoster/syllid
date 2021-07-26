import { PathProvider, StreamCore, StreamHandler, StreamProvider } from "./streamCore"

export class LiveStream implements Stream, PathProvider
{
	private core: StreamCore

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

		this.core = new StreamCore(
			this.type,
			this.id,
			this.bufferSize,
			this.handler,
			this.provider,
			this )

		// this.start()
	}

	private bindFns()
	{
		this.nextSegments = this.nextSegments.bind( this )

		this.path = this.path.bind( this )

		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )

		this.endpointWithQuery = this.endpointWithQuery.bind( this )

		this.addSlash = this.addSlash.bind( this )
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
		return this.core.idList.length > 0
			? new URL(
				`${this.core.idList[ this.core.idList.length - 1 ]}`,
				this.endpoint
			).toString()
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