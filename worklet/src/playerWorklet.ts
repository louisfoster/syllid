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

class PlayerWorklet extends AudioWorkletProcessor
{
	private handlers: Record<MessageType, ( data: Message ) => void>

	private channels: ChannelData[]

	constructor( options?: AudioWorkletNodeOptions )
	{
		super( options )

		this.bindFns()

		this.channels = Array( options?.outputChannelCount?.[ 0 ] ?? 2 )
			.fill( undefined )
			.map( () => this.newChannelItem() )

		this.port.onmessage = e => this.handleMessage( e )

		this.handlers = {
			[ MessageType.state ]: this.handleState,
			[ MessageType.buffer ]: this.handleBuffer
		}
	}

	private bindFns()
	{
		this.handleMessage = this.handleMessage.bind( this )

		this.handleState = this.handleState.bind( this )

		this.handleBuffer = this.handleBuffer.bind( this )

		this.process = this.process.bind( this )
	}

	private newChannelItem(): ChannelData
	{
		return {
			bufferCursor: 0,
			currentBuffer: 0,
			state: false,
			totalBuffers: 0
		}
	}

	private handleMessage( event: MessageEvent<Message> )
	{
		this.handlers[ event.data.type ]( event.data )
	}

	private handleState( data: Message )
	{
		// Wrong type
		if ( data.type !== MessageType.state ) return

		// Invalid data
		if ( typeof data.state !== `boolean` || typeof data.channel !== `number` ) return
		
		// No relevant channel
		if ( !this.channels[ data.channel ] ) return

		this.channels[ data.channel ].state = data.state
	}

	private handleBuffer( data: Message )
	{
		// Wrong type
		if ( data.type !== MessageType.buffer ) return

		// Invalid data
		if ( data.buffer?.buffer === undefined || typeof data.channel !== `number` ) return
		
		// No relevant channel
		if ( !this.channels[ data.channel ] ) return

		// Feeding a buffer to a stopped channel restarts it
		if ( !this.channels[ data.channel ].state )
		{
			this.channels[ data.channel ].state = true
		}
		
		this.channels[ data.channel ][ this.channels[ data.channel ].totalBuffers ] = data.buffer

		this.channels[ data.channel ].totalBuffers += 1
	}

	/**
	 * Output matrix:
	 * - First dimension is an output in a list of outputs, in this case, just 1
	 * - Second dimension is channels for the output, in this case, equal to destination channels
	 */
	process( _: Float32Array[][], outputs: Float32Array[][] ) 
	{
		// Just 1 output
		const output = outputs[ 0 ]

		const max = Math.min( this.channels.length, output.length )

		for ( let channelIndex = 0; channelIndex < max; channelIndex += 1 ) 
		{
			const channel = output[ channelIndex ]

			const ref = this.channels[ channelIndex ]

			for ( let dataIndex = 0; dataIndex < channel.length; dataIndex += 1 ) 
			{
				if ( !ref.state )
				{
					channel[ dataIndex ] = 0
				}
				else if ( !ref.totalBuffers || !ref[ ref.currentBuffer ] )
				{
					channel[ dataIndex ] = Math.random() * 0.0001
				}
				else
				{
					channel[ dataIndex ] = ref[ ref.currentBuffer ][ ref.bufferCursor ]

					ref.bufferCursor += 1

					// Reached end of buffer
					if ( ref.bufferCursor === ref[ ref.currentBuffer ].length )
					{
						// Delete used buffer
						delete ref[ ref.currentBuffer ]

						ref.bufferCursor = 0

						ref.currentBuffer += 1
					}
				}
			}
		}

		return true
	}
}

registerProcessor( `playerWorklet`, PlayerWorklet )