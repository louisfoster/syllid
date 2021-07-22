import type { Syllid } from "../build/syllid.js"

export class UI
{
	private el: HTMLElement

	private ui: {
		playBtn: HTMLButtonElement
		channelBtns: HTMLButtonElement[]
		playing: HTMLDivElement
	}

	constructor( private id: string, mount: HTMLElement, private syllid: Syllid )
	{
		this.bindFns()

		this.el = document.createElement( `div` )

		mount.appendChild( this.el )

		const playing = document.createElement( `div` )

		playing.textContent = `No data`

		this.el.appendChild( playing )

		this.ui = {
			playBtn: this.playBtn(),
			channelBtns: [],
			playing
		}

		for ( let c = 0; c < this.syllid.getChannels(); c++ )
		{
			this.ui.channelBtns[ c ] = this.btn( c )
		}
	}

	private bindFns()
	{
		this.disableBtn = this.disableBtn.bind( this )

		this.btnClick = this.btnClick.bind( this )

		this.playToggle = this.playToggle.bind( this )

		this.setSegmentPlaying = this.setSegmentPlaying.bind( this )

		this.setPlaying = this.setPlaying.bind( this )

		this.setStopped = this.setStopped.bind( this )

		this.setUnmute = this.setUnmute.bind( this )

		this.setMute = this.setMute.bind( this )

		this.setNoData = this.setNoData.bind( this )
	}

	private disableBtn( btn: HTMLButtonElement )
	{
		btn.textContent = `Loading`

		btn.dataset.state = `loading`

		btn.disabled = true
	}

	private btn( channel: number )
	{
		const b = document.createElement( `button` )

		b.textContent = `Unmute channel ${channel}`

		b.dataset.channel = `${channel}`

		b.dataset.state = `mute`

		b.addEventListener( `click`, () => this.btnClick( channel ) )

		this.el.appendChild( b )

		return b
	}

	private btnClick( channel: number )
	{
		const btn = this.ui.channelBtns[ channel ]

		const state = btn.dataset.state
		
		if ( state === `loading` )
		{
			return
		}
		else if ( state === `mute` )
		{
			this.disableBtn( btn )

			this.syllid.startStreamChannel( this.id, channel )
		}
		else
		{
			this.disableBtn( btn )

			this.syllid.stopStreamChannel( this.id, channel )
		}
	}

	private playBtn()
	{
		const b = document.createElement( `button` )

		b.textContent = `Play stream`

		b.dataset.state = `stopped`

		b.addEventListener( `click`, () => this.playToggle() )

		this.el.appendChild( b )

		return b
	}

	private playToggle()
	{
		const btn = this.ui.playBtn

		const state = btn.dataset.state

		if ( state === `loading` )
		{
			return
		}
		else if ( state === `stopped` )
		{
			this.disableBtn( btn )

			this.syllid.startStream( this.id )
		}
		else
		{
			this.disableBtn( btn )
			
			this.syllid.stopStream( this.id )
		}
	}

	public setSegmentPlaying( bufferID: string ): void
	{
		this.ui.playing.textContent = `Playing: ${bufferID}`
	}

	public setPlaying(): void
	{
		this.ui.playBtn.disabled = false
		
		this.ui.playBtn.textContent = `Stop stream`

		this.ui.playBtn.dataset.state = `playing`
	}

	public setStopped(): void
	{
		this.ui.playBtn.disabled = false

		this.ui.playBtn.textContent = `Play stream`

		this.ui.playBtn.dataset.state = `stopped`
	}

	public setUnmute( channel: number ): void
	{
		this.ui.channelBtns[ channel ].disabled = false
		
		this.ui.channelBtns[ channel ].textContent = `Mute channel ${channel}`

		this.ui.channelBtns[ channel ].dataset.state = `playing`
	}

	public setMute( channel: number ): void
	{
		this.ui.channelBtns[ channel ].disabled = false
		
		this.ui.channelBtns[ channel ].textContent = `Unmute channel ${channel}`

		this.ui.channelBtns[ channel ].dataset.state = `mute`
	}

	public setNoData(): void
	{
		this.ui.playing.textContent = `No data`
	}
}