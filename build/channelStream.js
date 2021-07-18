export class ChannelStream {
  constructor(index, handler, provider) {
    this.index = index;
    this.handler = handler;
    this.provider = provider;
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
    this.processURLs = this.processURLs.bind(this);
    this.errors = 0;
    this.count = 0;
    this.fileList = [];
    this.idList = [];
    this.location = ``;
    this.processedIndex = 0;
    this.running = false;
    this.freshLocation = false;
    this.interval = 0;
    this.fetchInterval = 0;
  }
  addQuery(url) {
    const _url = new URL(url);
    if (!_url.searchParams.has(`start`))
      _url.searchParams.append(`start`, `random`);
    return _url.toString();
  }
  segmentInterval(time) {
    this.interval = window.setTimeout(() => this.getSegments(), Math.min(8e3, time));
  }
  getSegments() {
    this.provider.getSegmentURLs(this).then((count) => {
      if (count > 0) {
        this.errors = 0;
        this.segmentInterval(Math.max(0, count * 1e3 - 1e3));
      } else {
        this.errors += 1;
        this.segmentInterval(Math.round(Math.exp(this.errors) * 50));
      }
    }).catch((e) => {
      this.errors += 1;
      this.handler.onWarning(e);
      this.segmentInterval(Math.round(Math.exp(this.errors) * 100));
    });
  }
  start() {
    if (this.running)
      return;
    this.running = true;
    this.getSegments();
    this.processURLs();
    this.fetchInterval = window.setInterval(() => this.processURLs(), 1e3);
  }
  processURLs() {
    if (this.fileList.length === this.processedIndex)
      return;
    const fetchList = this.fileList.slice(this.processedIndex);
    this.processedIndex += fetchList.length;
    this.handler.bufferSegmentData(fetchList, this.index);
  }
  stop() {
    clearInterval(this.interval);
    clearInterval(this.fetchInterval);
    this.fileList = [];
    this.idList = [];
    this.processedIndex = 0;
    this.location = ``;
    this.count = 0;
    this.running = false;
  }
  getPath(location) {
    this.setFreshLocation(location);
    this.count = this.count - 1;
    return this.idList.length > 0 ? new URL(`${this.idList[this.idList.length - 1]}`, this.location).toString() : !this.location ? this.location : this.addQuery(this.location);
  }
  setFreshLocation(location) {
    if (this.count > 0)
      return;
    this.count = this.provider.randomInt(0, 5);
    this.location = location;
    this.idList = [];
    this.freshLocation = true;
  }
  setStaleLocation(location) {
    if (this.freshLocation) {
      this.location = location;
      this.freshLocation = false;
    }
  }
  async addItemsFromPlaylist(playlist) {
    for (const {segmentID, segmentURL} of playlist) {
      this.fileList.push(segmentURL);
      this.idList.push(segmentID);
    }
    return playlist.length;
  }
}
