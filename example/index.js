class App {
    syllid;
    el;
    startBtn;
    stream;
    constructor() {
        this.load = this.load.bind(this);
        this.btnClick = this.btnClick.bind(this);
        this.start = this.start.bind(this);
        this.playToggle = this.playToggle.bind(this);
        this.el = this.getEl(`#main`);
        this.startBtn = this.getEl(`#startBtn`);
        this.startBtn.addEventListener(`click`, this.load);
        this.stream = {
            id: `${Math.floor(Math.random() * 1000000)}`,
            endpoint: new URL(`/playlist`, window.origin).toString()
        };
    }
    existsOrThrow(item, selector) {
        if (!item) {
            throw Error(`No item ${selector}`);
        }
        return item;
    }
    getEl(selector) {
        return this.existsOrThrow(document.querySelector(selector), selector);
    }
    btn(channel) {
        const b = document.createElement(`button`);
        b.textContent = `Play channel ${channel}`;
        b.dataset.channel = `${channel}`;
        b.dataset.state = `mute`;
        b.addEventListener(`click`, this.btnClick);
        this.el.appendChild(b);
    }
    btnClick(event) {
        const btn = event.target;
        const channel = parseInt(btn.dataset.channel ?? `-1`, 10);
        const state = btn.dataset.state;
        if (state === `mute`) {
            this.syllid?.startStreamChannel(this.stream.id, channel);
            btn.textContent = `Mute channel ${channel}`;
            btn.dataset.state = `playing`;
        }
        else {
            this.syllid?.stopStreamChannel(this.stream.id, channel);
            btn.textContent = `Umute channel ${channel}`;
            btn.dataset.state = `mute`;
        }
    }
    playBtn() {
        const b = document.createElement(`button`);
        b.textContent = `Play stream`;
        b.dataset.state = `stopped`;
        b.addEventListener(`click`, this.playToggle);
        this.el.appendChild(b);
    }
    playToggle(event) {
        const btn = event.target;
        const state = btn.dataset.state;
        if (state === `stopped`) {
            this.syllid?.startStream(this.stream.id);
            btn.textContent = `Stop stream`;
            btn.dataset.state = `playing`;
        }
        else {
            this.syllid?.stopStream(this.stream.id);
            btn.textContent = `Play stream`;
            btn.dataset.state = `stopped`;
        }
    }
    start() {
        this.syllid?.init()
            .then(() => {
            this.syllid?.addLiveStream(this.stream.id, this.stream.endpoint);
            this.playBtn();
            for (let c = 0; c < (this.syllid?.getChannels() ?? 0); c++) {
                this.btn(c);
            }
        });
    }
    load() {
        if (!this.syllid) {
            import(`../build/syllid.js`).then(({ Syllid }) => {
                this.syllid = new Syllid(this);
                this.start();
            });
        }
        else {
            this.start();
        }
        this.startBtn.remove();
    }
    static init() {
        new App();
    }
    onWarning(message) {
        console.warn(message);
    }
    onFailure(error) {
        console.error(error);
    }
    onPlayingSegments(idList) {
        console.log(idList);
    }
    onPlaying(id) {
        // btn.textContent = `Stop stream`
        // btn.dataset.state = `playing`
    }
    onStopped(id) {
        // btn.textContent = `Play stream`
        // btn.dataset.state = `stopped`
    }
    onNoData(id) {
        //
    }
}
App.init();
export {};
