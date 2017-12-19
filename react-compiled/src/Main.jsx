'use strict';

var React = require('react');

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

const { run, runLots, add, update, swapRows, deleteRow } = require('./utils')
var startTime;
var lastMeasure;
var startMeasure = function (name) {
    startTime = performance.now();
    lastMeasure = name;
}
var stopMeasure = function () {
    var last = lastMeasure;
    if (lastMeasure) {
        window.setTimeout(function () {
            lastMeasure = null;
            var stop = performance.now();
            var duration = 0;
            console.log(last + " took " + (stop - startTime));
        }, 0);
    }
}

function Main_run(instance) {
	startMeasure("run");
	const { id } = instance.state;
	const obj = run(id);
	instance.setState({ data: obj.data, id: obj.id, selected: undefined });
}

function Main_runLots(instance) {
	startMeasure("runLots");
	const { id } = instance.state;
	const obj = runLots(id);
	instance.setState({ data: obj.data, id: obj.id, selected: undefined });
}

function Main_clear(instance) {
	startMeasure("clear");
	instance.setState({ data: [], selected: undefined });
}

function Main_add(instance) {
	startMeasure("add");
	const { id } = instance.state;
	const obj = add(id, instance.state.data);
	instance.setState({ data: obj.data, id: obj.id});
}

function Main_update(instance) {
	startMeasure("update");
	const data = update(instance.state.data);
	instance.setState({ data: data });
}

function Main_swapRows(instance) {
	startMeasure("swapRows");
	const data = swapRows(instance.state.data);
	instance.setState({ data: data });
}

function Main_componentDidUpdate(instance) {
	stopMeasure();
}

function Main_componentDidMount(instance) {
	stopMeasure();
}

function Main_LoopItem_key(instance, item) {
	return item.id;
}

function Main_LoopItem_props(instance, item) {
	return {
		data: item,
		styleClass: item.id === instance.state.selected ? 'danger' : ''
	};
}

function Main_LoopItem_shouldLoopUpdate(instance, lastProps, nextProps) {
	return lastProps.data !== nextProps.data || lastProps.styleClass !== nextProps.styleClass;
}

function Main_LoopItem_select(instance, props) {
	startMeasure("select");
	instance.setState({ selected: props.data.id });
}

function Main_LoopItem_delete(instance, props) {
	startMeasure("delete");
	const data = deleteRow(instance.state.data, props.data.id);
	instance.setState({ data: data });
}

function Main_createInstance(props) {
	return {
		props,
		state: {
			data: [],
			selected: undefined,
			id: 1
		},
		start: 0,
		setState: null,
	}
}

function Main_map_label(instance, props) {
	return props.data.label;
}

function Main_map_id(instance, props) {
	return props.data.id;
}

function Main_state_data(instance) {
	return instance.state.data;
}

function Main_LoopItem_styleClass(instance, props) {
	return props.styleClass;
}

export const Main = [
	COMPONENT_INSTANCE, Main_createInstance, 0, [
		COMPONENT_LIFECYCLE_DID_MOUNT, Main_componentDidMount,
		COMPONENT_LIFECYCLE_DID_UPDATE, Main_componentDidUpdate,
		ELEMENT_OPEN_DIV,
			PROPERTY_STATIC_CLASS_NAME, "container",
			ELEMENT_OPEN_DIV,
				PROPERTY_STATIC_CLASS_NAME, "jumbotron",
				ELEMENT_OPEN_DIV,
					PROPERTY_STATIC_CLASS_NAME, "row",
					ELEMENT_OPEN_DIV,
						PROPERTY_STATIC_CLASS_NAME, "col-md-6",
						ELEMENT_OPEN, "h1",
							TEXT_STATIC_CONTENT, "React compiled keyed",
						ELEMENT_CLOSE,
					ELEMENT_CLOSE,
					ELEMENT_OPEN_DIV,
						PROPERTY_STATIC_CLASS_NAME, "col-md-6",
						ELEMENT_OPEN_DIV,
							PROPERTY_STATIC_CLASS_NAME, "row",
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "run",
									EVENT_STATIC_BOUND, "click", Main_run, 0,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Create 1,000 rows",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "runlots",
									EVENT_STATIC_BOUND, "click", Main_runLots, 1,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Create 10,000 rows",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "add",
									EVENT_STATIC_BOUND, "click", Main_add, 2,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Append 1,000 rows",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "update",
									EVENT_STATIC_BOUND, "click", Main_update, 3,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Update every 10th row",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "clear",
									EVENT_STATIC_BOUND, "click", Main_clear, 4,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Clear",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN_DIV,
								PROPERTY_STATIC_CLASS_NAME, "col-sm-6 smallpad",
								ELEMENT_OPEN, "button",
									PROPERTY_STATIC_CLASS_NAME, "btn btn-primary btn-block",
									PROPERTY_STATIC_ID, "swaprows",
									EVENT_STATIC_BOUND, "click", Main_swapRows, 5,
									ATTRIBUTE_STATIC, "type", "button",
									TEXT_STATIC_CONTENT, "Swap Rows",
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
						ELEMENT_CLOSE,
					ELEMENT_CLOSE,
				ELEMENT_CLOSE,
			ELEMENT_CLOSE,
			ELEMENT_OPEN, "table",
				PROPERTY_STATIC_CLASS_NAME, "table table-hover table-striped test-data",
				ELEMENT_OPEN, "tbody",
					LOOP_MAP, Main_state_data, 6, Main_LoopItem_key, Main_LoopItem_props, Main_LoopItem_shouldLoopUpdate, [
						ELEMENT_OPEN, "tr",
							PROPERTY_DYNAMIC_CLASS_NAME, Main_LoopItem_styleClass, 0,
							ELEMENT_OPEN, "td",
								PROPERTY_STATIC_CLASS_NAME, "col-md-1",
								TEXT_DYNAMIC_CONTENT, Main_map_id, 2,
							ELEMENT_CLOSE,
							ELEMENT_OPEN, "td",
								PROPERTY_STATIC_CLASS_NAME, "col-md-4",
								ELEMENT_OPEN, "a",
									EVENT_STATIC_BOUND, "click", Main_LoopItem_select, 4,
									TEXT_DYNAMIC_CONTENT, Main_map_label, 5,
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN, "td",
								PROPERTY_STATIC_CLASS_NAME, "col-md-1",
								ELEMENT_OPEN, "a",
									EVENT_STATIC_BOUND, "click", Main_LoopItem_delete, 7,
									ELEMENT_OPEN_SPAN,
										PROPERTY_STATIC_CLASS_NAME, "glyphicon glyphicon-remove",
										ATTRIBUTE_STATIC, "aria-hidden", "true",
									ELEMENT_CLOSE,
								ELEMENT_CLOSE,
							ELEMENT_CLOSE,
							ELEMENT_OPEN, "td",
								PROPERTY_STATIC_CLASS_NAME, "col-md-6",
							ELEMENT_CLOSE,
						ELEMENT_CLOSE,
					],
				ELEMENT_CLOSE,
			ELEMENT_CLOSE,
			ELEMENT_OPEN_SPAN,
				PROPERTY_STATIC_CLASS_NAME, "preloadicon glyphicon glyphicon-remove",
				ATTRIBUTE_STATIC, "aria-hidden", "true",
			ELEMENT_CLOSE,
		ELEMENT_CLOSE,
	]
];
