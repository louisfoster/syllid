import { UI } from "./ui.js";
var StreamType;
(function (StreamType) {
    StreamType["live"] = "live";
    StreamType["random"] = "random";
    StreamType["normal"] = "normal";
})(StreamType || (StreamType = {}));
class App {
    syllid;
    el;
    startBtn;
    ui;
    input;
    positions;
    constructor() {
        this.load = this.load.bind(this);
        this.start = this.start.bind(this);
        this.addStream = this.addStream.bind(this);
        this.el = this.getEl(`#main`);
        this.startBtn = this.getEl(`#startBtn`);
        this.startBtn.addEventListener(`click`, this.load);
        this.ui = {};
        this.input = document.createElement(`input`);
        this.positions = {};
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
                break;
            case StreamType.normal:
                this.syllid.addNormalStream(id, url);
                this.positions[id] = {};
        }
        const container = document.createElement(`div`);
        this.ui[id] = new UI(id, container, this.syllid, type === StreamType.normal
            ? position => this.syllid?.setPosition(id, position)
            : undefined);
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
            this.ui[sourceID].setSegmentPlaying(bufferID, this.positions[sourceID]?.[bufferID]);
        }
    }
    onBuffering() {
        // not handled
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
    onHasData(id) {
        this.ui[id].setHasData();
    }
    onLengthUpdate(id, length) {
        this.ui[id].setRangeLength(length);
    }
    onSegmentPositions(streamID, positions) {
        for (const { id, position } of positions) {
            this.positions[streamID][id] = position;
        }
    }
    onEndStreams(ids) {
        for (const id of ids) {
            this.ui[id].setEnded();
        }
    }
    onSetPosition(id, position) {
        this.ui[id].setPosition(position);
    }
}
App.init();
