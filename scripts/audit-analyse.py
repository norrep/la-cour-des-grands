# Résume les fichiers JSONL écrits par scripts/audit.ts : python3 scripts/audit-analyse.py <dossier>
import json, glob, sys, math, statistics as st
from collections import defaultdict, Counter

S = sys.argv[1]
parties = []
for f in glob.glob(f"{S}/*.jsonl"):
    for l in open(f):
        if l.strip():
            parties.append(json.loads(l))

ROLES = ['petit', 'populaire', 'chouchou', 'rapporteuse', 'fouine', 'contagieux', 'delegue', 'grand']
groupes = defaultdict(list)
for p in parties:
    groupes[(p['carte'], p['variante'], p['a'], p['b'])].append(p)

def pct(x, n):
    return f"{100*x/max(1,n):.1f}"

def ic(p, n):
    return 196 * math.sqrt(max(p * (1 - p), 1e-9) / max(1, n))

def resume(ps):
    n = len(ps)
    out = {}
    fin = [p for p in ps if not p['bloquee']]
    out['n'] = n
    out['bloquees'] = n - len(fin)
    pr = sum(p['gagnant'] == p['premier'] for p in fin)
    out['premier'] = 100 * pr / len(fin)
    out['premier_ic'] = ic(pr / len(fin), len(fin))
    out['rouge'] = 100 * sum(p['gagnant'] == 'rouge' for p in fin) / len(fin)
    out['A'] = 100 * sum(p['gagnant'] == p['couleurA'] for p in fin) / len(fin)
    rc = Counter(p['raison'] for p in fin)
    out['raisons'] = {k: round(100 * v / len(fin), 1) for k, v in rc.items()}
    t = [p['tours'] for p in fin]
    out['tours'] = (st.mean(t), st.median(t), min(t), max(t), sorted(t)[int(.1 * len(t))], sorted(t)[int(.9 * len(t))])
    # écarts de score
    ecarts = [abs(p['pts'][0] - p['pts'][1]) for p in fin]
    out['ecart_pts_moy'] = st.mean(ecarts)
    out['blanchissage'] = 100 * sum(min(p['pts']) == 0 and max(p['pts']) >= p['seuil'] for p in fin) / len(fin)
    out['perdant_zero'] = 100 * sum(p['pts'][0 if p['gagnant']=='bleu' else 1] == 0 for p in fin) / len(fin)
    out['perdant_menacait'] = 100 * sum(p['perdantMenacait'] for p in fin) / len(fin)
    pts_perd = [p['pts'][0 if p['gagnant']=='bleu' else 1] for p in fin]
    out['perdant_a_un_point'] = 100 * sum(pp >= p['seuil'] - 1 for pp, p in zip(pts_perd, fin)) / len(fin)
    out['finale_serree'] = 100 * sum(p['perdantMenacait'] or pp >= p['seuil'] - 1 for pp, p in zip(pts_perd, fin)) / len(fin)
    # trajectoires : retournements
    comebacks = 0; changements = []; gros_comeback = 0; decide_tot = []
    for p in fin:
        sgn = 1 if p['gagnant'] == 'rouge' else -1
        tr = [sgn * v for v in p['traj'][:-1]]  # du point de vue du gagnant
        # lissage : moyenne sur un tour complet (2 tours de joueur) pour gommer l'effet du trait
        lis = [(tr[i] + tr[i + 1]) / 2 for i in range(len(tr) - 1)] if len(tr) > 1 else tr
        if lis and min(lis) < -150: comebacks += 1
        if lis and min(lis) < -300: gros_comeback += 1
        ch = 0; etat = 0
        for v in lis:
            s = 1 if v > 100 else (-1 if v < -100 else 0)
            if s != 0 and etat != 0 and s != etat: ch += 1
            if s != 0: etat = s
        changements.append(ch)
        # moment où le gagnant passe définitivement devant (>100)
        k = len(lis)
        for i in range(len(lis) - 1, -1, -1):
            if lis[i] <= 100: break
            k = i
        decide_tot.append(k / max(1, len(lis)))
    out['comeback'] = 100 * comebacks / len(fin)
    out['gros_comeback'] = 100 * gros_comeback / len(fin)
    out['changements'] = st.mean(changements)
    out['decide_a'] = st.mean(decide_tot)
    # tours : temps morts et décisions
    T = [t for p in fin for t in p['t']]
    out['appels'] = 100 * sum(t.get('role') == 'appel' for t in T) / len(T)
    out['appels_debut'] = st.mean(sum(1 for t in p['t'][:6] if t.get('role') == 'appel') for p in fin)
    # temps morts : tour où il ne se passe rien de visible chez l'adversaire (appel, ou pose sans plaquage, pouvoir, goûter)
    def calme(t):
        if t.get('role') == 'appel': return True
        ev = [x for x in t.get('ev', []) if x not in ('ronde', 'courant')]
        return not t.get('plaque') and not ev and t.get('poses', 1) <= 1
    out['calmes'] = 100 * sum(calme(t) for t in T) / len(T)
    serie = []
    for p in fin:
        m = c = 0
        for t in p['t']:
            c = c + 1 if calme(t) else 0
            m = max(m, c)
        serie.append(m)
    out['serie_calme_max'] = st.mean(serie)
    out['choix_n'] = st.mean(t['n'] for t in T)
    out['force'] = 100 * sum(t['n'] <= 1 for t in T) / len(T)
    out['evident'] = 100 * sum(t['ecart'] >= 150 for t in T) / len(T)
    out['dilemme'] = 100 * sum(t['proches'] >= 2 for t in T) / len(T)
    out['plaquages'] = st.mean(sum(1 for t in p['t'] if t.get('plaque')) for p in fin)
    out['cpe'] = st.mean(sum(1 for t in p['t'] for e in t.get('ev', []) if e.startswith('cpe:')) for p in fin)
    # moments marquants
    m = Counter()
    for p in fin:
        for t in p['t']:
            ev = t.get('ev', [])
            reg = [e for e in ev if e.startswith('region:')]
            if any(e.startswith('region:') and e.split(':')[1] != t['b'] for e in ev): m['gouter_offert'] += 1
            if t.get('plaque') in ('grand', 'delegue') : m['gros_plaque'] += 1
            if t.get('role') == 'petit' and t.get('plaque'): m['petit_plaque'] += 1
            if t.get('horsChemin'): m['fouine_hors_chemin'] += 1
            if t.get('poses', 0) >= 2: m['double_pose'] += 1
            if len(reg) >= 2: m['double_gouter'] += 1
            if any(e.startswith('delegue') for e in ev) and reg: m['delegue_gouter'] += 1
            # le goûter ramassé grâce au courant ou à la ronde : région après ronde/courant
            if 'courant' in ev:
                i = ev.index('courant')
                if any(e.startswith('region:') for e in ev[i + 1:]): m['courant_gouter'] += 1
            if 'ronde' in ev:
                i = ev.index('ronde')
                if any(e.startswith('region:') for e in ev[i + 1:i + 3]): m['ronde_gouter'] += 1
    out['marquants'] = {k: round(v / len(fin), 2) for k, v in m.items()}
    # rôles
    poses = Counter(); posesG = Counter(); pouvoirs = Counter(); sans = Counter()
    for p in fin:
        for t in p['t']:
            r = t.get('role')
            if not r or r == 'appel': continue
            poses[r] += 1
            if t['b'] == p['gagnant']: posesG[r] += 1
            ev = t.get('ev', [])
            eff = {
                'populaire': any(e == 'pioche:populaire' for e in ev),
                'chouchou': t.get('poses', 0) >= 2,
                'rapporteuse': any(e.startswith('cpe:') for e in ev),
                'contagieux': 'infirmerie' in ev,
                'delegue': any(e.startswith('delegue') for e in ev),
                'fouine': bool(t.get('horsChemin')),
                'petit': t.get('plaque') is not None,
                'grand': True,
            }[r]
            if eff: pouvoirs[r] += 1
    out['roles'] = {r: (poses[r] / len(fin), 100 * posesG[r] / max(1, poses[r]), 100 * pouvoirs[r] / max(1, poses[r])) for r in ROLES}
    # avantage d'un rôle : taux de victoire de la bande qui l'a posé plus souvent que l'autre
    av = {}
    for r in ROLES:
        g = n2 = 0
        for p in fin:
            c = Counter(t['b'] for t in p['t'] if t.get('role') == r)
            if c['rouge'] == c['bleu']: continue
            plus = 'rouge' if c['rouge'] > c['bleu'] else 'bleu'
            n2 += 1; g += plus == p['gagnant']
        av[r] = (100 * g / max(1, n2), n2)
    out['avantage_role'] = av
    # premier élève posé qui plaque
    return out

res = {}
for k, ps in sorted(groupes.items()):
    res['|'.join(k)] = resume(ps)
json.dump(res, open(f"{S}/resume.json", 'w'), indent=1, ensure_ascii=False)
for k, r in res.items():
    print('\n==', k)
    for kk, v in r.items():
        print(f'  {kk}: {v}')
