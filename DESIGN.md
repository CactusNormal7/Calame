# Design — Calame

Ce fichier recense les décisions visuelles prises au fil du développement,
pour garder une DA cohérente. À mettre à jour à chaque choix visuel
(couleur, animation, composant d'UI).

## Direction artistique

Noir/blanc/gris dominant, quelques touches de statut fonctionnelles
(unité occupée, sélection) — pas de palette colorée décorative. Police
monospace partout (`Courier New`, `Menlo`, fallback système). Angles nets
partout dans l'UI (`border-radius: 0` implicite — aucun rayon nulle part :
HUD, feed, hint, console, panneaux flottants) : cohérent avec l'esprit
terminal/ASCII, pas d'arrondi.

## Langue

Toute l'interface joueur est en anglais : mots-commandes (`go`, `mine`,
`harvest`, `stop`, `skip`, `build`, `train`), identifiants de type
(`worker`/`scout`/`hauler`, `hq`/`barracks`), messages du feed, contenu des
panneaux (info unité/bâtiment, aide), légende/hint, HUD (`ink`, `tile: …`),
`<html lang="en">`. Les commentaires de code restent en français (langue de
travail interne, jamais vue par le joueur).

*(Révision : une première passe s'était limitée au panneau d'aide en
pensant que c'était la portée demandée — corrigé, "tout" voulait bien dire
tout. Les mots-commandes historiques en français (`va`, `mine`, `recolter`,
`construire`, `creer`, `passer`) ont été renommés en anglais à cette
occasion : `go`, `mine`, `harvest`, `build`, `train`, `skip`.)*

## Économie de l'encre

Seule la **création** (construction de bâtiment, entraînement d'unité)
consomme de l'encre au succès — `go`/`mine`/`harvest`/`stop`/`skip` ont un
coût nul. Le gaspillage sur commande invalide (mauvais tag/mot, cible hors
de portée, etc.) reste inchangé pour tous les verbes : c'est un mécanisme
de sanction de la faute de frappe, pas un coût d'exécution, donc distinct
de la question « est-ce que taper juste coûte quelque chose ».

*(Révision : au tout début, `go`/`mine`/`harvest`/`skip` avaient un coût
non nul — supprimé sur demande explicite : la frappe correcte ne doit pas
appauvrir le joueur, seule la création de contenu (bâtiment, unité) doit
avoir un prix.)*

## Palette (carte — `src/engine/render.ts`)

| Rôle | Valeur | Usage |
|---|---|---|
| Fond | `#050505` | arrière-plan canvas |
| Herbe | `#141414` | tuile de base |
| Sable | `#232320` | anneau autour des points d'eau |
| Eau (creux/pic) | `#3a3a3a` → `#e8e8e8` | vagues animées, mélange continu |
| Bordure de carte | `#f4f4f4` | contour de la zone jouable |
| Unité (repos) | `#ffffff` | forme pleine, cf. vocabulaire de formes ci-dessous |
| Unité (occupée) | `#ffd76a` | déplacement ou récolte en cours |
| Sélection | `#ffffff` (anneau pulsé) | unité sélectionnée au clic |
| Bâtiment | `#ffffff` (plein) | carré ; `caserne` = carré avec un carré évidé au centre (fond `#050505`), `qg` = carré plein simple |
| Bâtiment (construction) | contour `rgba(244,244,244,0.5)` + remplissage `#ffffff` progressif | remplit du bas vers le haut selon l'avancement |
| Anneau de production | `#ffd76a` | arc de progression autour d'un bâtiment qui produit une unité |
| Tag (label) | `#9a9a9a` | texte au-dessus des entités |

### Vocabulaire de formes (unités)

Chaque type d'unité a une forme géométrique dédiée (`UNIT_KINDS[kind].shape`
dans `game/entities.ts`), pas de nouvelle couleur — garde la lecture de
carte au niveau de la teinte (occupé/libre) tout en distinguant les types :

| Type | Forme | Trait de caractère |
|---|---|---|
| `worker` | cercle | polyvalent, existant depuis le V0 |
| `scout` | triangle | rapide, ne récolte pas |
| `hauler` | carré | lent, meilleur rendement de récolte |

## Palette (UI — `src/style.css`)

Alignée sur la carte : panneaux et console en noir/gris/blanc, plus
d'accent violet/couleur décorative (l'ancien violet `#a76bff` de l'encre a
été retiré, cf. décision ci-dessous). Statuts dans le feed distingués par
poids/inversion plutôt que par teinte :

