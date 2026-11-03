# Calcolo Mutuo

Web app per il calcolo della rata di mutui e prestiti con **ammortamento alla francese**.

## Funzionalità

- Rata mensile (formula standard banche italiane)
- TAEG annuo (tasso effettivo da capitalizzazione mensile)
- Totale interessi e totale rimborso
- Confronto rate per durate 2 / 5 / 10 / 15 / 20 / 25 / 30 anni
- Export CSV e stampa PDF
- Collegamento a Investing.com (notizie mercati)
- Installabile su home screen (PWA)

## Formula

```
Rata = C × [i(1+i)^n] / [(1+i)^n − 1]
```

dove `i = TAN/12` e `n = anni × 12`.

## Pubblicare su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `calcolo-mutuo`)
2. Carica **tutti** i file di questa cartella nella root del repository:
   - `index.html`
   - `manifest.json`
   - `favicon-32.png`
   - `icon-180.png`
   - `icon-192.png`
   - `icon-512.png`
   - `icon.svg` (opzionale)
   - `README.md`
3. Vai su **Settings → Pages**
4. In **Source** seleziona `Deploy from a branch`
5. Branch: `main` (o `master`), cartella: `/ (root)`
6. Salva. Dopo 1–2 minuti l’app sarà online su:
   `https://TUO-USERNAME.github.io/calcolo-mutuo/`

## Uso locale

Apri `index.html` direttamente nel browser, oppure:

```bash
npx serve .
```

## Note

Calcolo orientativo a supporto di consulenza. Non sostituisce le condizioni contrattuali della banca.
