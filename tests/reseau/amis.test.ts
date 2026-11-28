import { describe, expect, it } from 'vitest';
import { tirerEntier } from '../../src/engine/index';
import { Refus, SalleMemoire, validerPseudo } from '../../src/reseau/index';

function salle() {
  let maintenant = 1_000_000;
  let r = 7;
  const s = new SalleMemoire(
    () => maintenant,
    () => {
      const [v, suivant] = tirerEntier(r, 4294967296);
      r = suivant;
      return v;
    },
  );
  return {
    s,
    alice: s.client('alice'),
    bob: s.client('bob'),
    chloe: s.client('chloe'),
    avancer: (ms: number) => (maintenant += ms),
  };
}

async function refus(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof Refus) return e.code;
    throw e;
  }
  throw new Error('pas de refus');
}

describe('Amis du jeu en ligne (DR.12)', () => {
  it('le pseudo est nettoyé et borné', () => {
    expect(validerPseudo('  Léo   le  Grand ')).toBe('Léo le Grand');
    expect(() => validerPseudo('L')).toThrow(Refus);
    expect(() => validerPseudo('x'.repeat(17))).toThrow(Refus);
  });

  it('un profil a un code ami ; on devient amis par ce code, dans les deux sens', async () => {
    const { alice, bob } = salle();
    expect(await alice.profil()).toBeNull();
    const a = await alice.nommer('Alice');
    const b = await bob.nommer('Bob');
    expect(a.codeAmi).toMatch(/^[A-Z]{6}$/);
    expect(a.codeAmi).not.toBe(b.codeAmi);
    expect(await refus(alice.ajouterAmi(a.codeAmi))).toBe('soi_meme');
    expect(await refus(alice.ajouterAmi('ZZZZZZ'))).toBe('ami_introuvable');
    expect((await alice.ajouterAmi(b.codeAmi.toLowerCase())).pseudo).toBe('Bob');
    expect((await bob.amis()).map((x) => x.pseudo)).toEqual(['Alice']);
    // Changer de pseudo garde le code ami.
    expect((await alice.nommer('Alix')).codeAmi).toBe(a.codeAmi);
    expect((await bob.amis())[0]?.pseudo).toBe('Alix');
  });

  it('jouer ensemble rend amis, et chacun voit le pseudo de l’autre', async () => {
    const { alice, bob } = salle();
    await alice.nommer('Alice');
    await bob.nommer('Bob');
    const v = await alice.ouvrir({});
    const w = await bob.rejoindre(v.code);
    expect(w.adversaire).toBe('Alice');
    expect((await alice.lire(v.id)).adversaire).toBe('Bob');
    expect((await alice.amis()).map((x) => x.id)).toEqual(['bob']);
  });

  it('inviter un ami : il voit l’invitation, qui disparaît quand il rejoint', async () => {
    const { alice, bob, chloe } = salle();
    await alice.nommer('Alice');
    const b = await bob.nommer('Bob');
    await chloe.nommer('Chloé');
    expect(await refus(alice.ouvrir({}, 'bob'))).toBe('pas_ami');
    await alice.ajouterAmi(b.codeAmi);
    let prevenu = 0;
    const arreter = bob.suivreInvitations(() => prevenu++);
    const v = await alice.ouvrir({ carte: 'piscine' }, 'bob');
    const [inv] = await bob.invitations();
    expect(inv).toMatchObject({ partieId: v.id, code: v.code, pseudo: 'Alice', carte: 'piscine' });
    expect(await chloe.invitations()).toEqual([]);
    await bob.rejoindre(inv?.code ?? '');
    expect(await bob.invitations()).toEqual([]);
    expect(prevenu).toBe(2);
    arreter();
  });

  it('une invitation annulée ou trop vieille n’est plus montrée', async () => {
    const { alice, bob, avancer } = salle();
    await alice.nommer('Alice');
    await alice.ajouterAmi((await bob.nommer('Bob')).codeAmi);
    const v = await alice.ouvrir({}, 'bob');
    await alice.envoyer(v.id, { type: 'abandonner' });
    expect(await bob.invitations()).toEqual([]);
    await alice.ouvrir({}, 'bob');
    avancer(25 * 3600 * 1000);
    expect(await bob.invitations()).toEqual([]);
  });
});

describe('Temps limite (DR.12)', () => {
  it('celui qui a laissé filer son temps peut aussi clore la partie (il perd)', async () => {
    const { alice, bob, avancer } = salle();
    const v = await alice.ouvrir({ delaiTour: 60 });
    await bob.rejoindre(v.code);
    const vue = await alice.lire(v.id);
    const enRetard = vue.etat?.courant === 'rouge' ? alice : bob;
    expect(await refus(enRetard.envoyer(v.id, { type: 'reclamer' }))).toBe('pas_encore');
    avancer(61_000);
    // Un coup en retard ne passe pas : la partie est close.
    const fin = await enRetard.envoyer(v.id, {
      type: 'jouer',
      action: { type: 'appeler' },
      version: vue.version,
    });
    expect(fin.statut).toBe('finie');
    expect(fin.issue?.raison).toBe('temps');
    expect(fin.issue?.gagnant).not.toBe(fin.bande);
  });

  it('retirer un ami le retire des deux listes', async () => {
    const { alice, bob } = salle();
    await alice.nommer('Alice');
    const b = await bob.nommer('Bob');
    await alice.ajouterAmi(b.codeAmi);
    expect((await bob.amis()).map((a) => a.pseudo)).toEqual(['Alice']);
    await bob.retirerAmi((await bob.amis())[0]?.id ?? '');
    expect(await alice.amis()).toEqual([]);
    expect(await bob.amis()).toEqual([]);
  });
});
