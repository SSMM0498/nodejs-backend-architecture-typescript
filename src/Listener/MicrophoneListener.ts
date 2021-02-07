import MicrophoneRecorder from 'mic-recorder'

class MicrophoneListener {
    private handler!: MicrophoneRecorder

    constructor() {
        this.handler = new MicrophoneRecorder({
            bitRate: 128,
            encoder: 'mp3',     // default is mp3, can be wav as well
            sampleRate: 44100,  // default is 44100, it can also be set to 16000 and 8000.
        })
    }

    public listen() {
        this.handler.start()
    }

    public pause() {
        //  TODO: implement
    }

    public capture() {
        this.handler.getAudio()

            // * : Check this for saving file
            // .then(([buffer, blob]) => {
            //     // do what ever you want with buffer and blob
            //     // Example: Create a mp3 file and play
            //     const file = new File(buffer, 'me-at-thevoice.mp3', {
            //         type: blob.type,
            //         lastModified: Date.now()
            //     });

            //     const player = new Audio(URL.createObjectURL(file));
            //     player.play();

            // }).catch((e) => {
            //     alert('We could not retrieve your message');
            //     console.log(e);
            // });
    }

    public stop() {
        this.handler.stop()
    }
}

export default MicrophoneListener