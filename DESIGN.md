# Mobil fanesystem for partivisning

## Formål
På mobil skal brukeren kunne bytte mellom partienes svar uten å måtte scrolle gjennom alle.  
Dette løses med et **fanesystem (tabs)** øverst på skjermen.

## Struktur
- En rad med faner øverst, én fane per valgt parti.
- Hver fane viser partiets **navn eller logo**.
- Den aktive fanen markeres tydelig (f.eks. blå tekst eller understrek).
- Under fanene vises **kun innholdet for den valgte fanen**.

## Oppførsel
1. Når brukeren trykker på en fane:
   - Den valgte fanen blir aktiv.
   - Innholdet under oppdateres til å vise det partiets svar.
2. Bare **ett parti vises om gangen**.
3. Brukeren kan hoppe mellom partier ved å trykke på fanene.

## Eksempel (tekstlig wireframe)

Faner:
```
[ Ap ] [ H ] [ SV ] [ FrP ]
```

Innhold (hvis Ap er valgt):
```
Ap
[Logo]
Kort svar (3–6 setninger)
Kilder: kapittel/side
[Vis utdrag]
```

Hvis brukeren trykker på **H**:
```
H
[Logo]
Kort svar (3–6 setninger)
Kilder: kapittel/side
[Vis utdrag]
```

## Viktige regler
- Alltid vis faner øverst, selv når man bytter innhold.
- Kun én fane kan være aktiv om gangen.
- Innholdet under fanene skal være identisk i struktur for alle partier (kort svar, kilder, utdrag).