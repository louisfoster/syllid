import type { Syllid, SyllidContextInterface } from "../build/syllid.js"
import { UI } from "./ui.js"

class App implements SyllidContextInterface
{
	private syllid?: Syllid

	private el: HTMLElement

	private startBtn: HTMLButtonElement

	private ui: Record<string, UI>

	constructor()
	{
		this.load = this.load.bind( this )

		this.start = this.start.bind( this )

		this.addStream = this.addStream.bind( this )

		this.el = this.getEl( `#main` )

		this.startBtn = this.getEl( `#startBtn` )

		this.startBtn.addEventListener( `click`, this.load )

		this.ui = {}
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
				const input = document.createElement( `input` )

				const btn = document.createElement( `button` )

				btn.textContent = `Add`

				btn.addEventListener( `click`, () => 
				{
					this.addStream( input.value )
				} )

				this.el.appendChild( input )

				this.el.appendChild( btn )
			} )
	}

	private addStream( url: string )
	{
		if ( !this.syllid ) throw Error( `Must init syllid` )

		const id = this.getID()

		this.syllid.addLiveStream( id, url )

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

	public onPlayingSegments( idList: any[] ): void
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