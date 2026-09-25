import type { EquippedGear, Suit, Theme } from "../state/types";

const palettes: Record<Suit, { primary: string; dark: string; secondary: string; eye: string; web: string; glow: string }> = {
  classic: { primary: "#ef233c", dark: "#8d1024", secondary: "#1559d6", eye: "#ffffff", web: "#e8f5ff", glow: "#35bdf8" },
  future: { primary: "#071c33", dark: "#020617", secondary: "#00d9ff", eye: "#fff7ad", web: "#4ff3ff", glow: "#00e5ff" },
  stealth: { primary: "#11111d", dark: "#030308", secondary: "#7735d4", eye: "#d9c8ff", web: "#9f67ff", glow: "#8b5cf6" },
  venom: { primary: "#08090d", dark: "#000000", secondary: "#24252e", eye: "#ffffff", web: "#ffffff", glow: "#8b5cf6" },
};

const HEAD_PATH = "M105 86 Q106 24 160 12 Q214 24 215 86 Q207 132 160 144 Q113 132 105 86Z";
/** Only base64 image data URLs are ever drawn, so a stored value cannot break out of the attribute. */
const SAFE_PHOTO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function uniqueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function heroSvg(
  suit: Suit,
  pose: "idle" | "jump" | "victory" | "hurt" = "idle",
  gear: EquippedGear = {},
  facePhoto: string | null = null,
): string {
  const color = palettes[suit];
  const venom = suit === "venom";
  const id = uniqueId("spider");
  const face = facePhoto && SAFE_PHOTO.test(facePhoto) ? facePhoto : null;
  return `
    <svg class="hero-art hero-${pose} suit-${suit}" viewBox="0 0 320 390" role="img" aria-label="${venom ? "ונום" : "ספיידר תיתוי"}">
      <defs>
        <radialGradient id="${id}-aura" cx="50%" cy="42%" r="52%">
          <stop offset="0" stop-color="${color.glow}" stop-opacity=".42"/>
          <stop offset=".62" stop-color="${color.glow}" stop-opacity=".12"/>
          <stop offset="1" stop-color="${color.glow}" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${id}-red" x1=".18" y1=".08" x2=".9" y2=".94">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".23"/>
          <stop offset=".18" stop-color="${color.primary}"/>
          <stop offset=".78" stop-color="${color.dark}"/>
          <stop offset="1" stop-color="#000000" stop-opacity=".45"/>
        </linearGradient>
        <linearGradient id="${id}-blue" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${color.secondary}"/>
          <stop offset="1" stop-color="${color.dark}"/>
        </linearGradient>
        <filter id="${id}-glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="${id}-mask"><path d="${HEAD_PATH}"/></clipPath>
      </defs>

      <ellipse class="hero-aura" cx="160" cy="192" rx="145" ry="173" fill="url(#${id}-aura)"/>
      <g class="hero-shadow"><ellipse cx="160" cy="365" rx="70" ry="12" fill="#000" opacity=".45"/></g>

      ${venom ? `
        <g class="symbiote-tendrils" fill="none" stroke="${color.primary}" stroke-linecap="round">
          <path class="tendril t1" d="M105 176 C40 146 68 71 8 47" stroke-width="15"/>
          <path class="tendril t2" d="M215 178 C283 137 247 78 313 42" stroke-width="12"/>
          <path class="tendril t3" d="M112 239 C49 254 62 322 18 341" stroke-width="10"/>
        </g>` : `
        <path class="web-thread" d="M53 -10 Q66 82 94 143" fill="none" stroke="${color.web}" stroke-width="2.5" opacity=".7"/>
        <circle cx="52" cy="0" r="5" fill="${color.web}"/>`
      }

      ${gear.back === "web-wings" ? `
        <g class="gear-web-wings" fill="${color.glow}" fill-opacity=".18" stroke="${color.web}" stroke-width="2">
          <path d="M124 157 Q49 118 22 181 Q67 203 121 215 Q82 232 55 279 Q112 274 151 235Z"/>
          <path d="M196 157 Q271 118 298 181 Q253 203 199 215 Q238 232 265 279 Q208 274 169 235Z"/>
          <path d="M40 177L120 202M68 139L137 215M280 177L200 202M252 139L183 215" fill="none"/>
        </g>` : ""}
      ${gear.back === "bionic-arms" ? `
        <g class="gear-bionic-arms" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <g class="bionic-arm arm-a"><path d="M128 177 Q72 145 31 91 Q12 67 29 45" stroke="#242b3d" stroke-width="18"/><path d="M128 177 Q72 145 31 91 Q12 67 29 45" stroke="#60dfff" stroke-width="4"/><path d="M20 49L8 30M28 47L46 27" stroke="#dffaff" stroke-width="8"/></g>
          <g class="bionic-arm arm-b"><path d="M192 177 Q248 145 289 91 Q308 67 291 45" stroke="#242b3d" stroke-width="18"/><path d="M192 177 Q248 145 289 91 Q308 67 291 45" stroke="#60dfff" stroke-width="4"/><path d="M300 49L312 30M292 47L274 27" stroke="#dffaff" stroke-width="8"/></g>
          <g class="bionic-arm arm-c"><path d="M122 202 Q66 229 31 288 Q17 313 39 334" stroke="#242b3d" stroke-width="18"/><path d="M122 202 Q66 229 31 288 Q17 313 39 334" stroke="#60dfff" stroke-width="4"/><path d="M34 326L14 339M38 331L54 351" stroke="#dffaff" stroke-width="8"/></g>
          <g class="bionic-arm arm-d"><path d="M198 202 Q254 229 289 288 Q303 313 281 334" stroke="#242b3d" stroke-width="18"/><path d="M198 202 Q254 229 289 288 Q303 313 281 334" stroke="#60dfff" stroke-width="4"/><path d="M286 326L306 339M282 331L266 351" stroke="#dffaff" stroke-width="8"/></g>
        </g>` : ""}
      ${gear.back === "spider-drone-pack" ? `
        <g class="gear-drone-pack" stroke="#9ff6ff" stroke-width="3" filter="url(#${id}-glow)">
          <path d="M136 168Q92 123 61 110M184 168Q228 123 259 110" fill="none"/>
          <g class="gear-drone drone-left"><ellipse cx="56" cy="103" rx="28" ry="16" fill="#172033"/><circle cx="56" cy="103" r="7" fill="#22d3ee"/><path d="M29 90H10M83 90H102" fill="none"/></g>
          <g class="gear-drone drone-right"><ellipse cx="264" cy="103" rx="28" ry="16" fill="#172033"/><circle cx="264" cy="103" r="7" fill="#22d3ee"/><path d="M237 90H218M291 90H310" fill="none"/></g>
          <rect x="137" y="156" width="46" height="65" rx="16" fill="#1e293b"/>
        </g>` : ""}
      ${gear.back === "glider-cloak" ? `
        <path class="gear-glider-cloak" d="M113 151Q48 170 25 313Q91 276 150 249L160 177L170 249Q229 276 295 313Q272 170 207 151Q160 179 113 151Z" fill="#171225" stroke="#a78bfa" stroke-width="4" opacity=".9"/>` : ""}
      ${gear.back === "portal-pack" ? `
        <g class="gear-portal-pack" fill="none" filter="url(#${id}-glow)">
          <ellipse cx="160" cy="190" rx="104" ry="130" stroke="#f59e0b" stroke-width="12" stroke-dasharray="18 9"/>
          <ellipse cx="160" cy="190" rx="90" ry="115" stroke="#22d3ee" stroke-width="4" stroke-dasharray="5 13"/>
          <path d="M128 157H192V230H128Z" fill="#172033" stroke="#fde68a" stroke-width="3"/>
        </g>` : ""}
      ${gear.chest === "web-cape" ? `
        <path class="gear-web-cape" d="M112 147Q68 169 76 298Q111 269 160 244Q209 269 244 298Q252 169 208 147Q160 166 112 147Z" fill="#dbeafe" fill-opacity=".22" stroke="#e0f2fe" stroke-width="3" stroke-dasharray="8 5"/>` : ""}

      <g class="hero-body">
        <path class="hero-leg leg-back" d="M174 238 Q211 259 223 333 Q227 356 207 365 Q190 370 181 348 L151 268Z" fill="url(#${id}-blue)" stroke="${color.web}" stroke-width="2"/>
        <path class="hero-leg leg-front" d="M145 239 Q118 266 92 335 Q83 358 102 368 Q121 376 133 350 L170 267Z" fill="url(#${id}-blue)" stroke="${color.web}" stroke-width="2"/>
        <path d="M91 336 Q108 344 132 349 L126 371 Q100 385 81 366Z" fill="${color.primary}" stroke="${color.web}" stroke-width="2"/>
        <path d="M182 348 Q204 342 223 333 L238 360 Q219 380 191 370Z" fill="${color.primary}" stroke="${color.web}" stroke-width="2"/>

        <path class="hero-arm arm-back" d="M203 160 Q254 168 279 224 Q290 248 269 257 Q249 263 237 239 L195 198Z" fill="url(#${id}-red)" stroke="${color.web}" stroke-width="2.2"/>
        <path class="hero-arm arm-front" d="M116 160 Q70 171 40 218 Q25 239 43 253 Q61 264 78 242 L126 201Z" fill="url(#${id}-red)" stroke="${color.web}" stroke-width="2.2"/>
        <path d="M33 241 Q43 224 61 231 L75 247 Q61 270 41 263 Q27 258 33 241Z" fill="${color.primary}" stroke="${color.web}" stroke-width="2"/>
        <path d="M251 242 Q264 223 280 234 L290 252 Q273 270 256 260 Q244 253 251 242Z" fill="${color.primary}" stroke="${color.web}" stroke-width="2"/>

        <path class="hero-torso" d="M111 139 Q160 118 209 139 L220 246 Q160 278 100 246Z" fill="url(#${id}-red)" stroke="${color.web}" stroke-width="2.5"/>
        <path d="M111 179 Q160 209 209 179 L215 244 Q160 270 105 244Z" fill="url(#${id}-blue)" opacity=".96"/>
        <path d="M116 147 Q160 135 204 147 M107 179 Q160 210 213 179 M104 215 Q160 240 216 215 M160 126 V262" fill="none" stroke="${color.web}" stroke-width="1.5" opacity="${venom ? ".16" : ".65"}"/>
        <path d="M160 143 L143 159 L160 178 L177 159Z" fill="${venom ? "#fff" : color.dark}" filter="url(#${id}-glow)"/>
        <path d="M160 160 L128 205 M160 160 L192 205 M145 178 L117 162 M175 178 L203 162 M142 196 L116 216 M178 196 L204 216" fill="none" stroke="${venom ? "#fff" : color.dark}" stroke-width="${venom ? 9 : 7}" stroke-linecap="round"/>

        <path class="hero-head" d="${HEAD_PATH}" fill="url(#${id}-red)" stroke="${color.web}" stroke-width="2.8"/>
        ${face
          ? `<g class="hero-face" clip-path="url(#${id}-mask)">
               <image class="hero-face-photo" href="${face}" x="101" y="4" width="118" height="144" preserveAspectRatio="xMidYMid slice"/>
             </g>
             <path class="hero-face-rim" d="${HEAD_PATH}" fill="none" stroke="${color.web}" stroke-width="4.5"/>`
          : `<g clip-path="url(#${id}-mask)" fill="none" stroke="${color.web}" opacity="${venom ? ".08" : ".7"}">
               <path d="M160 4 V148 M103 73 H217 M112 39 Q160 72 208 39 M106 108 Q160 72 214 108" stroke-width="1.7"/>
               <path d="M120 20 Q160 50 200 20 M106 91 Q160 119 214 91" stroke-width="1.2"/>
             </g>`
        }
        ${venom
          ? `<path d="M111 61 Q135 31 154 69 Q130 101 108 82Z" fill="#fff"/><path d="M209 61 Q185 31 166 69 Q190 101 212 82Z" fill="#fff"/>
             ${face ? "" : `<path d="M115 102 Q160 139 205 102 Q191 145 160 151 Q129 145 115 102Z" fill="#fff"/>
               <path d="M128 114 L137 136 L147 119 L160 146 L173 119 L183 136 L192 114" fill="#020203"/>`}`
          : `<path class="hero-eye eye-left" d="M111 58 Q136 30 153 68 Q130 101 108 82Z" fill="${color.eye}" stroke="#050814" stroke-width="4"/>
             <path class="hero-eye eye-right" d="M209 58 Q184 30 167 68 Q190 101 212 82Z" fill="${color.eye}" stroke="#050814" stroke-width="4"/>
             <path d="M116 65 Q134 47 146 68" fill="none" stroke="${color.glow}" stroke-width="2" opacity=".7"/>`
        }
        ${gear.head === "spider-visor" ? `<path class="gear-visor" d="M102 70 Q160 42 218 70 L207 99 Q160 80 113 99Z" fill="#16d9ff" fill-opacity=".48" stroke="#bff7ff" stroke-width="4" filter="url(#${id}-glow)"/>` : ""}
        ${gear.head === "shadow-hood" ? `<path class="gear-hood" d="M96 94 Q88 27 160 3 Q232 27 224 94 L210 63 Q205 16 160 10 Q115 16 110 63Z" fill="#171024" stroke="#a855f7" stroke-width="4"/>` : ""}
        ${gear.head === "spider-sense-crown" ? `<g class="gear-sense-crown" fill="none" stroke="#fbbf24" stroke-width="5" stroke-linecap="round" filter="url(#${id}-glow)"><path d="M112 42Q160 15 208 42"/><path d="M126 31L111 7M160 20V-8M194 31L209 7"/><circle cx="111" cy="7" r="6" fill="#fde68a"/><circle cx="160" cy="-8" r="6" fill="#fde68a"/><circle cx="209" cy="7" r="6" fill="#fde68a"/></g>` : ""}
        ${gear.head === "noir-goggles" ? `<g class="gear-noir-goggles" fill="#cbd5e1" fill-opacity=".5" stroke="#111827" stroke-width="7"><circle cx="130" cy="70" r="28"/><circle cx="190" cy="70" r="28"/><path d="M158 68H162M102 60L91 50M218 60L229 50" fill="none"/></g>` : ""}
        ${gear.head === "multiverse-headphones" ? `<g class="gear-multiverse-headphones" fill="none" stroke="#ec4899" stroke-width="9" filter="url(#${id}-glow)"><path d="M105 78Q103 22 160 14Q217 22 215 78"/><rect x="91" y="66" width="27" height="48" rx="12" fill="#22d3ee"/><rect x="202" y="66" width="27" height="48" rx="12" fill="#a855f7"/><path d="M98 90L73 106M222 90L247 106" stroke="#fbbf24" stroke-width="4"/></g>` : ""}
        ${gear.chest === "hero-emblem" ? `<path class="gear-emblem" d="M160 154L147 169L154 184L137 213L154 201L160 224L166 201L183 213L166 184L173 169Z" fill="#f8fafc" stroke="${color.glow}" stroke-width="3" filter="url(#${id}-glow)"/>` : ""}
        ${gear.chest === "nano-armor" ? `<g class="gear-nano-armor" fill="#85eaff" fill-opacity=".27" stroke="#8ff4ff" stroke-width="3"><path d="M116 150L151 141L142 192L111 180Z"/><path d="M204 150L169 141L178 192L209 180Z"/><path d="M112 190L145 199L136 240L105 226Z"/><path d="M208 190L175 199L184 240L215 226Z"/></g>` : ""}
        ${gear.chest === "symbiote-crest" ? `<g class="gear-symbiote-crest" fill="#fff" filter="url(#${id}-glow)"><path d="M160 148L143 169L151 184L119 169L107 181L145 202L126 235L151 214L160 244L169 214L194 235L175 202L213 181L201 169L169 184L177 169Z"/><circle cx="160" cy="190" r="11" fill="#111"/></g>` : ""}
        ${gear.chest === "dimension-jacket" ? `<g class="gear-dimension-jacket" stroke="#f472b6" stroke-width="4"><path d="M108 146Q134 132 151 143L145 248Q122 252 101 240Z" fill="#312e81"/><path d="M212 146Q186 132 169 143L175 248Q198 252 219 240Z" fill="#7e22ce"/><path d="M151 143L160 179L169 143M123 180H145M175 180H197" fill="none"/><path d="M101 218L145 203M219 218L175 203" stroke="#22d3ee"/></g>` : ""}
        ${gear.wrists === "web-blasters" ? `<g class="gear-web-blasters" fill="#f8fafc" stroke="${color.glow}" stroke-width="3"><rect x="38" y="226" width="35" height="24" rx="8" transform="rotate(-28 55 238)"/><rect x="247" y="226" width="35" height="24" rx="8" transform="rotate(28 265 238)"/><circle cx="47" cy="236" r="4" fill="#ef233c"/><circle cx="273" cy="236" r="4" fill="#ef233c"/></g>` : ""}
        ${gear.wrists === "holo-gauntlets" ? `<g class="gear-holo-gauntlets" fill="none" stroke="#67e8f9" stroke-width="5" filter="url(#${id}-glow)"><circle cx="52" cy="242" r="22"/><circle cx="268" cy="242" r="22"/><path d="M32 242H72M52 222V262M248 242H288M268 222V262"/></g>` : ""}
        ${gear.wrists === "electric-cuffs" ? `<g class="gear-electric-cuffs" fill="none" stroke="#fde047" stroke-width="6" filter="url(#${id}-glow)"><path d="M33 232L45 238L38 249L55 245L49 261L70 246M287 232L275 238L282 249L265 245L271 261L250 246"/></g>` : ""}
        ${gear.wrists === "impact-gauntlets" ? `<g class="gear-impact-gauntlets" fill="#991b1b" stroke="#fca5a5" stroke-width="4"><path d="M26 219Q50 204 78 228L70 265Q43 281 20 256Z"/><path d="M294 219Q270 204 242 228L250 265Q277 281 300 256Z"/><path d="M29 230L64 258M291 230L256 258" fill="none"/></g>` : ""}
        ${gear.wrists === "camouflage-cuffs" ? `<g class="gear-camouflage-cuffs" fill="none" stroke="#5eead4" stroke-width="5" stroke-dasharray="8 5" filter="url(#${id}-glow)"><rect x="28" y="220" width="48" height="48" rx="14" transform="rotate(-24 52 244)"/><rect x="244" y="220" width="48" height="48" rx="14" transform="rotate(24 268 244)"/><path d="M18 217H45M275 217H302" stroke="#c4b5fd"/></g>` : ""}
      </g>
      <g class="web-spark" fill="${color.web}">
        <circle cx="35" cy="220" r="3"/><circle cx="286" cy="225" r="2.5"/><circle cx="69" cy="142" r="2"/>
      </g>
    </svg>`;
}

