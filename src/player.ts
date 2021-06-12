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

export class Player
{
	public channels: number

	private ctx: AudioContext

	private worklet?: AudioWorkletNode

	constructor()
	{
		this.bindFns()

		this.ctx = new ( window.AudioContext || window.webkitAudioContext )()

		this.ctx.suspend()

		const { maxChannelCount, channelCount } = this.ctx.destination

		this.channels = Math.max( maxChannelCount, channelCount )

		if ( maxChannelCount > channelCount ) this.ctx.destination.channelCount = this.channels

		this.ctx.destination.channelInterpretation = `discrete`
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

	public feed( channel: number, data: Float32Array ): void
	{
		this.worklet?.port.postMessage( this.bufferMessage( channel, data ), [ data.buffer ] )
	}

	private bufferMessage( channel: number, data: Float32Array ): BufferMessage
	{
		return {
			buffer: data,
			channel,
			type: MessageType.buffer
		}
	}

	public stopChannel( channel: number ): void
	{
		this.worklet?.port.postMessage( this.stateMessage( channel ) )
	}

	private stateMessage( channel: number ): StateMessage
	{
		return {
			channel,
			state: false,
			type: MessageType.state
		}
	}

	public stop(): void
	{
		this.ctx.suspend()
	}

	public async init(): Promise<void>
	{
		await this.ctx.audioWorklet.addModule( this.createWorkerScriptBlob( worker ).toString() )

		this.worklet = new AudioWorkletNode( this.ctx, `playerWorklet`, { outputChannelCount: [ this.channels ] } )

		this.worklet.connect( this.ctx.destination )

		this.ctx.resume()
	}
}