// Test harness for the Reading Challenge SPA.
//
// The app is a single HTML file with no build step, so the harness extracts the
// inline <script> straight out of index.html and runs it in a vm context with
// just enough of a DOM and localStorage to exercise the real functions. No
// dependencies — run with `node tests/app.test.js`.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX = path.join(__dirname, '..', 'index.html');

function extractScript(html) {
    const start = html.indexOf('<script>');
    const end = html.indexOf('</script>', start);
    if (start === -1 || end === -1) throw new Error('no inline <script> found in index.html');
    return html.slice(start + '<script>'.length, end);
}

// Minimal stand-in for an element: only what the app actually touches.
function makeEl(id) {
    const classes = new Set();
    const el = {
        id, innerHTML: '', textContent: '', value: '', href: '', style: {}, attrs: {},
        classList: {
            add: c => classes.add(c),
            remove: c => classes.delete(c),
            contains: c => classes.has(c),
            toggle: (c, force) => {
                const on = force === undefined ? !classes.has(c) : !!force;
                if (on) classes.add(c); else classes.delete(c);
                return on;
            }
        },
        setAttribute: (k, v) => { el.attrs[k] = v; },
        getAttribute: k => el.attrs[k],
        addEventListener() {}, removeEventListener() {}, focus() {},
        appendChild() {}, removeChild() {}, setPointerCapture() {}, click() {},
        closest: () => null,
        getContext: () => null,          // no canvas: icon generation is expected to fail
        toDataURL: () => 'data:,'
    };
    return el;
}

// createApp(initialChallenges) seeds storage *before* the app script runs, so
// each test starts from a genuine cold page load with its own fresh state.
function createApp(initialChallenges) {
    const els = {};
    const document = {
        documentElement: makeEl('html'),
        body: makeEl('body'),
        getElementById: id => (els[id] || (els[id] = makeEl(id))),
        querySelector: () => makeEl('query'),
        createElement: () => makeEl('created'),
        addEventListener() {}
    };

    const store = {};
    if (initialChallenges) store['reading_challenges'] = JSON.stringify(initialChallenges);
    let failWrites = false;
    const localStorage = {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => {
            if (failWrites) throw new Error('QuotaExceededError');
            store[k] = String(v);
        },
        removeItem: k => { delete store[k]; }
    };

    const alerts = [];
    const confirms = [];
    let confirmAnswer = true;
    let reloaded = false;

    // Swallow the app's own console.warn (canvas is unavailable here) but let
    // anything unexpected through.
    const quietConsole = Object.assign({}, console, { warn() {} });

    const ctx = {
        document, localStorage, console: quietConsole,
        navigator: {},                       // no serviceWorker: registration is skipped
        alert: m => alerts.push(String(m)),
        confirm: m => { confirms.push(String(m)); return confirmAnswer; },
        matchMedia: () => ({ matches: false }),
        location: { reload: () => { reloaded = true; } },
        performance, setTimeout, JSON, Math, Date, Set, Map, Number, String, Array,
        Object, parseInt, parseFloat, isNaN, Error
    };
    ctx.window = ctx;
    ctx.Image = function () { return makeEl('img'); };
    ctx.Blob = function () {};
    ctx.URL = { createObjectURL: () => 'blob:stub', revokeObjectURL() {} };
    // FileReader stub: fires onload synchronously with the file's text.
    ctx.FileReader = function () {
        const self = this;
        this.readAsText = file => self.onload({ target: { result: file.__text } });
    };

    vm.createContext(ctx);
    vm.runInContext(extractScript(fs.readFileSync(INDEX, 'utf8')), ctx);

    return {
        ctx,
        // Top-level `let` bindings are not properties of the global object, so
        // reach them by evaluating inside the same context.
        evalIn: expr => vm.runInContext(expr, ctx),
        alerts, confirms,
        setConfirm: v => { confirmAnswer = v; },
        setFailWrites: v => { failWrites = v; },
        reloaded: () => reloaded,
        seed: challenges => { store['reading_challenges'] = JSON.stringify(challenges); },
        read: () => JSON.parse(store['reading_challenges'] || '[]'),
        html: () => ctx.document.getElementById('challenges').innerHTML
    };
}

module.exports = { createApp, makeEl };
