# Calame — Encre

RTS 1v1 ASCII/minimaliste où chaque action (déplacement, récolte, hacking à
venir) s'exécute en tapant une commande texte plutôt qu'au clic. L'**encre**
est la ressource centrale : elle sert à la fois de monnaie de production et
de sanction (une commande invalide validée en gaspille) — avec un droit à
l'erreur explicite (backspace toujours gratuit, mots simples/avancés,
commande de secours `passer`) pour que la stratégie prime sur la vitesse de
frappe pure.

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite (`http://localhost:5173` par défaut).

Autres scripts :

```bash
npm run build     # vérifie les types (tsc) puis build de prod
npm run preview   # sert le build de prod en local
```

## Contrôles

**Commandes de jeu** (console en bas de l'écran) :

- Format : `tag mot [cible]`, validé avec `Entrée`.
- `Backspace` corrige librement, sans coût.
- `Échap` vide la ligne en cours sans pénalité.
- `aide` / `help` / `?` liste les tags et mots disponibles, gratuitement.

| Mot | Tier | Effet |
|---|---|---|
| `va <cible>` | simple | déplace l'unité vers un tag cible (fontaine, QG, autre unité) |
| `mine` | simple | démarre la récolte sur la fontaine où se trouve l'unité |
| `recolter` | avancé | même effet que `mine`, meilleur rendement, mot plus long donc plus risqué à taper |
| `stop` | simple | arrête le déplacement ou la récolte en cours |
| `passer` | soupape | exécute l'action par défaut du contexte, sans avoir à taper le bon mot |

Une commande invalide (tag ou mot inconnu) gaspille de l'encre — c'est la
mécanique de punition centrale liée au thème.

**Caméra** (indépendante de la saisie de commande) :

- Molette : zoom avant/arrière, centré sur le curseur.
- Glisser la souris sur la carte : déplacement (pan).
- Flèches du clavier : déplacement au clavier.

## État actuel du projet

Prototype **V0** : boucle de commande tag+mot, économie d'encre (coût,
gaspillage sur erreur, récolte continue), carte isométrique animée avec
caméra pan/zoom. Pas encore d'adversaire, de construction, ni de machines à
hacker.

## Structure

```
src/
  engine/    # rendu canvas, projection isométrique, caméra, maths utilitaires
  game/      # état de jeu, entités, dictionnaire de commandes, console
  world/     # génération de la carte et des fontaines (puits d'encre)
```

## Prochaines étapes

- Machines à hacker + brouillard de guerre (exploration)
- Calibration fine des coûts/gaspillages
- Décision temps réel vs pause active
- Mode PvP (netcode)
