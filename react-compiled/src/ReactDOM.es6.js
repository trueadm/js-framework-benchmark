"use strict";

const ELEMENT_OPEN = 1;
const ELEMENT_OPEN_DIV = 2;
const ELEMENT_OPEN_SPAN = 3;
const ELEMENT_CLOSE = 4;

const FRAGMENT_OPEN = 5;
const FRAGMENT_CLOSE = 6;

const TERNARY = 7;
const TERNARY_FROM_SLOT = 8;
const REF_CALLBACK = 9;
const LOOP_MAP = 10;
const LOOP_MAP_FROM_SLOT = 11;
const STORE_SLOT_VALUE = 12;

const COMPONENT_INSTANCE = 13;
const COMPONENT_LIFECYCLE_SHOULD_UPDATE = 14;
const COMPONENT_LIFECYCLE_WILL_MOUNT = 15;
const COMPONENT_LIFECYCLE_WILL_UPDATE = 16;
const COMPONENT_LIFECYCLE_WILL_RECEIVE_PROPS = 17;
const COMPONENT_LIFECYCLE_WILL_UNMOUNT = 18;
const COMPONENT_LIFECYCLE_DID_MOUNT = 19;
const COMPONENT_LIFECYCLE_DID_UPDATE = 20;
const COMPONENT_LIFECYCLE_DID_CATCH = 21;

const PROPERTY_STATIC_CLASS_NAME = 22;
const PROPERTY_STATIC_ID = 23;
const PROPERTY_STATIC_STYLE_CSS = 24;
const PROPERTY_DYNAMIC_CLASS_NAME = 25;
const PROPERTY_DYNAMIC_CLASS_NAME_FROM_SLOT = 26;
const PROPERTY_DYNAMIC_ID = 27;
const PROPERTY_DYNAMIC_ID_FROM_SLOT = 28;
const PROPERTY_DYNAMIC_STYLE_CSS = 29;
const PROPERTY_DYNAMIC_STYLE_CSS_FROM_SLOT = 30;

const TEXT_STATIC_CONTENT = 31;
const TEXT_DYNAMIC_CONTENT = 32;
const TEXT_STATIC_NODE = 33;
const TEXT_DYNAMIC_NODE = 34;
const TEXT_DYNAMIC_NODE_FROM_SLOT = 35;

const ATTRIBUTE_STATIC = 36;
const ATTRIBUTE_DYNAMIC = 37;
const ATTRIBUTE_DYNAMIC_FROM_SLOT = 38;

const EVENT_STATIC_BOUND = 39;
const EVENT_DYNAMIC_BOUND = 40;
const EVENT_DYNAMIC_BOUND_FROM_SLOT = 41;

const rootFibers = new Map();
const emptyObject = {};
const isArray = Array.isArray;
const updateQueue = [];

const ROOT_FIBER = 1;
const BYTECODE_FRAGMENT_FIBER = 2;

const nodeProto = Node.prototype;
const elementProto = Element.prototype;
const _nodeInsertBefore = nodeProto.insertBefore;
const _nodeRemoveChild = nodeProto.removeChild;
const _elementSetAttribute = elementProto.setAttribute;

function nodeInsertBefore(parent, newChild, refChild) {
  _nodeInsertBefore.call(parent, newChild, refChild);
}

function nodeRemoveChild(parent, child) {
  _nodeRemoveChild.call(parent, child);
}

function elementSetAttribute(el, name, value) {
  _elementSetAttribute.call(el, name, value);
}

function createFiber(flags, hostNode) {
  return {
    child: null,
    flags,
    hostNode,
    key: null,
    parent: null,
    props: null,
    ref: null,
    rootEvents: null,
    sibling: null,
    type: null,
  };
}

function createRootFiber(domNode) {
  return createFiber(ROOT_FIBER, domNode);
}

function createBytecodeFragmentFiber(mountInstructions) {
  return createFiber(BYTECODE_FRAGMENT_FIBER, mountInstructions);
}

function createDeferred(func, fiber, instance) {
  return {
    fiber,
    func,
    instance,
  };
}

function createBytecodeNode(mountInstructions, slots) {
  return {
    domNode: null,
    mountInstructions,
    slots: [],
    updateInstructions: null,
    unmountInstructions: null,
  };
}

