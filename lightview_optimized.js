/*
MIT License

Copyright (c) 2022 AnyWhichWay, LLC - Lightview Small, simple, powerful UI creation ...

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// <script src="https://000686818.codepen.website/lightview.js?as=x-body"></script>
/*
    self.variables({name:"string"})
    imported(x) => exported(x) => reactive(x) => remote(x,{path:".
 */

var currentComponent = window.currentComponent = null;
if(document.body)  currentComponent = window.currentComponent = document.currentComponent = document.body;
var Lightview = window.Lightview = { };

var {observe} = (() => {
    let CURRENTOBSERVER;
    const parser = new DOMParser();

    const templateSanitizer = (string) => {
        return string.replace(/function\s+/g, "")
            .replace(/function\(/g, "")
            .replace(/=\s*>/g, "")
            .replace(/(while|do|for|alert)\s*\(/g, "")
            .replace(/console\.[a-zA-Z$]+\s*\(/g, "");
    }
    Lightview.sanitizeTemplate = templateSanitizer;

    const escaper = document.createElement('textarea');
    function escapeHTML(html) {
        escaper.textContent = html;
        return escaper.innerHTML;
    }
    Lightview.escapeHTML = escapeHTML;

    const isArrowFunction = (f) => typeof(f)==="function" && (f+"").match(/\(*.*\)*\s*=>/g);

    const getTemplateVariableName = (template) => {
        if(template && /^\$\{[a-zA-z_0-9.]*\}$/g.test(template)) return template.substring(2, template.length - 1);
    }

    const walk = (target,path,depth=path.length-1,create) => {
        for(let i=0;i<=depth;i++) {
            target = (target[path[i]]==null && create ?  target[path[i]] = (typeof(create)==="function" ? Object.create(create.prototype) : {}) : target[path[i]]);
            if(target===undefined) return;
        }
        return target;
    }

    const addListener = (node, eventName, callback, self) => {
        node.addEventListener(eventName, (event) => {
            // todo shopuld self be currentComponent or component
            if(self) Object.defineProperty(event,"self",{value:self});
            callback(event);
        });
    }

    // imports a component based on an anchor and replace content of a target node with an instance of the component
    const anchorHandler = async (event) => {
        event.preventDefault();
        const target = event.target;
        if (target === event.currentTarget) {
            const {as} = await importLink(target),
                targets = querySelectorAll(document, target.getAttribute("target"));
            targets.forEach((target) => {
                while (target.lastChild) target.lastChild.remove();
                target.appendChild(document.createElement(as))
            })
        }
    }
    const getNameFromPath = (path) => {
        const file = path.split("/").pop(),
            name = file.split(".")[0],
            parts = name.split("-");
        if (name.includes("-") && parts[0].length>=1) return name;
        return "l-" + name;
    }
    const observe = (f, thisArg, argsList = []) => {
        const observer = (...args) => {
            if(observer.cancelled) return;
            CURRENTOBSERVER = observer;
            try {
                f.call(thisArg || this, ...argsList, ...args);
            } catch (e) {

            }
            CURRENTOBSERVER = null;
        }
        observer.cancel = () => observer.cancelled = true;
        observer();
        return observer;
    }
    const coerce = (value, toType) => {
        if (["null","undefined"].includes(value + "") || toType==="any") return value;
        const type = typeof (value);
        if (type === toType) return value;
        if (toType === "number") {
            value = value + "";
            if(value==="NaN") return NaN;
            const result = parseFloat(value);
            if(isNaN(result)) throw new TypeError(`Unable to coerce '${value}' to 'number'`)
            return result;
        }
        if (toType === "boolean") {
            if ([1,"on", "checked", "selected","true"].includes(value)) return true;
            if (value == null || value === "") return false;
            /*try {
                const parsed = JSON.parse(value + "");
                if (typeof (parsed) === "boolean") return parsed;
                return [1, "on", "checked", "selected"].includes(parsed);
            } catch (e) {
                throw new TypeError(`Unable to coerce ${value} to 'boolean'`);
            }*/
        }
        if (toType === "string") return value + "";
        const isfunction = typeof (toType) === "function";
        if ((toType === "object" || isfunction)) {
            if (type === "object" && isfunction && value instanceof toType) return value;
            if (type === "string") {
                value = value.trim();
                try {
                    if (isfunction) {
                        const instance = toType === Date ? new Date() : Object.create(toType.prototype);
                        if (instance instanceof Array) {
                            let parsed = tryParse(value.startsWith("[") ? value : `[${value}]`);
                            if (!Array.isArray(parsed)) {
                                if (value.includes(",")) parsed = value.split(",");
                                else {
                                    parsed = tryParse(`["${value}"]`);
                                    if (!Array.isArray(parsed) || parsed[0] !== value && parsed.length !== 1) parsed = null;
                                }
                            }
                            if (!Array.isArray(parsed)) {
                                throw new TypeError(`Expected Array for parsed data ${parsed}:${typeof(parsed)}`)
                            }
                            instance.push(...parsed);
                        } else if (instance instanceof Date) {
                            instance.setTime(Date.parse(value));
                        } else {
                            Object.assign(instance, JSON.parse(value));
                        }
                        return instance;
                    }
                    return JSON.parse(value);
                } catch (e) {
                    throw new TypeError(`Unable to coerce '${value}:${type}' to '${isfunction ? toType.name : type}'`);
                }
            }
        }
        throw new TypeError(`Unable to coerce '${value}:${type}' to '${toType}'`)
    }
    const Reactor = (data) => {
        if (data && typeof (data) === "object") {
            if (data.__isReactor__) return data;
            const childReactors = [],
                dependents = {},
                proxy = new Proxy(data, {
                    get(target, property) {
                        if (property === "__isReactor__") return true;
                        //if(property=== "__dependents__") return dependents;
                        //if(property=== "__reactorProxyTarget__") return data;
                        if (target instanceof Array) {
                            if (property === "toJSON") return function toJSON() { return [...target]; }
                            if (property === "toString") return function toString() { return JSON.stringify([...target]); }
                        }
                        if(target instanceof Date) {
                            const value = data[property];
                            if(typeof(value)==="function") return value.bind(data);
                        }
                        let value = target[property];
                        const type = typeof (value);
                        if (CURRENTOBSERVER && typeof (property) !== "symbol" && type !== "function") {
                            const observers = dependents[property] ||= new Set();
                            observers.add(CURRENTOBSERVER)
                        }
                        if(value===undefined) return;
                        if ((value && type !== "object") || typeof (property) === "symbol" || childReactors.includes(value)) {
                            // Dates and Promises must be bound to work with proxies
                            if (type === "function" && ([Date].includes(value) || property==="then")) value = value.bind(target)
                            return value;
                        }
                        if (value && type === "object") {
                            value = Reactor(value);
                            childReactors.push(value);
                            target[property] = value;
                        }
                       //  target[property] = value;
                        return value;
                    },
                    async set(target, property, value) {
                        if(target instanceof Promise) {
                            console.warn(`Setting ${property} = ${value} on a Promise in Reactor`);
                        }
                        const type = typeof (value);
                        if(value && type==="object" && value instanceof Promise) value = await value;
                        if (target[property] !== value) {
                            if (value && type === "object") {
                                value = Reactor(value);
                                childReactors.push(value);
                            }
                            target[property] = value;
                            [...dependents[property] || []].forEach((f) => { // handle dependent observers
                                if (f.cancelled) dependents[property].delete(f);
                                else f();
                            })
                        }
                        return true;
                    }
                });
            return proxy;
        }
        return data;
    }

   const createVarsProxy = (vars, component, constructor) => {
        return new Proxy(vars, {
            get(target, property) {
                if(property==="self") return component;
                if(target instanceof Date) return Reflect.get(target,property);
                let {value,get} = target[property] || {};
                if(get) return target[property].value = get.call(target[property]);
                if (typeof (value) === "function") return value.bind(target);
                return value;
            },
            set(target, property, newValue) {
                const event = {variableName: property, value: newValue};
                if (target[property] === undefined) {
                    target[property] = {type: "any", value: newValue}; // should we allow this,  do first to prevent loops
                    target.postEvent.value("change", event);
                    if (event.defaultPrevented) delete target[property].value;
                    return true;
                }
                const variable = target[property],
                    {value, shared, exported, constant, reactive, remote} = variable;
                let type = variable.type;
                if (constant) {
                    const error = new TypeError(`${property}:${type} is a constant`);
                    if(Lightview.renderErrors) {
                        variable.value = error.toString();
                        return true;
                    }
                    throw error;
                }
                if(newValue!=null || type.required) newValue = type.validate ? type.validate(newValue,target[property]) : coerce(newValue,type);
                const newtype = typeof (newValue),
                    typetype = typeof (type);
                if ((newValue == null && !type.required) ||
                    type === "any" ||
                    (newtype === type && typetype==="string") ||
                    (typetype === "function" && !type.validate && (newValue && newtype === "object" && newValue instanceof type) || variable.validityState?.valid)) {
                    if (value !== newValue) {
                        event.oldValue = value;
                        if(target[property].__isReactor__) target[property] = newValue;
                        else target[property].value = reactive ? Reactor(newValue) : newValue; // do first to prevent loops
                        target.postEvent.value("change", event);
                        if (event.defaultPrevented) target[property].value = value; // set value back
                        else if(remote && ((variable.reactive && variable?.remote?.config.put!==false) || remote.put)) remote.handleRemote({variable,config: variable?.remote?.config},true);
                        else if(variable.set) variable.set(newValue);
                    }
                    return true;
                }
                if (typetype === "function" && newValue && newtype === "object") {
                    const error = new TypeError(`Can't assign instance of '${newValue.constructor.name}' to variable '${property}:${type.name.replace("bound ", "")}'`)
                    if(Lightview.renderErrors) {
                        variable.value = error.toString();
                        return true;
                    }
                    throw error;
                }
                const error = new TypeError(`Can't assign '${typeof (newValue)} ${newtype === "string" ? '"' + newValue + '"' : newValue}' to variable '${property}:${typetype === "function" ? type.name.replace("bound ", "") : type} ${type.required ? "required" : ""}'`)
                if(Lightview.renderErrors) {
                    variable.value = error.toString();
                    return true;
                }
                throw error;
            },
            keys() {
                return [...Object.keys(vars)];
            }
        });
    }
    // this is a DOM observer, not an observer of the observer programming paradigm
    const createObserver = (domNode, framed) => {
        const mobserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const target = mutation.target;
                if (mutation.type === "attributes") {
                    //if (framed) debugger;
                    const name = mutation.attributeName,
                        value = target.getAttribute(name);
                    if (framed && name === "message" && target instanceof IFrameElement) {
                        //if (value) console.log("message", value);
                        target.removeAttribute(name);
                        target.dispatchEvent(new CustomEvent("message", {detail: JSON.parse(value)}))
                    }
                    if (target.observedAttributes && target.observedAttributes.includes(name) && value !== mutation.oldValue) {
                        target.setVariableValue(name, value);
                    }
                } else if (mutation.type === "childList") {
                    for (const target of mutation.removedNodes) {
                        if (target.disconnectedCallback) target.disconnectedCallback();
                    }
                    for (const target of mutation.addedNodes) {
                        if (target.connectedCallback) target.connectedCallback();
                    }
                } else if(mutation.type === "characterData") {
                    if(target.characterDataMutationCallback) target.characterDataMutationCallback(target,mutation.oldValue,target.textContent);
                }
            });
        });
        mobserver.observe(domNode, {subtree: true, childList: true});
        return mobserver;
    }
    const querySelectorAll = (node, selector) => {
        const nodes = [...node.querySelectorAll(selector)],
            nodeIterator = document.createNodeIterator(node, Node.ELEMENT_NODE);
        let currentNode;
        while (currentNode = nodeIterator.nextNode()) {
            if (currentNode.shadowRoot) nodes.push(...querySelectorAll(currentNode.shadowRoot, selector));
        }
        return nodes;
    }
    const getNodes = (root,href,nodes=new Set()) => {
        //const nodes = new Set();
        if (root.shadowRoot) {
            nodes.add(root);
            getNodes(root.shadowRoot,href,nodes);//.forEach((node) => nodes.add(node))
        } else {
            for (const node of root.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.includes("${")) {
                    node.template ||= node.nodeValue;
                    nodes.add(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    let skip;
                    //[...node.attributes].forEach((attr) => {
                    for(const attr of node.attributes) {
                        if (attr.value.includes("${")) {
                            attr.template ||= attr.value;
                            nodes.add(node);
                        } else if (attr.name.includes(":") || attr.name.startsWith("l-")) {
                            skip = attr.name.includes("l-for:");
                            nodes.add(node)
                        }
                    }
                    //})
                    if (node.getAttribute("type") === "radio") nodes.add(node);
                    if (!skip && !node.shadowRoot) getNodes(node,href,nodes);//.forEach((node) => nodes.add(node));
                }
            }
        }
        return nodes;
    }

    // populate a string literal template and turn objects into strings
    const populateTemplate = (strings,...values) => {
        values = values.map((value) => {
            const type = typeof(value);
            try {
                if(value && type==="object") return JSON.stringify(value);
                return value;
            } catch(e) {
                return e.toString();
            }
        });
        return strings.reduce((result,string,index) => index < values.length ? result += string + values[index] : result + string,"");
    }

    const resolveNodeOrText = (node, component, safe,extras=node.extras||{},skipNodeUpdate) => {
        const type = typeof (node),
            template = type === "string" ? node.trim() : node.template;
        extras.populateTemplate = populateTemplate;
        if (template) {
            const name = getTemplateVariableName(template);
            try {
                const parts = name ? name.split(".") : null;
                let value;
                value = (parts
                    ? (value = walk(extras,parts)) || (value = walk(component.varsProxy,parts)) || (value == null ? component[name] : value)
                    : Function("context", "extras", "with(context) { with(extras) { return populateTemplate`" + (safe ? template : Lightview.sanitizeTemplate(template)) + "` } }")(component.varsProxy,extras));
                //let value = Function("context", "with(context) { return `" + Lightview.sanitizeTemplate(template) + "` }")(component.varsProxy);
                if(typeof(value)==="function") return value.bind(component);
                value = (name || node.nodeType === Node.TEXT_NODE || safe ? value : Lightview.escapeHTML(value));
                if (type === "string") return value==="undefined" ? undefined : value;
                node.rawValue = value;
                if(!skipNodeUpdate) {
                    //requestAnimationFrame(() => {
                        if(name) {
                            node.nodeValue = value==null ? "" : typeof(value)==="string" ? value : JSON.stringify(value);
                        } else {
                            node.nodeValue = value == "null" || value == "undefined" ? "" : value;
                        }
                    //})
                }
                return value;
            } catch (e) {
                //console.warn(e);
                if (!e.message.includes("defined")) {
                    if(Lightview.renderErrors) return e.message;
                    throw e;
                } // actually looking for undefined or not defined, but different browsers spell or quote differently
                return undefined;
            }
        }
        return node?.nodeValue;
    }
    const inputTypeToType = (inputType) => {
        if (!inputType) return "any"
        if (["text", "tel", "email", "url", "search", "radio", "color", "password"].includes(inputType)) return "string";
        if (["number", "range"].includes(inputType)) return "number";
        if (["datetime"].includes(inputType)) return Date;
        if (["checkbox"].includes(inputType)) return "boolean";
        return "any";
    }
    const enableAnchors = (node) => {
        for(const anode of node.querySelectorAll('a[href$=".html"][target^="#"]')) {
            anode.removeEventListener("click", anchorHandler);
            addListener(anode, "click", anchorHandler);
        }
    }
    Lightview.enableAnchors = enableAnchors;
    
    const bound = new WeakSet();
    const bindInput = (input, variableName, component, value, object) => {
        if (bound.has(input)) return;
        bound.add(input);
        const inputtype = input.tagName === "SELECT" || input.tagName === "TEXTAREA" ? "text" : input.getAttribute("type"),
            nameparts = variableName.split(".");
        let type = input.tagName === "SELECT" && input.hasAttribute("multiple") ? Array : inputTypeToType(inputtype);
        const variable = walk(component.vars,nameparts) || {type};
        if(type==="any") type = variable?.type.type || variable?.type;
        if(inputtype==="checkbox" && value==null) value = input.checked;
        if(value==null) {
            const avalue = input.getAttribute("value");
            if(avalue) value = avalue;
        }
        if(object && nameparts.length>1) {
            const [root,...path] = nameparts;
            object = walk(object,path,path.length-2,true);
            const key = path[path.length-1];
            object[key] =  coerce(value,type);
        } else {
            const existing = component.vars[variableName];
            if(existing) {
                existingtype = existing?.type.type || existing?.type;
                if(existingtype!==type) throw new TypeError(`Attempt to bind <${input.tagName} name="${variableName}" type="${type}"> to variable ${variableName}:${existing.type}`)
                existing.reactive = true;
            } else if(Lightview.createInputVariables) {
                component.variables({[variableName]: type},{reactive,set:value});
            } else {
                throw new TypeError(`Attempt to bind undefined variable ${variableName} to <${input.tagName} type="${type}>`)
            }
            if(inputtype!=="radio") {
                if(typeof(value)==="string" && value.includes("${")) input.setAttribute("value","");
                else component.setVariableValue(variableName, coerce(value,type));
            }
        }
        let eventname = "change";
        if(input.tagName==="FORM") {
            eventname = "submit"
        } else if (input.tagName !== "SELECT" && (!inputtype || input.tagName === "TEXTAREA" || ["text", "number", "tel", "email", "url", "search", "password"].includes(inputtype))) {
            eventname = "input";
        }
        const listener = (event) => {
            if (event) event.stopImmediatePropagation();
            let value = input.value;
            if (inputtype === "checkbox") {
                value = input.checked
            } else if (input.tagName === "SELECT" && input.hasAttribute("multiple")) {
                value = [...input.querySelectorAll("option")]
                    .filter((option) => option.selected || resolveNodeOrText(option.attributes.value || option.innerText, component) === value)
                    .map((option) => option.getAttribute("value") || option.innerText);
            }
            if(object) {
                const [root,...path] = nameparts;
                object = walk(object,nameparts,path.length-2,true);
            } else {
                object = walk(component.varsProxy,nameparts,nameparts.length-2,true);
            }
            const key = nameparts[nameparts.length-1];
            object[key] =  coerce(value,type);
        };
        addListener(input, eventname, listener,component);
    }
    const tryParse = (value) => {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }
    const observed = () => {
        return {
            init({variable, component}) {
                const name = variable.name;
                variable.value = component.hasAttribute(name) ? coerce(component.getAttribute(name), variable.type) : variable.value;
                variable.observed = true;
                component.observedAttributes.add(name);
            }
        }
    }
    const reactive = () => {
        return {
            init({variable, component}) {
                variable.reactive = true;
                component.vars[variable.name] = Reactor(variable);
            }
        }
    }
    const shared = () => {
        return {
            init({variable, component}) {
                variable.shared = true;
                variable.set = function(newValue) {
                    if(component.vars[this.name]?.shared) component.siblings.forEach((instance) => instance.setVariableValue(this.name, newValue));
                }
            }
        }
    }
    const exported = () => {
        return {
            init({variable, component}) {
                const name = variable.name;
                variable.exported = true;
                variable.set = (newValue) => {
                    if(variable.exported) {
                        if(newValue==null) {
                            removeComponentAttribute(component, name);
                        } else {
                            const type = typeof(newValue);
                            // note, using isArray below will not always work for proxied items, so using instanceOf
                            newValue = type === "string" ? newValue : (type==="object" && newValue instanceof Array) ? JSON.stringify([...newValue]) : JSON.stringify(newValue);
                            setComponentAttribute(component, name, newValue);
                        }
                    }
                }
                variable.set(variable.value);
            }
        }
    }
    const imported = () => {
        return {
            init({variable, component}) {
                const name = variable.name.toLowerCase();
                let value = component.hasAttribute(name) ? component.getAttribute(name) : null;
                if((variable.type==="boolean" || variable.type.type==="boolean") && value==="") value = true;
                variable.imported = true;
                variable.value = value!=null ? coerce(value, variable.type) : variable.value;
            }
        }
    }

    let reserved = {
        observed: {
            constant: true,
            value: observed
        },
        reactive: {
            constant: true,
            value: reactive
        },
        shared: {
            constant: true,
            value: shared
        },
        exported: {
            constant: true,
            value: exported
        },
        imported: {
            constant: true,
            value: imported
        }
    };
    // patches relative references to use the passed in href as base
    const patchElementURIs = (node,tagName,attributeName,href) => { // attributeName will always be href or src
        if(node) {
            for(const child of node.querySelectorAll(tagName)) {
                let value = child.getAttribute(attributeName);
                if (value) child.setAttribute(attributeName, new URL(value, href).href);
            }
        }
    };
    // forces re-evaluation of scripts and links
    const forceLoadElement = (node) => {
        if((node.getAttribute("src")||"").includes("/lightview.js")) return;
        const el = document.createElement(node.tagName.toLowerCase());
        for(const attr of node.attributes) { el.setAttribute(attr.name,attr.value); }
        el.innerHTML = node.innerHTML;
        node.after(el);
        node.remove();
    };
    const createClass = (domElementNode, {observer, framed, href= window.location.href.replace("blob:",""), mount}) => {
        const instances = new Set(),
            observedAttributes = [];
        let dom;
        observedAttributes.add = function(name) { observedAttributes.includes(name) || observedAttributes.push(name); }
        const cls = class CustomElement extends HTMLElement {
            static get instances() {
                return instances;
            }
            static setTemplateNode(node) {
                dom = node.tagName === "TEMPLATE"
                    ? document.createElement("div")
                    : node.cloneNode(true);
                if(node.tagName === "TEMPLATE") {
                    dom.innerHTML = node.innerHTML;
                    for(const attr of node.attributes) { dom.setAttribute(attr.name,attr.value) }
                }
                patchElementURIs(dom.head,"link","href",href);
                patchElementURIs(dom.head,"script","src",href);
                patchElementURIs(dom.body||dom,"link","href",href);
                patchElementURIs(dom.body||dom,"script","src",href);
                dom.mount = node.mount || node.body?.mount;
            }
            constructor() {
                super();
                this.componentBaseURI = href;
                currentComponent =  window.currentComponent = document.currentComponent = this;
                instances.add(this);
                const shadow = this.attachShadow({mode: "open"}),
                    eventlisteners = {};
                this.vars = {
                    ...reserved,
                    observe: {
                        value: (...args) => observe(...args),
                        type: "function",
                        constant: true
                    },
                    addEventListener: {
                        value: (eventName, listener) => {
                            const listeners = eventlisteners[eventName] ||= new Set();
                            listeners.forEach((f) => {
                                if (listener + "" === f + "") listeners.delete(f);
                            })
                            eventlisteners[eventName].add(listener);
                        },
                        type: "function",
                        constant: true
                    },
                    postEvent: {
                        value: (eventName, event = {}) => {
                            //event = {...event}
                            event.type = eventName;
                            event.target = currentComponent;
                            eventlisteners[eventName]?.forEach((f) => f(event));
                        },
                        type: "function",
                        constant: true
                    },
                    self: {value: currentComponent, type: CustomElement, constant: true}
                };
                this.varsProxy = createVarsProxy(this.vars, this, CustomElement);
                if (framed || CustomElement.lightviewFramed) this.variables({message: Object}, {exported});
                ["getElementById", "querySelector"] //, "querySelectorAll"
                    .forEach((fname) => {
                        const f = this[fname];
                        Object.defineProperty(this, fname, {
                            configurable: true,
                            writable: true,
                            value: (...args) => { return (f ? f.call(this,...args) : null) || this.shadowRoot[fname](...args) }
                        })
                    });
                ["querySelectorAll"]
                    .forEach((fname) => {
                        const f = this[fname];
                        Object.defineProperty(this, fname, {
                            configurable: true,
                            writable: true,
                            value: (...args) => { return [...f.call(this,...args),...this.shadowRoot[fname](...args)] }
                        })
                    });
                [...dom.head?.childNodes||[]].forEach((child) => {
                    const clone = child.cloneNode(true);
                    document.head.appendChild(clone);
                    if(["LINK","SCRIPT"].includes(clone.tagName)) forceLoadElement(clone);
                });
                const body = dom.body || dom;
                for(const child of body.childNodes) {
                    if(child.tagName && customElements.get(child.tagName.toLowerCase())) {
                        const node = document.createElement(child.tagName);
                        for(const attr of child.attributes) { node.setAttribute(attr.name,attr.value); }
                        //currentComponent = window.currentComponent = document.currentComponent = node;
                        shadow.appendChild(node);
                    } else {
                        const clone = child.cloneNode(true);
                        shadow.appendChild(clone);
                        if(["LINK","SCRIPT"].includes(clone.tagName)) forceLoadElement(clone);
                    }
                };
                //forceLoadElements(shadow,"link");
                //forceLoadElements(shadow,"script");
                //importStyleSheets(shadow,this);
                enableAnchors(shadow);
            }

            get siblings() {
                return [...CustomElement.instances].filter((sibling) => sibling != this);
            }

            adoptedCallback() {
                if (this.hasOwnProperty("adoptedCallback")) this.adoptedCallback();
            }

            disconnectedCallback() {
                instances.delete(this);
            }

            connectedCallback() {
                const node = dom.body || dom;
                for(const attr of node.attributes) {
                    if(!this.hasAttribute(attr.name)) this.setAttribute(attr.name,attr.value);
                }
                if(dom.mount||mount) {
                    const script = document.createElement("script");
                    window.currentComponent = document.currentComponent = this;
                    script.innerHTML = `with(document.currentComponent.varsProxy) { 
                        ${typeof(lightviewDebug)!=="undefined" && lightviewDebug===true ? "debugger;" : ""}
                        const component = document.currentComponent; 
                        (async () => { await (${dom.mount||mount}).call(self,self); 
                        requestAnimationFrame(() => component.compile());  })(); 
                    };`;
                    this.appendChild(script);
                    script.remove();
                    for(const child of this.querySelectorAll('link[rel="stylesheet"][export]')) {
                        child.remove();
                        this.appendChild(child);
                    };
                    window.currentComponent = document.currentComponent = null;
                }
            }
            compile() {
                // Promise.all(promises).then(() => {
                const ctx = this,
                    shadow = this.shadowRoot;
                const nodes = getNodes(ctx,href),
                    processNodes = (nodes,{object,rootName,extras}={}) => {
                        nodes.forEach((node) => {
                            node.extras = extras;
                            if (node.nodeType === Node.TEXT_NODE && node.template.includes("${")) {
                                observe(() => resolveNodeOrText(node, this,true,node.extras));
                                if(node.parentElement?.tagName==="TEXTAREA") {
                                    const name = getTemplateVariableName(node.template);
                                    if (name) {
                                        const nameparts = name.split(".");
                                        if(node.extras && node.extras[nameparts[0]]) {
                                            object = node.extras[nameparts[0]];
                                        }
                                        if(!this.vars[nameparts[0]] || this.vars[nameparts[0]].reactive || object) {
                                            bindInput(node.parentElement, name, this, resolveNodeOrText(node.template, this,true,node.extras), object);
                                        }
                                    }
                                }
                            } else if (node.nodeType === Node.ELEMENT_NODE) {
                                // resolve the value before all else;
                                const attr = node.attributes.value,
                                    template = attr?.template;
                                if (attr && template) {
                                    //let value = resolveNodeOrText(attr, this),
                                    //   ;
                                    const eltype = node.attributes.type ? resolveNodeOrText(node.attributes.type, ctx, false,node.extras) : null,
                                        aname = node.getAttribute("name"),
                                        template = attr.template || (rootName && aname ? `\${${rootName}.${name}}` : null);
                                    if (template) {
                                        const name = getTemplateVariableName(template);
                                        if (name) {
                                            const nameparts = name.split(".");
                                            if(node.extras && node.extras[nameparts[0]]) {
                                                object = node.extras[nameparts[0]];
                                            }
                                            if(!this.vars[nameparts[0]] || this.vars[nameparts[0]].reactive || object) {
                                                bindInput(node, name, this, resolveNodeOrText(attr, this,false,node.extras), object);
                                            }
                                        }
                                        if(eltype==="checkbox" || eltype==="radio" || node.tagName==="SELECT") {
                                            observe(() => {
                                                const value = resolveNodeOrText(template, ctx, false, node.extras);
                                                if (value !== undefined) {
                                                    if (eltype === "checkbox") {
                                                        if (coerce(value, "boolean") === true) {
                                                            node.setAttribute("checked", "");
                                                            //node.checked = true; // do we need to do this and set attribute
                                                        } else {
                                                            node.removeAttribute("checked");
                                                            //node.checked = false;
                                                        }
                                                    } else if (node.tagName === "SELECT") {
                                                        const values = node.hasAttribute("multiple") ? coerce(value, Array) : [value];
                                                        for(const option of node.querySelectorAll("option")) {
                                                            if (option.hasAttribute("value")) {
                                                                if (values.includes(resolveNodeOrText(option.attributes.value, ctx, false, node.extras))) {
                                                                    option.setAttribute("selected", "");
                                                                    //option.selected = true;
                                                                }
                                                            } else if (values.includes(resolveNodeOrText(option.innerText, ctx, false, node.extras))) {
                                                                option.setAttribute("selected", "");
                                                                //option.selected = true;
                                                            }
                                                        }
                                                    } else if (eltype !== "radio") {
                                                        //attr.value = typeof(value)==="string" ? value : JSON.stringify(value);
                                                        let avalue = typeof (value) === "string" ? value : value.toString ? value.toString() : JSON.stringify(value);
                                                        if (avalue.startsWith('"')) avalue = avalue.substring(1);
                                                        if (avalue.endsWith('"')) avalue = avalue.substring(0, avalue.length - 1);
                                                        attr.value = avalue;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                }
                                for(const attr of node.attributes) {
                                    if (attr.name === "value" && attr.template) return;
                                    const {name, value} = attr,
                                        vname = node.attributes.name?.value;
                                    if(value.includes("${")) attr.template = value;
                                    if (name === "type" && value=="radio" && vname) {
                                        bindInput(node, vname, this, undefined, object);
                                        observe(() => {
                                            const varvalue =  Function("context", "with(context) { return `${" + vname + "}` }")(ctx.varsProxy);
                                            if (node.attributes.value.value == varvalue) {
                                                node.setAttribute("checked", "");
                                                node.checked = true;
                                            } else {
                                                node.removeAttribute("checked");
                                                node.checked = false;
                                            }
                                        });
                                    }

                                    const [type, ...params] = name.split(":");
                                    if (type === "") { // name is :something
                                        observe(() => {
                                            const value = attr.value;
                                            if (params[0]) {
                                                if (value === "true") node.setAttribute(params[0], "")
                                                else node.removeAttribute(params[0]);
                                            } else {
                                                const elvalue = node.attributes.value ? resolveNodeOrText(node.attributes.value, ctx,false,node.extras) : null,
                                                    eltype = node.attributes.type ? resolveNodeOrText(node.attributes.type, ctx,false,node.extras) : null;
                                                if (eltype === "checkbox" || node.tagName === "OPTION") {
                                                    if (elvalue === true) node.setAttribute("checked", "")
                                                    else node.removeAttribute("checked");
                                                }
                                            }
                                        })
                                    } else if (type === "l-on") {
                                        let listener;
                                        //setTimeout(() => {
                                            observe(() => {
                                                const value = resolveNodeOrText(attr, this,true,node.extras,true);
                                                if (listener) node.removeEventListener(params[0], listener);
                                                listener = null;
                                                if(typeof(value)==="function") {
                                                    listener = value;
                                                } else {
                                                    try {
                                                        listener = Function("return " + value)();
                                                    } catch(e) {

                                                    }
                                                }
                                                if(listener) addListener(node, params[0], listener,ctx);
                                            })
                                       // })
                                    } else if (type === "l-if") {
                                        observe(() => {
                                            const value = resolveNodeOrText(attr, this,true,node.extras);
                                            node.style.setProperty("display", value == true || value === "true" ? "revert" : "none");
                                        })
                                    } else if (type === "l-for") {
                                        node.template ||= node.innerHTML;
                                        node.clone ||= node.cloneNode(true);
                                        const [what = "each", vname = "item", index = "index", array = "array", after = false] = params;
                                        observe(() => {
                                            const value = resolveNodeOrText(attr, this,false,node.extras,true),
                                                coerced = coerce(value, what === "each" ? Array : "object"),
                                                target = what === "each" ? coerced : Object[what](coerced);
                                            let length = target.length * node.children.length;
                                            if (!window.lightviewDebug) {
                                                if (after) node.style.setProperty("display", "none")
                                                else if (length===0) while(node.lastElementChild) node.lastElementChild.remove();
                                                else while (node.lastElementChild && length--) node.lastElementChild.remove();
                                            }
                                            length = target.length * node.children.length;
                                            //requestAnimationFrame( () => {
                                                target.forEach((item,i,target) => {
                                                    const clone = node.clone.cloneNode(true),
                                                        extras = node.extras = {
                                                            [vname]: item,
                                                            [index]: i,
                                                            [array]: target
                                                        };
                                                    processNodes(getNodes(clone,href),{extras});
                                                    [...clone.childNodes].forEach((child,j) => {
                                                        const position = i + j;
                                                        if (after) node.parentElement.insertBefore(child, node);
                                                        else if(position<length) node.replaceChild(child,node.children[position])
                                                        else node.appendChild(child);
                                                    });
                                                });
                                            //});
                                        })
                                    } else if(attr.template) {
                                        observe(() => {
                                            resolveNodeOrText(attr, this,false,node.extras);
                                        })
                                    }
                                }
                            }
                        })
                    };
                nodes.forEach((node) => {
                    if(node.tagName==="FORM") {
                        const value = node.getAttribute("value"),
                            name = getTemplateVariableName(value);
                        if(name) {
                            const childnodes = [...nodes].filter((childnode) => node!==childnode && node.contains(childnode));
                            childnodes.forEach((node) => nodes.delete(node));
                            const variable = ctx.vars[name] ||= {type: "object", reactive:true, value: Reactor({})};
                            if(variable.type !== "object" || !variable.reactive || !variable.value || typeof(variable.value)!=="object") {
                                throw new TypeError(`Can't bind form ${node.getAttribute("id")} to non-object variable ${name}`);
                            }
                            processNodes(childnodes,{object:variable.value,rootName:name});
                        }
                    }
                })
                processNodes(nodes);
                shadow.normalize();
                observer ||= createObserver(ctx, framed);
                observer.observe(ctx, {attributeOldValue: true, subtree:true, characterData:true, characterDataOldValue:true});
                if(this.hasAttribute("l-unhide")) this.removeAttribute("hidden");
                //ctx.vars.postEvent.value("connected");
                this.dispatchEvent(new Event("mounted"));
                // })
            }
            adoptedCallback(callback) {
                this.dispatchEvent(new Event("adopted"));
            }
            disconnectedCallback() {
                this.dispatchEvent(new Event("disconnected"));
            }
            get observedAttributes() {
                return CustomElement.observedAttributes;
            }
            static get observedAttributes() {
                return observedAttributes;
            }

            getVariableNames() {
                return Object.keys(this.vars)
                    .filter(name => !(name in reserved) && !["self", "addEventListener", "postEvent","observe"].includes(name))
            }

            getVariableData() {
                return this.getVariableNames().reduce((data,name) => {
                    data[name] = this.getVariableValue(name);
                    return data;
                },{})
            }

            getVariable(name) {
                return this.vars[name] ? {...this.vars[name]} : undefined;
            }

            setVariableValue(variableName, value, {coerceTo = typeof (value)} = {}) {
                if (!this.isConnected) {
                    instances.delete(this);
                    return false;
                }
                let {type} = this.vars[variableName] || {};
                if (type) {
                    if (this.varsProxy[variableName] !== value) {
                        const variable = this.vars[variableName];
                        if (variable.shared) {
                            value = type.validate ? type.validate(value,variable) : coerce(value,coerceTo);
                            const event = {
                                variableName: variableName,
                                value: value,
                                oldValue: variable.value
                            };
                            variable.value = value;
                            this.vars.postEvent.value("change", event);
                            if (event.defaultPrevented) variable.value = value;
                        } else {
                            this.varsProxy[variableName] = value;
                        }
                    }
                    return true;
                }
                this.vars[variableName] = {name, type: coerceTo, value: coerce(value, coerceTo)};
                return false;
            }

            getVariableValue(variableName) {
                return this.vars[variableName]?.value;
            }

            variables(variables, {remote, constant, set,...rest} = {}) { // options = {observed,reactive,shared,exported,imported}
                const options = {remote, constant, ...rest};
                if (variables !== undefined) {
                    Object.entries(variables)
                        .forEach(([key, type]) => {
                            if(isArrowFunction(type)) type = type();
                            const variable = this.vars[key] ||= {name: key, type};
                            if(set!==undefined && constant!==undefined) throw new TypeError(`${key} has the constant value ${constant} and can't be set to ${set}`);
                            variable.value = set;
                            if(constant!==undefined) {
                                if(remote || rest.imported) throw new TypeError(`${key} can't be a constant and also remote or imported`)
                                variable.constant = true;
                                variable.value = constant;
                            }
                            if (remote) {
                                if(typeof(remote)==="function") remote = remote(`./${key}`);
                                variable.remote = remote;
                                remote.handleRemote({variable, config:remote.config,component:this});
                            }
                            // todo: handle custom functional types, remote should actually be handled this way
                            Object.entries(rest).forEach(([type,f]) => {
                                const functionalType = variable[type] = typeof(f)==="function" ? f() : f;
                                if(functionalType.init) functionalType.init({variable,options,component:this});
                                if((rest.get!==undefined || rest.set!==undefined) && constant!==undefined) throw new TypeError(`${key} has the constant value ${constant} and can't have a getter or setter`);
                                variable.set != functionalType.set;
                                variable.get != functionalType.get;
                            });
                            if(type.validate && variable.value!==undefined) type.validate(variable.value,variable);
                        });
                }
                return Object.entries(this.vars)
                    .reduce((result, [key, variable]) => {
                        result[key] = {...variable};
                        return result;
                    }, {});
            }
        }
        cls.setTemplateNode(domElementNode);
        return cls;
    }

    const createComponent = (name, node, {framed, observer, href, mount} = {}) => {
        let ctor = customElements.get(name);
        if (ctor) {
            if (framed && !ctor.lightviewFramed) ctor.lightviewFramed = true;
            else console.warn(new Error(`${name} is already a CustomElement. Not redefining`));
            return ctor;
        }
        ctor = createClass(node, {observer, framed, href, mount});
        customElements.define(name, ctor);
        Lightview.customElements.set(name, ctor);
        return ctor;
    }
    Lightview.customElements = new Map();
    Lightview.createComponent = createComponent;
    const importLink = async (link, observer) => {
        const url = (new URL(link.getAttribute("href"),document.baseURI)),
            as = link.getAttribute("as") || getNameFromPath(url.pathname);
        if (url.origin !== window.location.origin && !link.getAttribute("crossorigin")) {
            throw new URIError(`importLink:HTML imports must be from same domain: ${url.hostname}!=${location.hostname} unless 'crossorigin' attribute is set.`)
        }
        if (!customElements.get(as)) {
            const html = await (await fetch(url.href)).text(),
                dom = parser.parseFromString(html, "text/html"),
                unhide = !!dom.head.querySelector('meta[name="l-unhide"]');
            for (const childlink of [...dom.head.querySelectorAll('link[href]')]) {
                childlink.setAttribute("href", new URL(childlink.getAttribute("href"), url.href).href);
                if (link.hasAttribute("crossorigin")) childlink.setAttribute("crossorigin", link.getAttribute("crossorigin"))
                if(childlink.getAttribute("href").endsWith(".html") && childlink.getAttribute("rel")==="module") await importLink(childlink, observer);
            }
            currentComponent = window.currentComponent = document.currentComponent = dom.body;
            currentComponent.componentBaseURI = url.href;
            const lvscript = dom.getElementById("lightview");
            if(lvscript) {
                const script = document.createElement("script");
                script.innerHTML = lvscript.innerHTML;
                document.body.appendChild(script);
                script.remove();
            }
            currentComponent = window.currentComponent = document.currentComponent = null;
            createComponent(as, dom, {observer,href:url.href});
            if (unhide) dom.body.removeAttribute("hidden");
        }
        return {as};
    }
    const importLinks = async () => {
        const observer = createObserver(document.body);
        for (const link of [...document.querySelectorAll(`link[href$=".html"][rel=module]`)]) {
            await importLink(link, observer);
        }
    }
    const bodyAsComponent = ({as = "x-body", unhide, framed} = {}) => {
        createComponent(as, document.body, {framed});
        const component = document.createElement(as);
        document.body.parentElement.replaceChild(component, document.body);
        Object.defineProperty(document, "body", {
            enumerable: true, configurable: true, get() {
                return component;
            }
        });
        if (unhide) component.removeAttribute("hidden");
    }
    Lightview.bodyAsComponent = bodyAsComponent;
    const postMessage = (data, target = window.parent) => {
        if (postMessage.enabled) {
            if (target instanceof HTMLIFrameElement) {
                data = {...data, href: document.baseURI};
                target.contentWindow.postMessage(JSON.stringify(data), "*");
            } else {
                data = {...data, iframeId: document.lightviewId, href: document.baseURI};
                target.postMessage(JSON.stringify(data), "*");
            }
        }
    }
    const setComponentAttribute = (node, name, value) => {
        if (node.getAttribute(name) !== value) node.setAttribute(name, value);
        postMessage({type: "setAttribute", argsList: [name, value]});
    }
    const removeComponentAttribute = (node, name, value) => {
        node.removeAttribute(name);
        postMessage({type: "removeAttribute", argsList: [name]});
    }
    const getNodePath = (node, path = []) => {
        path.unshift(node);
        if (node.parentNode && node.parentNode !== node.parentNode) getNodePath(node.parentNode, path);
        return path;
    }
    const onresize = (node, callback) => {
        const resizeObserver = new ResizeObserver(() => callback());
        resizeObserver.observe(node);
    };

    const url = new URL(document.currentScript.getAttribute("src"), document.baseURI);
    let domContentLoadedEvent;
    if (!domContentLoadedEvent) addListener(window, "DOMContentLoaded", (event) => domContentLoadedEvent = event);
    let OBSERVER;
    const loader = async (whenFramed) => {
        await importLinks();
        const unhide = !!document.querySelector('meta[name="l-unhide"]'),
            isolated = !!document.querySelector('meta[name="l-isolate"]'),
            enableFrames = !!document.querySelector('meta[name="l-enableFrames"]');
        if (whenFramed) {
            whenFramed({unhide, isolated, enableFrames, framed: true});
            if (!isolated) {
                postMessage.enabled = true;
                addListener(window, "message", ({data}) => {
                    const {type, argsList} = JSON.parse(data);
                    if (type === "framed") {
                        const resize = () => {
                            const {width, height} = document.body.getBoundingClientRect();
                            postMessage({type: "setAttribute", argsList: ["width", width]})
                            postMessage({type: "setAttribute", argsList: ["height", height + 20]});
                        }
                        resize();
                        onresize(document.body, () => resize());
                        return
                    }
                    if (["setAttribute","removeAttribute"].includes(type)) {
                        let [name, value] = [...argsList];
                        const variable = document.body.vars[name];
                        if(type==="removeAttribute") value = undefined;
                        if (variable && variable.imported) document.body.setVariableValue(name, value);
                    }
                });
                const url = new URL(document.baseURI);
                document.lightviewId = url.searchParams.get("id");
                postMessage({type: "DOMContentLoaded"})
            }
        } else if (url.searchParams.has("as")) {
            bodyAsComponent({as: url.searchParams.get("as"), unhide});
        }
        if (enableFrames) {
            postMessage.enabled = true;
            addListener(window, "message", (message) => {
                const {type, iframeId, argsList, href} = JSON.parse(message.data),
                    iframe = document.getElementById(iframeId);
                if (iframe) {
                    if (type === "DOMContentLoaded") {
                        postMessage({type: "framed", href: document.baseURI}, iframe);
                        Object.defineProperty(domContentLoadedEvent, "currentTarget", {
                            enumerable: false,
                            configurable: true,
                            value: iframe
                        });
                        domContentLoadedEvent.href = href;
                        domContentLoadedEvent.srcElement = iframe;
                        domContentLoadedEvent.bubbles = false;
                        domContentLoadedEvent.path = getNodePath(iframe);
                        Object.defineProperty(domContentLoadedEvent, "timeStamp", {
                            enumerable: false,
                            configurable: true,
                            value: performance.now()
                        })
                        iframe.dispatchEvent(domContentLoadedEvent);
                        return;
                    }
                    if (type === "setAttribute") {
                        const [name, value] = [...argsList];
                        if (iframe.getAttribute(name) !== value + "") iframe.setAttribute(name, value);
                        return;
                    }
                    if (type === "removeAttribute") {
                        iframe.removeAttribute(...argsList);
                        return;
                    }
                }
                console.warn("iframe posted a message without providing an id", message);
            });
            if (!OBSERVER) {
                const mutationCallback = (mutationsList) => {
                    const console = document.getElementById("console");
                    for (const {target, attributeName, oldValue} of mutationsList) {
                        const value = target.getAttribute(attributeName);
                        if (!["height", "width", "message"].includes(attributeName)) {
                            if (!value) postMessage({type: "removeAttribute", argsList: [attributeName]}, iframe)
                            else if (value !== oldValue) {
                                postMessage({
                                    type: "setAttribute",
                                    argsList: [attributeName, value]
                                }, iframe)
                            }
                        }
                        if (attributeName === "message") {
                            if (value) {
                                target.removeAttribute("message");
                                target.dispatchEvent(new CustomEvent("message", {target, detail: JSON.parse(value)}))
                            }
                        } else {
                            target.dispatchEvent(new CustomEvent("attribute.changed", {
                                target,
                                detail: {attributeName, value, oldValue}
                            }))
                        }
                    }
                };
                const observer = OBSERVER = new MutationObserver(mutationCallback);
                // iframe = document.getElementById("myframe");
                [...document.body.querySelectorAll("iframe")].forEach((iframe) => {
                    observer.observe(iframe, {attributes: true, attributeOldValue: true});
                });
            }
        }
    }
    const whenFramed = (callback, {isolated} = {}) => {
        // loads for framed content
        addListener(document, "DOMContentLoaded", (event) => loader(callback));
    }
    Lightview.whenFramed = whenFramed;
    Lightview.loader = loader;
//debugger;
    if (window.location === window.parent.location || !(window.parent instanceof Window) || window.parent !== window) {
        // loads for unframed content
        // CodePen mucks with window.parent
        addListener(document, "DOMContentLoaded", () => loader())
    }

    return {observe}
})();