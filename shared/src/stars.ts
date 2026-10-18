// Bright-star catalog (J2000). RA in degrees, Dec in degrees, plus visual
// magnitude. Precession over a couple decades is well under a degree — fine for
// an ambient sky. Includes iconic asterisms and constellation outlines for both
// hemispheres, each toggleable from the control panel.

export interface Star {
  id: string;
  name: string;
  ra: number; // degrees
  dec: number; // degrees
  mag: number;
}

export interface Constellation {
  id: string;
  name: string;
  segments: [string, string][];
}

export const STARS: Star[] = [
  { id: "sirius", name: "Sirius", ra: 101.288, dec: -16.716, mag: -1.46 },
  { id: "canopus", name: "Canopus", ra: 95.988, dec: -52.696, mag: -0.74 },
  { id: "rigil", name: "Rigil Kent.", ra: 219.9, dec: -60.835, mag: -0.27 },
  { id: "arcturus", name: "Arcturus", ra: 213.915, dec: 19.182, mag: -0.05 },
  { id: "vega", name: "Vega", ra: 279.234, dec: 38.784, mag: 0.03 },
  { id: "capella", name: "Capella", ra: 79.173, dec: 45.998, mag: 0.08 },
  { id: "rigel", name: "Rigel", ra: 78.6345, dec: -8.2016, mag: 0.13 },
  { id: "procyon", name: "Procyon", ra: 114.825, dec: 5.225, mag: 0.34 },
  { id: "betelgeuse", name: "Betelgeuse", ra: 88.7925, dec: 7.407, mag: 0.42 },
  { id: "achernar", name: "Achernar", ra: 24.429, dec: -57.237, mag: 0.46 },
  { id: "hadar", name: "Hadar", ra: 210.9555, dec: -60.373, mag: 0.61 },
  { id: "altair", name: "Altair", ra: 297.696, dec: 8.868, mag: 0.77 },
  { id: "aldebaran", name: "Aldebaran", ra: 68.9805, dec: 16.509, mag: 0.85 },
  { id: "spica", name: "Spica", ra: 201.2985, dec: -11.161, mag: 1.04 },
  { id: "antares", name: "Antares", ra: 247.3515, dec: -26.432, mag: 1.09 },
  { id: "pollux", name: "Pollux", ra: 116.3295, dec: 28.026, mag: 1.14 },
  { id: "fomalhaut", name: "Fomalhaut", ra: 344.412, dec: -29.622, mag: 1.16 },
  { id: "deneb", name: "Deneb", ra: 310.3575, dec: 45.28, mag: 1.25 },
  { id: "regulus", name: "Regulus", ra: 152.0925, dec: 11.967, mag: 1.35 },
  { id: "adhara", name: "Adhara", ra: 104.655, dec: -28.972, mag: 1.5 },
  { id: "castor", name: "Castor", ra: 113.6505, dec: 31.888, mag: 1.57 },
  { id: "shaula", name: "Shaula", ra: 263.4015, dec: -37.104, mag: 1.62 },
  { id: "bellatrix", name: "Bellatrix", ra: 81.282, dec: 6.35, mag: 1.64 },
  { id: "elnath", name: "Elnath", ra: 81.573, dec: 28.608, mag: 1.65 },
  { id: "alnilam", name: "Alnilam", ra: 84.054, dec: -1.202, mag: 1.69 },
  { id: "alnitak", name: "Alnitak", ra: 85.1895, dec: -1.943, mag: 1.74 },
  { id: "alioth", name: "Alioth", ra: 193.506, dec: 55.96, mag: 1.77 },
  { id: "dubhe", name: "Dubhe", ra: 165.9315, dec: 61.751, mag: 1.79 },
  { id: "mirfak", name: "Mirfak", ra: 51.0808, dec: 49.861, mag: 1.79 },
  { id: "alkaid", name: "Alkaid", ra: 206.8845, dec: 49.313, mag: 1.86 },
  { id: "polaris", name: "Polaris", ra: 37.9545, dec: 89.264, mag: 1.98 },
  { id: "mizar", name: "Mizar", ra: 200.9805, dec: 54.925, mag: 2.04 },
  { id: "saiph", name: "Saiph", ra: 86.937, dec: -9.6696, mag: 2.06 },
  { id: "mintaka", name: "Mintaka", ra: 83.0016, dec: -0.299, mag: 2.23 },
  { id: "merak", name: "Merak", ra: 165.4605, dec: 56.382, mag: 2.37 },
  { id: "phecda", name: "Phecda", ra: 178.458, dec: 53.695, mag: 2.44 },
  { id: "megrez", name: "Megrez", ra: 183.8565, dec: 57.033, mag: 3.31 },
  { id: "schedar", name: "Schedar", ra: 10.1268, dec: 56.537, mag: 2.24 },
  { id: "caph", name: "Caph", ra: 2.2945, dec: 59.15, mag: 2.28 },
  { id: "navi", name: "Gamma Cas", ra: 14.1772, dec: 60.717, mag: 2.47 },
  { id: "ruchbah", name: "Ruchbah", ra: 21.454, dec: 60.235, mag: 2.68 },
  { id: "segin", name: "Segin", ra: 28.5988, dec: 63.67, mag: 3.35 },
  // Outline stars for the constellations below (J2000, Hipparcos via the
  // d3-celestial catalog). Faint ones only draw as line ends.
  { id: "acrux", name: "Acrux", ra: 186.6496, dec: -63.0991, mag: 0.77 },
  { id: "mimosa", name: "Mimosa", ra: 191.9303, dec: -59.6888, mag: 1.25 },
  { id: "gacrux", name: "Gacrux", ra: 187.7915, dec: -57.1132, mag: 1.59 },
  { id: "imai", name: "Imai", ra: 183.7863, dec: -58.7489, mag: 2.79 },
  { id: "dschubba", name: "Dschubba", ra: 240.0834, dec: -22.6217, mag: 2.29 },
  { id: "acrab", name: "Acrab", ra: 241.3593, dec: -19.8055, mag: 2.56 },
  { id: "fang", name: "Fang", ra: 239.7130, dec: -26.1141, mag: 2.89 },
  { id: "alniyat", name: "Alniyat", ra: 245.2972, dec: -25.5928, mag: 2.90 },
  { id: "paikauhale", name: "Paikauhale", ra: 248.9706, dec: -28.2160, mag: 2.82 },
  { id: "larawag", name: "Larawag", ra: 252.5409, dec: -34.2932, mag: 2.29 },
  { id: "xamidimura", name: "Xamidimura", ra: 252.9676, dec: -38.0474, mag: 3.00 },
  { id: "grafias", name: "Grafias", ra: 253.6459, dec: -42.3613, mag: 3.62 },
  { id: "eta_sco", name: "Eta Sco", ra: 258.0383, dec: -43.2392, mag: 3.32 },
  { id: "sargas", name: "Sargas", ra: 264.3297, dec: -42.9978, mag: 1.86 },
  { id: "girtab", name: "Girtab", ra: 266.8962, dec: -40.1270, mag: 2.99 },
  { id: "mula", name: "Mula", ra: 265.6220, dec: -39.0300, mag: 2.39 },
  { id: "lesath", name: "Lesath", ra: 262.6910, dec: -37.2958, mag: 2.70 },
  { id: "kaus_australis", name: "Kaus Australis", ra: 276.0430, dec: -34.3846, mag: 1.79 },
  { id: "kaus_media", name: "Kaus Media", ra: 275.2485, dec: -29.8281, mag: 2.72 },
  { id: "kaus_borealis", name: "Kaus Borealis", ra: 276.9927, dec: -25.4217, mag: 2.82 },
  { id: "alnasl", name: "Alnasl", ra: 271.4520, dec: -30.4241, mag: 2.98 },
  { id: "nunki", name: "Nunki", ra: 283.8164, dec: -26.2967, mag: 2.05 },
  { id: "ascella", name: "Ascella", ra: 285.6530, dec: -29.8801, mag: 2.60 },
  { id: "phi_sgr", name: "Phi Sgr", ra: 281.4141, dec: -26.9908, mag: 3.17 },
  { id: "tau_sgr", name: "Tau Sgr", ra: 286.7350, dec: -27.6704, mag: 3.32 },
  { id: "eta_leo", name: "Eta Leo", ra: 151.8331, dec: 16.7627, mag: 3.48 },
  { id: "algieba", name: "Algieba", ra: 154.9931, dec: 19.8415, mag: 2.01 },
  { id: "adhafera", name: "Adhafera", ra: 154.1726, dec: 23.4173, mag: 3.43 },
  { id: "rasalas", name: "Rasalas", ra: 148.1909, dec: 26.0070, mag: 3.88 },
  { id: "algenubi", name: "Algenubi", ra: 146.4628, dec: 23.7743, mag: 2.97 },
  { id: "zosma", name: "Zosma", ra: 168.5271, dec: 20.5237, mag: 2.56 },
  { id: "chertan", name: "Chertan", ra: 168.5600, dec: 15.4296, mag: 3.33 },
  { id: "denebola", name: "Denebola", ra: 177.2649, dec: 14.5721, mag: 2.14 },
  { id: "alhena", name: "Alhena", ra: 99.4279, dec: 16.3993, mag: 1.93 },
  { id: "mebsuta", name: "Mebsuta", ra: 100.9830, dec: 25.1311, mag: 3.06 },
  { id: "tejat", name: "Tejat", ra: 95.7401, dec: 22.5136, mag: 2.87 },
  { id: "wasat", name: "Wasat", ra: 110.0307, dec: 21.9823, mag: 3.50 },
  { id: "mekbuda", name: "Mekbuda", ra: 106.0272, dec: 20.5703, mag: 4.01 },
  { id: "tianguan", name: "Tianguan", ra: 84.4112, dec: 21.1425, mag: 2.97 },
  { id: "theta2_tau", name: "Theta2 Tau", ra: 67.1656, dec: 15.8709, mag: 3.40 },
  { id: "prima_hyadum", name: "Prima Hyadum", ra: 64.9483, dec: 15.6276, mag: 3.65 },
  { id: "secunda_hyadum", name: "Secunda Hyadum", ra: 65.7337, dec: 17.5425, mag: 3.77 },
  { id: "ain", name: "Ain", ra: 67.1542, dec: 19.1804, mag: 3.53 },
  { id: "mirzam", name: "Mirzam", ra: 95.6749, dec: -17.9559, mag: 1.98 },
  { id: "wezen", name: "Wezen", ra: 107.0979, dec: -26.3932, mag: 1.83 },
  { id: "aludra", name: "Aludra", ra: 111.0238, dec: -29.3031, mag: 2.45 },
  { id: "furud", name: "Furud", ra: 95.0783, dec: -30.0634, mag: 3.02 },
  { id: "gienah_crv", name: "Gienah", ra: 183.9515, dec: -17.5419, mag: 2.58 },
  { id: "algorab", name: "Algorab", ra: 187.4661, dec: -16.5154, mag: 2.94 },
  { id: "kraz", name: "Kraz", ra: 188.5968, dec: -23.3968, mag: 2.65 },
  { id: "minkar", name: "Minkar", ra: 182.5312, dec: -22.6198, mag: 3.02 },
  { id: "alchiba", name: "Alchiba", ra: 182.1034, dec: -24.7289, mag: 4.02 },
  { id: "sheliak", name: "Sheliak", ra: 282.5200, dec: 33.3627, mag: 3.52 },
  { id: "sulafat", name: "Sulafat", ra: 284.7359, dec: 32.6896, mag: 3.25 },
  { id: "delta2_lyr", name: "Delta2 Lyr", ra: 283.6262, dec: 36.8986, mag: 4.22 },
  { id: "zeta1_lyr", name: "Zeta1 Lyr", ra: 281.1932, dec: 37.6051, mag: 4.34 },
  { id: "sadr", name: "Sadr", ra: 305.5571, dec: 40.2567, mag: 2.23 },
  { id: "aljanah", name: "Aljanah", ra: 311.5528, dec: 33.9703, mag: 2.48 },
  { id: "fawaris", name: "Fawaris", ra: 296.2437, dec: 45.1308, mag: 2.86 },
  { id: "albireo", name: "Albireo", ra: 292.6803, dec: 27.9597, mag: 3.05 },
  { id: "markab", name: "Markab", ra: 346.1902, dec: 15.2053, mag: 2.49 },
  { id: "scheat", name: "Scheat", ra: 345.9436, dec: 28.0828, mag: 2.44 },
  { id: "algenib", name: "Algenib", ra: 3.3090, dec: 15.1836, mag: 2.83 },
  { id: "alpheratz", name: "Alpheratz", ra: 2.0969, dec: 29.0904, mag: 2.07 },
  { id: "tarazed", name: "Tarazed", ra: 296.5649, dec: 10.6133, mag: 2.72 },
  { id: "alshain", name: "Alshain", ra: 298.8283, dec: 6.4068, mag: 3.71 },
  { id: "delta_aql", name: "Delta Aql", ra: 291.3746, dec: 3.1148, mag: 3.36 },
  { id: "okab", name: "Okab", ra: 286.3525, dec: 13.8635, mag: 2.99 },
  { id: "lambda_aql", name: "Lambda Aql", ra: 286.5622, dec: -4.8826, mag: 3.43 },
];

