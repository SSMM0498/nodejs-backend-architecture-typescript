import { NodeCaptured, DocumentNodesMap, NodeFormated } from '../NodeCaptor/types'
export abstract class Watcher {
    public callback: (p: eventWithTime) => void
    abstract watch() : void
    abstract capture(event?: Event) : void
}

export enum EventType {
    Meta,
    FullCapture,
    IncrementalCapture
}

/**
 * Event saved when all nodes states are captured
 */
export type fullCaptureEvent = {
    type: EventType.FullCapture
    data: {
        node: NodeCaptured
        initialOffset: {
            top: number
            left: number
        }
    }
}

/**
 * Event saved when user triggered a watched event
 */
export type incrementalCaptureEvent = {
    type: EventType.IncrementalCapture
    data: incrementalData
}

/**
 * Event saved when a full capture is done
 */
export type metaEvent = {
    type: EventType.Meta;
    data: {
        href: string;
        width: number;
        height: number;
    };
};

/**
 * Type of event which triggered the incremental capture
 */
export enum IncrementalSource {
    Mutation,
    MouseMove,
    MouseInteraction,
    Scroll,
    ViewportResize,
    Input,
    TouchMove,
    MediaInteraction,
    StyleSheetRule,
    TextSelection
}

export type mutationData = {
    source: IncrementalSource.Mutation
} & mutationCallbackParam

export type mousemoveData = {
    source: IncrementalSource.MouseMove | IncrementalSource.TouchMove
    positions: mousePosition[]
}

export type mouseInteractionData = {
    source: IncrementalSource.MouseInteraction
} & mouseInteractionParam

export type textSelectionData = {
    source: IncrementalSource.TextSelection,
    selection: Selection
}

export type scrollData = {
    source: IncrementalSource.Scroll
} & scrollPosition

export type viewportResizeData = {
    source: IncrementalSource.ViewportResize
} & viewportResizeDimension

export type inputData = {
    source: IncrementalSource.Input
    id: number
} & inputValue

export type mediaInteractionData = {
    source: IncrementalSource.MediaInteraction
} & mediaInteractionParam

export type styleSheetRuleData = {
    source: IncrementalSource.StyleSheetRule
} & styleSheetRuleParam

export type incrementalData =
    | mutationData
    | mousemoveData
    | mouseInteractionData
    | scrollData
    | viewportResizeData
    | inputData
    | mediaInteractionData
    | styleSheetRuleData
    | textSelectionData

export type event =
    | fullCaptureEvent
    | incrementalCaptureEvent
    | metaEvent

export type eventWithTime = event & {
    timestamp: number
    delay?: number
}
/**
 * TODO:Check them
 */
export type mutationRecord = {
    type: string
    target: Node
    oldValue: string | null
    addedNodes: NodeList
    removedNodes: NodeList
    attributeName: string | null
}

export type textNodeNewValue = {
    node: Node
    value: string | null
}

export type textMutation = {
    id: number
    value: string | null
}

export type attributeNewValue = {
    node: Node
    attributes: {
        [key: string]: string | null
    }
}

export type attributeMutation = {
    id: number
    attributes: {
        [key: string]: string | null
    }
}

export type removedNodeMutation = {
    parentId: number
    id: number
}

export type addedNodeMutation = {
    parentId: number
    // Newly recorded mutations will not have previousId any more, just for compatibility
    previousId?: number | null
    nextId: number | null
    node: NodeCaptured
}

type mutationCallbackParam = {
    texts: textMutation[]
    attributes: attributeMutation[]
    removes: removedNodeMutation[]
    adds: addedNodeMutation[]
}

export type mousePosition = {
    x: number
    y: number
    id: number
    timeOffset: number
}

export enum MouseInteractions {
    MouseUp,
    MouseDown,
    Click,
    ContextMenu,
    DblClick,
    Focus,
    Blur,
    TouchStart,
    TouchMove_Departed, // we will start a separate observer for touch move event
    TouchEnd,
}

type mouseInteractionParam = {
    type: MouseInteractions
    id: number
    x: number
    y: number
}

export type scrollPosition = {
    id: number
    x: number
    y: number
}

export type styleSheetAddRule = {
    rule: string
    index?: number
}

export type styleSheetDeleteRule = {
    index: number
}

export type styleSheetRuleParam = {
    id: number
    removes?: styleSheetDeleteRule[]
    adds?: styleSheetAddRule[]
}

export type viewportResizeDimension = {
    width: number
    height: number
}

export type inputValue = {
    text: string
    isChecked: boolean
}

export const enum MediaInteractions {
    Play,
    Pause,
}

export type mediaInteractionParam = {
    type: MediaInteractions
    id: number
}

export type NodeFormatedMapHandler = {
    map: DocumentNodesMap
    getId: (n: NodeFormated) => number
    getNode: (id: number) => NodeFormated | null
    removeNodeFromMap: (n: NodeFormated) => void
    has: (id: number) => boolean
}

export type throttleOptions = {
    leading?: boolean
    trailing?: boolean
}