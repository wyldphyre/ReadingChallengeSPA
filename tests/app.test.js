// Regression tests for index.html. Run with: node tests/app.test.js
//
// Each test builds a fresh app instance, which re-runs the real inline script
// from index.html against a stubbed DOM — so these exercise shipped code, not a
// re-implementation of it.

const { createApp } = require('./harness.js');

const YEAR = new Date().getFullYear();
let passed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        console.log('  \x1b[32mPASS\x1b[0m  ' + name);
        passed++;
    } catch (err) {
        console.log('  \x1b[31mFAIL\x1b[0m  ' + name + '\n        ' + err.message);
        failures.push(name);
    }
}

function group(name) { console.log('\n' + name); }

function eq(actual, expected, msg) {
    const a = JSON.stringify(actual), b = JSON.stringify(expected);
    if (a !== b) throw new Error((msg ? msg + ' ' : '') + 'expected ' + b + ', got ' + a);
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected truthy'); }
function includes(haystack, needle, msg) {
    if (!String(haystack).includes(needle)) throw new Error((msg || 'missing') + ': ' + needle);
}

const challenge = over => Object.assign(
    { year: YEAR, target: 24, booksCompleted: 6, locked: false, autoLocked: false }, over);

/* ------------------------------------------------------------------ *
 * editingIndex is a raw array index; it must never outlive its target *
 * ------------------------------------------------------------------ */
group('editing against a changing list');

test('reset while editing tears the form down', () => {
    const app = createApp([challenge()]);
    app.ctx.editChallenge(0);
    eq(app.evalIn('editingIndex'), 0, 'editing;');
    app.setConfirm(true);
    app.ctx.resetAllData();
    eq(app.evalIn('editingIndex'), null, 'edit abandoned;');
    eq(app.ctx.document.getElementById('addForm').classList.contains('open'), false, 'form closed;');
    eq(app.read(), [], 'store empty;');
});

test('a stale editingIndex is refused instead of throwing', () => {
    const app = createApp([challenge()]);
    app.ctx.editChallenge(0);
    app.seed([]);                                  // storage emptied behind the form
    app.ctx.document.getElementById('year').value = String(YEAR);
    app.ctx.document.getElementById('target').value = '20';
    app.ctx.saveChallenge();                       // pre-fix: TypeError
    eq(app.read(), [], 'no phantom record;');
    eq(app.alerts, ['That challenge no longer exists.']);
    eq(app.evalIn('editingIndex'), null, 'form reset;');
});

test('deleting an earlier challenge does not overwrite the wrong record', () => {
    const app = createApp([
        challenge({ year: YEAR - 2, target: 10, booksCompleted: 10, locked: true, autoLocked: true }),
        challenge({ target: 20, booksCompleted: 5 })
    ]);
    app.ctx.editChallenge(1);                      // editing the current year
    app.setConfirm(true);
    app.ctx.deleteChallenge(0);                    // delete the older one; indices shift
    eq(app.evalIn('editingIndex'), null, 'edit abandoned;');
    eq(app.read().length, 1, 'one left;');
    eq(app.read()[0].target, 20, 'survivor untouched;');
});

test('deletion keeps the expanded set pointing at the same cards', () => {
    const app = createApp([
        challenge({ year: YEAR - 2, locked: true, autoLocked: true }),
        challenge()
    ]);
    app.evalIn('expandedCards.clear()');
    app.evalIn('expandedCards.add(1)');             // current year expanded
    app.setConfirm(true);
    app.ctx.deleteChallenge(0);
    eq([...app.evalIn('expandedCards')], [0], 'index remapped;');
});

/* ------------------------------------------- *
 * auto-lock must not undo a deliberate unlock *
 * ------------------------------------------- */
group('locking past years');

test('unlocking a past year survives the next load', () => {
    const app = createApp([challenge({ year: YEAR - 2, locked: true, autoLocked: true })]);
    app.ctx.toggleLock(0);
    eq(app.read()[0].locked, false, 'after unlock;');
    app.ctx.lockPreviousYears();                    // what the next page load runs
    eq(app.read()[0].locked, false, 'after reload;');
});

test('legacy records with no autoLocked flag still auto-lock once', () => {
    const app = createApp([{ year: YEAR - 2, target: 12, booksCompleted: 3 }]);  // pre-1.3.3
    eq(app.read()[0].locked, true, 'migration locks;');
    eq(app.read()[0].autoLocked, true, 'and marks;');
    app.ctx.toggleLock(0);
    app.ctx.lockPreviousYears();
    eq(app.read()[0].locked, false, 'then respects unlock;');
});

test('a newly added past-year challenge auto-locks', () => {
    const app = createApp([]);
    const d = app.ctx.document;
    app.ctx.toggleAddForm();
    d.getElementById('year').value = String(YEAR - 5);
    d.getElementById('target').value = '5';
    d.getElementById('booksCompleted').value = '5';
    app.ctx.saveChallenge();
    eq(app.read()[0].locked, true);
    eq(app.read()[0].autoLocked, true);
});

test('the current year is never auto-locked', () => {
    const app = createApp([challenge()]);
    eq(app.read()[0].locked, false);
});

/* ------------------------------- *
 * locked means protected, fully   *
 * ------------------------------- */
group('locked challenges');

test('locked cards disable edit, delete and both counters', () => {
    const app = createApp([challenge({ locked: true })]);
    const html = app.html();
    for (const cls of ['edit-btn', 'delete-btn', 'counter-btn minus', 'counter-btn plus']) {
        const m = html.match(new RegExp('<button class="' + cls + '[^"]*"([^>]*)>'));
        ok(m, 'missing button: ' + cls);
        includes(m[1], 'disabled', cls + ' should be disabled');
    }
});

test('unlocked cards keep those controls enabled', () => {
    const app = createApp([challenge()]);
    const m = app.html().match(/<button class="delete-btn"([^>]*)>/);
    ok(m && !m[1].includes('disabled'), 'delete should be enabled');
});

/* --------------------------------- *
 * storage failures must be surfaced *
 * --------------------------------- */
group('storage write failures');

test('a failed write alerts and leaves data unchanged', () => {
    const app = createApp([challenge({ booksCompleted: 4 })]);
    app.setFailWrites(true);
    app.ctx.updateCompleted(0, 1);
    app.setFailWrites(false);
    eq(app.read()[0].booksCompleted, 4, 'unchanged;');
    eq(app.alerts.length, 1, 'user told;');
});

test('a failed delete does not remap the expanded set', () => {
    const app = createApp([
        challenge({ year: YEAR - 2, locked: true, autoLocked: true }),
        challenge()
    ]);
    app.evalIn('expandedCards.clear()');
    app.evalIn('expandedCards.add(1)');
    app.setConfirm(true);
    app.setFailWrites(true);
    app.ctx.deleteChallenge(0);                     // write fails: nothing was removed
    app.setFailWrites(false);
    eq(app.read().length, 2, 'nothing deleted;');
    eq([...app.evalIn('expandedCards')], [1], 'expansion must not shift;');
});

test('a failed write during save does not clear the form', () => {
    const app = createApp([]);
    const d = app.ctx.document;
    app.ctx.toggleAddForm();
    d.getElementById('year').value = String(YEAR);
    d.getElementById('target').value = '12';
    app.setFailWrites(true);
    app.ctx.saveChallenge();
    app.setFailWrites(false);
    eq(d.getElementById('year').value, String(YEAR), 'input preserved;');
    eq(d.getElementById('addForm').classList.contains('open'), true, 'form still open;');
});

/* ------------------ *
 * import validation  *
 * ------------------ */
group('import');

const doImport = (app, text) =>
    app.ctx.importData({ target: { files: [{ __text: text }], value: 'x' } });

test('a valid file imports', () => {
    const app = createApp([]);
    doImport(app, JSON.stringify([{ year: YEAR, target: 10 }, { year: YEAR - 1, target: 20, booksCompleted: 20 }]));
    eq(app.read().length, 2);
    eq(app.alerts, ['Data imported successfully.']);
});

test('duplicate years are rejected', () => {
    const app = createApp([challenge({ year: 2030, target: 1 })]);
    doImport(app, JSON.stringify([{ year: YEAR, target: 10 }, { year: YEAR, target: 20 }]));
    eq(app.alerts, ['Failed to import data. Please check the file format.']);
    eq(app.read()[0].year, 2030, 'existing data untouched;');
});

test('malformed JSON is rejected', () => {
    const app = createApp([challenge({ year: 2030, target: 1 })]);
    doImport(app, 'not json at all');
    eq(app.alerts, ['Failed to import data. Please check the file format.']);
    eq(app.read().length, 1, 'existing data untouched;');
});

test('a non-array payload is rejected', () => {
    const app = createApp([]);
    doImport(app, JSON.stringify({ year: YEAR, target: 10 }));
    eq(app.alerts, ['Failed to import data. Please check the file format.']);
});

test('an out-of-range year is rejected', () => {
    const app = createApp([]);
    doImport(app, JSON.stringify([{ year: 1500, target: 10 }]));
    eq(app.alerts, ['Failed to import data. Please check the file format.']);
});

test('a zero or missing target is rejected', () => {
    const app = createApp([]);
    doImport(app, JSON.stringify([{ year: YEAR, target: 0 }]));
    eq(app.alerts, ['Failed to import data. Please check the file format.']);
});

test('import closes an open edit form', () => {
    const app = createApp([challenge()]);
    app.ctx.editChallenge(0);
    doImport(app, JSON.stringify([{ year: YEAR - 7, target: 3 }]));
    eq(app.evalIn('editingIndex'), null, 'edit abandoned;');
});

test('import never re-opens a settings sheet the user dismissed', () => {
    const app = createApp([]);
    app.ctx.toggleSettings();                       // open
    app.ctx.toggleSettings();                       // dismissed while the file was reading
    doImport(app, JSON.stringify([{ year: YEAR, target: 10 }]));
    eq(app.ctx.document.getElementById('settingsPanel').classList.contains('open'), false,
       'should stay closed;');
});

test('autoLocked survives an export/import round trip', () => {
    const app = createApp([challenge({ year: YEAR - 6, locked: false, autoLocked: true })]);
    const exported = JSON.stringify(app.ctx.loadChallenges());
    app.seed([]);
    doImport(app, exported);
    eq(app.read()[0].autoLocked, true, 'flag preserved;');
    app.ctx.lockPreviousYears();
    eq(app.read()[0].locked, false, 'unlock still respected;');
});

/* -------------------------- *
 * hostile / hand-edited data *
 * -------------------------- */
group('storage sanitising');

test('markup in stored fields cannot reach the renderer', () => {
    const app = createApp([{ year: '<img src=x onerror=alert(1)>', target: 5 }]);
    ok(!app.html().includes('<img'), 'injection reached the DOM');
});

test('non-array storage falls back to empty', () => {
    const app = createApp([]);
    app.evalIn('localStorage.setItem("reading_challenges", "{\\"nope\\":1}")');
    eq(app.ctx.loadChallenges(), []);
});

/* ------------------------- *
 * stats and rendered output *
 * ------------------------- */
group('stats and rendering');

test('current-year stats include daysElapsed and percentElapsed', () => {
    const app = createApp([]);
    const s = app.ctx.calculateStats(YEAR, 24, 10);
    ok(typeof s.daysElapsed === 'number', 'daysElapsed missing');
    ok(s.percentElapsed !== undefined, 'percentElapsed missing');
});

test('required daily rate is books per day, not a percentage', () => {
    const app = createApp([]);
    const s = app.ctx.calculateStats(YEAR, 24, 0);
    ok(!String(s.dailyRate).includes('%'), 'still a percentage: ' + s.dailyRate);
    const n = parseFloat(s.dailyRate);
    ok(n >= 0 && n < 5, 'implausible rate: ' + s.dailyRate);
});

test('a met target reports Complete rather than a rate', () => {
    const app = createApp([]);
    const s = app.ctx.calculateStats(YEAR, 5, 5);
    eq(s.requiredRate, 'Complete');
    eq(s.remainingDaysPerBook, 'Complete');
});

test('exceeding the target caps the bar and shows the excess', () => {
    const app = createApp([challenge({ target: 10, booksCompleted: 13 })]);
    const html = app.html();
    includes(html, 'width: 100%', 'bar not capped');
    includes(html, '+3', 'excess not shown');
    includes(html, 'progress-fill complete', 'not marked complete');
});

test('rendered markup is balanced and free of undefined/NaN', () => {
    const app = createApp([
        challenge({ booksCompleted: 30 }),
        challenge({ year: YEAR - 1, target: 12, booksCompleted: 12, locked: true, autoLocked: true })
    ]);
    const html = app.html();
    eq((html.match(/<div\b/g) || []).length, (html.match(/<\/div>/g) || []).length, 'div tags;');
    eq((html.match(/<button\b/g) || []).length, (html.match(/<\/button>/g) || []).length, 'button tags;');
    ok(!/undefined|NaN/.test(html), 'undefined or NaN leaked into markup');
});

test('the empty state renders when there are no challenges', () => {
    const app = createApp([]);
    includes(app.html(), 'empty-state');
});

/* -------------- *
 * accessibility  *
 * -------------- */
group('accessibility');

test('every icon button carries an accessible name', () => {
    const app = createApp([challenge()]);
    const html = app.html();
    for (const cls of ['lock-btn', 'edit-btn', 'delete-btn', 'counter-btn minus',
                       'counter-btn plus', 'expand-arrow']) {
        const m = html.match(new RegExp('<button class="' + cls + '[^"]*"([^>]*)>'));
        ok(m, 'missing button: ' + cls);
        ok(/aria-label="[^"]+"/.test(m[1]), 'no aria-label on ' + cls);
    }
});

test('the progress bar exposes its value and range', () => {
    const app = createApp([challenge({ target: 24, booksCompleted: 6 })]);
    const m = app.html().match(/<div class="progress-bar"([^>]*)>/)[1];
    for (const attr of ['role="progressbar"', 'aria-valuenow="6"', 'aria-valuemin="0"',
                        'aria-valuemax="24"']) {
        includes(m, attr);
    }
});

test('the lock button reports its pressed state', () => {
    const app = createApp([challenge({ locked: true })]);
    includes(app.html(), 'aria-pressed="true"');
});

test('the expand arrow toggles and reports aria-expanded', () => {
    const app = createApp([challenge()]);
    includes(app.html(), 'aria-expanded="true"', 'current year should load expanded');
    let stopped = false;
    app.ctx.toggleExpand({ stopPropagation: () => { stopped = true; }, target: null }, 0, true);
    ok(stopped, 'arrow click should stop propagation to the card');
    includes(app.html(), 'aria-expanded="false"', 'should have collapsed');
});

test('a card tap still ignores presses on action buttons', () => {
    const app = createApp([challenge()]);
    const before = app.html();
    app.ctx.toggleExpand({ target: { closest: () => ({}) } }, 0);
    eq(app.html(), before, 'unchanged;');
});

test('previous challenges are a real button with disclosure semantics', () => {
    const app = createApp([
        challenge(),
        challenge({ year: YEAR - 1, target: 12, booksCompleted: 12, locked: true, autoLocked: true })
    ]);
    const html = app.html();
    const m = html.match(/<button class="previous-challenges-header[^"]*"([^>]*)>/);
    ok(m, 'not rendered as a button');
    includes(m[1], 'aria-expanded=');
    includes(m[1], 'aria-controls="previousChallenges"');
    includes(html, 'id="previousChallenges"', 'aria-controls target missing');
});

test('opening settings updates aria state on both sheet and trigger', () => {
    const app = createApp([]);
    app.ctx.toggleSettings();
    const d = app.ctx.document;
    eq(d.getElementById('settingsPanel').getAttribute('aria-hidden'), 'false');
    eq(d.getElementById('settingsBtn').getAttribute('aria-expanded'), 'true');
    app.ctx.toggleSettings();
    eq(d.getElementById('settingsPanel').getAttribute('aria-hidden'), 'true');
    eq(d.getElementById('settingsBtn').getAttribute('aria-expanded'), 'false');
});

/* -------- */
console.log('\n' + (failures.length
    ? '\x1b[31m' + failures.length + ' failed\x1b[0m, ' + passed + ' passed'
    : '\x1b[32mAll ' + passed + ' tests passed\x1b[0m'));
process.exit(failures.length ? 1 : 0);