function createBytecodeLoopNode(key, props, slots) {
  return {
    domNode: null,
    key,
    props,
    slots,
  };
}

function createBytecodeLoopNodeFromItem(
  collection,
  index,
  fiber,
  componentInstance,
  loopKeyFunc,
  loopPropsFunc,
  slots
) {
  const item = collection[index];
  const key = loopKeyFunc(componentInstance, item, index);
  let props;

  if (loopPropsFunc !== null) {
    props = loopPropsFunc(componentInstance, item, index);
  } else {
    if (componentInstance !== null) {
      props = componentInstance.props
    } else {
      props = fiber.props
    }
  }
  return createBytecodeLoopNode(key, props, slots);
}

function attachDelegatedBytecodeComponentListener(eventName, instance, rootDomNode, events) {
  rootDomNode.addEventListener(eventName, e => {
    let target = e.target;
    while (target !== null) {
      if (events.has(target)) {
        let {func, props} = events.get(target);
        func(instance, props, e);
      }
      target = target.parentNode;
    }
    flushUpdateQueue();
  });
}

function flushDeferred(deferred) {
  let i = deferred.length;
  if (i > 0) {
    let deferredEvent;
    while (i-- > 0) {
      deferredEvent = deferred[i];
      deferredEvent.func(deferredEvent.instance);
    }
  }
}

function flushUpdateQueue() {
  if (updateQueue.length !== 0) {
    while (updateQueue.length !== 0) {
      const {
        callback,
        componentBytecodeNode,
        fiber,
        instance,
        node,
        stateOrFunc,
      } = updateQueue.shift();
      if (instance !== null) {
        let state;
        if (typeof stateOrFunc === "function") {
          state = stateOrFunc(instance.state, instance.props);
        } else if (typeof stateOrFunc === "object" && stateOrFunc !== null) {
          state = stateOrFunc;
        }
        instance.state = Object.assign({}, instance.state, state);
      }
      const deferred = [];
      if (node === null) {
        updateBytecodeFragment(fiber, instance, deferred, componentBytecodeNode, null);
      } else {
        // TODO
      }
      flushDeferred(deferred);
    }
  }
}

function addUpdate(callback, fiber, instance, stateOrFunc, node, componentBytecodeNode) {
  updateQueue.push({
    callback,
    componentBytecodeNode,
    fiber,
    instance,
    node,
    stateOrFunc,
  });
}

function createSetState(instance, fiber, componentBytecodeNode) {
  return (state, callback) => {
    addUpdate(callback, fiber, instance, state, null, componentBytecodeNode);
  };
}