const byId = new Map(STARS.map((s) => [s.id, s]));
export const star = (id: string): Star | undefined => byId.get(id);

/** Asterism line segments grouped by constellation, using star ids. */
export const CONSTELLATIONS: Constellation[] = [
  {
    id: "orion",
    name: "Orion",
    segments: [
      // Shoulders, two diagonals down to the belt, the belt itself, two
      // diagonals down to the feet, and the feet, forming the classic hourglass.
      ["betelgeuse", "bellatrix"], ["betelgeuse", "alnitak"], ["bellatrix", "mintaka"],
      ["alnitak", "alnilam"], ["alnilam", "mintaka"],
      ["alnitak", "saiph"], ["mintaka", "rigel"], ["saiph", "rigel"],
    ],
  },
  {
    id: "ursa_major",
    name: "Big Dipper",
    segments: [
      ["dubhe", "merak"], ["merak", "phecda"], ["phecda", "megrez"],
      ["megrez", "dubhe"], ["megrez", "alioth"], ["alioth", "mizar"],
      ["mizar", "alkaid"],
    ],
  },
  {
    id: "cassiopeia",
    name: "Cassiopeia",
    segments: [
      ["segin", "ruchbah"], ["ruchbah", "navi"], ["navi", "schedar"],
      ["schedar", "caph"],
    ],
  },
  {
    id: "summer_triangle",
    name: "Summer Triangle",
    segments: [["vega", "deneb"], ["deneb", "altair"], ["altair", "vega"]],
  },
  {
    id: "winter_triangle",
    name: "Winter Triangle",
    segments: [["betelgeuse", "sirius"], ["sirius", "procyon"], ["procyon", "betelgeuse"]],
  },
  {
    id: "crux",
    name: "Southern Cross",
    segments: [
      // The cross, plus the two Pointers (Alpha + Beta Centauri) that lead to it.
      ["acrux", "gacrux"], ["mimosa", "imai"], ["rigil", "hadar"],
    ],
  },
  {
    id: "scorpius",
    name: "Scorpius",
    segments: [
      // Head (Acrab, Dschubba, Fang), the heart (Antares), the body curling
      // down to the stinger (Shaula + Lesath).
      ["acrab", "dschubba"], ["dschubba", "fang"], ["dschubba", "alniyat"],
      ["alniyat", "antares"], ["antares", "paikauhale"], ["paikauhale", "larawag"],
      ["larawag", "xamidimura"], ["xamidimura", "grafias"], ["grafias", "eta_sco"],
      ["eta_sco", "sargas"], ["sargas", "girtab"], ["girtab", "mula"],
      ["mula", "shaula"], ["shaula", "lesath"],
    ],
  },
  {
    id: "sagittarius",
    name: "Sagittarius (Teapot)",
    segments: [
      // Spout, lid, body and handle of the Teapot asterism.
      ["alnasl", "kaus_media"], ["kaus_media", "kaus_australis"], ["kaus_australis", "alnasl"],
      ["kaus_media", "kaus_borealis"], ["kaus_borealis", "phi_sgr"], ["phi_sgr", "kaus_media"],
      ["phi_sgr", "nunki"], ["nunki", "tau_sgr"], ["tau_sgr", "ascella"],
      ["ascella", "phi_sgr"], ["ascella", "kaus_australis"],
    ],
  },
  {
    id: "leo",
    name: "Leo",
    segments: [
      // The Sickle (a backwards question mark ending at Regulus) and the hindquarters.
      ["regulus", "eta_leo"], ["eta_leo", "algieba"], ["algieba", "adhafera"],
      ["adhafera", "rasalas"], ["rasalas", "algenubi"],
      ["algieba", "zosma"], ["zosma", "denebola"], ["denebola", "chertan"],
      ["chertan", "regulus"],
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    segments: [
      // The twins' heads (Castor, Pollux) and their two bodies.
      ["castor", "pollux"], ["castor", "mebsuta"], ["mebsuta", "tejat"],
      ["pollux", "wasat"], ["wasat", "mekbuda"], ["mekbuda", "alhena"],
    ],
  },
  {
    id: "taurus",
    name: "Taurus",
    segments: [
      // The Hyades "V" of the bull's face with Aldebaran as its eye, out to the horns.
      ["prima_hyadum", "secunda_hyadum"], ["secunda_hyadum", "ain"], ["ain", "elnath"],
      ["prima_hyadum", "theta2_tau"], ["theta2_tau", "aldebaran"], ["aldebaran", "tianguan"],
    ],
  },
  {
    id: "canis_major",
    name: "Canis Major",
    segments: [
      ["mirzam", "sirius"], ["sirius", "wezen"], ["wezen", "adhara"],
      ["adhara", "furud"], ["wezen", "aludra"],
    ],
  },
  {
    id: "corvus",
    name: "Corvus",
    segments: [
      ["gienah_crv", "algorab"], ["algorab", "kraz"], ["kraz", "minkar"],
      ["minkar", "gienah_crv"], ["minkar", "alchiba"],
    ],
  },
  {
    id: "lyra",
    name: "Lyra",
    segments: [
      // Vega and the little parallelogram of the lyre.
      ["vega", "zeta1_lyr"], ["zeta1_lyr", "sheliak"], ["sheliak", "sulafat"],
      ["sulafat", "delta2_lyr"], ["delta2_lyr", "zeta1_lyr"],
    ],
  },
  {
    id: "cygnus",
    name: "Cygnus (Northern Cross)",
    segments: [
      ["deneb", "sadr"], ["sadr", "albireo"], ["fawaris", "sadr"], ["sadr", "aljanah"],
    ],
  },
  {
    id: "pegasus",
    name: "Great Square of Pegasus",
    segments: [
      ["markab", "scheat"], ["scheat", "alpheratz"], ["alpheratz", "algenib"],
      ["algenib", "markab"],
    ],
  },
  {
    id: "aquila",
    name: "Aquila",
    segments: [
      // Altair between Tarazed and Alshain, the eagle's wings and tail.
      ["tarazed", "altair"], ["altair", "alshain"], ["altair", "delta_aql"],
      ["delta_aql", "okab"], ["delta_aql", "lambda_aql"],
    ],
  },
];

/** True if a constellation's lines should draw. Unknown/missing ids default visible. */
export function constellationVisible(constellations: Record<string, boolean>, id: string): boolean {
  return constellations[id] !== false;
}

/** Flattened asterism segments for the currently-visible constellations. */
export function visibleAsterisms(constellations: Record<string, boolean>): [string, string][] {
  return CONSTELLATIONS.filter((c) => constellationVisible(constellations, c.id))
    .flatMap((c) => c.segments);
}

/** Asterism line segments, by star id, drawn faintly when both ends are up. */
export const ASTERISMS: [string, string][] = CONSTELLATIONS.flatMap((c) => c.segments);
