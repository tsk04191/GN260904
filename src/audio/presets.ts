import { PresetTrack } from '../types';

export const PRESET_TRACKS: PresetTrack[] = [
  {
    id: 'cyber-pulse',
    title: 'Cyber Pulse Overdrive',
    koreanTitle: '사이버 펄스 오버드라이브',
    subtitle: 'High-Tension Electronic Synthwave',
    genreTag: 'Cyberpunk • Fast Synthwave • 144 BPM',
    bpm: 144,
    key: 'Fm',
    scale: 'minor',
    description: '질주하는 네온 시티와 빠른 전개를 위한 하이텐션 일렉트로닉 신스웨이브 트랙. 강력한 16비트 펄스 베이스라인과 화려한 아르페지오 신스가 폭발적인 에너지를 전달합니다.',
    paydayReference: 'High-Tension Electro / Cyberpunk OST',
    introDurationSec: 30,
    loopDurationSec: 45,
    exitDurationSec: 30,
    lyricsOption: 'lyrics',
    lyrics: `[Verse 1]
빛을 삼킨 네온의 밤거리
가속하는 심장 소리
경계를 넘어 달려가
System overload, ready to explode

[Chorus]
Breaking through the firewall!
거침없이 터지는 에너지
We ignite the neon sky
끝없이 타오르는 Pulse in my mind

[Drop / Synth Solo]
(High-energy Arpeggio & Driving Bass)

[Outro]
We never stop the rhythm, we ride the night.`,
    synthType: 'payday_industrial',
    pattern: {
      bassLine: [0, 0, 3, 3, 5, 5, 2, 2, 0, 0, 3, 3, 7, 7, 5, 5],
      leadArp: [0, 3, 7, 10, 12, 10, 7, 3, 0, 3, 7, 12, 15, 12, 7, 3],
      harmonyChords: ['Fm', 'Db', 'Eb', 'C7'],
      drumPattern: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], // Kick
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],  // Snare
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],             // Hihat
        [true, false, false, true, false, false, true, false, true, false, false, true, false, false, true, false]   // Perc
      ]
    }
  },
  {
    id: 'epic-titan-battle',
    title: 'Titan Clash (Epic Boss)',
    koreanTitle: '타이탄의 결전 (에픽 시네마틱 보스전)',
    subtitle: 'Orchestral Choir & Brass Battle',
    genreTag: 'Cinematic Orchestral • Epic Choir • 160 BPM',
    bpm: 160,
    key: 'Am',
    scale: 'harmonic_minor',
    description: '웅장한 성가대 코러스(Choir)와 브라스, 격렬한 160 BPM 리듬이 어우러진 대규모 전투 및 보스전 테마. 극적인 위기감과 영웅적인 고조감을 연출합니다.',
    paydayReference: 'Epic Orchestral & Choir Boss Action',
    introDurationSec: 30,
    loopDurationSec: 50,
    exitDurationSec: 30,
    lyricsOption: 'lyrics',
    lyrics: `[Verse 1]
어둠이 드리운 전장 위에
울려 퍼지는 승리의 전조
물러설 수 없는 마지막 순간

[Chorus]
Rise above the storm and thunder!
신념의 칼날을 들어라
Through the fire and the ashes
운명을 부수고 일어서리라!

[Choir Chant]
Sanctus! Bellum! Gloria Aeterna!`,
    synthType: 'arcane_cyber',
    pattern: {
      bassLine: [0, 0, 0, 0, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1],
      leadArp: [0, 4, 7, 11, 12, 11, 7, 4, 0, 4, 7, 11, 12, 16, 12, 7],
      harmonyChords: ['Am', 'F', 'Dm', 'E7'],
      drumPattern: [
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        [true, true, false, true, true, false, true, true, true, true, false, true, true, false, true, true]
      ]
    }
  },
  {
    id: 'gothic-night-assault',
    title: 'Midnight Heist & Shadows',
    koreanTitle: '미드나잇 잠입 & 다크 섀도우',
    subtitle: 'Gothic Electro & Industrial Metal',
    genreTag: 'Dark Industrial • Gothic Rock • 135 BPM',
    bpm: 135,
    key: 'Dm',
    scale: 'phrygian',
    description: '어두운 밤 도심 침투와 비밀 미션을 테마로 한 다크 인더스트리얼 트랙. 프리기안 모드의 긴박한 하모니와 디스토션 기타 신스가 매력적입니다.',
    paydayReference: 'Dark Electro & Industrial Heist',
    introDurationSec: 30,
    loopDurationSec: 60,
    exitDurationSec: 30,
    lyricsOption: 'instrumental',
    synthType: 'gothic_organ',
    pattern: {
      bassLine: [0, 0, 1, 1, 0, 0, 3, 3, 0, 0, 1, 1, 5, 5, 4, 4],
      leadArp: [0, 1, 5, 7, 8, 7, 5, 1, 0, 1, 5, 8, 12, 8, 5, 1],
      harmonyChords: ['Dm', 'Bb', 'Gm', 'A7'],
      drumPattern: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true]
      ]
    }
  },
  {
    id: 'hyper-future-drop',
    title: 'Hyper Velocity EDM',
    koreanTitle: '하이퍼 벨로시티 EDM',
    subtitle: 'Futuristic Festival Bass Drop',
    genreTag: 'Future Bass • Festival EDM • 150 BPM',
    bpm: 150,
    key: 'Cm',
    scale: 'dorian',
    description: '경쾌하고 미래지향적인 사운드의 페스티벌 퓨처 베이스 & EDM 트랙. 산뜻한 벨 신스와 두터운 베이스 드롭이 청량감을 선사합니다.',
    paydayReference: 'Modern Festival Electronic',
    introDurationSec: 30,
    loopDurationSec: 40,
    exitDurationSec: 30,
    lyricsOption: 'lyrics',
    lyrics: `[Intro]
Count down to zero, ignite the beat!

[Chorus]
Fly higher than the clouds!
멈추지 말고 jump into the sound
Feel the bass dropping down!`,
    synthType: 'mana_overdrive',
    pattern: {
      bassLine: [0, 3, 0, 5, 0, 3, 0, 7, 0, 3, 0, 5, 0, 2, 0, 3],
      leadArp: [0, 3, 7, 10, 14, 10, 7, 3, 0, 3, 7, 10, 14, 17, 14, 10],
      harmonyChords: ['Cm', 'Ab', 'Fm', 'G7'],
      drumPattern: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        [false, false, true, true, false, false, true, true, false, false, true, true, false, false, true, true]
      ]
    }
  }
];

