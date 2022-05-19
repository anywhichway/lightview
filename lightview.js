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

if(document.body) document.currentComponent = document.body;

const Lightview = {};

const {observe} = (() => {
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
        if(template && /^\$\{[a-zA-z_.]*\}$/g.test(template)) return template.substring(2, template.length - 1);
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
            if(self) event.self = self;
            callback(event);
        });
    }

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
            name = file.split(".")[0];
        if (name.includes("-")) return name;
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
        if (value + "" === "null" || value + "" === "undefined" || toType==="any") return value;
        const type = typeof (value);
        if (type === toType) return value;
        if (toType === "number") return parseFloat(value + "");
        if (toType === "boolean") {
            if (["on", "checked", "selected"].includes(value)) return true;
            if (value == null || value === "") return false;
            try {
                const parsed = JSON.parse(value + "");
                if (typeof (parsed) === "boolean") return parsed;
                return [1, "on", "checked", "selected"].includes(parsed);
            } catch (e) {
                throw new TypeError(`Unable to convert ${value} into 'boolean'`);
            }
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
                                throw new TypeError(`Expected an Array for parsed data`)
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
                    throw new TypeError(`Unable to convert ${value} into ${isfunction ? toType.name : type}`);
                }
            }
        }
        throw new TypeError(`Unable to coerce ${value} to ${toType}`)
    }
    const Reactor = (data) => {
        if (data && typeof (data) === "object") {
            if (data.__isReactor__) return data;
            const childReactors = [],
                dependents = {},
                proxy = new Proxy(data, {
                    get(target, property) {
                        if (property === "__isReactor__") return true;
                        if(property=== "__dependents__") return dependents;
                        if(property=== "__reactorProxyTarget__") return data;
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
                        if (childReactors.includes(value) || (value && type !== "object") || typeof (property) === "symbol") {
                            // Dates and Promises must be bound to work with proxies
                            if (type === "function" && ([Date].includes(value) || property==="then")) value = value.bind(target)
                            return value;
                        }
                        if (value && type === "object") {
                            value = Reactor(value);
                            childReactors.push(value);
                        }
                        target[property] = value;
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
                            const observers = dependents[property] || [];
                            [...observers].forEach((f) => {
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

    class VariableEvent {
        constructor(config) {
            Object.assign(this, config);
        }
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
                const event = new VariableEvent({variableName: property, value: newValue});
                if (target[property] === undefined) {
                    target[property] = {type: "any", value: newValue}; // should we allow this,  do first to prevent loops
                    target.postEvent.value("change", event);
                    if (event.defaultPrevented) delete target[property].value;
                    return true;
                }
                const variable = target[property],
                    {value, shared, exported, constant, reactive, remote} = variable;
                let type = variable.type;
                if (constant) throw new TypeError(`${property}:${type} is a constant`);
                if(newValue!=null || type.required) newValue = type.validate ? type.validate(newValue,target[property]) : coerce(newValue,type);
                const newtype = typeof (newValue),
                    typetype = typeof (type);
                if ((newValue == null && !type.required) ||
                    type === "any" ||
                    (newtype === type && typetype==="string") ||
                    (typetype === "function" && !type.validate && (newValue && newtype === "object" && newValue instanceof type) || variable.validityState?.valid)) {
                    if (value !== newValue) {
                        event.oldValue = value;
                        target[property].value = reactive ? Reactor(newValue) : newValue; // do first to prevent loops
                        target.postEvent.value("change", event);
                        if (event.defaultPrevented) target[property].value = value;
                        else if(remote && (variable.reactive || remote.put)) remote.handleRemote({variable,config:remote.config},true);
                        else if(variable.set) variable.set(newValue);
                    }
                    return true;
                }
                if (typetype === "function" && newValue && newtype === "object") {
                    throw new TypeError(`Can't assign instance of '${newValue.constructor.name}' to variable '${property}:${type.name.replace("bound ", "")}'`)
                }
                throw new TypeError(`Can't assign '${typeof (newValue)} ${newtype === "string" ? '"' + newValue + '"' : newValue}' to variable '${property}:${typetype === "function" ? type.name.replace("bound ", "") : type} ${type.required ? "required" : ""}'`)
            },
            keys() {
                return [...Object.keys(vars)];
            }
        });
    }
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
    const getNodes = (root) => {
        const nodes = new Set();
        if (root.shadowRoot) {
            nodes.add(root);
            getNodes(root.shadowRoot).forEach((node) => nodes.add(node))
        } else {
            for (const node of root.childNodes) {
                if (node.tagName === "SCRIPT") continue;
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.includes("${")) {
                    node.template ||= node.nodeValue;
                    nodes.add(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    let skip;
                    [...node.attributes].forEach((attr) => {
                        if (attr.value.includes("${")) {
                            attr.template ||= attr.value;
                            nodes.add(node);
                        } else if (attr.name.includes(":") || attr.name.startsWith("l-")) {
                            skip = attr.name.includes("l-for:");
                            nodes.add(node)
                        }
                    })
                    if (node.getAttribute("type") === "radio") nodes.add(node);
                    if (!skip && !node.shadowRoot) getNodes(node).forEach((node) => nodes.add(node));
                }
            }
        }
        return nodes;
    }

    const resolveNodeOrText = (node, component, safe,extras=node.extras||{}) => {
        const type = typeof (node),
            template = type === "string" ? node.trim() : node.template;
        if (template) {
            const name = getTemplateVariableName(template);
            try {
                const parts = name ? name.split(".") : null;
                let value;
                value = (parts
                    ? (value = walk(extras,parts)) || (value = walk(component.varsProxy,parts)) || (value == null ? component[name] : value)
                    : Function("context", "extras", "with(context) { with(extras) { return `" + (safe ? template : Lightview.sanitizeTemplate(template)) + "` } }")(component.varsProxy,extras));
                //let value = Function("context", "with(context) { return `" + Lightview.sanitizeTemplate(template) + "` }")(component.varsProxy);
                if(typeof(value)==="function") return value;
                value = (name || node.nodeType === Node.TEXT_NODE || safe ? value : Lightview.escapeHTML(value));
                if (type === "string") return value==="undefined" ? undefined : value;
                if(name) {
                    node.nodeValue = value==null ? "" : typeof(value)==="string" ? value : JSON.stringify(value);
                } else {
                    node.nodeValue = value == "null" || value == "undefined" ? "" : value;
                }
                return value;
            } catch (e) {
                //console.warn(e);
                if (!e.message.includes("defined")) throw e; // actually looking for undefined or not defined
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
    const importAnchors = (node, component) => {
        [...node.querySelectorAll('a[href$=".html"][target^="#"]')].forEach((node) => {
            node.removeEventListener("click", anchorHandler);
            addListener(node, "click", anchorHandler);
        })
    }
    const bound = new WeakSet();
    const bindInput = (input, variableName, component, value, object) => {
        if (bound.has(input)) return;
        bound.add(input);
        const inputtype = input.tagName === "SELECT" || input.tagName === "TEXTAREA" ? "text" : input.getAttribute("type"),
            nameparts = variableName.split(".");
        let type = input.tagName === "SELECT" && input.hasAttribute("multiple") ? Array : inputTypeToType(inputtype);
        const variable = walk(component.vars,nameparts) || {type};
        if(type==="any") type = variable?.type.type || variable?.type;
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
                if(existingtype!==type) throw new TypeError(`Attempt to bind <input name="${variableName}" type="${type}"> to variable ${variableName}:${existing.type}`)
                existing.reactive = true;
            } else {
                component.variables({[variableName]: type},{reactive});
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
                component.observedAttributes.add(variable.name);
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
                            newValue = typeof (newValue) === "string" ? newValue : JSON.stringify(newValue);
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
                const name = variable.name;
                variable.imported = true;
                variable.value = component.hasAttribute(name) ? coerce(component.getAttribute(name), variable.type) : variable.value;
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
    const createClass = (domElementNode, {observer, framed, href=window.location.href}) => {
        const instances = new Set(),
            observedAttributes = [];
        /*let dom = domElementNode.tagName === "TEMPLATE"
            ? domElementNode.content.cloneNode(true)
            : domElementNode.cloneNode(true);*/
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
                    [...node.attributes].forEach((attr) => dom.setAttribute(attr.name,attr.value));
                    document.currentComponent = node;
                    document.currentComponent.componentBaseURI = window.location.href;
                    const lvscript = dom.querySelector("#lightview");
                    if(lvscript) {
                        const script = document.createElement("script");
                        script.innerHTML = lvscript.innerHTML;
                        document.head.appendChild(script);
                        script.remove();
                    }
                    document.currentComponent = null;
                }
                dom.mount = node.mount;
            }
            constructor() {
                super();
                this.componentBaseURI = href;
                instances.add(this);
                const currentComponent =  document.currentComponent =this,
                    shadow = this.attachShadow({mode: "open"}),
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
                            [...listeners].forEach((f) => {
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
                ["getElementById", "querySelector", "querySelectorAll"]
                    .forEach((fname) => {
                        Object.defineProperty(this, fname, {
                            configurable: true,
                            writable: true,
                            value: (...args) => this.shadowRoot[fname](...args)
                        })
                    });
                [...dom.childNodes].forEach((child) => {
                    if(child.tagName && customElements.get(child.tagName.toLowerCase())) {
                        const node = document.createElement(child.tagName);
                        [...child.attributes].forEach((attr) => node.setAttribute(attr.name,attr.value));
                        document.currentComponent = node;
                        shadow.appendChild(node);
                    } else {
                        const node = child.cloneNode(true);
                        shadow.appendChild(node);
                    }
                });
                importAnchors(shadow, this);
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
                [...dom.attributes].forEach((attr) => {
                    if(!this.hasAttribute(attr.name)) this.setAttribute(attr.name,attr.value);
                })
                if(dom.mount) {
                    const script = document.createElement("script");
                    document.currentComponent = this;
                    script.innerHTML = `with(document.currentComponent.varsProxy) { 
                        const component = document.currentComponent; 
                        (async () => { await (${dom.mount}).call(self,self); 
                        component.compile();  })(); 
                    };`;
                    this.appendChild(script);
                    script.remove();
                    document.currentComponent = null;
                }
            }
            compile() {
                // Promise.all(promises).then(() => {
                const ctx = this,
                    shadow = this.shadowRoot;
                const nodes = getNodes(ctx),
                    processNodes = (nodes,object) => {
                        nodes.forEach((node) => {
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
                                        template = attr.template;
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
                                        observe(() => {
                                            const value = resolveNodeOrText(template, ctx,false,node.extras);
                                            if(value!==undefined) {
                                                if (eltype === "checkbox") {
                                                    if (coerce(value, "boolean") === true) {
                                                        node.setAttribute("checked", "");
                                                        node.checked = true;
                                                    } else {
                                                        node.removeAttribute("checked");
                                                        node.checked = false;
                                                    }
                                                } else if (node.tagName === "SELECT") {
                                                    let values = [value];
                                                    if (node.hasAttribute("multiple")) values = coerce(value, Array);
                                                    [...node.querySelectorAll("option")].forEach(async (option) => {
                                                        if (option.hasAttribute("value")) {
                                                            if (values.includes(resolveNodeOrText(option.attributes.value, ctx,false,node.extras))) {
                                                                option.setAttribute("selected", "");
                                                                option.selected = true;
                                                            }
                                                        } else if (values.includes(resolveNodeOrText(option.innerText, ctx,false,node.extras))) {
                                                            option.setAttribute("selected", "");
                                                            option.selected = true;
                                                        }
                                                    })
                                                } else if (eltype!=="radio") {
                                                    //attr.value = typeof(value)==="string" ? value : JSON.stringify(value);
                                                    let avalue = typeof(value)==="string" ? value : value.toString ? value.toString() : JSON.stringify(value);
                                                    if(avalue.startsWith('"')) avalue = avalue.substring(1);
                                                    if(avalue.endsWith('"')) avalue = avalue.substring(0,avalue.length-1);
                                                    attr.value = avalue;
                                                }
                                            }
                                        });
                                    }
                                }
                                [...node.attributes].forEach(async (attr) => {
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
                                        observe(() => {
                                            const value = resolveNodeOrText(attr, this,true,node.extras);
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
                                    } else if (type === "l-if") {
                                        observe(() => {
                                            const value = resolveNodeOrText(attr, this,true,node.extras);
                                            node.style.setProperty("display", value == true || value === "true" ? "revert" : "none");
                                        })
                                    } else if (type === "l-for") {
                                        node.template ||= node.innerHTML;
                                        node.clone ||= node.cloneNode(true);
                                        observe(() => {
                                            const [what = "each", vname = "item", index = "index", array = "array", after = false] = params,
                                                value = resolveNodeOrText(attr, this,false,node.extras),
                                                coerced = coerce(value, what === "each" ? Array : "object"),
                                                target = what === "each" ? coerced : Object[what](coerced),
                                                children = target.reduce((children,item,i,target) => {
                                                    const clone = node.clone.cloneNode(true),
                                                        extras = node.extras = {
                                                            [vname]: item,
                                                            [index]: i,
                                                            [array]: target
                                                        },
                                                        nodes = [...getNodes(clone)].map((node) => {
                                                            node.extras = extras;
                                                            return node;
                                                        });
                                                    processNodes(nodes);
                                                    children.push(...clone.childNodes);
                                                    return children;
                                                },[]);
                                            if (!window.lightviewDebug) {
                                                if (after) {
                                                    node.style.setProperty("display", "none")
                                                } else {
                                                    while (node.lastElementChild) node.lastElementChild.remove();
                                                }
                                            }
                                            //const nodes = getNodes(parsed.body);
                                            children.forEach((child) => {
                                                //while (parsed.body.firstChild) {
                                                //const child = parsed.body.firstChild;
                                                if (after) node.parentElement.insertBefore(child, node);
                                                else node.appendChild(child);
                                            })
                                            //processNodes(nodes);
                                        })
                                    } else if(attr.template) {
                                        observe(() => {
                                            resolveNodeOrText(attr, this,false,node.extras);
                                        })
                                    }
                                })
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
                            processNodes(childnodes,variable.value);
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
                            const event = new VariableEvent({
                                variableName: variableName,
                                value: value,
                                oldValue: variable.value
                            });
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

            variables(variables, {remote, constant,set,...rest} = {}) { // options = {observed,reactive,shared,exported,imported}
                const options = {remote, constant,...rest},
                    addEventListener = this.varsProxy.addEventListener;
                if (variables !== undefined) {
                    Object.entries(variables)
                        .forEach(([key, type]) => {
                            if(isArrowFunction(type)) type = type();
                            const variable = this.vars[key] ||= {name: key, type};
                            if(set!==undefined && constant!==undefined) throw new TypeError(`${key} has the constant value ${constant} and can't be set to ${set}`);
                            variable.value = set;
                            if(constant!==undefined) {
                                if(remote || imported) throw new TypeError(`${key} can't be a constant and also remote or imported`)
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

    const createComponent = (name, node, {framed, observer, href} = {}) => {
        let ctor = customElements.get(name);
        if (ctor) {
            if (framed && !ctor.lightviewFramed) ctor.lightviewFramed = true;
            else console.warn(new Error(`${name} is already a CustomElement. Not redefining`));
            return ctor;
        }
        ctor = createClass(node, {observer, framed, href});
        customElements.define(name, ctor);
        Lightview.customElements.set(name, ctor);
        return ctor;
    }
    Lightview.customElements = new Map();
    Lightview.createComponent = createComponent;
    const importLink = async (link, observer) => {
        const url = (new URL(link.getAttribute("href"), window.location.href)),
            as = link.getAttribute("as") || getNameFromPath(url.pathname);
        if (url.hostname !== window.location.hostname && !link.getAttribute("crossorigin")) {
            throw new URIError(`importLink:HTML imports must be from same domain: ${url.hostname}!=${location.hostname} unless 'crossorigin' attribute is set.`)
        }
        if (!customElements.get(as)) {
            const html = await (await fetch(url.href)).text(),
                dom = parser.parseFromString(html, "text/html"),
                unhide = !!dom.head.querySelector('meta[name="l-unhide"]'),
                modulelinks = dom.head.querySelectorAll('link[href$=".html"][rel=module]');
            for (const childlink of modulelinks) {
                const href = childlink.getAttribute("href"),
                    childurl = new URL(href, url.href);
                childlink.setAttribute("href", childurl.href);
                if (link.hasAttribute("crossorigin")) childlink.setAttribute("crossorigin", link.getAttribute("crossorigin"))
                await importLink(childlink, observer);
            }
            const links =  dom.head.querySelectorAll('link:not([href$=".html"][rel=module])');
            for(const childlink of links) {
                const href = childlink.getAttribute("href"),
                    childurl = new URL(href, url.href);
                childlink.setAttribute("href", childurl.href);
                if (link.hasAttribute("crossorigin")) childlink.setAttribute("crossorigin", link.getAttribute("crossorigin"));
                dom.body.insertBefore(childlink,dom.body.firstChild);
            }
            document.currentComponent = dom.body;
            document.currentComponent.componentBaseURI = url.href;
            const lvscript = dom.getElementById("lightview");
            if(lvscript) {
                const script = document.createElement("script");
                script.innerHTML = lvscript.innerHTML;
                document.body.appendChild(script);
                script.remove();
            }
            document.currentComponent = null;
            createComponent(as, dom.body, {observer,href:url.href});
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
        const parent = document.body.parentElement;
        createComponent(as, document.body, {framed});
        const component = document.createElement(as);
        parent.replaceChild(component, document.body);
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
                data = {...data, href: window.location.href};
                target.contentWindow.postMessage(JSON.stringify(data), "*");
            } else {
                data = {...data, iframeId: document.lightviewId, href: window.location.href};
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

    const url = new URL(document.currentScript.getAttribute("src"), window.location.href);
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
                    if (type === "setAttribute") {
                        const [name, value] = [...argsList],
                            variable = document.body.vars[name];
                        if (variable && variable.imported) document.body.setVariableValue(name, value);
                        return;
                    }
                    if (type === "removeAttribute") {
                        const [name] = argsList[0],
                            variable = document.body.vars[name];
                        if (variable && variable.imported) document.body.setVariableValue(name, undefined);

                    }
                });
                const url = new URL(window.location.href);
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
                        postMessage({type: "framed", href: window.location.href}, iframe);
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
                const observer = OBSERVER = new MutationObserver(mutationCallback),
                    iframe = document.getElementById("myframe");
                observer.observe(iframe, {attributes: true, attributeOldValue: true});
            }
        }
    }
    const whenFramed = (callback, {isolated} = {}) => {
        // loads for framed content
        addListener(document, "DOMContentLoaded", (event) => loader(callback));
    }
    Lightview.whenFramed = whenFramed;

    if (window.location === window.parent.location || !(window.parent instanceof Window) || window.parent !== window) {
        // loads for unframed content
        // CodePen mucks with window.parent
        addListener(document, "DOMContentLoaded", () => loader())
    }

    return {observe}
})();