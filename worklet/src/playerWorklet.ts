enum MessageType
{
	state = `state`,
	buffer = `buffer`,
	add = `add`
}

enum EmitType
{
	feed = `feed`,
	id = `id`,
	end = `end`
}

enum BufferState
{
	new = `new`,
	stale = `stale`
}

enum PlayingState
{
	stopped = `stopped`,
	playing = `playing`
}

class PlayerWorklet extends AudioWorkletProcessor
{
	private handlers: Record<MessageType, ( data: Message ) => void>

	private sources: SourceData[]

	private sourceKey: Record<string, number>

	private playingBuffer: IDMessageItem[]

	private endBuffer: string[]

	private requestBuffer: string[]

	constructor( options?: AudioWorkletNodeOptions )
	{
		super( options )

		this.bindFns()

		this.sources = []

		this.sourceKey = {}

		this.playingBuffer = []

		this.endBuffer = []

		this.requestBuffer = []

		this.port.onmessage = e => this.handleMessage( e )

		this.handlers = {
			[ MessageType.state ]: this.handleState,
			[ MessageType.buffer ]: this.handleBuffer,
			[ MessageType.add ]: this.handleAdd
		}
	}

	private bindFns()
	{
		this.handleMessage = this.handleMessage.bind( this )

		this.handleState = this.handleState.bind( this )

		this.handleBuffer = this.handleBuffer.bind( this )

		this.handleAdd = this.handleAdd.bind( this )

		this.bufferKey = this.bufferKey.bind( this )

		this.process = this.process.bind( this )

		this.onEndProcess = this.onEndProcess.bind( this )

		this.isPlaying = this.isPlaying.bind( this )
	}

	private newStreamItem( id: string ): SourceData
	{
		return {
			id,
			bufferCursor: 0,
			currentBuffer: 0,
			state: PlayingState.stopped,
			requested: 0,
			totalBuffers: 0,
			bufferState: BufferState.new
		}
	}

	private handleMessage( event: MessageEvent<Message> )
	{
		this.handlers[ event.data.type ]( event.data )
	}

	private handleAdd( data: Message )
	{
		if ( data.type !== MessageType.add ) return

		if ( typeof data.id !== `string` ) return

		// Stream exists
		if ( this.sourceKey[ data.id ] !== undefined ) return

		this.sourceKey[ data.id ] = data.index

		this.sources[ data.index ] = this.newStreamItem( data.id )
	}

	private handleState( data: Message )
	{
		// Wrong type
		if ( data.type !== MessageType.state ) return

		// Invalid data
		if ( typeof data.state !== `string` || typeof data.id !== `string` ) return
		
		// No relevant stream
		const index = this.sourceKey[ data.id ]

		if ( index === undefined ) return

		this.sources[ index ].state = data.state

		this.sources[ index ].requested = 0
	}

	private handleBuffer( data: Message )
	{
		// Wrong type
		if ( data.type !== MessageType.buffer ) return

		// Invalid data
		if ( data.buffer?.buffer === undefined
			|| typeof data.id !== `string`
			|| typeof data.bufferID !== `string` ) return
		
		let index = this.sourceKey[ data.id ]

		if ( index === undefined )
		{
			index = this.sources.length
			
			this.sourceKey[ data.id ] = index
			
			this.sources.push( this.newStreamItem( data.id ) )
		}

		const key = this.bufferKey( index )

		this.sources[ index ][ key ] = {
			buffer: data.buffer,
			id: data.bufferID
		}

		this.sources[ index ].requested = 0
	}

	private bufferKey( index: number )
	{
		const number = this.sources[ index ].totalBuffers

		this.sources[ index ].totalBuffers += 1

		return number
	}

	private isPlaying( sourceIndex: number )
	{
		return this.sources[ sourceIndex ].state === PlayingState.playing
	}

