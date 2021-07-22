import { Core } from "./core"

export interface IDMessageItem
{
	sourceID: string
	bufferID: string
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
}

export class Syllid
{
	private core: Core

	public getChannels: () => number

	public init: () => Promise<void>

	public startStream: ( id: string ) => void

	public stopStream: ( id: string ) => void

	public startStreamChannel: ( streamID: string, channelIndex: number ) => void

	public stopStreamChannel: ( streamID: string, channelIndex: number ) => void

	public addLiveStream: ( id: string, endpoint: string ) => void


	/**
	 * Syllid Lib Interface
	 * @param context Interface to the context importing this lib
	 */
	constructor( private context: SyllidContextInterface ) 
	{
		this.core = new Core( this.context )

		this.getChannels = this.core.getChannels

		this.init = this.core.init

		this.startStream = this.core.startStream

		this.stopStream = this.core.stopStream

		this.startStreamChannel = this.core.startStreamChannel

		this.stopStreamChannel = this.core.stopStreamChannel

		this.addLiveStream = this.core.addLiveStream
	}

	public stop(): this
	{
		this.core.stop()

		return this
	}
}