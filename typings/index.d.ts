interface Window
{
	AudioContext: typeof AudioContext
	webkitAudioContext: typeof AudioContext
}

declare module "worker!*" {
	const Content: string;
	export default Content;
}

interface PlaylistItem
{
	segmentID: string
	streamPublicID: string
	segmentURL: string
}
    
type Playlist = PlaylistItem[]


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

declare module 'circular_buffer_js'
{
	export class circular_buffer<T>
	{
		private _values;
		private _cursor;
		private _length;
		private _capacity;
		constructor(uCapacity: number);
		capacity(): number;
		length(): number;
		available(): number;
		empty(): boolean;
		full(): boolean;
		push(v: T): T;
		pop(): T | undefined;
		at(i: number): T | undefined;
	}
}

type Result = ReadableStreamDefaultReadResult<Uint8Array>

type Reader = ReadableStreamDefaultReader<Uint8Array>

/**
 * Base class
 * - is notified when to deliver new segments
 * - contains a buffer quanitity to know when to fetch more segments
 * - updates segments when buffer is low
 * - don't overbuffer
 */
interface Stream
{
	nextSegments(): Float32Array[]
}