export const INITIAL_STEMS = [
  {
    id: 'stem-drums',
    name: 'Drums & Beat (Kick/Snare/HiHat)',
    koreanName: '드럼 & 퍼커션 비트',
    category: 'drums' as const,
    color: '#3b82f6', // Blue
    iconName: 'Drum',
    volume: 0.9,
    muted: false,
    solo: false,
    phaseVolumes: {
      intro: 0.7,
      ready: 0.8,
      battle: 1.0,
      boss: 1.0,
      result: 0.0,
      exit: 0.7
    }
  },
  {
    id: 'stem-bass',
    name: 'Sub Synth Bass & 808',
    koreanName: '서브 베이스 & 808',
    category: 'bass' as const,
    color: '#8b5cf6', // Purple
    iconName: 'Activity',
    volume: 0.85,
    muted: false,
    solo: false,
    phaseVolumes: {
      intro: 0.7,
      ready: 0.8,
      battle: 1.0,
      boss: 1.0,
      result: 0.4,
      exit: 0.6
    }
  },
  {
    id: 'stem-harmony',
    name: 'Chords & Rhythm Harmony',
    koreanName: '화음 & 리듬 코드',
    category: 'harmony' as const,
    color: '#ec4899', // Pink
    iconName: 'Music',
    volume: 0.8,
    muted: false,
    solo: false,
    phaseVolumes: {
      intro: 0.7,
      ready: 0.8,
      battle: 1.0,
      boss: 1.0,
      result: 0.5,
      exit: 0.8
    }
  },
  {
    id: 'stem-lead',
    name: 'Melody Arp & Lead Synth',
    koreanName: '멜로디 리드 & 아르페지오',
    category: 'lead' as const,
    color: '#06b6d4', // Cyan
    iconName: 'Zap',
    volume: 0.85,
    muted: false,
    solo: false,
    phaseVolumes: {
      intro: 0.7,
      ready: 0.8,
      battle: 1.0,
      boss: 1.0,
      result: 0.6,
      exit: 0.5
    }
  },
  {
    id: 'stem-boss',
    name: 'Choir / Brass & Atmosphere',
    koreanName: '성가대 코러스 & 앰비언스',
    category: 'boss' as const,
    color: '#eab308', // Gold
    iconName: 'Flame',
    volume: 0.85,
    muted: false,
    solo: false,
    phaseVolumes: {
      intro: 0.5,
      ready: 0.5,
      battle: 0.8,
      boss: 1.0,
      result: 0.3,
      exit: 0.5
    }
  }
];
