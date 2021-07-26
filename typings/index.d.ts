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

interface ResetMessage
{
	type: `reset`
	id: string
}

type Message =
	| StateMessage
	| BufferMessage
	| AddMessage
	| ResetMessage

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

type WorkletMessage = FeedMessage | IDMessage

type Result = ReadableStreamDefaultReadResult<Uint8Array>

type Reader = ReadableStreamDefaultReader<Uint8Array>

/**
 * Base class
 * - is notified when to deliver new segments
 * - contains a buffer quanitity to know when to fetch more segments
 * - updates segments when buffer is low
 * - don't overbuffer
 */
interface Segment
{
	buffer: Float32Array
	id: string
}

interface Stream
{
	type: `live` | `normal` | `random`
	nextSegments(): void
	start(): void
	stop(): void
}

interface Position
{
	id: string
	position: number
}