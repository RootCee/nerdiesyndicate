// M7.2 Nerdie Blaq Academy Library content. Pure data (no DOM): the library's reading panel, its
// lecterns, and the tests read it. Everything here comes from nerdieblaq.xyz, word for word:
// - the two guides are the Academy's certification guide PDFs (/academy/certifications/*.pdf)
// - the practice exams are the dashboard's certification questions (website src/lib/missions.ts)
// - the intro series and the ebook are the links on the Academy page (/academy)
// Practice exams are practice only: they record nothing and pay nothing. Real certification
// (and its soulbound mint, a blockchain transaction) stays on the website's dashboard.

export const ACADEMY_SITE = 'https://nerdieblaq.xyz';
export const ACADEMY_LINKS = Object.freeze({
  academy: `${ACADEMY_SITE}/academy`,
  certify: `${ACADEMY_SITE}/dashboard#certification-missions`,
  playlist: 'https://youtube.com/playlist?list=PLAX8YWrl6eTQsXS3R_onp5efHoLGWjxoC&si=Vgd0nalewfGigNki',
  ebook: 'https://chatgpt.com/canvas/shared/67dc6d7ba4748191a04565c279d2b21b',
});

const chapter = (title, body, points) => Object.freeze({ title, body, points: Object.freeze(points) });

