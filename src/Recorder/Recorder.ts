import { getWindowHeight, getWindowWidth, isIframeNodeFormated, _NFMHandler } from "./utils";
import { EventType, eventWithTime, IncrementalSource } from "./types";
import MutationBuffer from "../MutationBuffer/MutationBuffer";
import NodeCaptor from "../NodeCaptor/NodeCaptor";
import WatchersHandler from "../Watchers/WatchersHandler";
import MicrophoneListener from "../Listener/MicrophoneListener";
import { IframeManager } from "../IframeManager/IframeManager";

//  ! : Handle Iframe Manager
//  ! : Handle Live Mode
class Recorder {
    private eventsTimeLine: Array<eventWithTime> = []   //  Array for storing all capture events
    private audioFile: File                             //  File for storing the recorded audio

    private nodeCaptor: NodeCaptor                       //  NodeCaptor Instance for capture node
    private mutationBuffer: MutationBuffer               //  MutationBuffer for handle mutation events
    private iframeManager: IframeManager                 //  IframeManager Instance for handle all iframe
    private lastFullCaptureEvent: eventWithTime
    private readonly fullCaptureInterval: number = 2000  //  Constant representing the delay between 2 full capture
    private wrapperAddNewEventCb = () => (p: eventWithTime) => this.addNewEvent(p)

    //  Watchers
    private watchers: WatchersHandler[] = []

    //  Listener
    private microListener: MicrophoneListener


    constructor(document: Document) {
        //  Initialize the node captor
        this.nodeCaptor = new NodeCaptor()

        //  Initialize the iframe manager
        this.iframeManager = new IframeManager(this.wrapperAddNewEventCb())

        //  Initialize the mutation buffer
        this.mutationBuffer = new MutationBuffer(this.nodeCaptor)

        //  Initialize all watcher
        this.watchers[0] = new WatchersHandler(this.nodeCaptor, this.iframeManager, document, this.wrapperAddNewEventCb)

        this.microListener = new MicrophoneListener()

        this.iframeManager.addLoadListener((iframeEl) => {
            this.watchers.push(
                new WatchersHandler(
                    this.nodeCaptor,
                    this.iframeManager,
                    iframeEl.contentDocument!,
                    this.wrapperAddNewEventCb
                )
            )
        });
    }

    /**
     * Start recording
     */
    public start() {
        console.log('start')

        //  Take the first full capture
        this.takeFullCapture(true)

        // Start Watching
        this.watchers.forEach(w => w.watch())

        this.microListener.listen()
    }

    /**
     * Stop recording
     */
    public stop() {
        console.log('stop')
        console.log(this.eventsTimeLine);

        // Take the last full capture
        this.takeFullCapture()

        // Stop Watching
        this.watchers.forEach(w => w.stop())

        // Stop Listenning
        this.audioFile = this.microListener.stop()
        console.log(URL.createObjectURL(this.audioFile))

        //  TODO: Save to a file
    }

    /**
     * Take full capture of the document
     * @param isFirst for checking if this a the first full capture
     */
    public takeFullCapture(isFirst: boolean = false) {
        // Capture meta information
        const meta: eventWithTime = {
            type: EventType.Meta,
            data: {
                href: window.location.href,
                width: getWindowWidth(),
                height: getWindowHeight(),
            },
            timestamp: Date.now(),
        }
        //  Record a meta in events time line
        this.addNewEvent(meta)

        // Check if mutation buffer is frozen
        this.watchers.forEach((w) => w.mutationBuffers.forEach((b) => b.lock())); // don't allow any mirror modifications during snapshotting

        // Take a full node capture
        const [node, DocumentNodeMap] = this.nodeCaptor.capture(
            document,
            (n) => {
                if (isIframeNodeFormated(n)) {
                    this.iframeManager.addIframe(n);
                }
            },
            (iframe, childSn) => {
                this.iframeManager.attachIframe(iframe, childSn);
            }
        )

        if (!node) return console.warn('Failed to capture the document\'s node');

        //  Capture this full capture as an event
        const evt: eventWithTime = {
            type: EventType.FullCapture,
            data: {
                node,
                initialOffset: {
                    left:
                        window.pageXOffset !== undefined
                            ? window.pageXOffset
                            : document?.documentElement.scrollLeft ||
                            document?.body?.parentElement?.scrollLeft ||
                            document?.body.scrollLeft ||
                            0,
                    top:
                        window.pageYOffset !== undefined
                            ? window.pageYOffset
                            : document?.documentElement.scrollTop ||
                            document?.body?.parentElement?.scrollTop ||
                            document?.body.scrollTop ||
                            0,
                },
            },
            timestamp: Date.now(),
        }

        // Update mirror map
        _NFMHandler.map = DocumentNodeMap

        //  Record a full node capture as an event
        this.addNewEvent(evt)

        // Check if mutation buffer was frozen unfreeze it
        this.watchers.forEach((w) => w.mutationBuffers.forEach((b) => b.unlock()));
    }

    /**
     * Save the capture event in the events time line
     */
    private addNewEvent(evt: eventWithTime): void {
        if (
            this.watchers[0].mutationBuffers[0].isFrozen() &&
            evt.type !== EventType.FullCapture &&
            !(
                evt.type == EventType.IncrementalCapture &&
                evt.data.source == IncrementalSource.Mutation
            )
        ) {
            // this is an user initiated event so first we need to apply
            // all DOM changes that have been buffering during paused state
            this.watchers.forEach((w) => w.mutationBuffers.forEach((b) => b.unfreeze()));
        }

        // TODO : Handle live mode
        //  Saved the event in the time line array
        this.eventsTimeLine.push(evt);

        //  Check if it is time to do a new full node capture
        if (evt.type === EventType.FullCapture) {
            this.lastFullCaptureEvent = evt;
        } else if (evt.type === EventType.IncrementalCapture) {
            const exceedTime = this.fullCaptureInterval && evt.timestamp - this.lastFullCaptureEvent.timestamp > this.fullCaptureInterval;
            if (exceedTime) {
                this.takeFullCapture(false);
            }
        }
    }
}

export default Recorder