/**
 * Photography from Unsplash, used under the Unsplash License (free for commercial use,
 * attribution appreciated). Each entry links back to its source page.
 */
export interface Photo {
  id: string;
  alt: string;
  page: string;
  /** CSS object-position, for art direction. */
  pos?: string;
}

const P = (id: string, alt: string, slug: string, pos?: string): Photo => ({ id, alt, page: `https://unsplash.com/photos/${slug}`, pos });

export const PHOTOS = {
  // Tanzania
  dhowSunset: P("photo-1575992042651-e35f5a391252", "A dhow sailing at sunset off Zanzibar", "silhouette-of-sailboat-e5hzQubIb68", "60% 55%"),
  tzConcert: P("photo-1676156786479-46a5b1715f41", "A crowd around a stage at night", "a-crowd-of-people-standing-around-a-stage-at-night-L8r9_VomdKU"),
  tzStage: P("photo-1676156787087-8b1ce952b59f", "A band performing on stage", "a-group-of-people-standing-on-top-of-a-stage-aO-V7T0ufWE"),
  darDusk: P("photo-1772850052171-42329c743ac9", "Dar es Salaam at dusk with a mosque and bridge", "cityscape-with-a-mosque-and-bridge-at-dusk-2L3NBWBOdhU"),
  darSkyline: P("photo-1766730251071-fe1a835875db", "Dar es Salaam skyline with boats on the water", "city-skyline-with-boats-on-the-water-2J0HvhH9ZhU"),
  darAerial: P("photo-1589177900326-900782f88a55", "Aerial view of Dar es Salaam", "aerial-view-of-city-buildings-during-daytime-lZLgqIiFHSw"),
  darBus: P("photo-1674334264206-0c5db3a7c3cb", "Rapid-transit buses on a Dar es Salaam street", "a-couple-of-buses-that-are-sitting-in-the-street-rxsICm9TK6s"),
  streetVendor: P("photo-1718010561203-ababa995734f", "A vendor pushing a fruit cart down a city street", "a-man-pushing-a-cart-full-of-fruit-down-a-street-NXC0nTfrW8I"),
  zanzibarBeach: P("photo-1575999502951-4ab25b5ca889", "White sand beach and pier in Zanzibar", "white-sand-beach-in-zanzibar-e6dRLBx6Kg8"),
  dhowBeach: P("photo-1620896712848-d05411ec91ec", "A dhow resting on a white beach", "man-in-black-shirt-sitting-on-white-and-brown-sail-boat-on-sea-shore-during-daytime-6J3gBcvfbfo"),
  coastAerial: P("photo-1607444807093-eefb769187da", "Aerial view of a turquoise coastline", "aerial-view-of-beach-during-daytime-VqxfYDgg8RQ"),
  kilimanjaro: P("photo-1489392191049-fc10c97e64b6", "Mount Kilimanjaro above the clouds", "mount-kilimanjaro-in-amboseli-national-park-DWXR-nAbxCk"),
  kiliZebras: P("photo-1631646109206-4b5616964f84", "Zebras grazing below Kilimanjaro", "a-group-of-zebras-grazing-in-a-field-with-a-mountain-in-the-background-xQWelDCacZE"),
  acaciaSunset: P("photo-1516026672322-bc52d61a55d5", "An acacia tree in golden-hour grassland", "brown-tree-on-surrounded-by-brown-grass-during-golden-hour-60XLoOgwkfA"),
  safariSunset: P("photo-1516426122078-c23e76319801", "A safari vehicle at sunset", "man-riding-on-gray-car-during-sunset-0LwfbRtQ-ac"),
  giraffeSunset: P("photo-1695367255569-85b0536aeed2", "A giraffe silhouetted against the setting sun", "a-giraffe-is-silhouetted-against-the-setting-sun-U-7GtV1Da2c"),
  tzGuitarist: P("photo-1583492199383-f6edc205f762", "A musician playing electric guitar outdoors", "man-in-white-and-black-stripe-shirt-playing-brown-electric-guitar-Yu4l4FEPRuQ"),
  tzSinger: P("photo-1587600622977-7c4c924d7cf4", "A man holding a microphone", "man-in-red-and-blue-plaid-button-up-shirt-holding-microphone-wavHnLOTbro"),
  tzSmile: P("photo-1563868658432-7c4ea158b960", "A smiling man among green plants", "smiling-man-near-green-plants-oGf8xt3yI7g"),
  // General
  coastFigure: P("photo-1648706903501-8b74096438df", "A person standing on a rocky shore at dusk", "a-person-standing-on-a-beach-uZe_LONbMhI", "40% 50%"),
  concertCrowd: P("photo-1729553199933-c897fea4f41f", "A crowd under blue stage lights", "a-large-crowd-of-people-in-a-dark-room-9lUGIJsf9iw"),
  filmSetNight: P("photo-1681137063068-081072cf04b4", "A film crew around a camera at night", "a-group-of-people-standing-around-a-camera-in-the-dark-LP24lfRFKis"),
  spotlights: P("photo-1657208431551-cbf415b8ef26", "Teal and purple spotlights in haze", "teal-and-purple-nightclub-spotlights-QOajY0MNp8Y"),
  concertStage: P("photo-1602369944529-c237ca143d09", "An audience watching a concert at night", "people-watching-concert-during-night-time-TVV49SQuQ_c"),
  monoStage: P("photo-1558258021-971dd2148be5", "A performer on stage in black and white", "grayscale-photo-of-man-on-stga-XOLIrILp-vI"),
  blueSilhouette: P("photo-1610901056511-31de499995f0", "Silhouettes of a crowd in blue light", "silhouette-of-people-watching-concert-jz_CtXafltc"),
  redStage: P("photo-1714589334427-fb015b709c51", "A band on a stage bathed in red light", "a-group-of-people-standing-on-top-of-a-stage-3-cXlUsL6Os"),
  filmSetDay: P("photo-1632187981988-40f3cbaeef5e", "A crew setting up a camera", "a-group-of-people-standing-around-a-camera-set-up-xKfS7Hll0Ck"),
  shoulderCam: P("photo-1543235074-4768b5c2233c", "A shoulder-mounted cinema camera", "black-shoulder-mount-camera-Wnly2mV4YKw"),
  pinkCam: P("photo-1642266488300-1a57609d73aa", "A camera on a tripod against magenta light", "a-camera-on-a-tripod-in-front-of-a-red-and-purple-background-5UdK_9tZIaY"),
  studioMic: P("photo-1478737270239-2f02b77fc618", "A studio condenser microphone", "macro-photography-of-silver-and-black-studio-microphone-condenser-c1ZN57GfDB0"),
  studioDesk: P("photo-1463421585849-6b0acf2c9257", "A producer at a mixing desk", "man-in-front-of-studio-mixer-and-receiver-xxgkYSD-ekE"),
  mixer: P("photo-1627773755683-dfcf2774596a", "Hands on an audio mixer", "man-in-black-long-sleeve-shirt-playing-audio-mixer-WHTq-xyU40o"),
  redMic: P("photo-1633933757597-2d09c360c2ad", "A microphone lit in red and blue", "a-microphone-with-a-red-light-shining-on-it-jv3e5aURtcw"),
  seaSunset: P("photo-1441154283565-f88df169765a", "Rocks in the sea at sunset", "rocks-on-sea-under-sunset-Bm0Ja6LZWl4"),
  goldenShore: P("photo-1508313157893-34fe6176c189", "Waves on a shore at golden hour", "seashore-during-golden-hour-IM8AJKDavbk"),
  neonRide: P("photo-1599060052009-24d6d0b0161c", "A motorcycle on a neon-lit street", "motorcycle-on-neon-city-street-Z0aBm6359Oo"),
  neonAlley: P("photo-1628850627071-42b3fb16533d", "A narrow alley glowing with neon signs", "neon-alleyway-in-japan-mGs7oMPLB-c"),
  nightWalk: P("photo-1642845355300-5b81d31720bf", "A person walking down a city street at night", "a-person-walking-down-a-city-street-at-night-tKEUQJSq8Xg"),
  drummer: P("photo-1751708692623-44fe44b6bcff", "A musician playing a drum outdoors", "a-musician-plays-a-drum-at-an-outdoor-event-s32L5adnJ24"),
  guitarist: P("photo-1647208976651-d328633e9628", "A musician holding a guitar", "a-man-with-a-rainbow-hat-holding-a-guitar-rUufNkcGSAw"),
  performers: P("photo-1764670274687-ab62458d6306", "Performers in colourful clothing on stage", "people-in-colorful-traditional-clothing-performing-on-stage-9s1zMTevjm0"),
  editorDesk: P("photo-1744686909710-37b9531cbb60", "An editor cutting video on a computer", "a-man-edits-video-on-a-computer-brC_7jOF_cg"),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

export function photoUrl(p: Photo, w = 1600, q = 75) {
  return `https://images.unsplash.com/${p.id}?auto=format&fit=crop&w=${w}&q=${q}`;
}
