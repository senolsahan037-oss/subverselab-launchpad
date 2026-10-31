// The long "how to use every control" videos on the SubverseLab YouTube channel, one per product room (owner 2026-10-22:
// "ürün odalarına ürün ürün videolarını youtube dan koy"). PluginDemos.jsx shows them first, above the room's short demos.
// Every id was checked public and embeddable on 22 Oct 2026 (YouTube oEmbed / Data API). MIHENK's walk-through is already
// in its room's demos (the 60-second film is added here); ELEK and ADALET have no video yet. Owner 22 Oct: every product video on
// the channel belongs in its room. Left out on purpose: re-uploads of a Short already shown, the older copies of the 21 Oct
// how-tos (to be made private), titles that are out of date ("free for the first 1,000", "out October 5") and "Seven plugins,
// one loop" (a product count).
export const HOW_TO_VIDEOS = {
  kubbe: [{ youtube: 'N2jaDi4fYLw', caption: 'How to use every control: three rooms, duck and freeze.' }],
  kaset: [
    { youtube: 'EvmeKyX1S3I', caption: 'How to use every control, on a full mix.' },
    { youtube: '1tnXrmoxNDs', vertical: true, caption: 'TRACK: latency from 15 ms down to 1.5 ms, tape on while you record.' },
  ],
  koro: [{ youtube: '7fjPE0Hix0w', caption: 'How to use every control: auto key, doubling and harmony.' }],
  yanki: [{ youtube: 'Ht8lVPnDp4M', caption: 'How to use every control: tempo-synced echo that swells into a loop.' }],
  hava: [{ youtube: 'rWoYw7a2SDM', caption: 'How to use every control: air and spring sheen on a master.' }],
  tutkal: [{ youtube: 'AuAGjv7M2NA', caption: 'GLUE, LA and PUMP explained on a drum bus, a vocal and a sidechain.' }],
  taban: [{ youtube: 'jyHV9ZbCU_4', caption: 'How to use it: set a floor, lift the quiet parts.' }],
  alev: [{ youtube: 'UlNxrDGTjjA', caption: 'How to use every control: three-band heat on a mix.' }],
  kiyma: [{ youtube: 'okFHKJZzWrE', caption: 'How to use every control: chop and replay the last phrase in time.' }],
  mihenk: [{ youtube: 'xH_K_vktjqg', caption: 'MIHENK in 60 seconds: measure, plan, master.' }],
  seda: [{ youtube: 'IasD3vxJgPU', caption: 'How to use every control: the analog delay walk-through.' }],
  ru8: [
    { youtube: 'Oq79sAItRPY', caption: 'A two-minute tour of the drum machine.' },
    { youtube: 'Q_RlfS9-A3Q', caption: 'RU-8 in twelve seconds.' },
  ],
  // Every JING FANG video on the channel (owner 22 Oct: "burada birden fazla video var"): the three 2-minute films, then the six Shorts.
  // Filmed on 1.0.0; 1.1.0 (live 22 Oct) adds to it without changing what these show.
  jingfang: [
    { youtube: 'I9oLVRR7e2c', caption: 'Arp, sequencer and drum machine in one synthesizer.' },
    { youtube: 'nFV0Dg7t5Cw', caption: 'The Tuning Lab: learn a tuning from a recording.' },
    { youtube: 'z0WIVBxhBOg', caption: 'The preset synthesizer, the effects and the patch bay.' },
    { youtube: 'FEuJPaKEqSo', vertical: true, caption: 'Play between the keys.' },
    { youtube: 'pQI_NCkSQqU', vertical: true, caption: 'Learn a tuning from a recording.' },
    { youtube: 'oI4BpAWyYpg', vertical: true, caption: 'Build a sound out of other sounds.' },
    { youtube: 'N9qfbZ34g7A', vertical: true, caption: 'The patch bay.' },
    { youtube: 'MkdZ1r3KHJ0', vertical: true, caption: 'Write a sequence, then play on top.' },
    { youtube: 'z170GKyUl_w', vertical: true, caption: 'A drum machine inside the synth.' },
  ],
};
