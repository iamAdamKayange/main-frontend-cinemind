"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Lang = "en" | "sw";

const en = {
  nav: { workflows: "Workflows", ai: "AI editing", platforms: "Platforms", how: "How it works", faq: "FAQ", signIn: "Sign in", open: "Open studio" },
  hero: {
    headlines: [
      ["Edit at the", "speed of", "your ideas."],
      ["Say the cut.", "See the cut."],
      ["One project.", "Every screen", "you own."],
    ],
    pause: "Pause headlines",
    play: "Play headlines",
    lead: "Your AI video editing studio — with Cine as your editing partner.",
    body: "Upload footage and music, describe the edit in plain words, review exactly what Cine proposes and keep full control of a real multitrack timeline.",
    cta: "Start free",
    cta2: "Watch the 20-second demo",
    platforms: "Made in Tanzania · Web · Windows · macOS · Linux · Android · iOS",
    audienceTitle: "Made for the way you produce.",
    audiences: [
      ["Bongo Flava & music videos", "From master track to a beat-synced performance cut."],
      ["Creators & social teams", "Jump-cut talking heads and ship vertical clips fast."],
      ["Studios, brands & tourism", "From Zanzibar to Serengeti — client brief to first edit."],
    ],
    prompt: "Cut the chorus on the beat and keep the song as master",
    toast: "14 cuts proposed · 120 BPM · waiting for your approval",
  },
  reel: {
    eyebrow: "20-second demo",
    title: ["Watch Cine", "cut to the beat."],
    body: "This loop is the real workflow, condensed: a prompt, a beat grid, shot changes, and a proposal you approve. Every cut lands on the music.",
    steps: ["Reads the song: 120 BPM", "Finds shot changes in every take", "Cuts every 2 beats", "Waits for your approval"],
    caption: "Illustrative footage. Timeline, beats and cuts are generated live in your browser.",
  },
  caps: {
    eyebrow: "What Cine does",
    title: ["An editor that", "listens, then cuts."],
    items: [
      ["Beat-synced auto cut", "Detects tempo, beats and downbeats in your song, then cuts your takes exactly on the music."],
      ["Silence removal", "Turns rambling talking-head footage into tight jump cuts in one request."],
      ["Shot detection", "Finds every shot change so cuts start on clean, usable moments."],
      ["Your videos stay with you", "Footage never leaves your device. Only your edit syncs, so projects open anywhere."],
      ["Every version kept", "Each change is a new timeline version. Undo, redo or restore any point."],
      ["Export on your device", "Save finished MP4s for YouTube, TikTok, Reels or WhatsApp Status — straight from your device."],
    ],
  },
  workflows: {
    title: ["Pick up your", "next edit."],
    body: "A music video, a content series or a short film. Choose a workflow and see how Cine plans it.",
    proposed: "Cine · proposed plan",
    needs: "needs your approval",
    open: "Open this workflow in the editor",
    illustrative: "Illustrative project",
    items: [
      {
        tab: "Bongo Flava videos",
        eyebrow: "From master track to performance cut",
        title: ["One song.", "Six takes.", "One cut on the beat."],
        body: "Upload the master audio and every performance angle. Cine detects the beat grid and usable ranges, then proposes a cut you can review shot by shot — lip-sync stays in your hands.",
        prompt: "Cut the chorus on the beat, alternate the stage and street takes, keep the master song and fade out at the end.",
        plan: ["Detect 120 BPM grid in song.wav", "Place 14 clips on V1 every 2 beats", "Keep song.wav on A1 as master", "Fade out A1 over the last 2.0s"],
      },
      {
        tab: "Social content",
        eyebrow: "From long recording to short clips",
        title: ["One recording.", "Ten vertical", "clips to post."],
        body: "Drop in a podcast or livestream. Cine removes dead air, tightens the pacing and builds 9:16 cuts with titles you can edit.",
        prompt: "Remove the silences, make it vertical and add a bold title at the start.",
        plan: ["Find 41 silences longer than 0.6s", "Jump-cut 3m 12s down to 2m 07s", "Reframe to 1080×1920", "Add title on T1 at 00:00"],
      },
      {
        tab: "Documentary & travel",
        eyebrow: "From selected takes to an editable cut",
        title: ["A story to tell.", "Takes to sort.", "A cut to shape."],
        body: "Describe the mood and pacing. Cine assembles a first cut from your takes and explains each decision so you can push back.",
        prompt: "Assemble a calm opening from the Serengeti shots. Let the sunset breathe before the first cut.",
        plan: ["Pick 4 Serengeti takes by shot changes", "Hold the acacia wide for 6s", "Add 12-frame dissolves", "Title “Serengeti” at 00:02"],
      },
      {
        tab: "Brands & tourism",
        eyebrow: "From client brief to campaign drafts",
        title: ["One client brief.", "Three formats", "to deliver."],
        body: "Keep the brief, references and footage in one project. Cine drafts the hero edit and the cut-downs, and you export each format.",
        prompt: "Draft a 30s Zanzibar resort ad plus vertical and square versions.",
        plan: ["Build 30s hero edit on V1", "Derive 9:16 and 1:1 sequences", "Match titles to safe areas", "Queue 3 exports"],
      },
    ],
  },
  walk: {
    title: ["Follow one song.", "See the edit", "come together."],
    body: "Step through an illustrative music-video project: from raw material and a few words of direction to a reviewed, exported cut.",
    explore: "Explore the example",
    project: "Music video",
    illustrative: "Illustrative project",
    material: "Your material becomes the shared starting point.",
    interactive: "Interactive project example.",
    note: "One fictional music video. Names and responses are illustrative.",
    with: "With your project in mind",
    steps: [
      { name: "The material", quote: ["Here's the song and the takes.", "Let's find the opening."], body: "Start with what you already have. The master track, every angle and your brief live in one project.", noteTitle: "Project brief", note: ["Energetic, but let the first verse breathe.", "Street takes for verses, stage for chorus."], cta: "Direct the edit" },
      { name: "The direction", quote: ["“Cut the chorus on the beat", "and keep the song as master.”"], body: "Describe the result in your own words. Cine reads the timeline, beats and shot changes — never just the filenames.", noteTitle: "Cine understood", note: ["Chorus 00:42–01:10 · 120 BPM", "Master audio: song.wav on A1"], cta: "Review the plan" },
      { name: "The review", quote: ["Six changes proposed.", "Nothing applied yet."], body: "Every change is an operation you can read, approve or reject. Undo is always one click away — history is never lost.", noteTitle: "Proposed operations", note: ["Trim Street take 1 to 12.0s", "Insert Stage take 3 at 00:42", "Fade out A1 over 2.0s"], cta: "Export the cut" },
      { name: "The export", quote: ["Rendered from version 8.", "Ready on every device."], body: "Exports are made on your own device from the version you approved — ready for YouTube, TikTok or WhatsApp.", noteTitle: "Render · YouTube 1080p", note: ["H.264 · AAC · 30 fps", "Completed in 1m 42s"], cta: "Start again" },
    ],
  },
  compare: {
    title: ["Less timeline", "busywork."],
    body: "Professional editors give you every control. Cine adds an editor that does the repetitive first pass for you — and still hands you the controls.",
    head: ["Task", "Typical manual workflow", "With Cine"],
    rows: [
      ["Cut 3 minutes of takes to a song", "Tap tempo, mark beats, place and trim each clip by hand", "One sentence, then review the proposed cuts"],
      ["Remove pauses from a talk", "Scrub, blade and ripple-delete every gap", "“Remove the silences” — then approve"],
      ["Find usable shots", "Watch every take end to end", "Shot changes detected on upload"],
      ["Continue on another device", "Export project files, relink media", "Open the same project on web, desktop or phone"],
    ],
    note: "Cine proposes; you decide. You can always edit every clip by hand.",
  },
  platforms: {
    title: ["Three screens.", "One project."],
    body: "Start a cut in the browser, finish it on your desktop and approve it from your phone. The same account, media, timeline and AI history follow you everywhere.",
    items: [
      ["Website", "Professional editor in the browser", "Open a project from any computer. Upload, edit, ask Cine and export without installing anything."],
      ["Desktop", "Windows, macOS and Linux", "Native file access, a local media cache and optional local rendering on your own machine."],
      ["Mobile", "Android and iOS", "Review cuts, make quick changes and approve Cine's proposals wherever you are."],
    ],
    backend: "One account everywhere",
    sync: "Your projects, edits and Cine history follow you. Your videos stay on your devices.",
    flow: ["Sign in on the website in Dar", "Add your song and clips — they stay on your device", "Cine edits and saves the project", "Keep editing on Windows desktop", "Fine-tune on Android or iPhone in Zanzibar", "Export the finished video on your device"],
    privacyTitle: "Privacy",
    privacy: [
      ["Footage stays on your device", "Nothing you film is uploaded to CineMind."],
      ["Only the edit syncs", "Cuts, titles and Cine’s notes travel with your account."],
      ["You approve every change", "Cine suggests; nothing changes without your OK."],
    ] as [string, string][],
  },
  principles: {
    title: ["A real editor.", "An AI that", "asks first."],
    items: [
      ["Non-destructive", "Your original media is never changed. Every edit is a new timeline version you can return to."],
      ["You approve", "Cine proposes exact operations. Nothing reaches your timeline without your review."],
      ["Your media, your device", "Originals stay on your phone or computer. CineMind only keeps your edit and its notes."],
      ["Precise to the frame", "Cuts land exactly where you put them, and nudge one frame at a time when you need to."],
    ],
  },
  faq: {
    title: "Questions",
    items: [
      ["Does Cine change my original files?", "No. Uploads are kept as they are. Cine and you edit a timeline that points to them; exports are new files."],
      ["Where are my videos stored?", "On your own device. Your footage is never uploaded to CineMind — only the edit and small notes like beat positions sync to your account. To continue on another device, open the project there and point it to your copy of the files."],
      ["Can I edit without AI?", "Yes. The editor is a full multitrack timeline: trim, split, move, fades, titles, transitions, undo and version history."],
      ["Is lip-sync automatic?", "Cine aligns cuts to the music's beat grid. You should still review lip-sync — you can nudge any clip frame by frame."],
      ["Does it work in Swahili?", "Yes. Switch the site to Kiswahili at the top, and write to Cine in Swahili — it replies in the language you use."],
    ],
  },
  final: { title: ["What will", "you cut", "next?"], body: "Bring a song, a few takes and an idea. Cine helps you get to a first cut — and leaves every final decision to you.", cta: "Start free", cta2: "Open the editor" },
  footer: {
    tagline: "AI video editing for creators, musicians and studios. Made in Tanzania for the world — web, desktop and mobile.",
    cols: [
      ["Product", ["Editor", "Cine AI", "Rendering", "Pricing"]],
      ["Platforms", ["Website", "Windows", "macOS & Linux", "Android & iOS"]],
      ["Company", ["About", "Privacy", "Terms", "Contact"]],
    ] as [string, string[]][],
    credit: "Photography from Unsplash.",
  },
};

