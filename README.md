# Vibe Wallet

Mobilni PWA za praćenje prihoda, troškova, limita i ciljeva štednje, sa VibeLab dark identitetom.

## Lokalno pokretanje

```powershell
python -m http.server 4173
```

Zatim otvori `http://localhost:4173`.

## Funkcionalnosti

- AI početni ekran sa Gemini odgovorima i brzim pitanjima;
- unos troškova i prihoda kroz formu, chat komandu ili glas;
- glasovni diktat prvo popunjava chat polje, pa korisnik odlučuje kada šalje;
- dnevni, nedjeljni i mjesečni pregled, sa kretanjem kroz ranije periode;
- mjesečni limiti kategorija i plan cilja štednje;
- uređivanje, brisanje, izvoz i uvoz lokalnih unosa;
- instalabilna PWA aplikacija, offline app shell i swipe-down zatvaranje modala.

## Gemini na Vercelu

Dodaj `GEMINI_API_KEY` u Vercel Project Settings → Environment Variables za Production. Opcionalne varijable su `GEMINI_MODEL` i `GEMINI_VOICE_MODEL`; podrazumijevani model je `gemini-2.5-flash`.

API ključ ostaje samo na Vercelu. Chat endpoint šalje Gemini-ju sažetak, limite, cilj i ograničen broj transakcija bez privatnih napomena. Voice endpoint šalje kratki snimak samo kada korisnik aktivira mikrofon.

## Podaci i privatnost

Transakcije, limiti i cilj čuvaju se lokalno u browseru uređaja. Izvoz backup-a je preporučen prije promjene telefona, browsera ili ponovne instalacije PWA aplikacije.

## Provjere

```powershell
node --check app.js
node --check sw.js
node scripts/check-dom.js
```