	// Clean up tasks
	private onEndProcess()
	{
		// Emit IDs of buffers that commenced during this epoch
		if ( this.playingBuffer.length > 0 )
			this.port.postMessage( this.emitBufferIDs( this.playingBuffer ) )

		// Emit IDs of sources that have no more data after this epoch
		if ( this.endBuffer.length > 0 )
			this.port.postMessage( this.emitEndIDs( this.endBuffer ) )

		this.requestBuffer.length = 0

		const now = Date.now()

		for ( let i = 0; i < this.sources.length; i += 1 ) 
		{
			// this is here so anything buffering can finish before being cleared
			if ( !this.isPlaying( i ) && this.sources[ i ].totalBuffers > 0 )
			{
				// Reset channel if stopped
				this.sources[ i ] = this.newStreamItem( this.sources[ i ].id )
			}

			const buffersRemaining = this.sources[ i ].totalBuffers - this.sources[ i ].currentBuffer

			const timeElapsed = now - this.sources[ i ].requested

			const hasRequestedMoreBuffers = !!this.sources[ i ].requested

			if ( this.isPlaying( i ) && !hasRequestedMoreBuffers && buffersRemaining < 4 )
			{
				this.sources[ i ].requested = now

				this.requestBuffer.push( this.sources[ i ].id )
			}
			else if ( hasRequestedMoreBuffers && timeElapsed > 1000 )
			{
				this.sources[ i ].requested = 0
			}
		}

		// Emit source IDs that require more buffer data
		if ( this.requestBuffer.length > 0 )
			this.port.postMessage( this.emitFeedRequest( this.requestBuffer ) )
	}

	private emitBufferIDs( idList: IDMessageItem[] ): IDMessage
	{
		return {
			idList,
			type: EmitType.id
		}
	}

	private emitFeedRequest( streams: string[] ): FeedMessage
	{
		return {
			streams,
			type: EmitType.feed
		}
	}

	private emitEndIDs( idList: string[] ): EndMessage
	{
		return {
			idList,
			type: EmitType.end
		}
	}

	/**
	 * Output matrix:
	 * - First dimension is an output in a list of outputs, in this case, just 1
	 * - Second dimension is channels for the output, in this case, equal to destination channels
	 */
	process( _: Float32Array[][], outputs: Float32Array[][] ) 
	{
		try
		{
			this.playingBuffer.length = 0

			this.endBuffer.length = 0

			for ( let s = 0; s < this.sources.length; s += 1 )
			{		
				const source = this.sources[ s ]

				if ( !source || !this.isPlaying( s ) ) continue

				const output = outputs[ s ]

				if ( !output ) continue

				const channelBuffer = output[ 0 ]

				if ( !this.isPlaying( s ) // not playing
					|| !source.totalBuffers // no buffers
					|| !source[ source.currentBuffer ] // no current buffer
				)
				{
					channelBuffer.fill( 0 )

					continue
				}

				for ( let dataIndex = 0; dataIndex < channelBuffer.length; dataIndex += 1 ) 
				{
					// this is here in case state changes, buffer is cleared, 
					// or no more new buffers in the midst of copying data
					if ( !this.isPlaying( s ) || !source.totalBuffers || !source[ source.currentBuffer ] )
					{
						channelBuffer.fill( 0, dataIndex )

						break
					}

					if ( source.bufferState === BufferState.new )
					{
						this.playingBuffer.push( {
							bufferID: source[ source.currentBuffer ].id,
							sourceID: source.id
						} )

						source.bufferState = BufferState.stale
					}

					channelBuffer[ dataIndex ] = source[ source.currentBuffer ].buffer[ source.bufferCursor ]

					let faded = false

					// If we are < 2000 from end of buffer, add beginning of new buffer
					if ( source.bufferCursor > source[ source.currentBuffer ].buffer.length - 2000
						&& source[ source.currentBuffer + 1 ] )
					{
						const i = 2000 - ( source[ source.currentBuffer ].buffer.length - source.bufferCursor )

						channelBuffer[ dataIndex ] += source[ source.currentBuffer + 1 ].buffer[ i ]

						faded = true
					}

					source.bufferCursor += 1

					// Reached end of buffer
					if ( source.bufferCursor === source[ source.currentBuffer ].buffer.length )
					{
						// Delete used buffer
						delete source[ source.currentBuffer ]

						source.bufferCursor = faded ? 2000 : 0

						source.currentBuffer += 1

						source.bufferState = BufferState.new

						if ( !source[ source.currentBuffer ] ) this.endBuffer.push( source.id )
					}
				}
			}

			this.onEndProcess()
		}
		catch ( e )
		{
			console.warn( `Audio Worklet Errored:`, e )
		}

		return true
	}
}

registerProcessor( `playerWorklet`, PlayerWorklet )