| Rôle | Valeur | Usage |
|---|---|---|
| Fond panneau | `rgba(8,8,10,0.92)` | HUD, console, panneaux flottants |
| Bordure panneau | `#f4f4f4` | tous les panneaux (HUD, console, hint, panneaux flottants) — blanc franc, cohérente avec la bordure de carte |
| Texte primaire | `#e8e8e8` | contenu |
| Texte secondaire | `#8f8f8f` | labels, hints |
| Entrée feed « ok » | `#e8e8e8` | texte normal |
| Entrée feed « info » | `#7a7a7a` | atténué |
| Entrée feed « erreur » | fond `#e8e8e8`, texte `#050505` (bloc inversé) | erreur = bloc inversé, pas de rouge — reste lisible en noir/blanc |

## Animations

Toutes les animations ambiantes utilisent des sinusoïdes continues (pas de
bascule binaire d'état) avec un déphasage déterministe par entité
(`hashPhase(tag)`), pour qu'aucun élément du même type ne pulse en
synchronisation avec un autre — évite l'effet « stroboscope ».

| Élément | Période | Note |
|---|---|---|
| Vagues (eau) | 2.6 s | déphasage par case |
| Pulsation fontaine | 3.4 s | déphasage par tag |
| Respiration unité (idle bob) | 1.7 s | déphasage par tag |
| Anneau de sélection | 1.1 s | déphasage par tag + suffixe dédié |
| Curseur console | 1 s (CSS) | binaire assumé, c'est un curseur texte |

Panneaux flottants (info unité, aide) : animation d'ouverture par
transition CSS de `clip-path` (pas de `scale`) — le panneau se révèle en
rectangle depuis un point d'ouverture jusqu'au coin opposé, comme une
sélection en glissé sur un bureau (on clique en un point, on « tire »
jusqu'au coin inverse). `160ms cubic-bezier(0.33, 1, 0.68, 1)` (ease-out
modéré — assez rapide pour ne pas traîner, mais pas linéaire : on garde une
légère décélération en fin de course plutôt qu'un arrêt sec) + un fondu
d'opacité en appoint (`100ms ease-out`). Fermeture : retrait de la classe
`.open`, la transition rejoue à l'envers (le rectangle se referme vers son
point d'ouverture).

*(Révision 2 : la version précédente était en `260ms linear` — trop lente
et l'absence totale d'easing rendait le mouvement mécanique. Accélérée à
160ms avec un ease-out doux, qui reste perceptible comme un glissé sans
être instantané comme le tout premier `scale()` à easing très prononcé.)*

- Panneau d'info unité : point d'ouverture = coin supérieur-gauche du
  panneau, positionné au point de clic (`clip-path: inset(0 100% 100% 0)`
  → `inset(0 0 0 0)`) → le rectangle grandit depuis la souris vers le coin
  inférieur-droit.
- Panneau d'aide : centré à l'écran, point d'ouverture = centre
  (`clip-path: inset(50% 50% 50% 50%)` → `inset(0 0 0 0)`) → le rectangle
  grandit depuis le milieu vers les 4 coins à la fois, façon menu d'aide de
  type éditeur modal.

*(Révision : la première version utilisait un `scale()` depuis le point
d'origine — remplacé par une révélation `clip-path` en rectangle, qui
correspond à l'intention initiale : une ouverture façon sélection en
glissé, pas un simple agrandissement uniforme.)*

## Interaction souris

- Clic gauche court (< 6px de mouvement) sur une unité **ou un bâtiment**
  → sélection + ouverture du panneau d'info au point de clic (contenu
  différent selon le type : état/cible pour une unité, PV/état de
  construction ou production pour un bâtiment).
- Clic gauche court sur une zone vide → désélection, fermeture du panneau.
- Glisser (tout bouton, > 6px de mouvement) → pan caméra. Le panneau
  d'info reste ouvert et à sa position écran pendant un pan (il est
  ancré en pixels, pas en coordonnées monde — un pan ne le déplace ni ne
  le ferme).
- Molette → zoom caméra, **toujours centré exactement sous le curseur**
  (cf. Caméra ci-dessous), et ferme systématiquement tout panneau ouvert.
  Zoomer change le cadrage de façon plus disruptive qu'un pan ; un
  panneau resté à une position écran fixe après un zoom ne correspondrait
  plus à rien de cohérent, donc autant le fermer plutôt que le laisser
  raconter n'importe quoi.
