class MicrophoneListener {
    private stopped = false;
    private paused = false;
    private reco: MediaRecorder;
    private options: MediaRecorderOptions = { mimeType: 'audio/webm' };
    private recordedAudioBlob: BlobPart[] = [];

    constructor() {
        this.handleSuccess = this.handleSuccess.bind(this)
        this.handleData = this.handleData.bind(this)
        this.stop = this.stop.bind(this)
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(this.handleSuccess);
    }

    private handleSuccess(stream: MediaStream) {
        this.reco = new MediaRecorder(stream, this.options);

        this.reco.addEventListener('dataavailable', this.handleData)

        this.reco.addEventListener('stop', this.stop)
    }

    private handleData(e: BlobEvent) {
        if (e.data.size > 0) {
            this.recordedAudioBlob.push(e.data);
        }
    }

    public listen() {
        this.reco.start(1000)
    }

    public pause() {
        this.reco.pause();
        this.paused = true
    }

    public resume() {
        if (this.paused === true) { this.reco.resume(); this.paused = false; }
    }

    public stop() : File {
        this.stopped = true
        if(this.reco.state === 'recording') this.reco.stop()
        return this.capture()
    }

    private capture() {
        return new File(this.recordedAudioBlob, 'test.wav', {
            type: this.options.mimeType,
            lastModified: Date.now()
        });
    }
}

export default MicrophoneListener