import { UI } from "./ui.js";
var StreamType;
(function (StreamType) {
    StreamType["live"] = "live";
    StreamType["random"] = "random";
})(StreamType || (StreamType = {}));
class App {
    syllid;
    el;
    startBtn;
    ui;
    input;
    constructor() {
        this.load = this.load.bind(this);
        this.start = this.start.bind(this);
        this.addStream = this.addStream.bind(this);
        this.el = this.getEl(`#main`);
        this.startBtn = this.getEl(`#startBtn`);
        this.startBtn.addEventListener(`click`, this.load);
        this.ui = {};
        this.input = document.createElement(`input`);
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
            this.el.appendChild(this.input);
            Object.values(StreamType).forEach(type => this.btn(type));
        });
    }
    btn(type) {
        const btn = document.createElement(`button`);
        btn.textContent = `Add ${type}`;
        btn.addEventListener(`click`, () => {
            this.addStream(this.input.value, type);
        });
        this.el.appendChild(btn);
    }
    addStream(url, type) {
        if (!this.syllid)
            throw Error(`Must init syllid`);
        const id = this.getID();
        switch (type) {
            case StreamType.live:
                this.syllid.addLiveStream(id, url);
                break;
            case StreamType.random:
                this.syllid.addRandomStream(id, url);
        }
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
