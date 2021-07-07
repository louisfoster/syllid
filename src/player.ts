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
	buffer = `buffer`
}

enum ChannelState
{
	muted,
	active
}

enum StreamState
{
	inactive,
	buffering,
	active
}

interface StreamData
{
	stream: Stream
	channels: ChannelState[]
	state: StreamState
}

export class Player
{
	public channels: number

	private ctx?: AudioContext

	private worklet?: AudioWorkletNode

	private splitter?: ChannelSplitterNode

	private merger?: ChannelMergerNode

	private gain: GainNode[]

	private streams: StreamData[]

	constructor()
	{
		this.bindFns()

		this.channels = 0

		this.gain = []

		this.streams = []
	}

	private bindFns()
	{
		this.init = this.init.bind( this )
		
		this.feed = this.feed.bind( this )
		
		this.stop = this.stop.bind( this )
		
		this.stopChannel = this.stopChannel.bind( this )
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

		this.merger = this.ctx.createChannelMerger( this.channels )

		this.merger.connect( this.ctx.destination )

		this.splitter = this.ctx.createChannelSplitter( this.channels )

		for ( let n = 0; n < this.channels; n += 1 )
		{
			this.gain[ n ] = this.ctx.createGain()

			this.gain[ n ].gain.setValueAtTime( 0, 0 )

			this.gain[ n ].connect( this.merger, 0, n )

			this.splitter.connect( this.gain[ n ], n, 0 )
		}
	}

	private bufferMessage( channel: number, data: Float32Array ): BufferMessage
	{
		return {
			buffer: data,
			channel,
			type: MessageType.buffer
		}
	}

	private stateMessage( channel: number ): StateMessage
	{
		return {
			channel,
			state: false,
			type: MessageType.state
		}
	}

	public async init(): Promise<void>
	{
		this.setupCtx()

		if ( !this.ctx ) throw Error( `No audio context` )

		await this.ctx?.audioWorklet.addModule( this.createWorkerScriptBlob( worker ).toString() )

		this.worklet = new AudioWorkletNode( this.ctx, `playerWorklet`, { outputChannelCount: [ this.channels ] } )

		if ( this.splitter ) this.worklet.connect( this.splitter )

		this.ctx.resume()
	}

	public sampleRate(): number
	{
		return this.ctx?.sampleRate ?? 48000
	}

	public stop(): void
	{
		this.ctx?.suspend()
	}

	public feed( channel: number, data: Float32Array ): void
	{
		this.worklet?.port.postMessage( this.bufferMessage( channel, data ), [ data.buffer ] )

		if ( !this.channelState[ channel ] )
		{
			this.channelState[ channel ] = true

			this.gain[ channel ].gain.linearRampToValueAtTime( 1.0, ( this.ctx?.currentTime ?? 0 ) + 1 )
		}
	}

	public stopChannel( channel: number ): void
	{
		if ( !this.channelState[ channel ] ) return
		
		this.channelState[ channel ] = false

		this.gain[ channel ].gain.linearRampToValueAtTime( 0, ( this.ctx?.currentTime ?? 0 ) + 1 )

		setTimeout( () => this.worklet?.port.postMessage( this.stateMessage( channel ) ), 1500 )
	}
}