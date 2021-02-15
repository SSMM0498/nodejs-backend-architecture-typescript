class MicrophoneListener {
    private stopped = false;
    private paused = false;
    private reco: MediaRecorder;
    private options: MediaRecorderOptions = { mimeType: 'audio/webm' };
    private recordedChunks: BlobPart[] = [];
    private audioBlob: Blob;

    constructor() {
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
            this.recordedChunks.push(e.data);
        }

        if (this.stopped === false) {
            this.stop()
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

    public stop() {
        this.audioBlob = new Blob(this.recordedChunks);
        this.stopped = true;
        this.capture()
    }

    private capture() {
        return this.audioBlob

        // * : Check this for saving file
        //     const file = new File(buffer, 'me-at-thevoice.mp3', {
        //         type: blob.type,
        //         lastModified: Date.now()
        //     });
    }
}

export default MicrophoneListener