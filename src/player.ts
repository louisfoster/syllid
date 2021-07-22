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
	index: number
}

interface Connector
{
	inputs: GainNode[]
	count: number
}

export interface PlayerHandler
{
	bufferSource: ( id: string ) => void

	onPlayingBuffers: ( ids: IDMessageItem[] ) => void

	onWarning: ( message: string | Error | ErrorEvent ) => void

	onStartSource: ( id: string ) => void

	onStopSource: ( id: string ) => void

	onStartSourceChannel: ( id: string, channel: number ) => void

	onStopSourceChannel: ( id: string, channel: number ) => void
}

export class Player
{
	public channels: number

	private ctx?: AudioContext

	/**
	 * Outputs audio from buffers,
	 * each buffer source === node output
	 * All outputs have 1 channel
	 */
	private worklet?: AudioWorkletNode

	/**
	 * Each output channel has a connector
	 * A connector has a n inputs.
	 * A connector connects to the output merger.
	 */
	private connectors: Connector[]

	/**
	 * A source contains reference to a buffer
	 */
	private sources: Record<string, SourceData>

	/**
	 * Source index map associates the source ID
	 * with its index in the worklet node outputs
	 */
	private sourceIndexMap: string[]

	/**
	 * The output merger connects the connectors
	 * to the destination channels.
	 */
	private outputMerger?: ChannelMergerNode

	private streamCount: number

	constructor( private handler: PlayerHandler )
	{
		this.bindFns()

		this.channels = 0

		this.streamCount = 10

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

		this.outputMerger = this.ctx.createChannelMerger( this.channels )

		this.outputMerger.connect( this.ctx.destination )
		
		for ( let n = 0; n < this.channels; n += 1 )
		{
			const inputs: GainNode[] = []

			for ( let i = 0; i < this.streamCount; i += 1 )
			{
				inputs.push( this.ctx.createGain() )

				inputs[ i ].connect( this.outputMerger, 0, n )

				inputs[ i ].gain.setValueAtTime( 0, 0 )
			}

			this.connectors[ n ] = {
				inputs,
				count: 0
			}
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

		await this.ctx.audioWorklet.addModule( this.createWorkerScriptBlob( worker ).toString() )

		this.worklet = new AudioWorkletNode(
			this.ctx, 
			`playerWorklet`, 
			{ 
				numberOfInputs: 0,
				numberOfOutputs: this.streamCount,
				outputChannelCount: Array( this.streamCount ).fill( 1 ) 
			} )

		this.worklet.port.onmessage = event => this.handleWorkletMessage( event )

		// For each connector, attach the worklet
		for ( let c = 0; c < this.connectors.length; c += 1 )
		{
			// For each output
			for ( let i = 0; i < this.streamCount; i += 1 )
			{
				this.worklet.connect( this.connectors[ c ].inputs[ i ], i, 0 )
			}
		}

		this.ctx.resume()
	}

	private handleWorkletMessage( event: MessageEvent<WorkletMessage> )
	{
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
			index,
			state: SourceState.inactive,
			id
		}

		this.worklet?.port.postMessage( this.addMessage( id, index ) )
	}

	private getAvailableIndex( id: string ): number | undefined
	{
		const inactive: number[] = []

		for ( let i = 0; i < this.streamCount; i += 1 )
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

		this.worklet?.port.postMessage( this.stateMessage( id, true ) )

		this.handler.onStartSource( id )
	}

	public stopSource( sourceID: string ): void
	{
		if ( !this.sources[ sourceID ] ) return

		let activeChannel = false

		// stop all active channels for source
		for ( let i = 0; i < this.channels; i += 1 )
		{
			if ( this.sources[ sourceID ].channels[ i ] !== ChannelState.muted )
			{
				this.stopSourceChannel( sourceID, i, () => activeChannel = true )
			}
		}

		if ( !activeChannel ) this.handler.onStopSource( sourceID )

		// send inactive state message
		setTimeout( () => 
		{
			this.worklet?.port.postMessage( this.stateMessage( sourceID, false ) )

			if ( activeChannel ) this.handler.onStopSource( sourceID )
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

		this.connectors[ channel ].inputs[ this.sources[ sourceID ].index ].gain.linearRampToValueAtTime(
			1.0, ( this.ctx?.currentTime ?? 0 ) + 1 )

		this.handler.onStartSourceChannel( sourceID, channel )

		setTimeout( () => 
		{
			this.connectors[ channel ].count += 1
		}, 1000 )
	}

	public stopSourceChannel( sourceID: string, channel: number, onActive?: () => void ): void
	{
		if ( !this.sources[ sourceID ] ) return

		if ( this.sources[ sourceID ].channels[ channel ] !== ChannelState.active ) return

		onActive?.()

		this.sources[ sourceID ].channels[ channel ] = ChannelState.muted

		this.connectors[ channel ].inputs[ this.sources[ sourceID ].index ].gain.linearRampToValueAtTime(
			0.0, ( this.ctx?.currentTime ?? 0 ) + 1 )

		setTimeout( () => 
		{
			this.connectors[ channel ].count -= 1

			this.handler.onStopSourceChannel( sourceID, channel )
		}, 1000 )
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