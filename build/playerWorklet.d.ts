declare const worker = "var l;(function(a){a.state=\"state\",a.buffer=\"buffer\"})(l||(l={}));var u=class extends AudioWorkletProcessor{constructor(e){super(e);this.bindFns(),this.channels=Array(e?.outputChannelCount?.[0]??2).fill(void 0).map(()=>this.newChannelItem()),this.port.onmessage=s=>this.handleMessage(s),this.handlers={[l.state]:this.handleState,[l.buffer]:this.handleBuffer}}bindFns(){this.handleMessage=this.handleMessage.bind(this),this.handleState=this.handleState.bind(this),this.handleBuffer=this.handleBuffer.bind(this),this.process=this.process.bind(this)}newChannelItem(){return{bufferCursor:0,currentBuffer:0,state:!1,totalBuffers:0}}handleMessage(e){this.handlers[e.data.type](e.data)}handleState(e){e.type===l.state&&(typeof e.state!=\"boolean\"||typeof e.channel!=\"number\"||!this.channels[e.channel]||(this.channels[e.channel].state=e.state))}getIndex(e,s){let t=0,r=-1;for(let h=0;h<e.length;h+=1){let f=s===\"start\"?h:e.length-1-h;if(e[f]===0){t=0,r=-1;continue}else{if(t===9)break;t+=1,r=r===-1?f:r}}return r}fadeBuffer(e){let s=100;for(let t=0;t<s;t+=1)e[t]=e[t]*t/s;for(let t=0;t>e.length-s;t-=1)e[t]=e[t]-e[t]*t/s}handleBuffer(e){if(e.type!==l.buffer||e.buffer?.buffer===void 0||typeof e.channel!=\"number\"||!this.channels[e.channel])return;this.channels[e.channel].state||(this.channels[e.channel].state=!0);let s=this.getIndex(e.buffer,\"start\"),t=this.getIndex(e.buffer,\"end\"),r=new Float32Array(e.buffer.subarray(s,t+1));this.fadeBuffer(r),this.channels[e.channel][this.channels[e.channel].totalBuffers]=r,this.channels[e.channel].totalBuffers+=1}process(e,s){let t=s[0],r=Math.min(this.channels.length,t.length);for(let h=0;h<r;h+=1){let f=t[h],n=this.channels[h];for(let i=0;i<f.length;i+=1)n.state?!n.totalBuffers||!n[n.currentBuffer]?f[i]=Math.random()*1e-4:(f[i]=n[n.currentBuffer][n.bufferCursor],n.bufferCursor+=1,n.bufferCursor===n[n.currentBuffer].length&&(delete n[n.currentBuffer],n.bufferCursor=0,n.currentBuffer+=1)):f[i]=0}return!0}};registerProcessor(\"playerWorklet\",u);";
export default worker;
//# sourceMappingURL=playerWorklet.d.ts.map