export class RingArray<T>
{
	private ring: T[]

	private nextCursor: number

	private pushCursor: number

	constructor( private size: number )
	{
		this.ring = Array( size )

		this.nextCursor = 0

		this.pushCursor = 0
	}

	public next(): T
	{
		if ( !this.hasMore() ) throw Error( `No more items` )


	}

	public hasMore(): boolean
	{
		// 
	}

	public push( item: T ): void
	{
		if ( !this.canPush() ) throw Error( `No space in ring` )

		this.ring[ this.pushCursor ] = item

		this.pushCursor = this.pushCursor === this.size - 1
			? 0
			: this.pushCursor + 1
	}

	public canPush(): boolean
	{
		// if there's numbers less than next cursor
		// if there's numbers greater than push cursor

		return this.nextCursor !== this.pushCursor 
			&& ( this.nextCursor > 0 
				|| ( this.nextCursor < this.pushCursor
					? this.pushCursor < this.size - 1
					: this.pushCursor < this.nextCursor - 1 ) )
	}
}