function mountBytecodeFragment(
  fiber,
  componentInstance,
  deferred,
  bytecodeNode,
  bytecodeLoopNode,
  insertBeforeDomNode
) {
  const instructions = bytecodeNode.mountInstructions;
  if (instructions === null) {
    return;
  }
  const instructionsLength = instructions.length;
  let props;
  let updateInstructions;
  let unmountInstructions;
  let index = 0;
  let slots;
  let domNode = null;
  let rootEvents = fiber.rootEvents;
  let element = null;
  let createInstructions = false;
  
  if (bytecodeLoopNode !== null) {
    slots = bytecodeLoopNode.slots;
    props = bytecodeLoopNode.props;
  } else {
    if (componentInstance !== null) {
      props = componentInstance.props;
    } else {
      props = fiber.props
    }
    slots = bytecodeNode.slots;
  }

  if (bytecodeNode.updateInstructions === null) {
    createInstructions = true;
    updateInstructions = [];
    unmountInstructions = [];
  }
  
  while (index < instructionsLength) {
    switch (instructions[index]) {
      // DOM elements
      case ELEMENT_OPEN_DIV:
      if (element === null) {
        element = document.createElement("div");
      }
      case ELEMENT_OPEN_SPAN:
      if (element === null) {
        element = document.createElement("span");
      }
      case ELEMENT_OPEN: {
        if (element === null) {
          const elementName = instructions[++index];
          element = document.createElement(elementName);
        }
        if (domNode === null) {
          if (bytecodeLoopNode === null) {
            bytecodeNode.domNode = element;
          } else {
            bytecodeLoopNode.domNode = element;
            domNode = bytecodeNode.domNode;
          }
        }
        element._parentNode = domNode;
        domNode = element;
        element = null;
        break;
      }
      case ELEMENT_CLOSE: {
        const parentNode = domNode._parentNode;
        if (parentNode !== null) {
          if (isArray(parentNode) === true) {
            parentNode.push(domNode);
          } else {
            if (insertBeforeDomNode !== null) {
              insertBeforeDomNode(parentNode, domNode, insertBeforeDomNode);
            } else {
              parentNode.appendChild(domNode);
            }
          }
          domNode = parentNode;
        }
        break;
      }
      
      // DOM properties
      case PROPERTY_STATIC_CLASS_NAME: {
        domNode.className = instructions[++index];
        break;
      }
      case PROPERTY_DYNAMIC_CLASS_NAME: {
        const valueFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const value = valueFunc(componentInstance, props);

        slots.push(domNode, value);
        domNode.className = value;
        if (createInstructions === true) {
          updateInstructions.push(
            PROPERTY_DYNAMIC_CLASS_NAME,
            valueFunc,
            slotStartIndex,
          );
        }
        break;
      }
      case PROPERTY_STATIC_ID: {
        domNode.id = instructions[++index];
        break;
      }
      case PROPERTY_STATIC_STYLE_CSS: {
        domNode.style.cssText = instructions[++index];
        break;
      }
      
      // DOM attributes
      case ATTRIBUTE_STATIC: {
        elementSetAttribute(domNode, instructions[++index], instructions[++index]);
        break;
      }
      
      // DOM text
      case TEXT_STATIC_CONTENT: {
        domNode.innerText = instructions[++index];
        break;
      }
      case TEXT_DYNAMIC_CONTENT: {
        const valueFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const value = valueFunc(componentInstance, props);

        domNode.innerText = value;
        slots.push(domNode, value);
        if (createInstructions === true) {
          updateInstructions.push(
            TEXT_DYNAMIC_CONTENT,
            valueFunc,
            slotStartIndex,
          );
        }
        break;
      }
      case TEXT_STATIC_NODE: {
        const textNode = document.createTextNode(instructions[++index]);
        domNode.appendChild(textNode);
        break;
      }

      // Conditions
      case TERNARY: {
        const testExpression = instructions[++index];
        const slotStartIndex = instructions[++index];
        const consequentMountBytecodes = instructions[++index];
        const alternateMountBytecodes = instructions[++index];
        const testValue = !!testExpression(componentInstance, props);
        const ternaryBytecodeNode = createBytecodeNode(testValue ? consequentMountBytecodes : alternateMountBytecodes);

        slots.push(testValue, ternaryBytecodeNode);
        ternaryBytecodeNode.domNode = domNode;
        mountBytecodeFragment(fiber, componentInstance, deferred, ternaryBytecodeNode, bytecodeLoopNode, null);
        if (createInstructions === true) {
          updateInstructions.push(
            TERNARY,
            testExpression,
            slotStartIndex
          );
        }
        break;
      }
      
      // DOM events
      case EVENT_STATIC_BOUND: {
        const eventName = instructions[++index];
        const func = instructions[++index];
        const slotStartIndex = instructions[++index];
        if (rootEvents === null) {
          rootEvents = fiber.rootEvents = new Map();
        }
        let events = rootEvents.get(eventName);
        if (events === undefined) {
          events = new Map();
          rootEvents.set(eventName, events);
          attachDelegatedBytecodeComponentListener(
            eventName,
            componentInstance,
            bytecodeNode.domNode,
            events
          );
        }
        if (bytecodeLoopNode === null) {
          events.set(domNode, {func, props: null});
        } else {
          events.set(domNode, {func, props});
        }
        slots.push(domNode);
        if (createInstructions === true) {
          unmountInstructions.push(EVENT_STATIC_BOUND, eventName, slotStartIndex);
        }
        break;
      }

      // Fragments
      case FRAGMENT_OPEN: {
        if (domNode === null) {
          domNode = [];
          if (bytecodeLoopNode === null) {
            bytecodeNode.domNode = domNode;
          } else {
            bytecodeLoopNode.domNode = domNode;
          }
        }
        break;
      }
      case FRAGMENT_CLOSE: {
        const parentNode = bytecodeNode.domNode;

        if (parentNode !== null) {
          if (isArray(parentNode) === false) {
            const fragmentLength = domNode.length;
            let i = 0;

            for (; i < fragmentLength; ++i) {
              parentNode.appendChild(domNode[i]);
            }
          }
        }
        break;
      }
      
      // Components
      case COMPONENT_INSTANCE: {
        const instanceFactory = instructions[++index];
        const slotStartIndex = instructions[++index];
        const componentInstructions = instructions[++index];
        const componentInstance = instanceFactory(props);
        const componentBytecodeNode = createBytecodeNode(componentInstructions);
        
        componentInstance.props = props;
        componentInstance.setState = createSetState(
          componentInstance,
          fiber,
          componentBytecodeNode
        );
        slots.push(componentInstance, componentBytecodeNode);
        if (createInstructions === true) {
          updateInstructions.push(COMPONENT_INSTANCE, slotStartIndex);
        }
        mountBytecodeFragment(fiber, componentInstance, deferred, componentBytecodeNode, null, null);
        if (domNode === null) {
          domNode = bytecodeNode.domNode = componentBytecodeNode.domNode;
        }
        break;
      }
      case COMPONENT_LIFECYCLE_DID_MOUNT: {
        const func = instructions[++index];
        deferred.push(createDeferred(func, fiber, componentInstance));
        break;
      }
      case COMPONENT_LIFECYCLE_DID_UPDATE: {
        const funcInstruction = instructions[++index];
        if (createInstructions === true) {
          updateInstructions.push(COMPONENT_LIFECYCLE_DID_UPDATE, funcInstruction);
        }
        break;
      }

      // Loops
      case LOOP_MAP: {
        const mapFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const loopKeyFunc = instructions[++index];
        const loopPropsFunc = instructions[++index];
        const shouldLoopUpdate = instructions[++index];
        const componentInstructions = instructions[++index];
        const collection = mapFunc(componentInstance, props);
        const loopBytecodeNode = createBytecodeNode(componentInstructions);

        slots.push(collection, loopBytecodeNode);
        loopBytecodeNode.domNode = domNode;
        if (collection.length > 0) {
          mountBytecodeFragmentLoop(
            fiber,
            componentInstance,
            deferred,
            loopBytecodeNode,
            collection,
            loopKeyFunc,
            loopPropsFunc
          );
        }
        if (createInstructions === true) {
          updateInstructions.push(
            LOOP_MAP,
            mapFunc,
            slotStartIndex,
            loopKeyFunc,
            loopPropsFunc,
            shouldLoopUpdate
          );
        }
      }
    }
    ++index;
  }
  if (createInstructions === true) {
    bytecodeNode.updateInstructions = updateInstructions;
    bytecodeNode.unmountInstructions = unmountInstructions;
  }
}

