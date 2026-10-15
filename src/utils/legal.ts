// The Terms of use and the Privacy policy shown in the app. They describe what the app really does (see SECURITY.md):
// change them together with the code, and raise LEGAL_VERSION when they change in a way people should accept again.

/** Whoever accepted an older version is asked again. */
export const LEGAL_VERSION = '2026-10-14';
export const LEGAL_UPDATED = '14 tetor 2026';

/** The address people can write to about their data. Shown at the end of both documents when it is not empty. */
export const LEGAL_CONTACT_EMAIL = '';

export interface LegalSection {
  title: string;
  /** One paragraph each. */
  body: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

const contactSection = (about: string): LegalSection => ({
  title: 'Kontakt',
  body: [
    LEGAL_CONTACT_EMAIL
      ? `${about} shkruaj te ${LEGAL_CONTACT_EMAIL}.`
      : `${about} kontakto zhvilluesin e aplikacionit.`,
  ],
});

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Politika e privatësisë',
  intro:
    'Kjo politikë shpjegon çfarë të dhënash ruan aplikacioni Note Shop List, pse i ruan, ku ruhen dhe çfarë mund të bësh ti me to.',
  sections: [
    {
      title: 'Çfarë të dhënash ruajmë',
      body: [
        'Llogaria: email-i yt dhe, nëse hyn me Google, emri yt dhe një identifikues i llogarisë që e krijon sistemi.',
        'Ato që shkruan ti: listat e blerjeve, artikujt, sasitë, çmimet, të ardhurat, shënimet dhe cilësimet e tyre.',
        'Vetëm në telefonin tënd: emri që shkruan te Profili, zgjedhja për kyçjen e aplikacionit dhe një kopje e të dhënave për të punuar pa internet.',
        'Nuk mbledhim vendndodhjen, kontaktet, fotot, kamerën ose mikrofonin, dhe nuk përdorim reklama apo analitika.',
      ],
    },
    {
      title: 'Pse i përdorim',
      body: [
        'Vetëm që aplikacioni të funksionojë: të hysh në llogari, të ruhen listat e tua dhe t’i shohësh në çdo pajisje ku hyn. Nuk i përdorim për reklama, profilizim ose qëllime të tjera.',
      ],
    },
    {
      title: 'Ku ruhen dhe kush i përpunon',
      body: [
        'Të dhënat ruhen te shërbimi Google Firebase (Authentication dhe Cloud Firestore), që i përpunon për ne si ofrues teknik. Lidhja është e enkriptuar (HTTPS). Serverat e Google mund të jenë jashtë vendit tënd.',
        'Nuk i shesim dhe nuk i ndajmë me persona të tretë. Rregullat e bazës së të dhënave lejojnë që secili person të shohë, të ndryshojë ose të fshijë vetëm dokumentin e vet.',
      ],
    },
    {
      title: 'Siguria',
      body: [
        'Fjalëkalimi duhet të ketë të paktën 10 karaktere me shkronja dhe shifra. Mund të aktivizosh kyçjen e aplikacionit me gjurmë gishti, PIN ose model; atëherë ekrani fshihet edhe në aplikacionet e fundit. Kur del nga llogaria, kopja e të dhënave hiqet nga telefoni.',
        'Asnjë sistem nuk është plotësisht i padepërtueshëm: mos e ndaj fjalëkalimin me askënd.',
      ],
    },
    {
      title: 'Sa kohë i ruajmë',
      body: [
        'Derisa të fshish llogarinë. Listat që i fshin ti shkojnë në Koshin dhe fshihen përfundimisht pas 30 ditësh.',
      ],
    },
    {
      title: 'Të drejtat e tua',
      body: [
        'Qasje dhe korrigjim: i sheh dhe i ndryshon të dhënat vetë, në aplikacion.',
        'Fshirje: te Profili, “Fshi llogarinë dhe të dhënat” heq përgjithmonë llogarinë dhe të gjitha të dhënat nga cloud-i dhe nga telefoni.',
        'Mund ta tërheqësh pranimin në çdo kohë duke fshirë llogarinë.',
        'Ke të drejtë të paraqesësh ankesë te autoriteti për mbrojtjen e të dhënave personale në vendin tënd.',
      ],
    },
    {
      title: 'Fëmijët',
      body: ['Aplikacioni nuk është ndërtuar për fëmijë nën 16 vjeç. Mos e përdor pa miratimin e prindit ose kujdestarit.'],
    },
    {
      title: 'Ndryshimet',
      body: [
        'Nëse e ndryshojmë këtë politikë në mënyrë të rëndësishme, aplikacioni do të të kërkojë ta pranosh sërish përpara se të vazhdosh.',
      ],
    },
    contactSection('Për pyetje ose për të ushtruar të drejtat e tua,'),
  ],
};

