export interface Stream
{
	/**
	 * Base class
	 * - is notified when to deliver new segments
	 * - contains a buffer quanitity to know when to fetch more segments
	 * - updates segments when buffer is low
	 * - don't overbuffer
	 */

	nextSegments(): Float32Array[]
}