export const ACADEMY_BOOKS = Object.freeze([
  Object.freeze({
    id: 'defi-guide', shelf: 'Web3 & DeFi', title: 'Beginner DeFi Certification Guide', author: 'Nerdie Blaq Academy',
    exam: 'defi-exam', pdf: `${ACADEMY_SITE}/academy/certifications/beginner-defi-certification-guide.pdf`, cover: 0x4b168c,
    chapters: Object.freeze([
      chapter('Introduction to Decentralized Finance', 'Decentralized Finance (DeFi) is a blockchain-based financial ecosystem that removes traditional intermediaries such as banks and replaces them with smart contracts. Instead of requesting permission from institutions, users interact directly with protocols through self-custodied wallets. In Nerdie City, DeFi knowledge is required because the city economy is built around ownership, staking, governance, and on-chain identity.',
        ['Understand what a blockchain is', 'Understand how smart contracts work', 'Understand self-custody and wallet ownership', 'Understand why DeFi is different from traditional finance']),
      chapter('Wallet Security and Self-Custody', 'Your wallet is the foundation of your digital identity. A wallet does not actually store cryptocurrency; it stores the private keys that allow you to control blockchain assets. Whoever controls the private key controls the wallet. This is why security is critical.',
        ['Never share your seed phrase', 'Never store seed phrases in screenshots or cloud notes', 'Verify transaction prompts before signing', 'Use hardware wallets for valuable assets', 'Avoid connecting wallets to unknown websites']),
      chapter('Understanding Tokens and NFTs', 'Fungible tokens are interchangeable assets like currencies, while NFTs represent unique ownership. Inside Nerdie City, NFTs can represent certifications, business ownership, progression status, or future gameplay assets. Soulbound NFTs are non-transferable credentials tied directly to the operator wallet.',
        ['ERC-20 tokens represent transferable value', 'ERC-721 and ERC-1155 represent NFT ownership', 'Soulbound NFTs prove achievements or qualifications', 'Business NFTs unlock operational rights inside the city']),
      chapter('Liquidity, Markets, and Trading', 'Liquidity is the ability to buy or sell an asset without causing extreme price movement. In decentralized exchanges, liquidity is often supplied by users through liquidity pools. Understanding liquidity helps operators recognize market health and avoid risky conditions.',
        ['Liquidity pools are used instead of traditional order books', 'Low liquidity can increase volatility and slippage', 'Market psychology heavily impacts price movement', 'Operators should understand both risk and opportunity']),
      chapter('Staking and On-Chain Participation', 'Staking is the process of locking assets into a protocol or system in exchange for rewards, access, permissions, or operational readiness. Within Nerdie City, staking is tied to activation states, trust systems, and future business scaling.',
        ['Staking can unlock gameplay permissions', 'Businesses may require minimum staking tiers', 'Staking can affect trust and operational readiness', 'Operators must understand lock periods and risk']),
      chapter('Smart Contract Risks', 'Smart contracts are powerful, but they are not risk-free. Poorly written contracts may contain exploits, rug-pull mechanics, or vulnerabilities. Operators should always verify contract addresses and understand the risks before interacting with new protocols.',
        ['Read audits whenever possible', 'Verify official contract addresses', 'Avoid emotional decision-making', 'Do not blindly approve wallet permissions']),
      chapter('Applying DeFi Knowledge Inside Nerdie City', 'The Beginner DeFi Certification proves that an operator understands the foundations required to safely interact with the city economy. This certification unlocks future academy pathways, advanced business types, and operational permissions.',
        ['Unlocks future certifications', 'Unlocks advanced business progression', 'Acts as a trust signal in future systems', 'Functions as a soulbound credential']),
    ]),
  }),
  Object.freeze({
    id: 'operator-guide', shelf: 'Business & Operations', title: 'Business Operator & Staking Certification Guide', author: 'Nerdie Blaq Academy',
    exam: 'operator-exam', pdf: `${ACADEMY_SITE}/academy/certifications/business-operator-staking-guide.pdf`, cover: 0x123d2a,
    chapters: Object.freeze([
      chapter('Business Operations in Nerdie City', 'Nerdie City businesses are designed as operational systems, not static collectibles. Operators are expected to manage staffing, staking, district trust, certifications, and future defense systems. Each business type exists within a living city economy.',
        ['Businesses are tied to NFT ownership', 'Operations affect trust and progression', 'District placement matters', 'Operator readiness impacts activation state']),
      chapter('Business NFT Sectors and Variants', 'Each Business NFT sector contains multiple operational variants. For example, a Tech Startup NFT may allow a Data Hub, Bot Lab, Signal Center, or Security Office. Each variant has unique staffing, staking, and trust expectations.',
        ['Retail Business variants focus on commerce', 'Tech Startup variants focus on data and systems', 'Entertainment Venue variants focus on influence and activity', 'Financial Institution variants require higher trust']),
      chapter('Qualification and Certification', 'Operators cannot safely manage advanced systems without proving competency. Certifications exist to ensure that users understand both the economic and operational risks of the ecosystem.',
        ['Beginner DeFi Certification teaches blockchain fundamentals', 'Business Operator Certification teaches operational readiness', 'Future certifications may specialize by district or industry', 'Soulbound certs become long-term trust credentials']),
      chapter('Activation and Staking', 'Business setup and business activation are intentionally separate stages. A player may own and configure a business but still fail activation if staffing, staking, or trust conditions are not satisfied.',
        ['Staking affects activation readiness', 'Missing staking can create operational risk', 'Higher-tier businesses may require larger commitments', 'Activation status impacts future city systems']),
      chapter('Staffing and Team Structures', 'Businesses require operators, support roles, and eventually specialized positions such as analysts, security staff, or automation controllers. Future gameplay systems may allow player guilds or collaborative operations.',
        ['Owner slots control strategic direction', 'Operator slots manage daily functions', 'Support slots improve efficiency', 'Defense slots reduce operational vulnerability']),
      chapter('District Trust and Heat', 'Every district in Nerdie City develops its own trust dynamics. Operators with poor performance, excessive heat, or weak staffing may lose permissions or enter at-risk operational states.',
        ['High trust unlocks advanced permissions', 'Heat represents instability or risk', 'District reputation influences opportunities', 'Operational discipline matters']),
      chapter('Long-Term Vision', 'The long-term vision for Nerdie City is a persistent metaverse economy inspired by open-world city systems, decentralized ownership, and strategic progression. Businesses, certifications, missions, districts, and trust systems will all work together to create player-driven growth.',
        ['Businesses become persistent city entities', 'Certifications become long-term operator identity', 'Districts evolve dynamically', 'The ecosystem supports music, business, crypto, gaming, and education']),
    ]),
  }),
]);

const question = (id, prompt, options, correct, explanation) => Object.freeze({ id, prompt, options: Object.freeze(options.map(([oid, label]) => Object.freeze({ id: oid, label }))), correct, explanation });