export const TERMS_OF_USE: LegalDocument = {
  title: 'Kushtet e përdorimit',
  intro: 'Duke përdorur Note Shop List i pranon këto kushte. Nëse nuk pajtohesh, mos e përdor aplikacionin.',
  sections: [
    {
      title: 'Çfarë është aplikacioni',
      body: [
        'Note Shop List është një aplikacion personal për të mbajtur lista blerjesh, shpenzime, të ardhura dhe shënime. Është i destinuar për përdorim personal dhe familjar.',
      ],
    },
    {
      title: 'Llogaria dhe siguria',
      body: [
        'Je përgjegjës për llogarinë tënde, për fjalëkalimin dhe për pajisjen ku hyn. Mos e ndaj fjalëkalimin. Nëse dyshon se dikush e ka përdorur llogarinë tënde, ndrysho fjalëkalimin menjëherë.',
      ],
    },
    {
      title: 'Përdorimi i lejuar',
      body: [
        'Përdore aplikacionin vetëm ligjërisht dhe për qëllimin e tij. Mos u përpiq të hysh në llogaritë ose të dhënat e të tjerëve, mos e ngarko shërbimin me kërkesa të tepërta dhe mos e prish, kopjo ose ndrysho aplikacionin për qëllime të këqija.',
      ],
    },
    {
      title: 'Të dhënat e tua',
      body: [
        'Të dhënat që fut janë të tuat. Ne i ruajmë vetëm që aplikacioni të funksionojë, siç shpjegohet te Politika e privatësisë. Mund t’i fshish në çdo kohë (Profili, “Fshi llogarinë dhe të dhënat”).',
      ],
    },
    {
      title: 'Saktësia e shifrave',
      body: [
        'Totalet, përqindjet dhe grafikët llogariten nga ato që fut ti. Aplikacioni nuk është këshillë financiare, kontabël ose tatimore: shifrat e rëndësishme kontrolloji vetë.',
      ],
    },
    {
      title: 'Disponueshmëria dhe kopjet',
      body: [
        'Përpiqemi ta mbajmë aplikacionin të punojë mirë, por nuk garantojmë që do të jetë gjithmonë pa gabime ose pa ndërprerje. Ruaj vetë çdo të dhënë që është shumë e rëndësishme.',
      ],
    },
    {
      title: 'Kufizimi i përgjegjësisë',
      body: [
        'Aplikacioni jepet “ashtu siç është”. Brenda kufijve që lejon ligji, zhvilluesi nuk mban përgjegjësi për humbje të të dhënave, humbje financiare ose dëme të tjera që vijnë nga përdorimi ose nga pamundësia për ta përdorur.',
      ],
    },
    {
      title: 'Mbyllja e llogarisë',
      body: [
        'Mund ta fshish llogarinë kur të duash. Mund ta pezullojmë ose mbyllim një llogari që e përdor keq aplikacionin.',
      ],
    },
    {
      title: 'Ndryshimet',
      body: [
        'Mund t’i përditësojmë këto kushte. Kur ndryshojnë në mënyrë të rëndësishme, do të të kërkohet t’i pranosh sërish.',
      ],
    },
    contactSection('Për pyetje rreth këtyre kushteve,'),
  ],
};