function updateBytecodeFragment(
  fiber,
  componentInstance,
  deferred,
  bytecodeNode,
  bytecodeLoopNode
) {
  const instructions = bytecodeNode.updateInstructions;
  const instructionsLength = instructions.length;
  let props;
  let index = 0;
  let slots;
  let rootEvents = fiber.rootEvents;

  if (bytecodeLoopNode !== null) {
    slots = bytecodeLoopNode.slots;
    props = bytecodeLoopNode.props;
  } else {
    if (componentInstance !== null) {
      props = componentInstance.props;
    } else {
      props = fiber.props
    }
    slots = bytecodeNode.slots;
  }

  while (index < instructionsLength) {
    switch (instructions[index]) {
      // DOM text
      case TEXT_DYNAMIC_CONTENT: {
        const valueFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const domNode = slots[slotStartIndex];
        const lastValue = slots[slotStartIndex + 1];

        let nextValue = valueFunc(componentInstance, props);
        if (lastValue !== nextValue) {
          domNode.innerText = nextValue;
        }
        slots[slotStartIndex + 1] = nextValue;
        break;
      }

      // DOM properties
      case PROPERTY_DYNAMIC_CLASS_NAME: {
        const valueFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const domNode = slots[slotStartIndex];
        const lastValue = slots[slotStartIndex + 1];

        let nextValue = valueFunc(componentInstance, props);
        if (lastValue !== nextValue) {
          domNode.className = nextValue;
        }
        slots[slotStartIndex + 1] = nextValue;
        break;
      }

      // Loops
      case LOOP_MAP: {
        const mapFunc = instructions[++index];
        const slotStartIndex = instructions[++index];
        const loopKeyFunc = instructions[++index];
        const loopPropsFunc = instructions[++index];
        const shouldLoopUpdate = instructions[++index];
        const prevCollection = slots[slotStartIndex];
        const _bytecodeNode = slots[slotStartIndex + 1];
        const nextCollection = mapFunc(componentInstance, props);
        const prevCollectionLength = prevCollection.length;
        const nextCollectionLength = nextCollection.length;
        
        if (prevCollectionLength > 0 || nextCollectionLength > 0) {
          if (prevCollectionLength === 0 && nextCollectionLength > 0) {
            mountBytecodeFragmentLoop(
              fiber,
              componentInstance,
              deferred,
              _bytecodeNode,
              nextCollection,
              loopKeyFunc,
              loopPropsFunc
            );
          } else if (nextCollectionLength === 0 && prevCollectionLength > 0) {
            unmountBytecodeFragmentLoop(fiber, componentInstance, deferred, _bytecodeNode);
          } else {
            updateBytecodeFragmentLoop(
              fiber,
              componentInstance,
              deferred,
              _bytecodeNode,
              prevCollection,
              nextCollection,
              loopKeyFunc,
              loopPropsFunc,
              shouldLoopUpdate
            );
          }
        }
        slots[slotStartIndex] = nextCollection;
        break;
      }

      // Components
      case COMPONENT_LIFECYCLE_DID_UPDATE: {
        const func = instructions[++index];
        deferred.push(createDeferred(func, fiber, componentInstance));
        break;
      }
    }
    ++index;
  }
}