- Survol de la carte → lecture de la case sous le curseur affichée en
  permanence dans le HUD (`#hover-coord`), pour rendre praticable la
  construction à coordonnées explicites (`build <type> <gx> <gy>`).
- Le seuil de 6px distingue un clic d'un début de glissé.

## Caméra (`src/engine/camera.ts`)

L'origine écran de la projection (`getOrigin()`) est calculée une seule
fois dans `camera.ts` et réutilisée telle quelle par `render.ts` — avant,
`render.ts` avait sa propre copie de la formule, légèrement différente de
celle utilisée par le calcul de zoom, ce qui faisait dériver le point de
pivot du zoom loin du curseur (surtout perceptible verticalement, à cause
d'un terme de recentrage qui dépend du niveau de zoom). Le zoom calcule
maintenant le point du monde sous le curseur *avant* de changer le niveau
de zoom, puis ajuste le pan pour que ce même point reste exactement sous
le curseur *après* — robuste à toute formule d'origine, pas seulement à
un ratio simple sur pan.

## Historique des décisions

- **Rendu carte** : abandon du glyphe ASCII par case au profit de tuiles
  pleines + formes géométriques (cercles/carrés) pour les entités — trop
  dense visuellement à grande échelle, cf. PR caméra/viewport.
- **Erreurs en bloc inversé plutôt qu'en rouge** : cohérence avec la DA
  noir/blanc ; garde un signal fort (bloc plein) sans réintroduire de
  couleur.
- **`aide` ouvre un panneau plutôt que de logger dans le feed** : la liste
  de commandes est un contenu de référence consulté à la demande, pas un
  évènement de partie — elle ne doit pas polluer l'historique ni pousser
  les entrées précédentes hors de vue.
- **Bâtiment placé sur une case adjacente libre, jamais sous l'unité qui
  construit** : construire pile sur la case de l'unité faisait se
  superposer les étiquettes des deux entités (illisible). `findBuildSpot`
  essaie la case elle-même puis les 4 voisines directes (libres de tout
  bâtiment, fontaine, unité, eau et hors-carte).
- **Légende/hint rafraîchis en continu (`tickConsole`), pas seulement à la
  frappe** : un bâtiment ou une unité peut apparaître pendant que le
  joueur ne tape rien (fin de construction/production) — le hint-panel ne
  doit pas rester figé sur son dernier état tapé.
- **Panneau d'aide (`help`) classé par catégorie** (Units, Buildings,
  Movement, Economy, Construction, Production, Utility), avec une
  description par unité/bâtiment/commande. Toute l'UI est en anglais, cf.
  section Langue ci-dessus.
- **Titres de section (`.panel-section`) très marqués** : gras, blanc,
  taille augmentée, bordure supérieure de séparation, marge généreuse —
  la version précédente (gris terne, même taille que le texte courant) se
  distinguait à peine du contenu et rendait un panneau dense (l'aide,
  avec unités + bâtiments + 7 commandes détaillées) difficile à scanner
  visuellement.
- **`build` accepte des coordonnées explicites** (`<type> <gx> <gy>`), en
  plus du placement automatique par défaut (case libre la plus proche de
  l'unité) — portée limitée à `BUILD_RANGE` (10 cases) pour qu'un
  chantier reste lié à la présence d'une unité dessus, pas téléportable
  n'importe où sur la carte.
- **Construire exige une présence physique** : une commande `build` ne
  démarre plus le chantier instantanément — l'unité se déplace d'abord
  jusqu'à la case cible (`Unit.pendingBuild`), le bâtiment n'apparaît
  qu'à l'arrivée. Le coût est débité dès l'ordre donné (comme pour la
  production), pas à l'arrivée, pour rester cohérent avec le reste de
  l'économie (« payer à la commande, recevoir plus tard ») ; `go`/`stop`
  annulent un chantier en attente (l'encre déjà dépensée n'est pas
  remboursée — une redirection a un coût assumé, pas de retour arrière
  gratuit).
- **PV ajoutés aux bâtiments** (`hp`/`maxHp`, toujours au maximum pour
  l'instant, aucun système de combat n'existe encore) — affichés dans le
  panneau d'info, pose la base pour une future mécanique de destruction
  sans simuler des dégâts qui n'ont pas de source.
