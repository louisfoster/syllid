declare module 'audioworklet-polyfill'

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
	state: `playing` | `stopped`
	id: string
}

interface BufferMessage
{
	type: `buffer`
	buffer: Float32Array
	bufferID: string
	id: string
}

interface AddMessage
{
	type: `add`
	id: string
	index: number
}

type Message =
	| StateMessage
	| BufferMessage
	| AddMessage

interface FeedMessage
{
	type: `feed`
	streams: string[]
}

interface IDMessageItem
{
	sourceID: string
	bufferID: string
}

interface IDMessage
{
	type: `id`
	idList: IDMessageItem[]
}

interface EndMessage
{
	type: `end`
	idList: string[]
}

type WorkletMessage = FeedMessage | IDMessage | EndMessage

interface BufferData
{
	buffer: Float32Array
	id: string
}

interface SourceData
{
	id: string
	state: `playing` | `stopped`
	currentBuffer: number
	bufferCursor: number
	totalBuffers: number
	bufferState: `new` | `stale`
	requested: number
	[buffer: number]: BufferData
}