function unmountBytecodeFragment(
  fiber,
  componentInstance,
  deferred,
  bytecodeNode,
  bytecodeLoopNode
) {
  const instructions = bytecodeNode.unmountInstructions;
  const instructionsLength = instructions.length;
  let props;
  let index = 0;
  let slots;
  let rootEvents = fiber.rootEvents;

  if (bytecodeLoopNode !== null) {
    slots = bytecodeLoopNode.slots;
    props = bytecodeLoopNode.props;
  } else {
    if (componentInstance !== null) {
      props = componentInstance.props;
    } else {
      props = fiber.props
    }
    slots = bytecodeNode.slots;
  }

  while (index < instructionsLength) {
    switch (instructions[index]) {
      // DOM events
      case EVENT_STATIC_BOUND: {
        const eventName = instructions[++index];
        const slotStartIndex = instructions[++index];
        const domNode = slots[slotStartIndex];
        let events = rootEvents.get(eventName);
        if (events !== undefined) {
          events.delete(domNode);
        }
        break;
      }
    }
    ++index;
  }
}

function mountBytecodeFragmentLoop(
  fiber,
  componentInstance,
  deferred,
  bytecodeNode,
  collection,
  loopKeyFunc,
  loopPropsFunc
) {
  const loopSlots = bytecodeNode.slots;
  const collectionLength = collection.length;
  let bytecodeLoopNodesAlreadyCreated = false;
  let bytecodeLoopNode;
  let key;
  let props;
  let item;
  let i = 0;

  if (loopSlots.length > 0) {
    bytecodeLoopNodesAlreadyCreated = true;
  }
  for (; i < collectionLength; ++i) {
    if (bytecodeLoopNodesAlreadyCreated === false) {
      item = collection[i];
      key = loopKeyFunc(componentInstance, item, i);
      if (loopPropsFunc !== null) {
        props = loopPropsFunc(componentInstance, item, i);
      } else {
        if (componentInstance !== null) {
          props = componentInstance.props
        } else {
          props = fiber.props
        }
      }
      bytecodeLoopNode = createBytecodeLoopNode(key, props, []);
      
      loopSlots.push(bytecodeLoopNode);
    } else {
      bytecodeLoopNode = loopSlots[i];
    }
    mountBytecodeFragment(fiber, componentInstance, deferred, bytecodeNode, bytecodeLoopNode, null);
  }
}