export const ACADEMY_EXAMS = Object.freeze([
  Object.freeze({
    id: 'defi-exam', title: 'Beginner DeFi Certification', book: 'defi-guide', passThreshold: 3,
    questions: Object.freeze([
      question('wallet-custody', 'What is the main reason a self-custody wallet matters in DeFi?', [['a', 'It lets the game server hold your assets for you.'], ['b', 'It gives you direct control over the wallet keys used to access assets.'], ['c', 'It guarantees every trade will be profitable.']], 'b',
        'Self-custody means the user controls the wallet credentials rather than delegating them to a third party.'),
      question('lp-risk', 'What risk can happen when you provide liquidity to a DeFi pool?', [['a', 'Impermanent loss if token prices move relative to each other.'], ['b', 'The blockchain stops recording transactions forever.'], ['c', 'Your NFT level is automatically reset.']], 'a',
        'Liquidity providers can face impermanent loss when paired asset prices diverge.'),
      question('gas-fees', 'What are gas fees generally paying for on a blockchain network?', [['a', 'Extra in-game reputation only.'], ['b', 'Network computation and transaction inclusion.'], ['c', 'Guaranteed staking rewards.']], 'b',
        'Gas fees compensate the network for processing and including transactions.'),
      question('slippage', 'What does slippage usually describe in a token swap?', [['a', 'The difference between expected and executed price.'], ['b', 'A permanent ban from using DeFi apps.'], ['c', 'The number of NFTs in a wallet.']], 'a',
        'Slippage is the price movement between quote time and execution time.'),
    ]),
  }),
  Object.freeze({
    id: 'operator-exam', title: 'Business Operator / Staking Certification', book: 'operator-guide', passThreshold: 3,
    questions: Object.freeze([
      question('activation-bridge-purpose', 'What is the current purpose of the staking bridge in the local business slice?', [['a', 'It acts as an activation entitlement for business gameplay, not a second reward lane.'], ['b', 'It permanently replaces all business ownership checks.'], ['c', 'It automatically fills operator and defense slots.']], 'a',
        'The current slice treats staking as an activation entitlement bridge while leaving token rewards on the existing staking contract lane.'),
      question('operator-readiness', 'What must still be true before a locally opened business can become active after staking is present?', [['a', 'Only the district color theme must match the NFT image.'], ['b', 'Required owner/operator coverage and other business requirements still need to be satisfied.'], ['c', 'The business automatically becomes active with no other checks.']], 'b',
        'Activation still depends on the broader business rules, including required staffing and any remaining gating conditions.'),
      question('activation-scope', 'Why is a separate operator/staking certification useful in the current roadmap?', [['a', 'It separates activation readiness from setup and can later become a reusable proof.'], ['b', 'It removes the need for business variants and district fit.'], ['c', 'It lets the UI bypass domain-level eligibility rules.']], 'a',
        'The operator/staking certification is a distinct readiness proof for activation and can later evolve into a soulbound credential.'),
      question('stake-tier-awareness', 'What does the required staking tier represent in the current business model?', [['a', 'A gameplay activation threshold tied to the business path being operated.'], ['b', 'A guaranteed city-wide combat bonus.'], ['c', 'A replacement for certifications, staffing, and trust.']], 'a',
        "The required tier represents the level of staking entitlement needed for that business path's activation state."),
    ]),
  }),
]);

export const ACADEMY_MEDIA = Object.freeze([
  Object.freeze({ id: 'intro-series', kind: 'video', title: 'Academy Intro Series', blurb: 'Start with the original Nerdie Blaq Academy video series, then move into the guides and practice exams here in the Library.', href: ACADEMY_LINKS.playlist, action: 'Watch on YouTube' }),
  Object.freeze({ id: 'ebook', kind: 'ebook', title: 'From 5K to 1 Million', blurb: 'The original free ebook: mindset, strategy, and digital wealth-building.', href: ACADEMY_LINKS.ebook, action: 'Open the ebook' }),
]);

export const bookById = (id) => ACADEMY_BOOKS.find((b) => b.id === id) || null;
export const examById = (id) => ACADEMY_EXAMS.find((e) => e.id === id) || null;
export const mediaById = (id) => ACADEMY_MEDIA.find((m) => m.id === id) || null;

// Score a practice exam: answers is { questionId: optionId }. Nothing is stored or sent anywhere.
export function scoreExam(exam, answers = {}) {
  const results = exam.questions.map((q) => ({ id: q.id, chosen: answers[q.id] ?? null, correct: answers[q.id] === q.correct, answer: q.correct, explanation: q.explanation }));
  const score = results.filter((r) => r.correct).length;
  return { score, total: exam.questions.length, passed: score >= exam.passThreshold, results };
}
