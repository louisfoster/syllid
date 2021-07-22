import type { IDMessageItem, Syllid, SyllidContextInterface } from "../build/syllid.js"
import { UI } from "./ui.js"

enum StreamType
{
	live = `live`,
	random = `random`
}

class App implements SyllidContextInterface
{
	private syllid?: Syllid

	private el: HTMLElement

	private startBtn: HTMLButtonElement

	private ui: Record<string, UI>

	private input: HTMLInputElement

	constructor()
	{
		this.load = this.load.bind( this )

		this.start = this.start.bind( this )

		this.addStream = this.addStream.bind( this )

		this.el = this.getEl( `#main` )

		this.startBtn = this.getEl( `#startBtn` )

		this.startBtn.addEventListener( `click`, this.load )

		this.ui = {}

		this.input = document.createElement( `input` )

	}

	private existsOrThrow<T>( item: unknown, selector: string )
	{
		if ( !item )
		{
			throw Error( `No item ${selector}` )
		}

		return item as T
	}

	private getEl<T extends HTMLElement>( selector: string ): T
	{
		return this.existsOrThrow( document.querySelector( selector ), selector )
	}

	private start()
	{
		this.syllid?.init()
			.then( () =>
			{
				this.el.appendChild( this.input )

				Object.values( StreamType ).forEach( type => this.btn( type ) )
			} )
	}

	private btn( type: StreamType )
	{
		const btn = document.createElement( `button` )

		btn.textContent = `Add ${type}`

		btn.addEventListener( `click`, () => 
		{
			this.addStream( this.input.value, type )
		} )

		this.el.appendChild( btn )
	}

	private addStream( url: string, type: StreamType )
	{
		if ( !this.syllid ) throw Error( `Must init syllid` )

		const id = this.getID()

		switch( type )
		{
			case StreamType.live:
				this.syllid.addLiveStream( id, url )

				break

			case StreamType.random:
				this.syllid.addRandomStream( id, url )
		}

		const container = document.createElement( `div` )

		this.ui[ id ] = new UI( id,  container, this.syllid )

		this.el.appendChild( container )
	}

	private getID()
	{
		return `${Math.floor( Math.random() * 1000000 )}`
	}

	private load()
	{
		if ( !this.syllid )
		{
			import( `../build/syllid.js` ).then( ( { Syllid } ) =>
			{
				this.syllid = new Syllid( this )

				this.start()
			} )
		}
		else
		{
			this.start()
		}
		
		this.startBtn.remove()
	}

	public static init()
	{
		new App()
	}

	public onWarning( message: string | Error | ErrorEvent ): void
	{
		console.warn( message )
	}

	public onFailure( error: string | Error | ErrorEvent ): void
	{
		console.error( error )
	}

	public onPlayingSegments( idList: IDMessageItem[] ): void
	{
		for ( const { sourceID, bufferID } of idList )
		{
			this.ui[ sourceID ].setSegmentPlaying( bufferID )
		}
	}

	public onPlaying( id: string ): void
	{
		this.ui[ id ].setPlaying()
	}

	public onStopped( id: string ): void
	{
		this.ui[ id ].setStopped()
	}

	public onUnmuteChannel( streamID: string, channelIndex: number ): void
	{
		this.ui[ streamID ].setUnmute( channelIndex )
	}

	public onMuteChannel( streamID: string, channelIndex: number ): void
	{
		this.ui[ streamID ].setMute( channelIndex )
	}

	public onNoData( id: string ): void
	{
		this.ui[ id ].setNoData()
	}
}

App.init()