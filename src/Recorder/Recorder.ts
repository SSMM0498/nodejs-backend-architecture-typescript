import { getWindowHeight, getWindowWidth, _NFHandler } from "./utils";
import { EventType, eventWithTime, IncrementalSource } from "./types";
import MutationBuffer from "../MutationBuffer/MutationBuffer";
import NodeCaptor from "../NodeCaptor/NodeCaptor";

import ScrollWatcher from "../Watchers/ScrollWatcher";
import MouseMovementWatcher from "../Watchers/MouseMovementWatcher";
import MouseInteractionWatcher from "../Watchers/MouseInteractionWatcher";
import InputWatcher from "../Watchers/InputWatcher";
import CSSRuleWatcher from "../Watchers/CSSRuleWatcher";
import MutationWatcher from "../Watchers/MutationWatcher";
import TextSelectionWatcher from "../Watchers/TextSelectionWatcher";

class Recorder {
    public eventsTimeLine: Array<eventWithTime> = []    //  Array for storing all capture events
    public nodeCaptor: NodeCaptor                       //  NodeCaptor Instance for capture node
    public mutationBuffer: MutationBuffer;              //  MutationBuffer for handle mutation events
    private lastFullCaptureEvent: eventWithTime
    private readonly fullCaptureInterval: number = 2000 //  Constant representing the delay between 2 full capture

    constructor(document: Document) {
        this.nodeCaptor = new NodeCaptor(document)
    }

    /**
     * Start recording
     */
    public start() {
        console.log('start');
        const addNewEventCb = () => (p: eventWithTime) => this.addNewEvent(p)

        //  Initialize the mutation buffer
        this.mutationBuffer = new MutationBuffer();

        //  Take the first full capture
        this.takeFullCapture(true)

        // Initialize all watcher
        const scrollHandler = new ScrollWatcher(addNewEventCb())
        const mouseMoveHandler = new MouseMovementWatcher(addNewEventCb())
        const mouseInteractionHandler = new MouseInteractionWatcher(addNewEventCb())
        const inputHandler = new InputWatcher(addNewEventCb())
        const textSelectionHandler = new TextSelectionWatcher(addNewEventCb())
        const cssRulesHandler = new CSSRuleWatcher(addNewEventCb())
        const mutationHandler = new MutationWatcher(addNewEventCb(), this.mutationBuffer);
        
        // Start Watching
        scrollHandler.watch()
        mouseMoveHandler.watch()
        mouseInteractionHandler.watch()
        inputHandler.watch()
        textSelectionHandler.watch()
        cssRulesHandler.watch()
        mutationHandler.watch()
    }

    /**
     * Stop recording
     */
    // TODO: implement stop function
    public stop() {
        console.log('stop')
        console.log(this.eventsTimeLine);
    }

    /**
     * Take full capture of the document
     * @param isFirst for checking if this a the first full capture
     */
    public takeFullCapture(isFirst: boolean) {
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
        let wasFrozen = this.mutationBuffer.isFrozen();
        this.mutationBuffer.freeze(); // don't allow any mirror modifications during snapshotting

        // Take a full node capture
        const [node, DocumentNodeMap] = this.nodeCaptor.capture();
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
        _NFHandler.map = DocumentNodeMap

        //  Record a full node capture as an event
        this.addNewEvent(evt)

        // Check if mutation buffer was frozen unfreeze it
        if (!wasFrozen) {
            this.mutationBuffer.emit(); // emit anything queued up now
            this.mutationBuffer.unfreeze();
        }
    }

    /**
     * Save the capture event in the events time line
     */
    private addNewEvent(evt: eventWithTime): void {
        if (
            this.mutationBuffer.isFrozen() &&
            evt.type !== EventType.FullCapture &&
            !(
                evt.type == EventType.IncrementalCapture &&
                evt.data.source == IncrementalSource.Mutation
            )
        ) {
            // this is an user initiated event so first we need to apply
            // all DOM changes that have been buffering during paused state
            this.mutationBuffer.emit();
            this.mutationBuffer.unfreeze();
        }

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