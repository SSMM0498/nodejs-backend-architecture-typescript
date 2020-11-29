import { eventWithTime } from "./types";
import ScrollWatcher from "../Watchers/ScrollWatcher";
import MouseMovementWatcher from "../Watchers/MouseMovementWatcher";
import MouseInteractionWatcher from "../Watchers/MouseInteractionWatcher";
import InputWatcher from "../Watchers/InputWatcher";
import CSSRuleWatcher from "../Watchers/CSSRuleWatcher";

class Recorder {
    public eventsTimeLine: Array<eventWithTime>

    constructor() {  }

    /**
     * startRecording
     */
    public startRecording() {
        // Initialize all watcher
        const scrollHandler = new ScrollWatcher(this.addNewEvent())
        const mouseMoveHandler = new MouseMovementWatcher(this.addNewEvent())
        const mouseInteractionHandler = new MouseInteractionWatcher(this.addNewEvent())
        const inputHandler = new InputWatcher(this.addNewEvent())
        const cssRulesHandler = new CSSRuleWatcher(this.addNewEvent())
        
        // Start Watching
        scrollHandler.watch()
        mouseMoveHandler.watch()
        mouseInteractionHandler.watch()
        inputHandler.watch()
        cssRulesHandler.watch()
    }

    /**
     * Save the capture event in the events time line
     */
    private addNewEvent(): (p: eventWithTime) => void {
        return (evt: eventWithTime) => this.eventsTimeLine.push(evt);
    }
}

export default Recorder