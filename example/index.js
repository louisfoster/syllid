import { UI } from "./ui.js";
class App {
    syllid;
    el;
    startBtn;
    ui;
    constructor() {
        this.load = this.load.bind(this);
        this.start = this.start.bind(this);
        this.addStream = this.addStream.bind(this);
        this.el = this.getEl(`#main`);
        this.startBtn = this.getEl(`#startBtn`);
        this.startBtn.addEventListener(`click`, this.load);
        this.ui = {};
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
    start() {
        this.syllid?.init()
            .then(() => {
            const input = document.createElement(`input`);
            const btn = document.createElement(`button`);
            btn.textContent = `Add`;
            btn.addEventListener(`click`, () => {
                this.addStream(input.value);
            });
            this.el.appendChild(input);
            this.el.appendChild(btn);
        });
    }
    addStream(url) {
        if (!this.syllid)
            throw Error(`Must init syllid`);
        const id = this.getID();
        this.syllid.addLiveStream(id, url);
        const container = document.createElement(`div`);
        this.ui[id] = new UI(id, container, this.syllid);
        this.el.appendChild(container);
    }
    getID() {
        return `${Math.floor(Math.random() * 1000000)}`;
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
        for (const { sourceID, bufferID } of idList) {
            this.ui[sourceID].setSegmentPlaying(bufferID);
        }
    }
    onPlaying(id) {
        this.ui[id].setPlaying();
    }
    onStopped(id) {
        this.ui[id].setStopped();
    }
    onUnmuteChannel(streamID, channelIndex) {
        this.ui[streamID].setUnmute(channelIndex);
    }
    onMuteChannel(streamID, channelIndex) {
        this.ui[streamID].setMute(channelIndex);
    }
    onNoData(id) {
        this.ui[id].setNoData();
    }
}
App.init();