type Dict = typeof en;

const sw: Dict = {
  nav: { workflows: "Mitiririko", ai: "Uhariri wa AI", platforms: "Majukwaa", how: "Inavyofanya kazi", faq: "Maswali", signIn: "Ingia", open: "Fungua studio" },
  hero: {
    headlines: [
      ["Hariri kwa", "kasi ya", "mawazo yako."],
      ["Sema mkato.", "Uone mkato."],
      ["Project moja.", "Kwenye kila", "kifaa chako."],
    ],
    pause: "Simamisha vichwa",
    play: "Endesha vichwa",
    lead: "Studio yako ya kuhariri video kwa AI — Cine akiwa mshirika wako wa uhariri.",
    body: "Pakia video na muziki, eleza uhariri kwa maneno ya kawaida, kagua kila pendekezo la Cine na ubaki na udhibiti kamili wa timeline halisi ya tracks nyingi.",
    cta: "Anza bure",
    cta2: "Tazama demo ya sekunde 20",
    platforms: "Imetengenezwa Tanzania · Wavuti · Windows · macOS · Linux · Android · iOS",
    audienceTitle: "Imetengenezwa kwa jinsi unavyozalisha.",
    audiences: [
      ["Bongo Flava na video za muziki", "Kutoka master track hadi mkato unaofuata beat."],
      ["Creators na timu za mitandao", "Kata kimya kwenye video za kuongea, toa clips wima haraka."],
      ["Studio, brands na utalii", "Kutoka Zanzibar hadi Serengeti — brief ya mteja hadi edit ya kwanza."],
    ],
    prompt: "Kata chorus kwenye beat na wimbo ubaki kuwa master",
    toast: "Mikato 14 imependekezwa · 120 BPM · inasubiri idhini yako",
  },
  reel: {
    eyebrow: "Demo ya sekunde 20",
    title: ["Tazama Cine", "akikata kwenye beat."],
    body: "Mzunguko huu ni workflow halisi kwa ufupi: ombi, gridi ya beat, mabadiliko ya shot, na pendekezo unaloidhinisha. Kila mkato unaangukia kwenye muziki.",
    steps: ["Anasoma wimbo: 120 BPM", "Anapata mabadiliko ya shot kwenye kila take", "Anakata kila beat 2", "Anasubiri idhini yako"],
    caption: "Picha ni za mfano. Timeline, beats na mikato vinatengenezwa moja kwa moja kwenye browser yako.",
  },
  caps: {
    eyebrow: "Cine anafanya nini",
    title: ["Mhariri anayesikiliza,", "kisha anakata."],
    items: [
      ["Mkato wa moja kwa moja kwenye beat", "Anatambua tempo, beats na downbeats za wimbo wako, kisha anakata takes zako sawasawa na muziki."],
      ["Kuondoa ukimya", "Anageuza video ndefu za kuongea kuwa jump cuts zilizobana kwa ombi moja."],
      ["Kutambua shots", "Anapata kila badiliko la shot ili mikato ianze kwenye nyakati safi."],
      ["Video zako zinabaki kwako", "Video hazitoki kwenye kifaa chako. Edit pekee ndiyo inaoanishwa, hivyo project inafunguka popote."],
      ["Kila toleo linahifadhiwa", "Kila badiliko ni toleo jipya la timeline. Undo, redo au rudisha wakati wowote."],
      ["Export kwenye kifaa chako", "Hifadhi MP4 kwa YouTube, TikTok, Reels au WhatsApp Status — moja kwa moja kwenye kifaa chako."],
    ],
  },
  workflows: {
    title: ["Endelea na", "edit yako ijayo."],
    body: "Video ya muziki, mfululizo wa maudhui au filamu fupi. Chagua workflow uone Cine anavyoipanga.",
    proposed: "Cine · mpango uliopendekezwa",
    needs: "unahitaji idhini yako",
    open: "Fungua workflow hii kwenye editor",
    illustrative: "Project ya mfano",
    items: [
      {
        tab: "Video za Bongo Flava",
        eyebrow: "Kutoka master track hadi mkato wa performance",
        title: ["Wimbo mmoja.", "Takes sita.", "Mkato mmoja kwenye beat."],
        body: "Pakia master audio na kila angle ya performance. Cine anatambua gridi ya beat na sehemu zinazofaa, kisha anapendekeza mkato unaoweza kukagua shot kwa shot — lip-sync inabaki mikononi mwako.",
        prompt: "Kata chorus kwenye beat, badilisha kati ya takes za jukwaani na za mtaani, wimbo ubaki master na ufifie mwishoni.",
        plan: ["Tambua gridi ya 120 BPM kwenye song.wav", "Weka clips 14 kwenye V1 kila beat 2", "Acha song.wav kwenye A1 kama master", "Fifisha A1 sekunde 2.0 za mwisho"],
      },
      {
        tab: "Maudhui ya mitandao",
        eyebrow: "Kutoka rekodi ndefu hadi clips fupi",
        title: ["Rekodi moja.", "Clips kumi", "wima za kupost."],
        body: "Weka podcast au livestream. Cine anaondoa ukimya, anabana mwendo na kutengeneza mikato ya 9:16 yenye vichwa unavyoweza kuhariri.",
        prompt: "Ondoa ukimya, ifanye wima na weka kichwa kikubwa mwanzoni.",
        plan: ["Pata ukimya 41 wa zaidi ya sekunde 0.6", "Kata 3m 12s hadi 2m 07s", "Panga upya kuwa 1080×1920", "Ongeza kichwa kwenye T1 00:00"],
      },
      {
        tab: "Documentary na utalii",
        eyebrow: "Kutoka takes zilizochaguliwa hadi mkato wa kuhariri",
        title: ["Hadithi ya kusimulia.", "Takes za kupanga.", "Mkato wa kuunda."],
        body: "Eleza hisia na mwendo. Cine anaunganisha mkato wa kwanza kutoka kwenye takes zako na kueleza kila uamuzi ili uweze kupinga.",
        prompt: "Unda mwanzo tulivu kutoka shots za Serengeti. Acha machweo yapumue kabla ya mkato wa kwanza.",
        plan: ["Chagua takes 4 za Serengeti kwa mabadiliko ya shot", "Shikilia wide ya mgunga sekunde 6", "Ongeza dissolves za frame 12", "Kichwa “Serengeti” 00:02"],
      },
      {
        tab: "Brands na utalii",
        eyebrow: "Kutoka brief ya mteja hadi drafts za kampeni",
        title: ["Brief moja ya mteja.", "Miundo mitatu", "ya kutoa."],
        body: "Weka brief, marejeo na video kwenye project moja. Cine anaandaa hero edit na matoleo mafupi, nawe unatoa kila muundo.",
        prompt: "Andaa tangazo la sekunde 30 la hoteli ya Zanzibar pamoja na matoleo ya wima na mraba.",
        plan: ["Jenga hero edit ya 30s kwenye V1", "Tengeneza sequences za 9:16 na 1:1", "Panga vichwa kwenye maeneo salama", "Panga exports 3"],
      },
    ],
  },
  walk: {
    title: ["Fuata wimbo mmoja.", "Uone edit", "ikikamilika."],
    body: "Pitia project ya mfano ya video ya muziki: kutoka malighafi na maneno machache ya mwelekeo hadi mkato uliokaguliwa na kutolewa.",
    explore: "Chunguza mfano",
    project: "Video ya muziki",
    illustrative: "Project ya mfano",
    material: "Malighafi yako inakuwa mahali pa kuanzia pamoja.",
    interactive: "Mfano wa project unaoingiliana.",
    note: "Video moja ya muziki ya kubuni. Majina na majibu ni ya mfano.",
    with: "Akiwa na project yako akilini",
    steps: [
      { name: "Malighafi", quote: ["Huu hapa wimbo na takes.", "Tutafute mwanzo."], body: "Anza na ulicho nacho. Master track, kila angle na brief yako vinakaa kwenye project moja.", noteTitle: "Brief ya project", note: ["Yenye nguvu, lakini verse ya kwanza ipumue.", "Takes za mtaani kwa verses, jukwaa kwa chorus."], cta: "Elekeza edit" },
      { name: "Mwelekeo", quote: ["“Kata chorus kwenye beat", "na wimbo ubaki master.”"], body: "Eleza matokeo kwa maneno yako. Cine anasoma timeline, beats na mabadiliko ya shot — si majina ya faili tu.", noteTitle: "Cine ameelewa", note: ["Chorus 00:42–01:10 · 120 BPM", "Master audio: song.wav kwenye A1"], cta: "Kagua mpango" },
      { name: "Ukaguzi", quote: ["Mabadiliko sita yamependekezwa.", "Hakuna kilichotumika bado."], body: "Kila badiliko ni operation unayoweza kusoma, kuidhinisha au kukataa. Undo iko kwa click moja — historia haipotei.", noteTitle: "Operations zilizopendekezwa", note: ["Punguza Street take 1 hadi 12.0s", "Weka Stage take 3 kwenye 00:42", "Fifisha A1 kwa 2.0s"], cta: "Toa mkato" },
      { name: "Export", quote: ["Imerenderiwa kutoka toleo 8.", "Iko tayari kwenye kila kifaa."], body: "Exports zinatengenezwa kwenye kifaa chako kutoka toleo ulilolidhinisha — tayari kwa YouTube, TikTok au WhatsApp.", noteTitle: "Render · YouTube 1080p", note: ["H.264 · AAC · 30 fps", "Imekamilika kwa 1m 42s"], cta: "Anza upya" },
    ],
  },
  compare: {
    title: ["Kazi ndogo ya", "kurudia-rudia."],
    body: "Editors za kitaalamu zinakupa kila udhibiti. Cine anaongeza mhariri anayefanya hatua ya kwanza ya kurudia-rudia kwa niaba yako — na bado anakuachia udhibiti.",
    head: ["Kazi", "Workflow ya kawaida ya mkono", "Ukiwa na Cine"],
    rows: [
      ["Kata dakika 3 za takes kwa wimbo", "Gusa tempo, weka alama za beat, weka na kupunguza kila clip kwa mkono", "Sentensi moja, kisha kagua mikato iliyopendekezwa"],
      ["Ondoa vituo kwenye mazungumzo", "Tafuta, kata na futa kila pengo", "“Ondoa ukimya” — kisha idhinisha"],
      ["Pata shots zinazofaa", "Tazama kila take mwanzo hadi mwisho", "Mabadiliko ya shot yanatambuliwa wakati wa upload"],
      ["Endelea kwenye kifaa kingine", "Toa faili za project, unganisha media upya", "Fungua project ileile kwenye wavuti, desktop au simu"],
    ],
    note: "Cine anapendekeza; wewe unaamua. Unaweza kuhariri kila clip kwa mkono wakati wowote.",
  },
  platforms: {
    title: ["Skrini tatu.", "Project moja."],
    body: "Anza mkato kwenye browser, umalizie kwenye desktop na uidhinishe kutoka kwenye simu. Akaunti, media, timeline na historia ya AI vinakufuata kila mahali.",
    items: [
      ["Wavuti", "Editor ya kitaalamu kwenye browser", "Fungua project kutoka kompyuta yoyote. Pakia, hariri, muulize Cine na toa bila kusakinisha chochote."],
      ["Desktop", "Windows, macOS na Linux", "Ufikiaji wa faili za ndani, cache ya media na rendering ya ndani kwenye mashine yako."],
      ["Simu", "Android na iOS", "Kagua mikato, fanya mabadiliko ya haraka na idhinisha mapendekezo ya Cine popote ulipo."],
    ],
    backend: "Akaunti moja kila mahali",
    sync: "Projects, edits na historia ya Cine vinakufuata. Video zako zinabaki kwenye vifaa vyako.",
    flow: ["Ingia kupitia wavuti ukiwa Dar", "Ongeza wimbo na video zako — zinabaki kwenye kifaa chako", "Cine anahariri na kuhifadhi project", "Endelea kuhariri kwenye Windows desktop", "Rekebisha kwenye Android au iPhone ukiwa Zanzibar", "Toa video iliyokamilika kwenye kifaa chako"],
    privacyTitle: "Faragha",
    privacy: [
      ["Video zinabaki kwenye kifaa chako", "Hakuna unachorekodi kinachopakiwa kwenye CineMind."],
      ["Edit pekee ndiyo inaoanishwa", "Mikato, vichwa na maelezo ya Cine vinasafiri na akaunti yako."],
      ["Unaidhinisha kila badiliko", "Cine anapendekeza; hakuna kinachobadilika bila idhini yako."],
    ],
  },
  principles: {
    title: ["Editor halisi.", "AI inayouliza", "kwanza."],
    items: [
      ["Haiharibu asili", "Media yako ya asili haibadilishwi kamwe. Kila edit ni toleo jipya la timeline unaloweza kurudia."],
      ["Wewe unaidhinisha", "Cine anapendekeza operations kamili. Hakuna kinachofika kwenye timeline bila ukaguzi wako."],
      ["Media yako, kifaa chako", "Video za asili zinabaki kwenye simu au kompyuta yako. CineMind inahifadhi edit yako na maelezo yake tu."],
      ["Sahihi hadi frame", "Mikato inaangukia pale ulipoweka, na unaweza kusogeza frame moja moja ukihitaji."],
    ],
  },
  faq: {
    title: "Maswali",
    items: [
      ["Je, Cine anabadilisha faili zangu za asili?", "Hapana. Uploads zinabaki kama zilivyo. Wewe na Cine mnahariri timeline inayozielekeza; exports ni faili mpya."],
      ["Video zangu zinahifadhiwa wapi?", "Kwenye kifaa chako mwenyewe. Video zako hazipakiwi kwenye CineMind — ni edit tu na maelezo madogo kama nafasi za beats ndiyo yanaoanishwa kwenye akaunti yako. Ukiendelea kwenye kifaa kingine, fungua project hapo na uionyeshe nakala yako ya faili."],
      ["Naweza kuhariri bila AI?", "Ndiyo. Editor ni timeline kamili ya tracks nyingi: trim, split, move, fades, vichwa, transitions, undo na historia ya matoleo."],
      ["Je, lip-sync ni ya moja kwa moja?", "Cine analinganisha mikato na gridi ya beat ya muziki. Bado kagua lip-sync — unaweza kusogeza clip yoyote frame kwa frame."],
      ["Inafanya kazi kwa Kiswahili?", "Ndiyo. Badilisha tovuti kuwa Kiswahili juu, na mwandikie Cine kwa Kiswahili — anajibu kwa lugha unayotumia."],
    ],
  },
  final: { title: ["Utakata", "nini", "kesho?"], body: "Leta wimbo, takes chache na wazo. Cine anakusaidia kufikia mkato wa kwanza — na anakuachia kila uamuzi wa mwisho.", cta: "Anza bure", cta2: "Fungua editor" },
  footer: {
    tagline: "Uhariri wa video kwa AI kwa creators, wanamuziki na studio. Imetengenezwa Tanzania kwa ajili ya dunia — wavuti, desktop na simu.",
    cols: [
      ["Bidhaa", ["Editor", "Cine AI", "Rendering", "Bei"]],
      ["Majukwaa", ["Wavuti", "Windows", "macOS na Linux", "Android na iOS"]],
      ["Kampuni", ["Kuhusu", "Faragha", "Masharti", "Mawasiliano"]],
    ],
    credit: "Picha kutoka Unsplash.",
  },
};

const DICTS: Record<Lang, Dict> = { en, sw };

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({ lang: "en", setLang: () => {}, t: en });

/** The language preference lives in localStorage; React reads it as an external store. */
const listeners = new Set<() => void>();
function readLang(): Lang {
  try {
    return localStorage.getItem("cm-lang") === "sw" ? "sw" : "en";
  } catch {
    return "en";
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => "en" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    try {
      localStorage.setItem("cm-lang", l);
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((f) => f());
  };
  return <Ctx.Provider value={{ lang, setLang, t: DICTS[lang] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
