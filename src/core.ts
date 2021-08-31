import { LiveStream } from "./liveStream"
import { NormalStream, NormalStreamHandler } from "./normalStream"
import { Player, PlayerHandler } from "./player"
import { RandomStream } from "./randomStream"
import type { StreamHandler, StreamProvider } from "./streamCore"
import type { SyllidContextInterface } from "./syllid"
import { WorkerPool } from "./workerPool"

export class Core
implements
	PlayerHandler,
	StreamHandler,
	StreamProvider,
	NormalStreamHandler
{
	private streams: Record<string, Stream>

	private player: Player

	private initialised: boolean

	private workerPool?: WorkerPool

	/**
	 * 
	 * @param context Interface to the context importing this lib
	 */
	constructor( private context: SyllidContextInterface ) 
	{
		this.bindFns()

		this.player = new Player( this )

		this.streams = {}

		this.initialised = false
	}

	private bindFns()
	{
		this.stop = this.stop.bind( this )

		this.init = this.init.bind( this )

		this.startStream = this.startStream.bind( this )

		this.stopStream = this.stopStream.bind( this )

		this.startStreamChannel = this.startStreamChannel.bind( this )

		this.stopStreamChannel = this.stopStreamChannel.bind( this )

		this.addLiveStream = this.addLiveStream.bind( this )

		this.addRandomStream = this.addRandomStream.bind( this )

		this.getChannels = this.getChannels.bind( this )

		this.bufferSource = this.bufferSource.bind( this )

		this.onPlayingBuffers = this.onPlayingBuffers.bind( this )

		this.onStartSource = this.onStartSource.bind( this )

		this.onStopSource = this.onStopSource.bind( this )

		this.onStreamStart = this.onStreamStart.bind( this )

		this.onStreamStop = this.onStreamStop.bind( this )

		this.onStartSourceChannel = this.onStartSourceChannel.bind( this )

		this.onStopSourceChannel = this.onStopSourceChannel.bind( this )

		this.decodeSegment = this.decodeSegment.bind( this )

		this.onWarning = this.onWarning.bind( this )

		this.onFailure = this.onFailure.bind( this )

		this.handleSegment = this.handleSegment.bind( this )

		this.noData = this.noData.bind( this )

		this.onLengthUpdate = this.onLengthUpdate.bind( this )

		this.validatePlaylistResponse = this.validatePlaylistResponse.bind( this )
	}

	private isNormalStream( stream: Stream ): stream is NormalStream
	{
		return stream.type === `normal`
	}


	/**
	 * 
	 * 
	 * Player handlers
	 * 
	 * 
	 */



	public bufferSource( id: string ): void
	{
		// nextSegments request to stream
		this.streams[ id ].nextSegments()
	}

	public onPlayingBuffers( idList: IDMessageItem[] ): void
	{
		// emit handler that segments are now playing
		this.context.onPlayingSegments( idList )
	}

	public onStartSource( id: string ): void
	{
		// emit handler that stream is now playing
		this.context.onPlaying( id )
	}

	public onStopSource( id: string ): void
	{
		// emit handler that stream is stopped playing
		this.context.onStopped( id )
	}

	public onStartSourceChannel( id: string, channel: number ): void
	{
		this.context.onUnmuteChannel( id, channel )
	}

	public onStopSourceChannel( id: string, channel: number ): void
	{
		this.context.onMuteChannel( id, channel )
	}

	public onSourcesEnded( ids: string[] ): void
	{
		this.context.onEndStreams( ids )
	}


	/**
	 * 
	 * 
	 * Stream providers
	 * 
	 * 
	 */

	public async decodeSegment( data: Uint8Array ): Promise<Float32Array>
	{
		const workerID = await this.getWorkerID()

		return new Promise( resolve =>
		{
			this.workerPool?.decode( workerID, data, resolve )
		} )
	}

	private getWorkerID( res?: ( id: string ) => void )
	{
		return new Promise<string>( resolve =>
		{
			const id = this.workerPool?.getWorker()

			const r = res ?? resolve

			if ( !id ) setTimeout( () => this.getWorkerID( r ), 10 )
			else r( id )
		} )
	}

	public validatePlaylistResponse( items: Playlist ): Playlist
	{
		if ( !Array.isArray( items ) ) 
		{
			throw Error( `Playlist is not an array.` )
		}

		items.forEach( ( i: PlaylistItem ): void => 
		{
			try 
			{
				new URL( i.segmentURL ).toString()
			}
			catch
			{
				throw Error( `${i.segmentURL} in playlist is invalid URL.` )
			}

			if ( !i.segmentID || typeof i.segmentID !== `string` ) 
			{
				throw Error( `${i.segmentID || `Missing ID`} in playlist is invalid ID.` )
			}
		} )

		return items
	}


	/**
	 * 
	 * 
	 *  Stream handler
	 * 
	 * 
	 */

	


	public handleSegment( streamID: string, data: Float32Array, segmentID: string ): void
	{
		this.player.feed( streamID, segmentID, data )
	}

	public onStreamBuffering( id: string ): void
	{
		this.context.onBuffering( id )
	}

	public onStreamStart( id: string ): void
	{
		this.player.startSource( id )
	}

	public onStreamStop( id: string ): void
	{
		this.player.stopSource( id )
	}

	public onWarning( message: string | Error | ErrorEvent ): void 
	{
		this.context.onWarning( message )
	}

	public onFailure( error: string | Error | ErrorEvent ): void 
	{
		this.context.onFailure( error )
	}

	public noData( id: string ): void
	{
		this.context.onNoData( id )
	}

	public hasData( id: string ): void
	{
		this.context.onHasData( id )
	}


	/**
	 * 
	 * 
	 *  Normal stream handler
	 * 
	 * 
	 */



	public onLengthUpdate( id: string, length: number ): void
	{
		this.context.onLengthUpdate( id, length )
	}

	public onSegmentPositions( id: string, positions: Position[] ): void
	{
		this.context.onSegmentPositions( id, positions )
	}

	public onSetPosition( id: string, position: number ): void
	{
		this.context.onSetPosition( id, position )
	}



	/**
	 * 
	 * 
	 *  Core API
	 * 
	 * 
	 */



	public async init(): Promise<void>
	{
		if ( this.initialised ) return
		
		this.initialised = true

		await this.player.init()

		this.workerPool = new WorkerPool( 4, this, this.player.sampleRate() )
	}

	public startStream( id: string ): void
	{
		this.init()

		this.streams[ id ]?.start()
	}
	
	public stopStream( id: string ): void
	{
		this.streams[ id ]?.stop()
	}

	public startStreamChannel( streamID: string, channelIndex: number ): void
	{
		if ( !this.streams[ streamID ] ) return

		this.player.startSourceChannel( streamID, channelIndex )
	}

	public stopStreamChannel( streamID: string, channelIndex: number ): void
	{
		if ( !this.streams[ streamID ] ) return
		
		this.player.stopSourceChannel( streamID, channelIndex )
	}

	public stop(): void
	{
		this.player.stop()

		for ( const stream in this.streams ) 
		{
			this.streams[ stream ].stop()
		}
	}

	public addLiveStream( id: string, endpoint: string ): void
	{
		if ( this.streams[ id ] ) return

		this.init()

		this.streams[ id ] = new LiveStream( id, endpoint, 10, this, this )
	}

	public addRandomStream( id: string, endpoint: string ): void
	{
		if ( this.streams[ id ] ) return

		this.init()

		this.streams[ id ] = new RandomStream( id, endpoint, 10, this, this )
	}

	public addNormalStream( id: string, endpoint: string ): void
	{
		if ( this.streams[ id ] ) return

		this.init()

		this.streams[ id ] = new NormalStream( id, endpoint, 10, this, this, this )
	}

	public setPosition( id: string, position: number ): void
	{
		const stream = this.streams[ id ]

		if ( this.isNormalStream( stream ) )
		{
			stream.setPosition( position )
		}
	}

	public getChannels(): number
	{
		return this.player.channels
	}
}