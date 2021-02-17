/**
 * Represents the type of the node if it'a HTML Element or Text Node
 */
export enum NodeType {
    Document,
    DocumentType,
    Element,
    Text
}

export type documentNode = {
    type: NodeType.Document;
    childNodes: NodeCaptured[];
};

export type documentTypeNode = {
    type: NodeType.DocumentType;
    name: string;
    publicId: string;
    systemId: string;
};

/**
 * Represents an array of all the usefull attributes found in the node
 */
export type attributes = {
    [key: string]: string | number | boolean
}

/**
 * Represents the storing format for a HTML Element
 */
export type ElementNode = {
    type: NodeType.Element
    elementName: string
    attributes: attributes
    childNodes: NodeCaptured[]
}

/**
 * Represents the text node or css rules
 */
export type TextNode = {
    type: NodeType.Text
    textContent: string
    isCSSRules: boolean
}

/**
 * Represents a captured node
 */
export type NodeCaptured = (
    {nodeId: number} &
    {originId?: number} &
    (| ElementNode | TextNode | documentNode | documentTypeNode)
)

/**
 * Represents a merge with the captured node and the node document
 */
export interface NodeFormated extends Node {
    _cnode: NodeCaptured
}

/**
 * Represents a map storing all the found node
 */
export type DocumentNodesMap = {
    [key: number]: NodeFormated
}