function unmountBytecodeLoopNode(fiber, componentInstance, deferred, bytecodeNode, node) {
  nodeRemoveChild(bytecodeNode.domNode, node.domNode);
  unmountBytecodeFragment(
    fiber,
    componentInstance,
    deferred,
    bytecodeNode,
    node
  );
}

function updateBytecodeLoopNode(fiber, componentInstance, deferred, bytecodeNode, a, b, shouldLoopUpdate) {
  b.domNode = a.domNode;
  b.slots = a.slots;
  if (shouldLoopUpdate === null || shouldLoopUpdate(componentInstance, a.props, b.props)) {
    updateBytecodeFragment(fiber, componentInstance, deferred, bytecodeNode, b);
  }
}

function unmountBytecodeFragmentLoop(fiber, componentInstance, deferred, bytecodeNode) {
  bytecodeNode.domNode.textContent = "";
  let i = 0;
  const slotsLength = bytecodeNode.slots.length;
  for (; i < slotsLength; ++i) {
    unmountBytecodeFragment(
      fiber,
      componentInstance,
      deferred,
      bytecodeNode,
      bytecodeNode.slots[i]
    );
  }
  bytecodeNode.slots = [];
}

function updateBytecodeFragmentLoop(
  fiber,
  componentInstance,
  deferred,
  bytecodeNode,
  prevCollection,
  nextCollection,
  loopKeyFunc,
  loopPropsFunc,
  shouldLoopUpdate
) {
  const a = bytecodeNode.slots;
  const b = new Array(nextCollection.length);
  const parentDomNode = bytecodeNode.domNode;
  let aStart = 0;
  let bStart = 0;
  let aEnd = a.length - 1;
  let bEnd = b.length - 1;
  let aStartNode = a[aStart];
  let bStartNode = b[bStart] = createBytecodeLoopNodeFromItem(
    nextCollection,
    0,
    fiber,
    componentInstance,
    loopKeyFunc,
    loopPropsFunc,
    null
  );
  let aEndNode = a[aEnd];
  let bEndNode = b[bEnd] = createBytecodeLoopNodeFromItem(
    nextCollection,
    bEnd,
    fiber,
    componentInstance,
    loopKeyFunc,
    loopPropsFunc,
    null
  );
  let i;
  let j;
  let k;
  let next;
  let aNode;
  let bNode;

  // Step 1
  outer: while (true) {
    // Sync nodes with the same key at the beginning.
    while (aStartNode.key === bStartNode.key) {
      updateBytecodeLoopNode(
        fiber,
        componentInstance,
        deferred,
        bytecodeNode,
        aStartNode,
        bStartNode,
        shouldLoopUpdate
      );
      ++aStart;
      ++bStart;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aStartNode = a[aStart];
      bStartNode = b[bStart] = createBytecodeLoopNodeFromItem(
        nextCollection,
        bStart,
        fiber,
        componentInstance,
        loopKeyFunc,
        loopPropsFunc,
        null
      );
    }
    while (aEndNode.key === bEndNode.key) {
      updateBytecodeLoopNode(
        fiber,
        componentInstance,
        deferred,
        bytecodeNode,
        aEndNode,
        bEndNode,
        shouldLoopUpdate
      );
      --aEnd;
      --bEnd;
      if (aStart > aEnd || bStart > bEnd) {
        break outer;
      }
      aEndNode = a[aEnd];
      bEndNode = b[bEnd] = createBytecodeLoopNodeFromItem(
        nextCollection,
        bEnd,
        fiber,
        componentInstance,
        loopKeyFunc,
        loopPropsFunc,
        null
      );
    }
    break;
  }

  if (aStart > aEnd) {
    // All nodes from a are synced, insert the rest from b.
    if (bStart <= bEnd) {
      k = bEnd + 1;
      next = k < b.length ? b[k].domNode : null;
      do {
        b[bStart] = bStartNode = createBytecodeLoopNodeFromItem(
          nextCollection,
          bStart,
          fiber,
          componentInstance,
          loopKeyFunc,
          loopPropsFunc,
          []
        );
        bStart++;
        mountBytecodeFragment(fiber, componentInstance, deferred, bytecodeNode, bStartNode, next);
      } while (bStart <= bEnd);
    }
  } else if (bStart > bEnd) {
    // All nodes from b are synced, remove the rest from a.
    do {
      unmountBytecodeLoopNode(fiber, componentInstance, deferred, bytecodeNode, a[aStart++]);
    } while (aStart <= aEnd);
    // Step 2
  } else {
    const aLength = aEnd - aStart + 1;
    const bLength = bEnd - bStart + 1;
    const aNullable = a; // will be removed by js optimizing compilers.
    // Mark all nodes as inserted.
    const sources = new Array(bLength);
    for (i = 0; i < bLength; ++i) {
      sources[i] = -1;
    }
    // When lists are small, perform a linear search instead of building an index.
    // 0 - unitialized (lazy initialization)
    // 1 - linear search
    // 2 - hashmap search
    let matchKeyMode = 0;

    let bPositionKeyStart = bStart;
    // When pos === 2147483647, it means that one of the nodes in the wrong position.
    let pos = 0;
    let synced = 0;

    let keyIndex;

    for (i = aStart; i <= aEnd && synced < bLength; ++i) {
      aNode = a[i];

      if (aNode.key !== null) {
        if (matchKeyMode === 0) {
          if ((aLength | bLength) < 32 || bLength < 4) {
            matchKeyMode = 1;
          } else {
            matchKeyMode = 2;
            // Build an index that maps keys to their locations in the new children list.
            for (j = bStart; j <= bEnd; ++j) {
              bNode = b[j] = createBytecodeLoopNodeFromItem(
                nextCollection,
                j,
                fiber,
                componentInstance,
                loopKeyFunc,
                loopPropsFunc,
                null
              );
              if (bNode.key !== null) {
                if (keyIndex === undefined) {
                  keyIndex = new Map;
                }
                keyIndex.set(bNode.key, j);
              }
            }
          }
        }
        if (matchKeyMode === 1) {
          for (j = bStart; j <= bEnd; ++j) {
            k = j - bStart;
            if (sources[k] === -1) {
              bNode = b[j];
              if (bNode.key !== null && aNode.key === bNode.key) {
                pos = (pos > j) ? 2147483647 : j;
                ++synced;
                sources[k] = i;
                aNullable[i] = null;
                updateBytecodeLoopNode(
                  fiber,
                  componentInstance,
                  deferred,
                  bytecodeNode,
                  aNode,
                  bNode,
                  shouldLoopUpdate
                );
                break;
              }
            }
          }
        } else if (keyIndex !== undefined) {
          j = keyIndex.get(aNode.key);
          if (j !== undefined) {
            pos = (pos > j) ? 2147483647 : j;
            ++synced;
            bNode = b[j];
            sources[j - bStart] = i;
            aNullable[i] = null;
            updateBytecodeLoopNode(
              fiber,
              componentInstance,
              deferred,
              bytecodeNode,
              aNode,
              bNode,
              shouldLoopUpdate
            );
          }
        }
      } else {
        // TODO
      }
    }

    if (aLength === a.length && synced === 0) {
      unmountBytecodeFragmentLoop(fiber, componentInstance, deferred, bytecodeNode);
      mountBytecodeFragmentLoop(
        fiber,
        componentInstance,
        deferred,
        bytecodeNode,
        nextCollection,
        loopKeyFunc,
        loopPropsFunc
      );
      return;
    } else {
      i = aLength - synced;
      while (i > 0) {
        aNode = aNullable[aStart++];
        if (aNode !== null) {
          unmountBytecodeLoopNode(fiber, componentInstance, deferred, bytecodeNode, aNode);
          i--;
        }
      }
      
      // Step 3
      if (pos === 2147483647) {
        const seq = lis(sources);
        j = seq.length - 1;
        k = b.length;
        for (i = bLength - 1; i >= 0; --i) {
          if (sources[i] === -1) {
            pos = i + bStart;
            bNode = b[pos++];
            next = pos < k ? b[pos].domNode : null;
            // TODO
            // vNodeRenderIntoAndAttach(parent, next, bNode, context, syncFlags);
          } else {
            if (j < 0 || i !== seq[j]) {
              pos = i + bStart;
              bNode = b[pos++];
              next = pos < k ? b[pos].domNode : null;
              nodeInsertBefore(parentDomNode, bNode.domNode, next);
            } else {
              --j;
            }
          }
        }
      } else if (synced !== bLength) {
        k = b.length;
        for (i = bLength - 1; i >= 0; --i) {
          if (sources[i] === -1) {
            pos = i + bStart;
            bNode = b[pos++];
            next = pos < k ? b[pos].domNode : null;
            // TODO
            // vNodeRenderIntoAndAttach(parent, next, bNode, context, syncFlags);
          }
        }
      }
    }
  }
  // update the slots
  bytecodeNode.slots = b;
}

