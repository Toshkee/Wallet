# Vibe Wallet

Mobilni PWA za praćenje prihoda, troškova i moguće uštede, vizuelno usklađen sa VibeLab identitetom.

## Lokalno pokretanje

PWA funkcije traže HTTP adresu, zato aplikaciju nemoj otvarati direktno kao lokalni fajl.

```powershell
python -m http.server 4173
```

Zatim otvori `http://localhost:4173`.

## Trenutno radi

- dnevni, nedjeljni i mjesečni pregled;
- navigacija kroz prethodne dane, neđelje i mjesece;
- unos prihoda i troškova;
- prilagodljivi mjesečni limiti po kategorijama;
- kompletan pregled i brisanje evidentiranih transakcija;
- lokalno čuvanje podataka u browseru;
- automatski pregled kategorija i posljednjih sedam dana;
- glasovno popunjavanje unosa u browserima koji podržavaju Speech Recognition;
- lokalni AI finansijski uvid sa mjesečnom i godišnjom procjenom uštede;
- instalacija na početni ekran i offline app shell;
- izvoz i uvoz lokalnog backup fajla pri promjeni uređaja ili browsera.

Podaci u ovoj verziji ostaju samo u browseru uređaja. Cloud nalog, sinhronizacija i pravi AI servis su naredna razvojna faza.
