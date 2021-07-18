import worker from "./playerWorklet"
import "audioworklet-polyfill"

/**
 * Single worker node
 * Worker receives data for
 * - channel playing state
 * - buffers for channel
 * 
 * When channel is stopped, just copy 0s
 * When channel playing but buffer is empty, just copy almost silent randoms
 * When channel is playing and buffer is available
 * - get current buffer file
 * - get current buffer index
 * - get next non 0 value
 * - if new buffer file, fade in values
 * - if end of buffer (sequence of 0 values > 10), fade out values
 * - copy values to output for channel
 */

enum MessageType
{
	state = `state`,
	buffer = `buffer`,
	add = `add`
}

enum ChannelState
{
	muted,
	active
}

enum SourceState
{
	inactive,
	// buffering,
	active
}

enum WorkletMessageType
{
	feed = `feed`,
	id = `id`
}

interface SourceData
{
	id: string
	channels: ChannelState[]
	state: SourceState
	connection: GainNode
	index: number
}

interface Connector
{
	input: ChannelMergerNode
	output: GainNode
	count: number
}

export interface PlayerHandler
{
	bufferSource: ( id: string ) => void

	onPlayingBuffers: ( ids: IDMessageItem[] ) => void

	onWarning: ( message: string | Error | ErrorEvent ) => void

	onStartSource: ( id: string ) => void

	onStopSource: ( id: string ) => void
}

export class Player
{
	public channels: number

	private ctx?: AudioContext

	private worklet?: AudioWorkletNode

	private connectors: Connector[]

	private sources: Record<string, SourceData>

	private sourceIndexMap: string[]

	private outputMerger?: ChannelMergerNode

	constructor( private handler: PlayerHandler )
	{
		this.bindFns()

		this.channels = 0

		this.connectors = []

		this.sources = {}

		this.sourceIndexMap = []
	}

	private bindFns()
	{
		this.init = this.init.bind( this )
		
		this.feed = this.feed.bind( this )
		
		this.stop = this.stop.bind( this )

		this.handleWorkletMessage = this.handleWorkletMessage.bind( this )

		this.startSource = this.startSource.bind( this )

		this.stopSource = this.stopSource.bind( this )

		this.startSourceChannel = this.startSourceChannel.bind( this )

		this.stopSourceChannel = this.stopSourceChannel.bind( this )
	}

	private createWorkerScriptBlob( script: string ): URL
	{
		const blob = new Blob( [ script ], { type: `text/javascript` } )

		return new URL( URL.createObjectURL( blob ), import.meta.url )
	}

	private setupCtx()
	{
		this.ctx = new ( window.AudioContext || window.webkitAudioContext )()

		this.ctx.suspend()

		const { maxChannelCount, channelCount } = this.ctx.destination

		this.channels = Math.max( maxChannelCount, channelCount )

		if ( maxChannelCount > channelCount ) this.ctx.destination.channelCount = this.channels

		this.ctx.destination.channelInterpretation = `discrete`

		this.outputMerger = this.ctx.createChannelMerger( this.channels )

		this.outputMerger.connect( this.ctx.destination )

		for ( let n = 0; n < this.channels; n += 1 )
		{
			const output = this.ctx.createGain()

			output.gain.setValueAtTime( 0, 0 )

			output.connect( this.outputMerger, 0, n )

			const input = this.ctx.createChannelMerger( 32 )

			this.connectors[ n ] = {
				input,
				output,
				count: 0
			}
	
			this.connectors[ n ].input.connect( output )
		}
	}

	private bufferMessage( sourceID: string, bufferID: string, data: Float32Array ): BufferMessage
	{
		return {
			id: sourceID,
			bufferID,
			buffer: data,
			type: MessageType.buffer
		}
	}

	private stateMessage( id: string, state: boolean ): StateMessage
	{
		return {
			id,
			state,
			type: MessageType.state
		}
	}

	private addMessage( id: string, index: number ): AddMessage
	{
		return {
			id,
			index,
			type: MessageType.add
		}
	}

	public async init(): Promise<void>
	{
		this.setupCtx()

		if ( !this.ctx ) throw Error( `No audio context` )

		await this.ctx?.audioWorklet.addModule( this.createWorkerScriptBlob( worker ).toString() )

		this.worklet = new AudioWorkletNode( this.ctx, `playerWorklet`, { numberOfInputs: 0, numberOfOutputs: 32 } )

		this.worklet.port.onmessage = event => this.handleWorkletMessage( event )

		this.ctx.resume()
	}

	private handleWorkletMessage( event: MessageEvent<WorkletMessage> )
	{
		// console.log( `got worklet message`, event )
		
		if ( event.data.type === WorkletMessageType.feed )
		{
			// Get more data for a source
			for ( const id of event.data.streams )
			{
				if ( this.sources[ id ].state !== SourceState.active ) continue

				this.handler.bufferSource( id )
			}
		}
		else if ( event.data.type === WorkletMessageType.id )
		{
			// IDs of segments currently playing
			this.handler.onPlayingBuffers( event.data.idList )
		}
		else
		{
			throw new Error( `Received unknown message type` )
		}
	}