/**
 * Slightly modified Longest Increased Subsequence algorithm, it ignores items that have -1 value, they're representing
 * new items.
 *
 * http://en.wikipedia.org/wiki/Longest_increasing_subsequence
 *
 * @param a Array of numbers.
 * @returns Longest increasing subsequence.
 */
function lis(a) {
  const p = a.slice();
  const result = [];
  result.push(0);
  let u;
  let v;

  for (let i = 0, il = a.length; i < il; ++i) {
    if (a[i] === -1) {
      continue;
    }

    const j = result[result.length - 1];
    if (a[j] < a[i]) {
      p[i] = j;
      result.push(i);
      continue;
    }

    u = 0;
    v = result.length - 1;

    while (u < v) {
      const c = ((u + v) / 2) | 0;
      if (a[result[c]] < a[i]) {
        u = c + 1;
      } else {
        v = c;
      }
    }

    if (a[i] < a[result[u]]) {
      if (u > 0) {
        p[i] = result[u - 1];
      }
      result[u] = i;
    }
  }

  u = result.length;
  v = result[u - 1];

  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }

  return result;
}

function isBytecodeFragment(type) {
  return typeof type === "object" && isArray(type) === true;
}

function isReactElement(node) {
  return typeof node === "object" && typeof node.$$typeof === "symbol";
}