const sceneColors: Record<Theme, { sky: string; sky2: string; building: string; accent: string; light: string }> = {
  webs: { sky: "#071126", sky2: "#231044", building: "#030713", accent: "#38bdf8", light: "#fde68a" },
  towers: { sky: "#0b132c", sky2: "#312e81", building: "#08091b", accent: "#a78bfa", light: "#93c5fd" },
  fortress: { sky: "#1a1005", sky2: "#713f12", building: "#110b05", accent: "#fbbf24", light: "#fed7aa" },
  storm: { sky: "#020617", sky2: "#334155", building: "#020617", accent: "#67e8f9", light: "#e0f2fe" },
  caves: { sky: "#011516", sky2: "#115e59", building: "#021c1e", accent: "#5eead4", light: "#ccfbf1" },
  neon: { sky: "#10002b", sky2: "#4c1d95", building: "#090014", accent: "#22d3ee", light: "#f0abfc" },
  shadow: { sky: "#010102", sky2: "#2e1065", building: "#000", accent: "#a855f7", light: "#f5f3ff" },
};

export function worldBackground(theme: Theme): string {
  const color = sceneColors[theme];
  const id = uniqueId("city");
  const windows = Array.from({ length: 38 }, (_, index) => {
    const x = 24 + (index % 19) * 42;
    const y = 240 + Math.floor(index / 19) * 74 - (index % 4) * 17;
    return `<rect class="city-window w${index % 5}" x="${x}" y="${y}" width="8" height="15" rx="2"/>`;
  }).join("");
  return `<svg class="world-bg world-bg-${theme}" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color.sky}"/><stop offset=".72" stop-color="${color.sky2}"/><stop offset="1" stop-color="${color.building}"/></linearGradient>
      <radialGradient id="${id}-moon"><stop stop-color="${color.light}" stop-opacity=".7"/><stop offset=".42" stop-color="${color.accent}" stop-opacity=".2"/><stop offset="1" stop-color="${color.accent}" stop-opacity="0"/></radialGradient>
      <filter id="${id}-blur"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <rect width="800" height="600" fill="url(#${id}-sky)"/>
    <circle class="city-moon-glow" cx="655" cy="108" r="105" fill="url(#${id}-moon)" filter="url(#${id}-blur)"/>
    <circle class="city-moon" cx="655" cy="108" r="48" fill="${color.light}" opacity=".2"/>
    <g class="far-city" fill="${color.building}" opacity=".58">
      <path d="M0 390H55V280H108V390H165V235H220V390H280V305H340V390H405V260H470V390H530V215H585V390H645V300H712V390H800V600H0Z"/>
    </g>
    <g class="near-city" fill="${color.building}">
      <path d="M0 455H85V258H145V455H190V330H275V455H330V205H422V455H480V292H570V455H625V248H725V455H800V600H0Z"/>
      <path d="M350 205L376 167L401 205ZM661 248L676 205L694 248Z" fill="${color.accent}" opacity=".25"/>
    </g>
    <g class="city-windows" fill="${color.accent}" opacity=".62">${windows}</g>
    <g class="web-lines" fill="none" stroke="${color.accent}" opacity=".22">
      <path d="M-20 24 Q400 350 820 24 M65 -20 Q400 302 735 -20 M400 -20V330" stroke-width="2"/>
      <path d="M88 82 Q400 268 712 82 M190 155 Q400 234 610 155" stroke-width="1.4"/>
    </g>
    ${theme === "caves" ? `<path d="M0 0L45 82L91 0L138 52L190 0L236 96L290 0L352 67L411 0L466 80L530 0L584 51L642 0L706 88L756 0L800 64V0Z" fill="#010b0c"/><g fill="${color.accent}" opacity=".35"><circle cx="98" cy="470" r="18"/><circle cx="704" cy="490" r="24"/></g>` : ""}
    ${theme === "storm" ? `<g class="lightning" fill="none" stroke="${color.light}" stroke-width="5"><path d="M594 0L558 100L596 92L552 195"/></g>` : ""}
    ${theme === "shadow" ? `<g class="shadow-tendrils" fill="none" stroke="#09070f" stroke-width="20" stroke-linecap="round"><path d="M0 520Q112 427 82 333"/><path d="M800 506Q685 441 729 321"/></g>` : ""}
    <path class="foreground-roof" d="M0 540 Q130 500 252 548 Q390 492 532 546 Q676 500 800 535 V600 H0Z" fill="#01030a"/>
  </svg>`;
}
