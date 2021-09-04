export class UI {
    id;
    syllid;
    onPositionChange;
    el;
    ui;
    scrubLen;
    isNormal;
    scrubPos;
    scrubbing;
    noData;
    constructor(id, mount, syllid, onPositionChange) {
        this.id = id;
        this.syllid = syllid;
        this.onPositionChange = onPositionChange;
        this.bindFns();
        this.scrubLen = 0;
        this.scrubPos = 0;
        this.el = document.createElement(`div`);
        mount.appendChild(this.el);
        const playing = document.createElement(`div`);
        playing.textContent = `No data`;
        this.el.appendChild(playing);
        this.ui = {
            playBtn: this.playBtn(),
            channelBtns: [],
            playing,
            scrubber: document.createElement(`div`)
        };
        for (let c = 0; c < this.syllid.getChannels(); c++) {
            this.ui.channelBtns[c] = this.btn(c);
        }
        this.isNormal = this.onPositionChange !== undefined;
        this.scrubbing = false;
        this.noData = false;
        if (this.isNormal)
            this.scrubber();
    }
    bindFns() {
        this.disableBtn = this.disableBtn.bind(this);
        this.btnClick = this.btnClick.bind(this);
        this.playToggle = this.playToggle.bind(this);
        this.setSegmentPlaying = this.setSegmentPlaying.bind(this);
        this.setPlaying = this.setPlaying.bind(this);
        this.setStopped = this.setStopped.bind(this);
        this.setUnmute = this.setUnmute.bind(this);
        this.setMute = this.setMute.bind(this);
        this.setNoData = this.setNoData.bind(this);
        this.updateScrub = this.updateScrub.bind(this);
        this.emitPosition = this.emitPosition.bind(this);
    }
    disableBtn(btn) {
        btn.textContent = `Loading`;
        btn.dataset.state = `loading`;
        btn.disabled = true;
    }
    btn(channel) {
        const b = document.createElement(`button`);
        b.textContent = `Unmute channel ${channel}`;
        b.dataset.channel = `${channel}`;
        b.dataset.state = `mute`;
        b.addEventListener(`click`, () => this.btnClick(channel));
        this.el.appendChild(b);
        return b;
    }
    btnClick(channel) {
        const btn = this.ui.channelBtns[channel];
        const state = btn.dataset.state;
        if (state === `loading`) {
            return;
        }
        else if (state === `mute`) {
            this.disableBtn(btn);
            this.syllid.startStreamChannel(this.id, channel);
        }
        else {
            this.disableBtn(btn);
            this.syllid.stopStreamChannel(this.id, channel);
        }
    }
    playBtn() {
        const b = document.createElement(`button`);
        b.textContent = `Play stream`;
        b.dataset.state = `stopped`;
        b.addEventListener(`click`, () => this.playToggle());
        this.el.appendChild(b);
        return b;
    }
    playToggle() {
        const btn = this.ui.playBtn;
        const state = btn.dataset.state;
        if (state === `loading`) {
            return;
        }
        else if (state === `stopped`) {
            this.disableBtn(btn);
            this.syllid.startStream(this.id);
        }
        else {
            this.disableBtn(btn);
            if (this.isNormal) {
                this.scrubbing = true;
                this.emitPosition();
            }
            else {
                this.syllid.stopStream(this.id);
            }
        }
    }
    scrubber() {
        const range = document.createElement(`input`);
        range.type = `range`;
        range.min = `0`;
        range.max = `${this.scrubLen}`;
        range.step = `1`;
        this.ui.scrubber.appendChild(range);
        range.addEventListener(`input`, () => this.updateScrub());
        range.addEventListener(`change`, () => this.emitPosition());
        const time = document.createElement(`div`);
        const now = document.createElement(`span`);
        now.textContent = this.lengthToTime(this.scrubPos);
        const total = document.createElement(`span`);
        total.textContent = ` / ${this.lengthToTime(this.scrubLen)}`;
        time.appendChild(now);
        time.appendChild(total);
        this.ui.scrubber.appendChild(time);
        this.el.appendChild(this.ui.scrubber);
    }
    updateScrub() {
        this.scrubbing = true;
        const time = this.ui.scrubber.querySelector(`div > span:first-child`);
        const scrub = this.ui.scrubber.querySelector(`input`);
        if (time && scrub) {
            this.scrubPos = parseInt(scrub.value) ?? 0;
            time.textContent = this.lengthToTime(this.scrubPos);
        }
    }
    emitPosition() {
        const scrub = this.ui.scrubber.querySelector(`input`);
        if (scrub)
            scrub.disabled = true;
        this.onPositionChange?.(this.scrubPos);
    }
    lengthToTime(time) {
        const hour = time * (1 / 3600);
        const min = (hour % 1) * 60;
        const sec = (min % 1) * 60;
        return `${this.toInterval(hour)}:${this.toInterval(min)}:${this.toInterval(sec)}`;
    }
    toInterval(value) {
        return `${`${Math.floor(value)}`.padStart(2, `0`)}`;
    }
    setSegmentPlaying(segmentID, position) {
        this.ui.playing.textContent = `Playing: ${segmentID}`;
        if (position && this.isNormal && !this.scrubbing) {
            this.scrubPos = position;
            const time = this.ui.scrubber.querySelector(`div > span:first-child`);
            if (time)
                time.textContent = this.lengthToTime(position);
            const scrub = this.ui.scrubber.querySelector(`input`);
            if (scrub)
                scrub.value = `${this.scrubPos}`;
        }
    }
    setPlaying() {
        this.ui.playBtn.disabled = false;
        this.ui.playBtn.textContent = `Stop stream`;
        this.ui.playBtn.dataset.state = `playing`;
    }
    setStopped() {
        this.ui.playBtn.disabled = false;
        this.ui.playBtn.textContent = `Play stream`;
        this.ui.playBtn.dataset.state = `stopped`;
    }
    setUnmute(channel) {
        this.ui.channelBtns[channel].disabled = false;
        this.ui.channelBtns[channel].textContent = `Mute channel ${channel}`;
        this.ui.channelBtns[channel].dataset.state = `playing`;
    }
    setMute(channel) {
        this.ui.channelBtns[channel].disabled = false;
        this.ui.channelBtns[channel].textContent = `Unmute channel ${channel}`;
        this.ui.channelBtns[channel].dataset.state = `mute`;
    }
    setNoData() {
        this.noData = true;
    }
    setHasData() {
        this.noData = false;
    }
    setRangeLength(length) {
        if (!this.isNormal)
            return;
        this.scrubLen = length;
        const scrub = this.ui.scrubber.querySelector(`input`);
        if (scrub)
            scrub.max = `${this.scrubLen}`;
        const time = this.ui.scrubber.querySelector(`div > span:last-child`);
        if (time)
            time.textContent = ` / ${this.lengthToTime(this.scrubLen)}`;
    }
    setEnded() {
        if (this.noData) {
            this.ui.playing.textContent = `No data`;
            this.syllid.stopStream(this.id);
        }
        if (this.isNormal) {
            this.syllid.stopStream(this.id);
            const scrub = this.ui.scrubber.querySelector(`input`);
            this.scrubPos = this.scrubLen;
            if (scrub) {
                scrub.value = `${this.scrubPos}`;
            }
            const time = this.ui.scrubber.querySelector(`div > span:first-child`);
            if (time)
                time.textContent = this.lengthToTime(this.scrubPos);
        }
    }
    setPosition(position) {
        if (!this.isNormal)
            return;
        this.scrubbing = false;
        const scrub = this.ui.scrubber.querySelector(`input`);
        this.scrubPos = position;
        if (scrub) {
            scrub.disabled = false;
            scrub.value = `${this.scrubPos}`;
        }
        const time = this.ui.scrubber.querySelector(`div > span:first-child`);
        if (time)
            time.textContent = this.lengthToTime(this.scrubPos);
    }
}