function mountFiber(children, fiber, deferred) {
  const hostNode = fiber.hostNode;
  let childFiber = fiber.child;
  
  if (isReactElement(children)) {
    const props = children.props || emptyObject;
    const type = children.type;
    
    if (isBytecodeFragment(type)) {
      if (childFiber === null) {
        const bytecodeNode = createBytecodeNode(type);
        
        childFiber = fiber.child = createBytecodeFragmentFiber(bytecodeNode);
        childFiber.props = props;
        mountBytecodeFragment(childFiber, null, deferred, bytecodeNode, null, null);
        hostNode.appendChild(bytecodeNode.domNode);
      }
    }
  }
}

function updateFiber(children, fiber, deferred) {
  const hostNode = fiber.hostNode;
  let childFiber = fiber.child;
  
  if (isReactElement(children)) {
    const props = children.props || emptyObject;
    const type = children.type;

    if (isBytecodeFragment(type)) {
      if (childFiber === null) {
        // TODO
      } else if (childFiber.flags === BYTECODE_FRAGMENT_FIBER) {
        const bytecodeNode = childFiber.hostNode;

        childFiber.props = props;
        updateBytecodeFragment(childFiber, null, deferred, bytecodeNode, null);
      } else {
        // TODO
      }
    }
  }
}

function unmountFiber(fiber) {
  
}

function render(children, domNode) {
  const deferred = [];
  let fiber = rootFibers.get(domNode);
  
  if (fiber === undefined && domNode !== null) {
    fiber = createRootFiber(domNode);
    rootFibers.set(domNode, fiber);
    mountFiber(children, fiber, deferred)
  } else if (fiber !== undefined) {
    if (domNode === null) {
      unmountFiber(fiber, deferred);
    } else {
      updateFiber(children, fiber, deferred);
    }
  }
  flushDeferred(deferred);
  flushUpdateQueue();
}

module.exports = {
  render,
};