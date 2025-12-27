# Plan za Integraciju Igara u Lanči LoveVerse

## 📋 Pregled Trenutnog Stanja

### Postojeće Igre:
1. **Spoji srcad** (Match-3) ✅ - Završeno
2. **SaveMePlatformer** ❌ - Treba zamijeniti
3. **RunningHeartGame** ❌ - Treba zamijeniti

### Dostupni Asset-i:
- **Platformer assets**: 769 tile fajlova, 102 interactive objekti, 50 karaktera
- **Runner assets**: 102 obstacle fajlova
- **Puzzle/Board assets**: 269 fajlova (1bit Puzzle and Board)
- **RPG assets**: 1437 fajlova (characters, scenery, tilesets)
- **8bit Adventure**: 1489 fajlova
- **Retro Monsters**: 111 fajlova
- **Particles**: 88 efekata
- **UI assets**: 52 fajlova

---

## 🎮 Predložene Igre (Prioritetni Redoslijed)

### 1. **Puzzle/Board Igra** (Zamjena za SaveMePlatformer)
**Koncept**: Match-3 ili Block Puzzle igra
- **Asset-i**: 1bit Puzzle and Board (269 fajlova)
- **Mehanika**: 
  - Spajanje blokova u linije
  - Cilj: Očistiti board
  - Potezi: Ograničeni broj poteza
- **Nagrada**: 10 srcadi
- **Naziv**: "Puzzle srcad" ili "Blokovi ljubavi"

### 2. **Runner Igra** (Zamjena za RunningHeartGame)
**Koncept**: Endless runner sa srcadima
- **Asset-i**: Runner obstacles (102 fajlova), backgrounds
- **Mehanika**:
  - Skakanje preko prepreka
  - Sakupijanje srcadi
  - Cilj: Preći određenu udaljenost ili sakupiti određeni broj srcadi
- **Nagrada**: 10 srcadi
- **Naziv**: "Trčanje za srcadima"

### 3. **Platformer Igra**
**Koncept**: 2D platformer sa levelima
- **Asset-i**: Platformer tiles (769), interactive (102), characters (50)
- **Mehanika**:
  - Skakanje po platformama
  - Sakupijanje srcadi/novčića
  - Izbjegavanje neprijatelja
  - Cilj: Doći do kraja levela
- **Nagrada**: 10 srcadi
- **Naziv**: "Skokovi ljubavi"

### 4. **Memory/Concentration Igra**
**Koncept**: Memory card matching igra
- **Asset-i**: UI assets, heart assets
- **Mehanika**:
  - Okretanje kartica
  - Pronalaženje parova
  - Cilj: Pronaći sve parove u određenom broju poteza
- **Nagrada**: 10 srcadi
- **Naziv**: "Pamćenje srcadi"

### 5. **Bubble Shooter**
**Koncept**: Pucanje srcadima u grupe
- **Asset-i**: Heart assets, particles
- **Mehanika**:
  - Pucanje srcadima
  - Spajanje 3+ iste boje
  - Cilj: Očistiti board
- **Nagrada**: 10 srcadi
- **Naziv**: "Pucanje srcadima"

### 6. **Snake Igra**
**Koncept**: Klasična Snake igra sa srcadima
- **Asset-i**: Heart assets, particles
- **Mehanika**:
  - Kontrola zmije (strelicama)
  - Jedenje srcadi
  - Izbjegavanje zidova i sebe
  - Cilj: Postići određeni score
- **Nagrada**: 10 srcadi
- **Naziv**: "Zmija ljubavi"

### 7. **Tower Defense (Simplified)**
**Koncept**: Jednostavna tower defense
- **Asset-i**: RPG assets, monsters
- **Mehanika**:
  - Postavljanje obrana
  - Zaustavljanje neprijatelja
  - Cilj: Preživjeti sve valove
- **Nagrada**: 10 srcadi
- **Naziv**: "Zaštita srcadi"

