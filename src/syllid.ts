import { Core } from "./core"

export interface IDMessageItem
{
	sourceID: string
	bufferID: string
}

export interface Position
{
	id: string
	position: number
}

export interface SyllidContextInterface
{
	onWarning: ( message: string | Error | ErrorEvent ) => void

	onFailure: ( error: string | Error | ErrorEvent ) => void

	onPlayingSegments: ( idList: IDMessageItem[] ) => void

	onPlaying: ( id: string ) => void

	onStopped: ( id: string ) => void

	onNoData: ( id: string ) => void

	onUnmuteChannel: ( streamID: string, channelIndex: number ) => void

	onMuteChannel: ( streamID: string, channelIndex: number ) => void

	onLengthUpdate: ( id: string, length: number ) => void

	onSegmentPositions: ( id: string, positions: Position[] ) => void

	onEndStreams: ( ids: string[] ) => void

	onSetPosition: ( id: string, position: number ) => void
}

export class Syllid
{
	private core: Core

	/**
	 * Syllid Lib Interface
	 * @param context Interface to the context importing this lib
	 */
	constructor( private context: SyllidContextInterface ) 
	{
		this.core = new Core( this.context )
	}

	public getChannels(): number
	{
		return this.core.getChannels()
	}

	public async init(): Promise<this>
	{
		await this.core.init()

		return this
	}

	public startStream( id: string ): this
	{
		this.core.startStream( id )

		return this
	}

	public stopStream( id: string ): this
	{
		this.core.stopStream( id )

		return this
	}

	public startStreamChannel( streamID: string, channelIndex: number ): this
	{
		this.core.startStreamChannel( streamID, channelIndex )

		return this
	}

	public stopStreamChannel( streamID: string, channelIndex: number ): this
	{
		this.core.stopStreamChannel( streamID, channelIndex )

		return this
	}

	public addLiveStream( id: string, endpoint: string ): this
	{
		this.core.addLiveStream( id, endpoint )

		return this
	}

	public addRandomStream( id: string, endpoint: string ): this
	{
		this.core.addRandomStream( id, endpoint )

		return this
	}

	public addNormalStream( id: string, endpoint: string ): this
	{
		this.core.addNormalStream( id, endpoint )

		return this
	}

	public stop(): this
	{
		this.core.stop()

		return this
	}

	public setPosition( id: string, position: number ): this
	{
		this.core.setPosition( id, position )

		return this
	}
}