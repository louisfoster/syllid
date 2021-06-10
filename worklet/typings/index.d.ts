interface AudioWorkletProcessor
{
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>
	): boolean;
}

declare var AudioWorkletProcessor: {
	prototype: AudioWorkletProcessor;
	new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare function registerProcessor(
	name: string,
	processorCtor: (new (
		options?: AudioWorkletNodeOptions
	) => AudioWorkletProcessor) & {
		parameterDescriptors?: AudioParamDescriptor[];
	}
): undefined;


interface StateMessage
{
	type: `state`
	state: boolean
	channel: number
}

interface BufferMessage
{
	type: `buffer`
	buffer: Float32Array
	channel: number
}

type Message = StateMessage | BufferMessage

interface ChannelData
{
	state: boolean
	currentBuffer: number
	bufferCursor: number
	totalBuffers: number
	[buffer: number]: Float32Array
}