### 8. **Whack-a-Mole Varijanta**
**Koncept**: "Whack-a-Heart" - udaranje srcadi
- **Asset-i**: Heart assets, UI assets
- **Mehanika**:
  - Klikanje na srcad koje se pojavljuju
  - Cilj: Sakupiti određeni broj u vremenskom roku
- **Nagrada**: 10 srcadi
- **Naziv**: "Udari srcad"

### 9. **Falling Blocks (Tetris-like)**
**Koncept**: Padajući blokovi sa srcadima
- **Asset-i**: Heart assets, puzzle assets
- **Mehanika**:
  - Rotiranje i pomicanje padajućih blokova
  - Cilj: Očistiti linije
- **Nagrada**: 10 srcadi
- **Naziv**: "Padajuća srcad"

### 10. **Clicker Igra**
**Koncept**: Idle/clicker sa srcadima
- **Asset-i**: Heart assets, particles
- **Mehanika**:
  - Klikanje na srcad
  - Automatsko generisanje srcadi
  - Cilj: Postići određeni broj srcadi
- **Nagrada**: 10 srcadi
- **Naziv**: "Klikaj srcad"

---

## 🎯 Preporučeni Redoslijed Implementacije

### Faza 1: Zamjena postojećih igara (Prioritet)
1. **Puzzle/Board Igra** - Zamjena za SaveMePlatformer
2. **Runner Igra** - Zamjena za RunningHeartGame

### Faza 2: Dodatne igre (Nakon zamjene)
3. **Memory Igra** - Lako za implementaciju
4. **Bubble Shooter** - Slično match-3, ali drugačiji gameplay
5. **Snake Igra** - Klasična, jednostavna

### Faza 3: Naprednije igre
6. **Platformer Igra** - Kompleksnija, ali imamo sve assete
7. **Falling Blocks** - Srednje kompleksna
8. **Whack-a-Mole** - Jednostavna, zabavna
9. **Clicker Igra** - Jednostavna mehanika
10. **Tower Defense** - Najkompleksnija

---

## 📐 Struktura Implementacije

### Svaka igra treba imati:
1. **Game Component** (`frontend/src/games/GameName.tsx`)
2. **Game CSS** (`frontend/src/styles/GameName.css`)
3. **Rute u LevelPage.tsx** (`level_X_code`)
4. **Backend level entry** (u `seed.ts`)
5. **Instrukcije na lijevoj strani** (kao u Spoji srcad)
6. **Nagrada**: 10 srcadi po završetku

### Zajednički Features:
- Top bar sa srcadima (nakon završetka)
- Animacija srcadi nakon pobjede
- Win/Lose modali
- "Nazad" button
- Responsive dizajn
- Bosanski jezik

---

## 🎨 UI/UX Konzistentnost

Sve igre trebaju imati:
- **Isti header stil** (kao Spoji srcad)
- **Instrukcije na lijevoj strani** (ako je potrebno)
- **Isti sistem nagrađivanja** (10 srcadi)
- **Isti win/lose modal stil**
- **Isti top bar** (nakon završetka)

---

## 📝 Sljedeći Koraci

1. ✅ Završiti "Spoji srcad" (Match-3)
2. ⏳ Implementirati Puzzle/Board igru (zamjena za SaveMePlatformer)
3. ⏳ Implementirati Runner igru (zamjena za RunningHeartGame)
4. ⏳ Dodati Memory igru
5. ⏳ Dodati Bubble Shooter
6. ⏳ Dodati Snake igru
7. ⏳ Dodati ostale igre po prioritetu

---

## 💡 Napomene

- Sve igre trebaju biti **jednostavne za razumijevanje** (korisnik nije igrao igrice)
- **Kratke instrukcije** na bosanskom jeziku
- **Vizuelno privlačne** sa srcadima kao temom
- **Kratke sesije** (2-5 minuta po igri)
- **Konzistentan dizajn** kroz sve igre