	private addSource( id: string )
	{
		if ( !this.ctx )
		{
			this.handler.onWarning( `No audio context available.` )

			return
		}

		if ( this.sources[ id ] ) return 

		const index = this.getAvailableIndex( id )

		if ( index === undefined )
		{
			// No available connections
			this.handler.onWarning( `Can't start source, too many sources.` )

			return
		}

		const connection = this.ctx.createGain()

		connection.gain.setValueAtTime( 0, 0 )

		this.sources[ id ] = {
			channels: Array( this.channels ).fill( ChannelState.muted ),
			connection,
			index,
			state: SourceState.inactive,
			id
		}

		this.worklet?.port.postMessage( this.addMessage( id, index ) )
	}

	public feed( sourceID: string, bufferID: string, data: Float32Array ): void
	{
		this.worklet?.port.postMessage(
			this.bufferMessage( sourceID, bufferID, data ),
			[ data.buffer ] )
	}

	public startSource( id: string ): void
	{
		if ( !this.ctx )
		{
			this.handler.onWarning( `No audio context available.` )

			return
		}

		// check if source previously added
		// create if not, send add message
		this.addSource( id )

		// send active state message
		this.sources[ id ].state = SourceState.active

		this.worklet?.connect( this.sources[ id ].connection, this.sources[ id ].index, 0 )

		this.worklet?.port.postMessage( this.stateMessage( id, true ) )

		// fade in source gain
		this.sources[ id ].connection.gain.linearRampToValueAtTime(
			1.0, ( this.ctx?.currentTime ?? 0 ) + 1 )

		this.handler.onStartSource( id )
	}

	private getAvailableIndex( id: string ): number | undefined
	{
		const inactive: number[] = []

		for ( let i = 0; i < 32; i += 1 )
		{
			if ( !this.sourceIndexMap[ i ] )
			{
				this.sourceIndexMap[ i ] = id
				
				return i
			}
			else if ( this.sources[ this.sourceIndexMap[ i ] ].state === SourceState.inactive )
			{
				inactive.push( i )
			}
		}

		if ( inactive.length > 0 )
		{
			const i = inactive[ inactive.length - 1 ]

			this.sourceIndexMap[ i ] = id

			return i
		}

		return
	}

	public stopSource( sourceID: string ): void
	{
		if ( !this.sources[ sourceID ] ) return

		// stop all active channels for source
		for ( let i = 0; i < this.channels; i += 1 )
		{
			if ( this.sources[ sourceID ].channels[ i ] !== ChannelState.muted )
			{
				this.stopSourceChannel( sourceID, i )
			}
		}

		// fade out gain
		this.sources[ sourceID ].connection.gain.linearRampToValueAtTime(
			0, ( this.ctx?.currentTime ?? 0 ) + 1 )

		this.handler.onStopSource( sourceID )

		// send inactive state message
		setTimeout( () => 
		{
			this.worklet?.port.postMessage( this.stateMessage( sourceID, false ) )

			this.worklet?.disconnect( this.sources[ sourceID ].connection, this.sources[ sourceID ].index, 0 )
		}, 1000 )
	}

	public startSourceChannel( sourceID: string, channel: number ): void
	{
		// check if source previously added
		// create if not, send add message
		this.addSource( sourceID )

		// connect source gain node to merger channel node
		if ( this.sources[ sourceID ]?.channels[ channel ] !== ChannelState.muted ) return

		this.sources[ sourceID ].channels[ channel ] = ChannelState.active

		this.sources[ sourceID ].connection.connect(
			this.connectors[ channel ].input, 0, this.sources[ sourceID ].index )

		this.connectors[ channel ].count += 1

		// if only source connected, fade in merger gain
		if ( this.connectors[ channel ].count === 1 )
		{
			this.connectors[ channel ].output.gain.linearRampToValueAtTime(
				1.0, ( this.ctx?.currentTime ?? 0 ) + 1 )
		}
	}

	public stopSourceChannel( sourceID: string, channel: number ): void
	{
		if ( !this.sources[ sourceID ] ) return

		// if final source connected to channel
		// fade out channel merger
		this.fadeOutChannel( channel )
			.then( () =>
			{
				// disconnect from merger
				this.sources[ sourceID ].connection.disconnect(
					this.connectors[ channel ].input, 0, this.sources[ sourceID ].index )
			} )
	}

	private fadeOutChannel( channel: number ): Promise<boolean>
	{
		return new Promise( resolve =>
		{
			if ( this.connectors[ channel ].count === 1 )
			{
				this.connectors[ channel ].output.gain.linearRampToValueAtTime(
					0, ( this.ctx?.currentTime ?? 0 ) + 1 )

				setTimeout( () => resolve( true ) )
			}
			else
			{
				resolve( false )
			}
		} )
	}

	public sampleRate(): number
	{
		return this.ctx?.sampleRate ?? 48000
	}

	public stop(): void
	{
		this.ctx?.suspend()
	}
}