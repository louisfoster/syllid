import { PathProvider, StreamCore, StreamHandler, StreamProvider } from "./streamCore"

export interface NormalStreamHandler
{
	onLengthUpdate: ( id: string, length: number ) => void

	onSegmentPositions: ( id: string, positions: Position[] ) => void
	
	onSetPosition: ( id: string, position: number ) => void
}

enum PositionState
{
	updating = `updating`,
	done = `done`
}

export class NormalStream implements Stream, PathProvider
{
	private core: StreamCore

	private position: number

	private lengthURL: string

	private lengthPoll: number

	private fileIndexRef: number

	private segmentPosition: Position[]

	private positionSetState: PositionState
	
	private currentLength: number

	public type: `normal`

	constructor(
		private id: string,
		private endpoint: string,
		private bufferSize: number = 10,
		private handler: StreamHandler,
		private provider: StreamProvider,
		private normalHandler: NormalStreamHandler )
	{
		this.bindFns()

		this.type = `normal`

		this.endpoint = this.addSlash( this.endpoint )

		this.lengthURL = new URL( `length`, this.endpoint ).toString()

		this.core = new StreamCore(
			this.type,
			this.id,
			this.bufferSize,
			this.handler,
			this.provider,
			this,
			this.updateFilePositionReference )

		this.position = 0

		this.currentLength = 0

		this.lengthPoll = 0

		this.fileIndexRef = 0

		this.segmentPosition = []

		this.positionSetState = PositionState.done

		// this.start()
	}

	private bindFns()
	{
		this.nextSegments = this.nextSegments.bind( this )

		this.path = this.path.bind( this )

		this.start = this.start.bind( this )

		this.stop = this.stop.bind( this )

		this.addSlash = this.addSlash.bind( this )

		this.updateFilePositionReference = this.updateFilePositionReference.bind( this )

		this.length = this.length.bind( this )

		this.updateLength = this.updateLength.bind( this )
	}

	private addSlash( url: string ): string 
	{
		return url.endsWith( `/` ) ? url : `${url}/`
	}

	private updateLength( length: number )
	{
		this.currentLength = length

		this.normalHandler.onLengthUpdate( this.id, this.currentLength )
	}

	private length(): void
	{
		fetch( this.lengthURL )
			.then( response =>
			{
				if ( response.status !== 200 )
				{
					this.updateLength( 0 )

					this.handler.onWarning( `Invalid response from endpoint.` )
				}

				return response.json()
			} )
			.then( data =>
			{
				if ( !data || data.length === undefined )
				{
					this.updateLength( 0 )

					this.handler.onWarning( `Invalid data from endpoint.` )
				}

				this.updateLength( data.length )

				this.lengthPoll = window.setTimeout( () => this.length, 5000 )
			} )
			.catch( ( e: Error ) => 
			{
				this.updateLength( 0 )
				
				this.handler.onWarning( e.message )
			} )
	}

	private endpointWithQuery(): string
	{
		const _url = new URL( this.endpoint )

		if( !_url.searchParams.has( `start` ) )
			_url.searchParams.append( `start`, `position` )

		if( !_url.searchParams.has( `position` ) )
			_url.searchParams.append( `position`, `${this.position}` )

		return _url.toString()
	}

	private updateFilePositionReference()
	{
		if ( this.positionSetState === PositionState.updating ) return

		let position = this.segmentPosition.length > 0
			? this.segmentPosition[ this.segmentPosition.length - 1 ].position
			: this.position

		const positions: Position[] = []

		if ( this.segmentPosition.length >= this.currentLength - this.position )
		{
			throw Error( `Can't add more positions, maximum length reached` )
		}

		for ( let i = this.fileIndexRef; i < this.core.fileList.length; i += 1 )
		{
			const positionItem: Position = {
				id: this.core.fileList[ i ],
				position: position
			}

			positions.push( positionItem )

			this.segmentPosition.push( positionItem )

			position += 1

			this.fileIndexRef += 1
		}

		this.normalHandler.onSegmentPositions( this.id, positions )
	}

	public nextSegments(): void
	{
		this.core.nextSegments()
	}

	public path(): string 
	{
		return this.currentLength === 0
			? ``
			: this.core.idList.length > 0
				? this.core.idList.length >= this.currentLength - this.position
					? ``
					: new URL(
						`${this.core.idList[ this.core.idList.length - 1 ]}`,
						this.endpoint
					).toString()
				// if no position set, return normal endpoint
				: this.position === 0
					? this.endpoint
					// otherwise, return endpoint with position request
					: this.endpointWithQuery()
	}

	public start(): void
	{
		this.core.start()

		this.length()
	}

	public stop(): void
	{
		this.core.stop()

		clearTimeout( this.lengthPoll )
	}

	public setPosition( position: number ): void
	{
		if ( this.positionSetState === PositionState.updating ) return

		this.positionSetState = PositionState.updating

		this.core.reset()
			.then( () =>
			{
				this.position = position
	
				this.fileIndexRef = 0
		
				this.segmentPosition.length = 0

				setTimeout( () => 
				{
					this.positionSetState = PositionState.done

					this.normalHandler.onSetPosition( this.id, position )
				}, 1000 )
			} )
	}
}