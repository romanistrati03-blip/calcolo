(() => {
  'use strict';
  const C = window.IperitoCalculations;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const number = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const today = () => new Date().toLocaleDateString('it-IT');
  let sessionKey = null;
  let toastTimer;
  let idleTimer;

  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600); }
  function go(page) {
    $$('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (page === 'history') renderHistory();
  }
  document.addEventListener('click', e => { const target = e.target.closest('[data-page]'); if (target) { e.preventDefault(); go(target.dataset.page); } });

  function dbOpen() { return new Promise((resolve, reject) => { const req = indexedDB.open('iperito-private-v1', 1); req.onupgradeneeded = () => { const db = req.result; db.createObjectStore('vault'); }; req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  async function dbGet(key) { const db = await dbOpen(); return new Promise((resolve, reject) => { const req = db.transaction('vault').objectStore('vault').get(key); req.onsuccess = () => { db.close(); resolve(req.result); }; req.onerror = () => { db.close(); reject(req.error); }; }); }
  async function dbPut(key, value) { const db = await dbOpen(); return new Promise((resolve, reject) => { const tx = db.transaction('vault', 'readwrite'); tx.objectStore('vault').put(value, key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
  async function dbDelete(key) { const db = await dbOpen(); return new Promise((resolve, reject) => { const tx = db.transaction('vault', 'readwrite'); tx.objectStore('vault').delete(key); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }
  async function derive(passphrase, salt) { const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
  async function seal(object, key = sessionKey) { const iv = crypto.getRandomValues(new Uint8Array(12)); const bytes = new TextEncoder().encode(JSON.stringify(object)); const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes); return { version: 1, iv: [...iv], data: [...new Uint8Array(encrypted)] }; }
  async function unseal(envelope, key = sessionKey) { const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(envelope.iv) }, key, new Uint8Array(envelope.data)); return JSON.parse(new TextDecoder().decode(decrypted)); }
  async function unlock(passphrase, create = false) {
    let meta = await dbGet('meta');
    if (!meta && create) { meta = { salt: [...crypto.getRandomValues(new Uint8Array(16))] }; await dbPut('meta', meta); }
    if (!meta) throw new Error('Archivio non ancora creato.');
    const candidate = await derive(passphrase, new Uint8Array(meta.salt));
    const check = await dbGet('check');
    if (check) { try { await unseal(check, candidate); } catch { throw new Error('Passphrase non corretta.'); } }
    else { await dbPut('check', await seal({ check: 'iperito-v1' }, candidate)); }
    sessionKey = candidate; updateVaultUI(); refreshIdleLock();
  }
  async function lock() { clearTimeout(idleTimer); sessionKey = null; updateVaultUI(); renderHistory(); }
  function refreshIdleLock() { clearTimeout(idleTimer); if (sessionKey) idleTimer = setTimeout(() => { lock(); toast('Archivio bloccato dopo inattività.'); }, 5 * 60 * 1000); }
  function updateVaultUI() { const unlocked = !!sessionKey; $('#vault-button').textContent = unlocked ? 'Blocca archivio' : 'Sblocca archivio'; $('#home-vault').textContent = unlocked ? 'Sbloccato' : 'Bloccato'; $('#home-vault-note').textContent = unlocked ? 'Sessione aperta su questo dispositivo' : 'Sbloccalo per consultare lo storico'; $('#history-locked').classList.toggle('hidden', unlocked); }
  async function readRecords() { if (!sessionKey) throw new Error('Sblocca prima l’archivio.'); const envelope = await dbGet('records'); return envelope ? await unseal(envelope) : []; }
  async function writeRecords(records) { await dbPut('records', await seal(records)); $('#history-count').textContent = String(records.length); $('#home-count').textContent = String(records.length); }
  async function saveRecord(kind, title, value, data) {
    if (!sessionKey) { toast('Sblocca l’archivio prima di salvare.'); return; }
    try { const records = await readRecords(); records.unshift({ id: crypto.randomUUID(), kind, title: title || kind, value, date: new Date().toISOString(), data }); await writeRecords(records.slice(0, 100)); toast('Simulazione salvata nello storico cifrato.'); }
    catch (err) { toast(err.message || 'Salvataggio non riuscito.'); }
  }
  async function renderHistory() {
    const list = $('#history-list'); list.replaceChildren(); if (!sessionKey) { $('#history-locked').classList.remove('hidden'); return; }
    $('#history-locked').classList.add('hidden');
    try {
      const records = await readRecords(); $('#history-count').textContent = String(records.length); $('#home-count').textContent = String(records.length);
      if (!records.length) { list.innerHTML = '<div class="result-card empty-result">Non hai ancora salvato simulazioni.</div>'; return; }
      list.innerHTML = records.map(r => `<article class="history-item"><div><strong>${esc(r.title)}</strong><small>${esc(r.kind)} · ${new Date(r.date).toLocaleString('it-IT')}</small><details><summary>Parametri salvati</summary><pre>${esc(JSON.stringify(r.data, null, 2))}</pre></details></div><span class="history-value">${esc(r.value || '')}</span><button data-delete-record="${esc(r.id)}">Elimina</button></article>`).join('');
    } catch (err) { toast(err.message); }
  }
  document.addEventListener('click', async e => {
    const del = e.target.closest('[data-delete-record]');
    if (del) { try { const records = await readRecords(); await writeRecords(records.filter(x => x.id !== del.dataset.deleteRecord)); renderHistory(); } catch (err) { toast(err.message); } }
    const saver = e.target.closest('[data-save]');
    if (saver) saveFrom(saver.dataset.save);
  });
  ['pointerdown', 'keydown', 'touchstart'].forEach(name => document.addEventListener(name, refreshIdleLock, { passive: true }));

  function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  function resultMetrics(items, note = '') { return `<div class="result-grid">${items.map(([label, value]) => `<div class="result-item"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>${note ? `<p class="result-note">${esc(note)}</p>` : ''}`; }

  $('#omi-form').addEventListener('submit', e => { e.preventDefault(); const d = formObject(e.currentTarget); const lo = Number(d.min), hi = Number(d.max); if (hi < lo) return toast('Il valore massimo deve essere almeno pari al minimo.'); const mean = (lo + hi) / 2; $('#omi-result').classList.remove('empty-result'); $('#omi-result').innerHTML = resultMetrics([['Intervallo OMI', `${fmt.format(lo)} – ${fmt.format(hi)} / m²`], ['Valore medio indicativo', `${fmt.format(mean)} / m²`], ['Comune / zona', `${esc(d.comune)}${d.zona ? ` · ${esc(d.zona)}` : ''}`], ['Periodo', d.semestre || 'Non specificato']], `Fonte dichiarata: ${d.fonte || 'Non specificata'}. Tipologia: ${d.tipologia}; stato conservativo: ${d.stato}.`); });

  const surfaceDefaults = [['Superficie principale', 100], ['Balconi e terrazze', 30], ['Cantina / soffitta', 25], ['Box / posto auto', 50]];
  function addSurfaceRow(name = '', coefficient = 100, area = 0) { const tr = document.createElement('tr'); tr.innerHTML = `<td><input aria-label="Ambiente" value="${esc(name)}"></td><td><input aria-label="Superficie in metri quadri" type="number" min="0" step="0.01" value="${area}"></td><td><input aria-label="Coefficiente percentuale" type="number" min="0" max="100" step="1" value="${coefficient}"></td><td class="ragguagliata">0,00</td><td><button aria-label="Rimuovi riga">Rimuovi</button></td>`; $('#surface-table tbody').append(tr); }
  surfaceDefaults.forEach(([name, c]) => addSurfaceRow(name, c));
  function surfaceItems() { return $$('#surface-table tbody tr').map(tr => ({ name: $('td:nth-child(1) input', tr).value, area: Number($('td:nth-child(2) input', tr).value || 0), coefficientPercent: Number($('td:nth-child(3) input', tr).value || 0) })); }
  function updateSurface() { let total = 0; $$('#surface-table tbody tr').forEach(tr => { const area = Number($('td:nth-child(2) input', tr).value || 0), coefficient = Number($('td:nth-child(3) input', tr).value || 0); const weighted = area * coefficient / 100; total += weighted; $('.ragguagliata', tr).textContent = `${number.format(weighted)} m²`; }); $('#surface-total').textContent = `${number.format(total)} m²`; }
  $('#surface-table').addEventListener('input', updateSurface); $('#add-surface').addEventListener('click', () => { addSurfaceRow('Nuova superficie', 0); updateSurface(); }); $('#surface-table').addEventListener('click', e => { if (e.target.matches('button')) { e.target.closest('tr').remove(); updateSurface(); } });
  $('#save-surface').addEventListener('click', () => { const items = surfaceItems(); const total = C.commercialSurface(items); saveRecord('Superficie commerciale', 'Calcolo superficie', `${number.format(total)} m²`, { items, total }); }); updateSurface();

  let lastEstimate = null;
  $('#estimate-form').addEventListener('submit', e => { e.preventDefault(); const d = formObject(e.currentTarget); const amount = C.estimate({ surface: d.surface, unitValue: d.unit, adjustmentPercent: d.adjustment || 0 }); lastEstimate = { d, amount }; $('#estimate-result').classList.remove('empty-result'); $('#estimate-result').innerHTML = resultMetrics([['Valore base', fmt.format(Number(d.surface) * Number(d.unit))], ['Aggiustamento', `${number.format(Number(d.adjustment || 0))}%`], ['Stima indicativa', fmt.format(amount)]], 'Valore orientativo; l’aggiustamento è interamente determinato dall’utente.'); });

  let lastCosts = null;
  $('#costs-form').addEventListener('submit', e => { e.preventDefault(); const d = formObject(e.currentTarget); const r = C.purchaseBudget(d); lastCosts = { d, r }; $('#costs-result').classList.remove('empty-result'); $('#costs-result').innerHTML = resultMetrics([['Prezzo immobile', fmt.format(r.price)], ['Spese accessorie inserite', fmt.format(r.totalCosts)], ['Budget complessivo', fmt.format(r.totalBudget)]], 'Il totale comprende esclusivamente le voci inserite dall’utente.'); });

  let lastMortgage = null;
  $('#mortgage-form').addEventListener('submit', e => { e.preventDefault(); try { const d = formObject(e.currentTarget); const m = C.mortgage({ principal: d.principal, annualRate: d.rate, years: d.years }); const afford = C.affordability({ monthlyIncome: d.income || 0, commitments: d.commitments || 0, thresholdPercent: d.threshold || 35 }); const loanToValue = C.ltv({ principal: d.principal, propertyValue: d.propertyValue || 0 }); lastMortgage = { d, m, afford, loanToValue }; const metrics = [['Rata mensile stimata', fmt.format(m.payment)], ['Interessi complessivi', fmt.format(m.totalInterest)], ['Totale rate', fmt.format(m.totalPaid)], ['Rata sostenibile stimata', Number(d.income) > 0 ? fmt.format(afford.sustainablePayment) : 'Non inserito']]; if (loanToValue !== null) metrics.push(['LTV indicativo', `${number.format(loanToValue)}%`]); $('#mortgage-result').classList.remove('empty-result'); $('#mortgage-result').innerHTML = resultMetrics(metrics, `${m.count} rate mensili · TAN ${number.format(Number(d.rate))}% · ${esc(d.rateSource || 'Riferimento tasso non specificato')}. Calcolo indicativo senza spese accessorie.`); $('#schedule-wrap').classList.remove('hidden'); $('#schedule-body').innerHTML = m.schedule.map(x => `<tr><td>${x.month}</td><td>${fmt.format(x.capital)}</td><td>${fmt.format(x.interest)}</td><td>${fmt.format(x.balance)}</td></tr>`).join(''); $('#home-payment').textContent = fmt.format(m.payment); } catch (err) { toast(err.message || 'Verifica i dati inseriti.'); } });

  function readOffers() { return $$('#offers-table tbody tr').map((tr, i) => ({ name: $('td:nth-child(1) input', tr).value || `Offerta ${i + 1}`, rate: Number($('td:nth-child(2) input', tr).value || 0), fees: Number($('td:nth-child(3) input', tr).value || 0) })); }
  function addOffer(name = '', rate = 3.5, fees = 0) { const tr = document.createElement('tr'); tr.innerHTML = `<td><input aria-label="Nome offerta" value="${esc(name)}" placeholder="Es. Fisso banca A"></td><td><input aria-label="TAN percentuale" type="number" min="0" max="100" step="0.001" value="${rate}"></td><td><input aria-label="Spese iniziali" type="number" min="0" step="10" value="${fees}"></td><td class="offer-payment">—</td><td class="offer-interest">—</td><td class="offer-cost">—</td><td><button aria-label="Rimuovi offerta">Rimuovi</button></td>`; $('#offers-table tbody').append(tr); }
  function updateOffers() { const amount = Number($('#compare-principal').value || 0), years = Number($('#compare-years').value || 0); $$('#offers-table tbody tr').forEach(tr => { try { const rate = Number($('td:nth-child(2) input', tr).value), fees = Number($('td:nth-child(3) input', tr).value || 0); const m = C.mortgage({ principal: amount, annualRate: rate, years }); $('.offer-payment', tr).textContent = fmt.format(m.payment); $('.offer-interest', tr).textContent = fmt.format(m.totalInterest); $('.offer-cost', tr).textContent = fmt.format(m.totalPaid + fees); } catch { ['.offer-payment', '.offer-interest', '.offer-cost'].forEach(sel => $(sel, tr).textContent = '—'); } }); }
  addOffer('Offerta A', 3.5, 0); addOffer('Offerta B', 3.8, 0); $('#add-offer').addEventListener('click', () => { addOffer('', 3.5, 0); updateOffers(); }); $('#offers-table').addEventListener('input', updateOffers); $('#offers-table').addEventListener('click', e => { if (e.target.matches('button')) { e.target.closest('tr').remove(); updateOffers(); } }); $('#compare-principal').addEventListener('input', updateOffers); $('#compare-years').addEventListener('input', updateOffers); updateOffers();

  function saveFrom(type) {
    if (type === 'omi') { const d = formObject($('#omi-form')); if (!d.comune || d.min === '' || d.max === '') return toast('Completa prima i dati OMI.'); const value = `${fmt.format((Number(d.min) + Number(d.max)) / 2)} / m²`; saveRecord('Quotazione OMI', `${d.comune} ${d.zona}`.trim(), value, d); }
    if (type === 'estimate') { if (!lastEstimate) return toast('Calcola prima una stima.'); saveRecord('Stima immobile', lastEstimate.d.label || 'Stima immobile', fmt.format(lastEstimate.amount), lastEstimate); }
    if (type === 'costs') { if (!lastCosts) return toast('Calcola prima le spese.'); saveRecord('Spese d’acquisto', 'Budget acquisto', fmt.format(lastCosts.r.totalBudget), lastCosts); }
    if (type === 'mortgage') { if (!lastMortgage) return toast('Calcola prima il mutuo.'); saveRecord('Simulazione mutuo', lastMortgage.d.label || 'Simulazione mutuo', fmt.format(lastMortgage.m.payment), lastMortgage); }
  }
  $('#compare-save').addEventListener('click', () => { const offers = readOffers(); if (!offers.length) return toast('Aggiungi almeno un’offerta.'); try { const data = offers.map(o => ({ ...o, calculation: C.mortgage({ principal: $('#compare-principal').value, annualRate: o.rate, years: $('#compare-years').value }) })); saveRecord('Confronto offerte', `Confronto · ${offers.length} offerte`, `${offers.length} scenari`, { principal: $('#compare-principal').value, years: $('#compare-years').value, offers: data }); } catch (err) { toast(err.message); } });
  function printActive() { window.print(); } $('#print-mortgage').addEventListener('click', printActive); $('#compare-print').addEventListener('click', printActive);

  $('#vault-form').addEventListener('submit', async e => { e.preventDefault(); const d = formObject(e.currentTarget); if (d.passphrase !== d.confirm) return toast('Le passphrase non coincidono.'); try { await unlock(d.passphrase, true); e.currentTarget.reset(); toast('Archivio sbloccato.'); renderHistory(); } catch (err) { toast(err.message); } });
  $('#vault-button').addEventListener('click', async () => { if (sessionKey) { await lock(); toast('Archivio bloccato.'); go('home'); return; } const pass = window.prompt('Inserisci la passphrase dell’archivio'); if (!pass) return; try { await unlock(pass); toast('Archivio sbloccato.'); renderHistory(); } catch (err) { toast(err.message); } });
  $('#lock-vault').addEventListener('click', async () => { await lock(); toast('Archivio bloccato.'); });
  $('#clear-history').addEventListener('click', async () => { if (!sessionKey) return toast('Sblocca l’archivio prima.'); if (!window.confirm('Eliminare definitivamente tutte le simulazioni salvate?')) return; await writeRecords([]); renderHistory(); toast('Storico eliminato.'); });
  $('#export-backup').addEventListener('click', async () => { if (!sessionKey) return toast('Sblocca l’archivio prima.'); const pass = window.prompt('Scegli una passphrase per questo backup cifrato (almeno 10 caratteri)'); if (!pass || pass.length < 10) return toast('Usa una passphrase di almeno 10 caratteri.'); try { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await derive(pass, salt); const records = await readRecords(); const envelope = { app: 'iPerito Pro & Mutuo', backupVersion: 1, createdAt: new Date().toISOString(), salt: [...salt], payload: await seal({ records }, key) }; const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iperito-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href); toast('Backup cifrato esportato.'); } catch (err) { toast(err.message); } });
  $('#import-backup').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; if (!sessionKey) { toast('Sblocca l’archivio prima di importare.'); e.target.value = ''; return; } const pass = window.prompt('Inserisci la passphrase del backup'); if (!pass) return; try { const backup = JSON.parse(await file.text()); if (backup.app !== 'iPerito Pro & Mutuo' || backup.backupVersion !== 1) throw new Error('Formato di backup non riconosciuto.'); const key = await derive(pass, new Uint8Array(backup.salt)); const imported = await unseal(backup.payload, key); if (!Array.isArray(imported.records)) throw new Error('Contenuto backup non valido.'); const current = await readRecords(); const merged = [...imported.records, ...current]; const unique = [...new Map(merged.map(x => [x.id, x])).values()].sort((a, b) => b.date.localeCompare(a.date)); await writeRecords(unique.slice(0, 100)); renderHistory(); toast('Backup importato e unito allo storico.'); } catch (err) { toast(err.message || 'Backup non valido o passphrase errata.'); } finally { e.target.value = ''; } });

  window.addEventListener('online', () => { $('#offline-state').innerHTML = '<i></i> Online'; }); window.addEventListener('offline', () => { $('#offline-state').innerHTML = '<i></i> Offline pronto'; });
  $('#offline-state').innerHTML = navigator.onLine ? '<i></i> Online · calcoli locali' : '<i></i> Offline pronto';
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  if (!window.isSecureContext || !window.crypto?.subtle || !window.indexedDB) { $('#vault-button').disabled = true; toast('Per l’archivio cifrato apri l’app tramite HTTPS o localhost in un browser aggiornato.'); }
  updateVaultUI();
})();
