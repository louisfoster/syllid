import type { Syllid, SyllidContextInterface } from "../build/syllid.js"

class App implements SyllidContextInterface
{
	private syllid?: Syllid

	private el: HTMLElement

	private startBtn: HTMLButtonElement

	private stream: {id: string; endpoint: string}

	constructor()
	{
		this.load = this.load.bind( this )

		this.btnClick = this.btnClick.bind( this )

		this.start = this.start.bind( this )

		this.playToggle = this.playToggle.bind( this )

		this.el = this.getEl( `#main` )

		this.startBtn = this.getEl( `#startBtn` )

		this.startBtn.addEventListener( `click`, this.load )

		this.stream = {
			id: `${Math.floor( Math.random() * 1000000 )}`,
			endpoint: new URL( `/playlist`, window.origin ).toString() }
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

	private btn( channel: number )
	{
		const b = document.createElement( `button` )

		b.textContent = `Play channel ${channel}`

		b.dataset.channel = `${channel}`

		b.dataset.state = `mute`

		b.addEventListener( `click`, this.btnClick )

		this.el.appendChild( b )
	}

	private btnClick( event: MouseEvent )
	{
		const btn = event.target as HTMLButtonElement

		const channel = parseInt( btn.dataset.channel ?? `-1`, 10 )

		const state = btn.dataset.state

		if ( state === `mute` )
		{
			this.syllid?.startStreamChannel( this.stream.id, channel )

			btn.textContent = `Mute channel ${channel}`

			btn.dataset.state = `playing`
		}
		else
		{
			this.syllid?.stopStreamChannel( this.stream.id, channel )

			btn.textContent = `Umute channel ${channel}`

			btn.dataset.state = `mute`
		}
	}

	private playBtn()
	{
		const b = document.createElement( `button` )

		b.textContent = `Play stream`

		b.dataset.state = `stopped`

		b.addEventListener( `click`, this.playToggle )

		this.el.appendChild( b )
	}

	private playToggle( event: MouseEvent )
	{
		const btn = event.target as HTMLButtonElement

		const state = btn.dataset.state

		if ( state === `stopped` )
		{
			this.syllid?.startStream( this.stream.id )

			btn.textContent = `Stop stream`

			btn.dataset.state = `playing`
		}
		else
		{
			this.syllid?.stopStream( this.stream.id )

			btn.textContent = `Play stream`

			btn.dataset.state = `stopped`
		}
	}

	private start()
	{
		this.syllid?.init()
			.then( () =>
			{
				this.syllid?.addLiveStream( this.stream.id, this.stream.endpoint )

				this.playBtn()

				for ( let c = 0; c < ( this.syllid?.getChannels() ?? 0 ); c++ )
				{
					this.btn( c )
				}
			} )
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
		console.log( idList )
	}

	public onPlaying( id: string ): void
	{
		// btn.textContent = `Stop stream`

		// btn.dataset.state = `playing`
	}

	public onStopped( id: string ): void
	{
		// btn.textContent = `Play stream`

		// btn.dataset.state = `stopped`
	}

	public onNoData( id: string ): void
	{
		//
	}
}

App.init()