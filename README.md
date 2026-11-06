# iPerito Pro & Mutuo — web app

Calcolatore personale offline-first ispirato alla struttura funzionale di iPerito Pro & Mutuo. Non contiene anagrafiche, archivio pratiche, account o sincronizzazione remota.

## Avvio locale

Con Node.js installato, dalla cartella del progetto eseguire `node serve.cjs` e aprire `http://127.0.0.1:4173`. Il server serve esclusivamente file statici locali e non registra le richieste. Per installarla come PWA su iPhone occorre pubblicarla su un dominio HTTPS sotto il proprio controllo e poi usare “Aggiungi alla schermata Home” da Safari.

## Funzioni presenti

- Quotazioni OMI inserite manualmente con comune, zona, tipologia, periodo, fonte e stato conservativo.
- Calcolo della superficie commerciale tramite voci e coefficienti modificabili.
- Stima indicativa al metro quadro con aggiustamento percentuale esplicito.
- Budget di acquisto con imposte, notaio, agenzia, spese mutuo e altre voci inserite dall’utente.
- Simulazione mutuo con rata, piano di ammortamento, interessi, rapporto rata/reddito e LTV.
- Confronto tra più scenari omogenei; il costo mostrato non viene etichettato come TAEG.
- Storico locale cifrato AES-GCM, derivazione chiave PBKDF2 e backup cifrato importabile/esportabile.
- Stampa o salvataggio in PDF attraverso il dialogo di stampa del browser.

## Sicurezza e limiti

La passphrase dell’archivio non viene salvata. I record sono cifrati prima di essere scritti in IndexedDB; l’archivio si blocca dopo cinque minuti di inattività o quando si usa il pulsante di blocco. Il backup ha una passphrase separata. Per usare Web Crypto e il service worker è necessario HTTPS o localhost. Per il deployment, configurare HTTPS e una politica CSP equivalente a quella fornita dal server locale.

OMI e tassi non vengono recuperati automaticamente: vanno aggiornati dall’utente, con fonte e data esplicite. L’app non calcola imposte sulla base di regole normative, non produce un TAEG ufficiale e non sostituisce perizie, preventivi o delibere bancarie. I coefficienti iniziali della superficie sono modificabili e vanno adattati al criterio di stima applicabile.

Il service worker memorizza solo il guscio statico dell’app, mai dati o risultati. Non sono inclusi analytics, font remoti o SDK terzi. L’uso di una password robusta sul dispositivo e un backup cifrato custodito separatamente restano essenziali.

## Verifica del motore

I test automatici si eseguono con `node --test calculations.test.cjs`. Non servono dipendenze di terze parti.
