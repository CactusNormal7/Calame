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

## Palette (carte — `src/engine/render.ts`)

| Rôle | Valeur | Usage |
|---|---|---|
| Fond | `#050505` | arrière-plan canvas |
| Herbe | `#141414` | tuile de base |
| Sable | `#232320` | anneau autour des points d'eau |
| Eau (creux/pic) | `#3a3a3a` → `#e8e8e8` | vagues animées, mélange continu |
| Bordure de carte | `#f4f4f4` | contour de la zone jouable |
| Unité (repos) | `#ffffff` | cercle plein |
| Unité (occupée) | `#ffd76a` | déplacement ou récolte en cours |
| Sélection | `#ffffff` (anneau pulsé) | unité sélectionnée au clic |
| Tag (label) | `#9a9a9a` | texte au-dessus des entités |

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

- Clic gauche court (< 6px de mouvement) sur une unité → sélection +
  ouverture du panneau d'info au point de clic.
- Clic gauche court sur une zone vide → désélection, fermeture du panneau.
- Glisser (tout bouton, > 6px de mouvement) → pan caméra (existant).
- Molette → zoom caméra (existant).
- Le seuil de 6px distingue un clic d'un début de glissé.

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
