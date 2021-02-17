import { IframeManager } from "../IframeManager/IframeManager"
import MutationBuffer from "../MutationBuffer/MutationBuffer"
import NodeCaptor from "../NodeCaptor/NodeCaptor"
import { eventWithTime } from "../Recorder/types"
import CSSRuleWatcher from "./CSSRuleWatcher"
import InputWatcher from "./InputWatcher"
import MouseInteractionWatcher from "./MouseInteractionWatcher"
import MouseMovementWatcher from "./MouseMovementWatcher"
import MutationWatcher from "./MutationWatcher"
import ScrollWatcher from "./ScrollWatcher"
import TextSelectionWatcher from "./TextSelectionWatcher"
import ViewPortWatcher from "./ViewPortWatcher"

class WatchersHandler {
    public mutationBuffers: MutationBuffer[] = []

    private scrollHandler: ScrollWatcher
    private viewPortHandler: ViewPortWatcher
    private mouseMoveHandler: MouseMovementWatcher
    private mouseInteractionHandler: MouseInteractionWatcher
    private inputHandler: InputWatcher
    private textSelectionHandler: TextSelectionWatcher
    private cssRulesHandler: CSSRuleWatcher
    private mutationHandler: MutationWatcher

    constructor(nodeCaptor: NodeCaptor, ifm: IframeManager, doc: Document, addNewEventCb: () => (p: eventWithTime) => void) {
        const mutationBuffer = new MutationBuffer(nodeCaptor)
        this.mutationBuffers.push(mutationBuffer)

        this.scrollHandler = new ScrollWatcher(addNewEventCb())
        this.viewPortHandler = new ViewPortWatcher(addNewEventCb())
        this.mouseMoveHandler = new MouseMovementWatcher(addNewEventCb())
        this.mouseInteractionHandler = new MouseInteractionWatcher(addNewEventCb())
        this.inputHandler = new InputWatcher(addNewEventCb())
        this.textSelectionHandler = new TextSelectionWatcher(addNewEventCb())
        this.cssRulesHandler = new CSSRuleWatcher(addNewEventCb())
        this.mutationHandler = new MutationWatcher(addNewEventCb(), mutationBuffer, doc, ifm)
    }

    /**
     * watch
     */
    public watch() {
        this.scrollHandler.watch()
        this.viewPortHandler.watch()
        this.mouseMoveHandler.watch()
        this.mouseInteractionHandler.watch()
        this.inputHandler.watch()
        this.textSelectionHandler.watch()
        this.cssRulesHandler.watch()
        this.mutationHandler.watch()
    }

    /**
     * stop
     */
    public stop() {
        this.scrollHandler.stop()
        this.viewPortHandler.stop()
        this.mouseMoveHandler.stop()
        this.mouseInteractionHandler.stop()
        this.inputHandler.stop()
        this.textSelectionHandler.stop()
        this.cssRulesHandler.stop()
        this.mutationHandler.stop()
    }
}

export default WatchersHandler;