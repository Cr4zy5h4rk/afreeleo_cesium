import * as Cesium from "cesium";
import * as satellite from "satellite.js";

// Configuration Cesium
const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
  timeline: true,
  animation: true,
});

// Paramètres de la mission AFREELEO
const MISSION_CONFIG = {
  launchSite: { lon: -17.477989, lat: 14.733128 }, // Dakar
  // Piste de l'aéroport Dakar (départ et arrivée)
  runway: {

    start: { lat: 14.686448, lon: -17.072957 }, // Début de piste
    end: { lat: 14.660182, lon: -17.072747 },   // Fin de piste
  },
  carrierAltitude: 12000, // 12 km
  targetAltitude: 400000, // 400 km LEO
  orbitalInclination: 14.7, // degrés
  carrierSpeed: 250, // m/s
  phaseDurations: {
    pause: 100, // 10 secondes de pause avant décollage
    taxiing: 30, // 30 secondes de roulage
    takeoff: 60, // 1 minute de décollage
    climb: 120, // 2 minutes de montée vers 12km
    cruise: 600, // 10 minutes de croisière vers destination
    launch: 300, // 5 minutes
    orbit: 5400, // 90 minutes (1 orbite complète)
    deorbit: 172800, // 48 heures
  },
};

// Données TLE des satellites réels
const TLE_DATA = [
  {
    name: "CALSPHERE 1",
    tle1: "1 00900U 64063C   25275.83201927  .00001327  00000+0  13502-2 0  9996",
    tle2: "2 00900  90.2161  65.8158 0024870 355.4150 100.2459 13.76223249 36028",
  },
  {
    name: "CALSPHERE 2",
    tle1: "1 00902U 64063E   25275.95814793  .00000108  00000+0  14985-3 0  9995",
    tle2: "2 00902  90.2288  69.7235 0016689 252.3543 227.5740 13.52873766821486",
  },
  {
    name: "LCS 1",
    tle1: "1 01361U 65034C   25275.77916527  .00000001  00000+0 -99501-3 0  9992",
    tle2: "2 01361  32.1419  68.1942 0013575 290.8518  69.0525  9.89309326184398",
  },
  {
    name: "TEMPSAT 1",
    tle1: "1 01512U 65065E   25275.58393454  .00000079  00000+0  14230-3 0  9991",
    tle2: "2 01512  89.9866 212.7336 0067698 251.7507 283.5487 13.33573483925715",
  },
  {
    name: "CALSPHERE 4A",
    tle1: "1 01520U 65065H   25275.94629242  .00000182  00000+0  33021-3 0  9991",
    tle2: "2 01520  89.9113 124.8636 0071176 108.9744 359.7841 13.36220042928353",
  },
  {
    name: "OPS 5712 (P/L 160)",
    tle1: "1 02826U 67053A   25275.89256548  .00015908  00000+0  25142-2 0  9995",
    tle2: "2 02826  69.9196 306.5920 0004067 330.0450  30.0462 14.72380956 28287",
  },
  {
    name: "LES-5",
    tle1: "1 02866U 67066E   25275.67263244 -.00000044  00000+0  00000+0 0  9999",
    tle2: "2 02866   2.0289 105.2071 0053535 195.6817 111.6761  1.09425015128213",
  },
  {
    name: "SURCAL 159",
    tle1: "1 02872U 67053F   25275.93974780  .00000257  00000+0  21262-3 0  9997",
    tle2: "2 02872  69.9745 194.7332 0003766  89.0596 271.0943 13.99510262974216",
  },
  {
    name: "OPS 5712 (P/L 153)",
    tle1: "1 02874U 67053H   25275.46870473  .00000129  00000+0  13119-3 0  9991",
    tle2: "2 02874  69.9737 307.6848 0007349 194.3811 165.7087 13.96771398970790",
  },
  {
    name: "SURCAL 150B",
    tle1: "1 02909U 67053J   25275.90117486  .00886030  00000+0  90969-2 0  9997",
    tle2: "2 02909  69.9075 176.0900 0014535 182.5865 177.5254 15.62278186 42298",
  },
  {
    name: "OPS 3811 (DSP 2)",
    tle1: "1 05204U 71039A   25275.75349282 -.00000083  00000+0  00000+0 0  9992",
    tle2: "2 05204   0.4671 299.2228 0022011 341.5617 209.8666  0.98161237203704",
  },
];

// ============================================
// PARTIE 1: AJOUT DES SATELLITES RÉELS
// ============================================

function addRealSatellites() {
  const now = new Date();

  // Palette de couleurs distinctes pour chaque satellite
  const colors = [
    Cesium.Color.LIGHTGREEN,
    Cesium.Color.CYAN,
    Cesium.Color.MAGENTA,
    Cesium.Color.YELLOW,
    Cesium.Color.ORANGE,
    Cesium.Color.LIGHTBLUE,
    Cesium.Color.PINK,
    Cesium.Color.LIME,
    Cesium.Color.GOLD,
    Cesium.Color.VIOLET,
    Cesium.Color.AQUA,
  ];

  TLE_DATA.forEach((satData, index) => {
    const satrec = satellite.twoline2satrec(satData.tle1, satData.tle2);

    // Créer une propriété de position dynamique
    const positionProperty = new Cesium.SampledPositionProperty();

    // Calculer positions pour les 2 prochaines heures
    for (let i = 0; i < 120; i++) {
      const time = new Date(now.getTime() + i * 60000); // chaque minute
      const positionAndVelocity = satellite.propagate(satrec, time);

      if (positionAndVelocity.position) {
        const gmst = satellite.gstime(time);
        const gdPos = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

        const lon = Cesium.Math.toDegrees(gdPos.longitude);
        const lat = Cesium.Math.toDegrees(gdPos.latitude);
        const alt = gdPos.height * 1000; // km vers m

        const julianDate = Cesium.JulianDate.fromDate(time);
        const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
        positionProperty.addSample(julianDate, position);
      }
    }

    // Couleur unique pour chaque satellite
    const satColor = colors[index % colors.length];

    // Créer l'entité satellite
    viewer.entities.add({
      id: `real-sat-${index}`,
      name: satData.name,
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: Cesium.JulianDate.fromDate(now),
          stop: Cesium.JulianDate.fromDate(new Date(now.getTime() + 7200000)),
        }),
      ]),
      position: positionProperty,
      orientation: new Cesium.VelocityOrientationProperty(positionProperty),
      model: {
        uri: "./simple_satellite.glb",
        minimumPixelSize: 32,
        maximumScale: 5000,
        scale: 100,
      },
      label: {
        text: satData.name,
        font: "10pt monospace",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        fillColor: satColor,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
      },
      path: {
        resolution: 60,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.15,
          color: satColor.withAlpha(0.5),
        }),
        width: 2,
      },
    });
  });

  console.log(`${TLE_DATA.length} satellites réels ajoutés avec succès!`);
}

// ============================================
// PARTIE 2: SIMULATION MISSION AFREELEO
// ============================================

// Piste de l'aéroport Dakar
viewer.entities.add({
  name: "Runway - Dakar Airport",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([
      MISSION_CONFIG.runway.start.lon, MISSION_CONFIG.runway.start.lat,
      MISSION_CONFIG.runway.end.lon, MISSION_CONFIG.runway.end.lat,
    ]),
    width: 20,
    material: new Cesium.PolylineOutlineMaterialProperty({
      color: Cesium.Color.WHITE.withAlpha(0.8),
      outlineWidth: 2,
      outlineColor: Cesium.Color.YELLOW,
    }),
    clampToGround: true,
  },
});

// Marqueur début de piste
viewer.entities.add({
  name: "Runway Start",
  position: Cesium.Cartesian3.fromDegrees(
    MISSION_CONFIG.runway.start.lon,
    MISSION_CONFIG.runway.start.lat,
    0
  ),
  point: {
    pixelSize: 15,
    color: Cesium.Color.GREEN,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
  label: {
    text: "🛫 RUNWAY START",
    font: "12pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
    fillColor: Cesium.Color.GREEN,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
  },
});

// Marqueur fin de piste
viewer.entities.add({
  name: "Runway End",
  position: Cesium.Cartesian3.fromDegrees(
    MISSION_CONFIG.runway.end.lon,
    MISSION_CONFIG.runway.end.lat,
    0
  ),
  point: {
    pixelSize: 15,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
  },
  label: {
    text: "🛫 TAKEOFF POINT",
    font: "12pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
    fillColor: Cesium.Color.RED,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
  },
});

// Marqueur point de largage Falcon 9
viewer.entities.add({
  name: "Rocket Launch Point",
  position: Cesium.Cartesian3.fromDegrees(-16.493000, 3.336000, 12000),
  point: {
    pixelSize: 20,
    color: Cesium.Color.ORANGE,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 3,
  },
  label: {
    text: "🚀 ROCKET LAUNCH",
    font: "12pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
    fillColor: Cesium.Color.ORANGE,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
  },
});

// Marqueur séparation premier étage (120km altitude)
viewer.entities.add({
  name: "Stage 1 Separation",
  position: Cesium.Cartesian3.fromDegrees(-16.493000 + 18, 3.336000 + 0.8, 120000),
  point: {
    pixelSize: 15,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.YELLOW,
    outlineWidth: 2,
  },
  label: {
    text: "💥 STAGE 1 SEP (120km)",
    font: "11pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -15),
    fillColor: Cesium.Color.YELLOW,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
  },
});

// Marqueur déploiement satellite (coordonnées exactes GMAT - 679.86km)
viewer.entities.add({
  name: "Satellite Deployment",
  position: Cesium.Cartesian3.fromDegrees(161.236329, 0.150964, 679860),
  point: {
    pixelSize: 20,
    color: Cesium.Color.LIME,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 3,
  },
  label: {
    text: "🛰️ DEPLOYMENT (679.86km)",
    font: "12pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
    fillColor: Cesium.Color.LIME,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
  },
});

// Définition manuelle de tous les points de vol
// Trajectoire optimale: Dakar → Golfe de Guinée (au-dessus de l'océan Atlantique)
// Point de largage: proche de l'équateur, au-dessus de l'océan
const flightData = [
  // ===== PHASE 0: PAUSE - Stationnement début de piste =====
  { lon: -17.072957, lat: 14.686448, alt: 0, time: 0, phase: "PAUSE" },
  { lon: -17.072955, lat: 14.685900, alt: 0, time: 20, phase: "PAUSE" },
  { lon: -17.072953, lat: 14.685400, alt: 0, time: 40, phase: "PAUSE" },
  { lon: -17.072950, lat: 14.684900, alt: 0, time: 60, phase: "PAUSE" },

  // ===== PHASE 1: TAXIING - Roulage lent vers position de décollage =====
  { lon: -17.072945, lat: 14.684200, alt: 0, time: 70, phase: "TAXIING" },
  { lon: -17.072940, lat: 14.683500, alt: 0, time: 80, phase: "TAXIING" },
  { lon: -17.072935, lat: 14.682800, alt: 0, time: 90, phase: "TAXIING" },
  { lon: -17.072930, lat: 14.682100, alt: 0, time: 100, phase: "TAXIING" },
  { lon: -17.072925, lat: 14.681400, alt: 0, time: 110, phase: "TAXIING" },
  { lon: -17.072920, lat: 14.680700, alt: 0, time: 120, phase: "TAXIING" },

  // ===== PHASE 2: TAKEOFF - Décollage ultra-réaliste =====

  // Début de l'accélération (freins relâchés, pleine puissance)
  { lon: -17.072915, lat: 14.680000, alt: 0, time: 125, phase: "TAKEOFF" },
  { lon: -17.072910, lat: 14.679200, alt: 0, time: 128, phase: "TAKEOFF" },
  { lon: -17.072905, lat: 14.678300, alt: 0, time: 131, phase: "TAKEOFF" },

  // Accélération progressive (50-100 kt)
  { lon: -17.072900, lat: 14.677300, alt: 0, time: 134, phase: "TAKEOFF" },
  { lon: -17.072895, lat: 14.676200, alt: 0, time: 137, phase: "TAKEOFF" },
  { lon: -17.072890, lat: 14.675000, alt: 0, time: 140, phase: "TAKEOFF" },

  // Accélération continue (100-140 kt)
  { lon: -17.072880, lat: 14.673500, alt: 0, time: 143, phase: "TAKEOFF" },
  { lon: -17.072870, lat: 14.671800, alt: 0, time: 146, phase: "TAKEOFF" },
  { lon: -17.072860, lat: 14.669900, alt: 0, time: 149, phase: "TAKEOFF" },

  // V1 - Vitesse de décision (140-150 kt) - point de non-retour
  { lon: -17.072850, lat: 14.667900, alt: 0, time: 152, phase: "TAKEOFF" },
  { lon: -17.072840, lat: 14.665700, alt: 0, time: 155, phase: "TAKEOFF" },

  // VR - Vitesse de rotation (155-165 kt) - début de rotation
  { lon: -17.072830, lat: 14.663400, alt: 0, time: 158, phase: "TAKEOFF" },
  { lon: -17.072820, lat: 14.661900, alt: 5, time: 159, phase: "TAKEOFF" },  // Nez commence à lever
  { lon: -17.072810, lat: 14.660700, alt: 15, time: 160, phase: "TAKEOFF" }, // Rotation en cours

  // Décollage - train principal quitte le sol (V2 ~170 kt)
  { lon: -17.072800, lat: 14.659500, alt: 25, time: 161, phase: "TAKEOFF" }, // Wheels up!
  { lon: -17.072790, lat: 14.658400, alt: 40, time: 162, phase: "TAKEOFF" },
  { lon: -17.072780, lat: 14.657300, alt: 60, time: 163, phase: "TAKEOFF" },

  // Montée initiale (angle ~12°, taux 200 m/min)
  { lon: -17.072770, lat: 14.656200, alt: 80, time: 164, phase: "TAKEOFF" },
  { lon: -17.072760, lat: 14.655100, alt: 100, time: 165, phase: "TAKEOFF" },
  { lon: -17.072745, lat: 14.653900, alt: 125, time: 166, phase: "TAKEOFF" },
  { lon: -17.072730, lat: 14.652700, alt: 150, time: 167, phase: "TAKEOFF" },
  { lon: -17.072710, lat: 14.651400, alt: 180, time: 168, phase: "TAKEOFF" },
  { lon: -17.072690, lat: 14.650100, alt: 210, time: 169, phase: "TAKEOFF" },
  { lon: -17.072670, lat: 14.648800, alt: 240, time: 170, phase: "TAKEOFF" },

  // Continuation montée initiale (train rentré, volets en configuration TO)
  { lon: -17.072650, lat: 14.647400, alt: 275, time: 171, phase: "TAKEOFF" },
  { lon: -17.072625, lat: 14.645900, alt: 310, time: 172, phase: "TAKEOFF" },
  { lon: -17.072600, lat: 14.644400, alt: 350, time: 173, phase: "TAKEOFF" },
  { lon: -17.072570, lat: 14.642800, alt: 390, time: 174, phase: "TAKEOFF" },
  { lon: -17.072540, lat: 14.641200, alt: 435, time: 175, phase: "TAKEOFF" },
  { lon: -17.072510, lat: 14.639500, alt: 480, time: 176, phase: "TAKEOFF" },
  { lon: -17.072475, lat: 14.637700, alt: 530, time: 177, phase: "TAKEOFF" },
  { lon: -17.072440, lat: 14.635900, alt: 580, time: 178, phase: "TAKEOFF" },
  { lon: -17.072400, lat: 14.634000, alt: 635, time: 179, phase: "TAKEOFF" },
  { lon: -17.072360, lat: 14.632100, alt: 690, time: 180, phase: "TAKEOFF" },

  // ===== PHASE 3: INITIAL CLIMB - Montée initiale douce =====
  // Taux de montée: ~300m/min (réaliste pour A380)
  // Continuation fluide depuis le décollage
  { lon: -17.072320, lat: 14.630200, alt: 750, time: 181, phase: "CLIMB" },
  { lon: -17.072280, lat: 14.628300, alt: 810, time: 182, phase: "CLIMB" },
  { lon: -17.072240, lat: 14.626400, alt: 875, time: 183, phase: "CLIMB" },
  { lon: -17.072200, lat: 14.624500, alt: 940, time: 184, phase: "CLIMB" },
  { lon: -17.072160, lat: 14.622600, alt: 1010, time: 185, phase: "CLIMB" },
  { lon: -17.072115, lat: 14.620600, alt: 1080, time: 186, phase: "CLIMB" },
  { lon: -17.072070, lat: 14.618600, alt: 1155, time: 187, phase: "CLIMB" },
  { lon: -17.072020, lat: 14.616500, alt: 1230, time: 188, phase: "CLIMB" },
  { lon: -17.071970, lat: 14.614400, alt: 1310, time: 189, phase: "CLIMB" },
  { lon: -17.071920, lat: 14.612300, alt: 1390, time: 190, phase: "CLIMB" },
  { lon: -17.071865, lat: 14.610100, alt: 1475, time: 191, phase: "CLIMB" },
  { lon: -17.071810, lat: 14.607900, alt: 1560, time: 192, phase: "CLIMB" },
  { lon: -17.071750, lat: 14.605600, alt: 1650, time: 193, phase: "CLIMB" },
  { lon: -17.071690, lat: 14.603300, alt: 1740, time: 194, phase: "CLIMB" },
  { lon: -17.071625, lat: 14.600900, alt: 1835, time: 195, phase: "CLIMB" },
  { lon: -17.071560, lat: 14.598500, alt: 1930, time: 196, phase: "CLIMB" },
  { lon: -17.071490, lat: 14.596000, alt: 2030, time: 197, phase: "CLIMB" },
  { lon: -17.071420, lat: 14.593500, alt: 2130, time: 198, phase: "CLIMB" },
  { lon: -17.071350, lat: 14.591000, alt: 2235, time: 199, phase: "CLIMB" },
  { lon: -17.071275, lat: 14.588400, alt: 2340, time: 200, phase: "CLIMB" },

  // ===== PHASE 4: CLIMB TO CRUISE - Montée continue vers altitude de croisière =====
  // Légère courbe douce vers le sud (direction Golfe de Guinée)
  { lon: -17.071200, lat: 14.585800, alt: 2450, time: 201, phase: "CLIMB" },
  { lon: -17.071120, lat: 14.583100, alt: 2560, time: 205, phase: "CLIMB" },
  { lon: -17.071030, lat: 14.580300, alt: 2675, time: 210, phase: "CLIMB" },
  { lon: -17.070940, lat: 14.577400, alt: 2790, time: 215, phase: "CLIMB" },
  { lon: -17.070840, lat: 14.574400, alt: 2910, time: 220, phase: "CLIMB" },
  { lon: -17.070730, lat: 14.571300, alt: 3030, time: 225, phase: "CLIMB" },
  { lon: -17.070620, lat: 14.568100, alt: 3155, time: 230, phase: "CLIMB" },
  { lon: -17.070500, lat: 14.564800, alt: 3280, time: 235, phase: "CLIMB" },
  { lon: -17.070370, lat: 14.561400, alt: 3410, time: 240, phase: "CLIMB" },
  { lon: -17.070230, lat: 14.557900, alt: 3540, time: 245, phase: "CLIMB" },
  { lon: -17.070090, lat: 14.554300, alt: 3675, time: 250, phase: "CLIMB" },
  { lon: -17.069940, lat: 14.550600, alt: 3810, time: 255, phase: "CLIMB" },
  { lon: -17.069780, lat: 14.546800, alt: 3950, time: 260, phase: "CLIMB" },
  { lon: -17.069610, lat: 14.542900, alt: 4090, time: 265, phase: "CLIMB" },
  { lon: -17.069440, lat: 14.538900, alt: 4235, time: 270, phase: "CLIMB" },
  { lon: -17.069260, lat: 14.534800, alt: 4380, time: 275, phase: "CLIMB" },
  { lon: -17.069070, lat: 14.530600, alt: 4530, time: 280, phase: "CLIMB" },
  { lon: -17.068870, lat: 14.526200, alt: 4680, time: 285, phase: "CLIMB" },
  { lon: -17.068670, lat: 14.521700, alt: 4835, time: 290, phase: "CLIMB" },
  { lon: -17.068460, lat: 14.517100, alt: 4990, time: 295, phase: "CLIMB" },
  { lon: -17.068240, lat: 14.512400, alt: 5150, time: 300, phase: "CLIMB" },
  { lon: -17.068010, lat: 14.507600, alt: 5310, time: 305, phase: "CLIMB" },
  { lon: -17.067770, lat: 14.502700, alt: 5475, time: 310, phase: "CLIMB" },
  { lon: -17.067520, lat: 14.497700, alt: 5640, time: 315, phase: "CLIMB" },
  { lon: -17.067260, lat: 14.492600, alt: 5810, time: 320, phase: "CLIMB" },
  { lon: -17.066990, lat: 14.487400, alt: 5980, time: 325, phase: "CLIMB" },
  { lon: -17.066710, lat: 14.482100, alt: 6155, time: 330, phase: "CLIMB" },
  { lon: -17.066420, lat: 14.476700, alt: 6330, time: 335, phase: "CLIMB" },
  { lon: -17.066120, lat: 14.471200, alt: 6510, time: 340, phase: "CLIMB" },
  { lon: -17.065810, lat: 14.465600, alt: 6690, time: 345, phase: "CLIMB" },
  { lon: -17.065490, lat: 14.459900, alt: 6875, time: 350, phase: "CLIMB" },
  { lon: -17.065160, lat: 14.454100, alt: 7060, time: 355, phase: "CLIMB" },
  { lon: -17.064820, lat: 14.448200, alt: 7250, time: 360, phase: "CLIMB" },
  { lon: -17.064470, lat: 14.442200, alt: 7440, time: 365, phase: "CLIMB" },
  { lon: -17.064110, lat: 14.436100, alt: 7635, time: 370, phase: "CLIMB" },
  { lon: -17.063740, lat: 14.429900, alt: 7830, time: 375, phase: "CLIMB" },
  { lon: -17.063360, lat: 14.423600, alt: 8030, time: 380, phase: "CLIMB" },
  { lon: -17.062970, lat: 14.417200, alt: 8230, time: 385, phase: "CLIMB" },
  { lon: -17.062570, lat: 14.410700, alt: 8435, time: 390, phase: "CLIMB" },
  { lon: -17.062160, lat: 14.404100, alt: 8640, time: 395, phase: "CLIMB" },
  { lon: -17.061740, lat: 14.397400, alt: 8850, time: 400, phase: "CLIMB" },
  { lon: -17.061310, lat: 14.390600, alt: 9060, time: 405, phase: "CLIMB" },
  { lon: -17.060870, lat: 14.383700, alt: 9275, time: 410, phase: "CLIMB" },
  { lon: -17.060420, lat: 14.376700, alt: 9490, time: 415, phase: "CLIMB" },
  { lon: -17.059960, lat: 14.369600, alt: 9710, time: 420, phase: "CLIMB" },
  { lon: -17.059490, lat: 14.362400, alt: 9930, time: 425, phase: "CLIMB" },
  { lon: -17.059010, lat: 14.355100, alt: 10155, time: 430, phase: "CLIMB" },
  { lon: -17.058520, lat: 14.347700, alt: 10380, time: 435, phase: "CLIMB" },
  { lon: -17.058020, lat: 14.340200, alt: 10610, time: 440, phase: "CLIMB" },
  { lon: -17.057510, lat: 14.332600, alt: 10840, time: 445, phase: "CLIMB" },
  { lon: -17.056990, lat: 14.324900, alt: 11075, time: 450, phase: "CLIMB" },
  { lon: -17.056460, lat: 14.317100, alt: 11310, time: 455, phase: "CLIMB" },
  { lon: -17.055920, lat: 14.309200, alt: 11550, time: 460, phase: "CLIMB" },
  { lon: -17.055370, lat: 14.301200, alt: 11790, time: 465, phase: "CLIMB" },
  { lon: -17.054810, lat: 14.293100, alt: 11950, time: 470, phase: "CLIMB" },
  { lon: -17.054240, lat: 14.284900, alt: 12000, time: 475, phase: "CLIMB" },

  // ===== PHASE 5: CRUISE - Vol de croisière à 12km =====
  // Trajectoire rectiligne parfaite vers le point de largage (Golfe de Guinée)
  // Calcul: ligne droite de (-17.054240, 14.284900) à (-15.955650, 3.397300)
  { lon: -17.052200, lat: 14.244400, alt: 12000, time: 480, phase: "CRUISE" },
  { lon: -17.048050, lat: 14.163600, alt: 12000, time: 500, phase: "CRUISE" },
  { lon: -17.043900, lat: 14.082800, alt: 12000, time: 520, phase: "CRUISE" },
  { lon: -17.039750, lat: 14.002000, alt: 12000, time: 540, phase: "CRUISE" },
  { lon: -17.035600, lat: 13.921200, alt: 12000, time: 560, phase: "CRUISE" },
  { lon: -17.031450, lat: 13.840400, alt: 12000, time: 580, phase: "CRUISE" },
  { lon: -17.027300, lat: 13.759600, alt: 12000, time: 600, phase: "CRUISE" },
  { lon: -17.023150, lat: 13.678800, alt: 12000, time: 620, phase: "CRUISE" },
  { lon: -17.019000, lat: 13.598000, alt: 12000, time: 640, phase: "CRUISE" },
  { lon: -17.014850, lat: 13.517200, alt: 12000, time: 660, phase: "CRUISE" },
  { lon: -17.010700, lat: 13.436400, alt: 12000, time: 680, phase: "CRUISE" },
  { lon: -17.006550, lat: 13.355600, alt: 12000, time: 700, phase: "CRUISE" },
  { lon: -17.002400, lat: 13.274800, alt: 12000, time: 720, phase: "CRUISE" },
  { lon: -16.998250, lat: 13.194000, alt: 12000, time: 740, phase: "CRUISE" },
  { lon: -16.994100, lat: 13.113200, alt: 12000, time: 760, phase: "CRUISE" },
  { lon: -16.989950, lat: 13.032400, alt: 12000, time: 780, phase: "CRUISE" },
  { lon: -16.985800, lat: 12.951600, alt: 12000, time: 800, phase: "CRUISE" },
  { lon: -16.981650, lat: 12.870800, alt: 12000, time: 820, phase: "CRUISE" },
  { lon: -16.977500, lat: 12.790000, alt: 12000, time: 840, phase: "CRUISE" },
  { lon: -16.973350, lat: 12.709200, alt: 12000, time: 860, phase: "CRUISE" },
  { lon: -16.969200, lat: 12.628400, alt: 12000, time: 880, phase: "CRUISE" },
  { lon: -16.965050, lat: 12.547600, alt: 12000, time: 900, phase: "CRUISE" },
  { lon: -16.960900, lat: 12.466800, alt: 12000, time: 920, phase: "CRUISE" },
  { lon: -16.956750, lat: 12.386000, alt: 12000, time: 940, phase: "CRUISE" },
  { lon: -16.952600, lat: 12.305200, alt: 12000, time: 960, phase: "CRUISE" },
  { lon: -16.948450, lat: 12.224400, alt: 12000, time: 980, phase: "CRUISE" },
  { lon: -16.944300, lat: 12.143600, alt: 12000, time: 1000, phase: "CRUISE" },
  { lon: -16.940150, lat: 12.062800, alt: 12000, time: 1020, phase: "CRUISE" },
  { lon: -16.936000, lat: 11.982000, alt: 12000, time: 1040, phase: "CRUISE" },
  { lon: -16.931850, lat: 11.901200, alt: 12000, time: 1060, phase: "CRUISE" },
  { lon: -16.927700, lat: 11.820400, alt: 12000, time: 1080, phase: "CRUISE" },
  { lon: -16.923550, lat: 11.739600, alt: 12000, time: 1100, phase: "CRUISE" },
  { lon: -16.919400, lat: 11.658800, alt: 12000, time: 1120, phase: "CRUISE" },
  { lon: -16.915250, lat: 11.578000, alt: 12000, time: 1140, phase: "CRUISE" },
  { lon: -16.911100, lat: 11.497200, alt: 12000, time: 1160, phase: "CRUISE" },
  { lon: -16.906950, lat: 11.416400, alt: 12000, time: 1180, phase: "CRUISE" },
  { lon: -16.902800, lat: 11.335600, alt: 12000, time: 1200, phase: "CRUISE" },
  { lon: -16.898650, lat: 11.254800, alt: 12000, time: 1220, phase: "CRUISE" },
  { lon: -16.894500, lat: 11.174000, alt: 12000, time: 1240, phase: "CRUISE" },
  { lon: -16.890350, lat: 11.093200, alt: 12000, time: 1260, phase: "CRUISE" },
  { lon: -16.886200, lat: 11.012400, alt: 12000, time: 1280, phase: "CRUISE" },
  { lon: -16.882050, lat: 10.931600, alt: 12000, time: 1300, phase: "CRUISE" },
  { lon: -16.877900, lat: 10.850800, alt: 12000, time: 1320, phase: "CRUISE" },
  { lon: -16.873750, lat: 10.770000, alt: 12000, time: 1340, phase: "CRUISE" },
  { lon: -16.869600, lat: 10.689200, alt: 12000, time: 1360, phase: "CRUISE" },
  { lon: -16.865450, lat: 10.608400, alt: 12000, time: 1380, phase: "CRUISE" },
  { lon: -16.861300, lat: 10.527600, alt: 12000, time: 1400, phase: "CRUISE" },
  { lon: -16.857150, lat: 10.446800, alt: 12000, time: 1420, phase: "CRUISE" },
  { lon: -16.853000, lat: 10.366000, alt: 12000, time: 1440, phase: "CRUISE" },
  { lon: -16.848850, lat: 10.285200, alt: 12000, time: 1460, phase: "CRUISE" },
  { lon: -16.844700, lat: 10.204400, alt: 12000, time: 1480, phase: "CRUISE" },
  { lon: -16.840550, lat: 10.123600, alt: 12000, time: 1500, phase: "CRUISE" },
  { lon: -16.836400, lat: 10.042800, alt: 12000, time: 1520, phase: "CRUISE" },
  { lon: -16.832250, lat: 9.962000, alt: 12000, time: 1540, phase: "CRUISE" },
  { lon: -16.828100, lat: 9.881200, alt: 12000, time: 1560, phase: "CRUISE" },
  { lon: -16.823950, lat: 9.800400, alt: 12000, time: 1580, phase: "CRUISE" },
  { lon: -16.819800, lat: 9.719600, alt: 12000, time: 1600, phase: "CRUISE" },
  { lon: -16.815650, lat: 9.638800, alt: 12000, time: 1620, phase: "CRUISE" },
  { lon: -16.811500, lat: 9.558000, alt: 12000, time: 1640, phase: "CRUISE" },
  { lon: -16.807350, lat: 9.477200, alt: 12000, time: 1660, phase: "CRUISE" },
  { lon: -16.803200, lat: 9.396400, alt: 12000, time: 1680, phase: "CRUISE" },
  { lon: -16.799050, lat: 9.315600, alt: 12000, time: 1700, phase: "CRUISE" },
  { lon: -16.794900, lat: 9.234800, alt: 12000, time: 1720, phase: "CRUISE" },
  { lon: -16.790750, lat: 9.154000, alt: 12000, time: 1740, phase: "CRUISE" },
  { lon: -16.786600, lat: 9.073200, alt: 12000, time: 1760, phase: "CRUISE" },
  { lon: -16.782450, lat: 8.992400, alt: 12000, time: 1780, phase: "CRUISE" },
  { lon: -16.778300, lat: 8.911600, alt: 12000, time: 1800, phase: "CRUISE" },
  { lon: -16.774150, lat: 8.830800, alt: 12000, time: 1820, phase: "CRUISE" },
  { lon: -16.770000, lat: 8.750000, alt: 12000, time: 1840, phase: "CRUISE" },
  { lon: -16.765850, lat: 8.669200, alt: 12000, time: 1860, phase: "CRUISE" },
  { lon: -16.761700, lat: 8.588400, alt: 12000, time: 1880, phase: "CRUISE" },
  { lon: -16.757550, lat: 8.507600, alt: 12000, time: 1900, phase: "CRUISE" },
  { lon: -16.753400, lat: 8.426800, alt: 12000, time: 1920, phase: "CRUISE" },
  { lon: -16.749250, lat: 8.346000, alt: 12000, time: 1940, phase: "CRUISE" },
  { lon: -16.745100, lat: 8.265200, alt: 12000, time: 1960, phase: "CRUISE" },
  { lon: -16.740950, lat: 8.184400, alt: 12000, time: 1980, phase: "CRUISE" },
  { lon: -16.736800, lat: 8.103600, alt: 12000, time: 2000, phase: "CRUISE" },
  { lon: -16.732650, lat: 8.022800, alt: 12000, time: 2020, phase: "CRUISE" },
  { lon: -16.728500, lat: 7.942000, alt: 12000, time: 2040, phase: "CRUISE" },
  { lon: -16.724350, lat: 7.861200, alt: 12000, time: 2060, phase: "CRUISE" },
  { lon: -16.720200, lat: 7.780400, alt: 12000, time: 2080, phase: "CRUISE" },
  { lon: -16.716050, lat: 7.699600, alt: 12000, time: 2100, phase: "CRUISE" },
  { lon: -16.711900, lat: 7.618800, alt: 12000, time: 2120, phase: "CRUISE" },
  { lon: -16.707750, lat: 7.538000, alt: 12000, time: 2140, phase: "CRUISE" },
  { lon: -16.703600, lat: 7.457200, alt: 12000, time: 2160, phase: "CRUISE" },
  { lon: -16.699450, lat: 7.376400, alt: 12000, time: 2180, phase: "CRUISE" },
  { lon: -16.695300, lat: 7.295600, alt: 12000, time: 2200, phase: "CRUISE" },
  { lon: -16.691150, lat: 7.214800, alt: 12000, time: 2220, phase: "CRUISE" },
  { lon: -16.687000, lat: 7.134000, alt: 12000, time: 2240, phase: "CRUISE" },
  { lon: -16.682850, lat: 7.053200, alt: 12000, time: 2260, phase: "CRUISE" },
  { lon: -16.678700, lat: 6.972400, alt: 12000, time: 2280, phase: "CRUISE" },
  { lon: -16.674550, lat: 6.891600, alt: 12000, time: 2300, phase: "CRUISE" },
  { lon: -16.670400, lat: 6.810800, alt: 12000, time: 2320, phase: "CRUISE" },
  { lon: -16.666250, lat: 6.730000, alt: 12000, time: 2340, phase: "CRUISE" },
  { lon: -16.662100, lat: 6.649200, alt: 12000, time: 2360, phase: "CRUISE" },
  { lon: -16.657950, lat: 6.568400, alt: 12000, time: 2380, phase: "CRUISE" },
  { lon: -16.653800, lat: 6.487600, alt: 12000, time: 2400, phase: "CRUISE" },
  { lon: -16.649650, lat: 6.406800, alt: 12000, time: 2420, phase: "CRUISE" },
  { lon: -16.645500, lat: 6.326000, alt: 12000, time: 2440, phase: "CRUISE" },
  { lon: -16.641350, lat: 6.245200, alt: 12000, time: 2460, phase: "CRUISE" },
  { lon: -16.637200, lat: 6.164400, alt: 12000, time: 2480, phase: "CRUISE" },
  { lon: -16.633050, lat: 6.083600, alt: 12000, time: 2500, phase: "CRUISE" },
  { lon: -16.628900, lat: 6.002800, alt: 12000, time: 2520, phase: "CRUISE" },
  { lon: -16.624750, lat: 5.922000, alt: 12000, time: 2540, phase: "CRUISE" },
  { lon: -16.620600, lat: 5.841200, alt: 12000, time: 2560, phase: "CRUISE" },
  { lon: -16.616450, lat: 5.760400, alt: 12000, time: 2580, phase: "CRUISE" },
  { lon: -16.612300, lat: 5.679600, alt: 12000, time: 2600, phase: "CRUISE" },
  { lon: -16.608150, lat: 5.598800, alt: 12000, time: 2620, phase: "CRUISE" },
  { lon: -16.604000, lat: 5.518000, alt: 12000, time: 2640, phase: "CRUISE" },
  { lon: -16.599850, lat: 5.437200, alt: 12000, time: 2660, phase: "CRUISE" },
  { lon: -16.595700, lat: 5.356400, alt: 12000, time: 2680, phase: "CRUISE" },
  { lon: -16.591550, lat: 5.275600, alt: 12000, time: 2700, phase: "CRUISE" },
  { lon: -16.587400, lat: 5.194800, alt: 12000, time: 2720, phase: "CRUISE" },
  { lon: -16.583250, lat: 5.114000, alt: 12000, time: 2740, phase: "CRUISE" },
  { lon: -16.579100, lat: 5.033200, alt: 12000, time: 2760, phase: "CRUISE" },
  { lon: -16.574950, lat: 4.952400, alt: 12000, time: 2780, phase: "CRUISE" },
  { lon: -16.570800, lat: 4.871600, alt: 12000, time: 2800, phase: "CRUISE" },
  { lon: -16.566650, lat: 4.790800, alt: 12000, time: 2820, phase: "CRUISE" },
  { lon: -16.562500, lat: 4.710000, alt: 12000, time: 2840, phase: "CRUISE" },
  { lon: -16.558350, lat: 4.629200, alt: 12000, time: 2860, phase: "CRUISE" },
  { lon: -16.554200, lat: 4.548400, alt: 12000, time: 2880, phase: "CRUISE" },
  { lon: -16.550050, lat: 4.467600, alt: 12000, time: 2900, phase: "CRUISE" },
  { lon: -16.545900, lat: 4.386800, alt: 12000, time: 2920, phase: "CRUISE" },
  { lon: -16.541750, lat: 4.306000, alt: 12000, time: 2940, phase: "CRUISE" },
  { lon: -16.537600, lat: 4.225200, alt: 12000, time: 2960, phase: "CRUISE" },
  { lon: -16.533450, lat: 4.144400, alt: 12000, time: 2980, phase: "CRUISE" },
  { lon: -16.529300, lat: 4.063600, alt: 12000, time: 3000, phase: "CRUISE" },
  { lon: -16.525150, lat: 3.982800, alt: 12000, time: 3020, phase: "CRUISE" },
  { lon: -16.521000, lat: 3.902000, alt: 12000, time: 3040, phase: "CRUISE" },
  { lon: -16.516850, lat: 3.821200, alt: 12000, time: 3060, phase: "CRUISE" },
  { lon: -16.512700, lat: 3.740400, alt: 12000, time: 3080, phase: "CRUISE" },
  { lon: -16.508550, lat: 3.659600, alt: 12000, time: 3100, phase: "CRUISE" },
  { lon: -16.504400, lat: 3.578800, alt: 12000, time: 3120, phase: "CRUISE" },
  { lon: -16.500250, lat: 3.498000, alt: 12000, time: 3140, phase: "CRUISE" },

  // ===== PHASE 6: APPROACH - Approche finale du point de largage =====
  { lon: -16.496100, lat: 3.417200, alt: 12000, time: 3155, phase: "APPROACH" },

  // ===== PHASE 7: LAUNCH - Largage de la fusée =====
  // L'avion maintient trajectoire stable puis descend légèrement pour se séparer de la fusée (au-dessus)
  { lon: -16.495000, lat: 3.390000, alt: 12000, time: 3158, phase: "LAUNCH" },
  { lon: -16.494000, lat: 3.363000, alt: 12000, time: 3161, phase: "LAUNCH" },
  { lon: -16.493000, lat: 3.336000, alt: 12000, time: 3164, phase: "LAUNCH" }, // Largage!

  // Descente légère pour séparation verticale (fusée reste à 12km, avion descend)
  { lon: -16.492000, lat: 3.309000, alt: 11950, time: 3167, phase: "LAUNCH" },
  { lon: -16.491000, lat: 3.282000, alt: 11900, time: 3170, phase: "LAUNCH" },

  // ===== PHASE 8: EVASIVE - Manœuvre d'évitement et mise en sécurité =====
  // Virage rapide à droite (vers l'ouest) + descente continue
  { lon: -16.490000, lat: 3.255000, alt: 11850, time: 3173, phase: "EVASIVE" },
  { lon: -16.489000, lat: 3.228000, alt: 11800, time: 3176, phase: "EVASIVE" },
  { lon: -16.488500, lat: 3.201000, alt: 11750, time: 3179, phase: "EVASIVE" },
  { lon: -16.488800, lat: 3.174000, alt: 11700, time: 3182, phase: "EVASIVE" },
  { lon: -16.489800, lat: 3.147000, alt: 11650, time: 3185, phase: "EVASIVE" },
  { lon: -16.491500, lat: 3.120000, alt: 11600, time: 3188, phase: "EVASIVE" },

  // Virage continu vers le nord (début du demi-tour)
  { lon: -16.494000, lat: 3.095000, alt: 11550, time: 3191, phase: "EVASIVE" },
  { lon: -16.497500, lat: 3.072000, alt: 11500, time: 3194, phase: "EVASIVE" },
  { lon: -16.502000, lat: 3.052000, alt: 11450, time: 3197, phase: "EVASIVE" },
  { lon: -16.507500, lat: 3.035000, alt: 11400, time: 3200, phase: "EVASIVE" },
  { lon: -16.514000, lat: 3.021000, alt: 11400, time: 3203, phase: "EVASIVE" },
  { lon: -16.521000, lat: 3.010000, alt: 11400, time: 3206, phase: "EVASIVE" },

  // ===== PHASE 9: RETURN - Retour vers Dakar =====
  // Grand virage à 180° pour reprendre la direction nord vers Dakar
  { lon: -16.528500, lat: 3.002000, alt: 11400, time: 3210, phase: "RETURN" },
  { lon: -16.536000, lat: 2.998000, alt: 11400, time: 3214, phase: "RETURN" },
  { lon: -16.543500, lat: 2.997000, alt: 11400, time: 3218, phase: "RETURN" },
  { lon: -16.550500, lat: 3.000000, alt: 11400, time: 3222, phase: "RETURN" },
  { lon: -16.557000, lat: 3.006000, alt: 11400, time: 3226, phase: "RETURN" },
  { lon: -16.562500, lat: 3.015000, alt: 11400, time: 3230, phase: "RETURN" },
  { lon: -16.567000, lat: 3.027000, alt: 11400, time: 3234, phase: "RETURN" },
  { lon: -16.570500, lat: 3.042000, alt: 11400, time: 3238, phase: "RETURN" },
  { lon: -16.573000, lat: 3.060000, alt: 11400, time: 3242, phase: "RETURN" },

  // Stabilisation cap nord vers Dakar
  { lon: -16.575000, lat: 3.080000, alt: 11400, time: 3246, phase: "RETURN" },
  { lon: -16.576500, lat: 3.250000, alt: 11400, time: 3270, phase: "RETURN" },
  { lon: -16.578000, lat: 3.500000, alt: 11400, time: 3300, phase: "RETURN" },
  { lon: -16.579500, lat: 3.750000, alt: 11400, time: 3330, phase: "RETURN" },
  { lon: -16.581000, lat: 4.000000, alt: 11400, time: 3360, phase: "RETURN" },
  { lon: -16.582500, lat: 4.250000, alt: 11400, time: 3390, phase: "RETURN" },
  { lon: -16.584000, lat: 4.500000, alt: 11400, time: 3420, phase: "RETURN" },
  { lon: -16.585500, lat: 4.750000, alt: 11400, time: 3450, phase: "RETURN" },
  { lon: -16.587000, lat: 5.000000, alt: 11400, time: 3480, phase: "RETURN" },
  { lon: -16.588500, lat: 5.250000, alt: 11400, time: 3510, phase: "RETURN" },
  { lon: -16.590000, lat: 5.500000, alt: 11400, time: 3540, phase: "RETURN" },

  // Retour progressif vers Dakar (trajectoire simplifiée - ligne droite vers le nord)
  { lon: -16.591500, lat: 5.750000, alt: 11400, time: 3570, phase: "RETURN" },
  { lon: -16.593000, lat: 6.000000, alt: 11400, time: 3600, phase: "RETURN" },
  { lon: -16.595000, lat: 6.500000, alt: 11400, time: 3650, phase: "RETURN" },
  { lon: -16.597000, lat: 7.000000, alt: 11400, time: 3700, phase: "RETURN" },
  { lon: -16.599000, lat: 7.500000, alt: 11400, time: 3750, phase: "RETURN" },
  { lon: -16.601000, lat: 8.000000, alt: 11400, time: 3800, phase: "RETURN" },
  { lon: -16.603000, lat: 8.500000, alt: 11400, time: 3850, phase: "RETURN" },
  { lon: -16.605000, lat: 9.000000, alt: 11400, time: 3900, phase: "RETURN" },
  { lon: -16.607000, lat: 9.500000, alt: 11400, time: 3950, phase: "RETURN" },
  { lon: -16.610000, lat: 10.000000, alt: 11400, time: 4000, phase: "RETURN" },
  { lon: -16.615000, lat: 10.500000, alt: 11400, time: 4050, phase: "RETURN" },
  { lon: -16.620000, lat: 11.000000, alt: 11400, time: 4100, phase: "RETURN" },
  { lon: -16.627000, lat: 11.500000, alt: 11400, time: 4150, phase: "RETURN" },
  { lon: -16.635000, lat: 12.000000, alt: 11400, time: 4200, phase: "RETURN" },
  { lon: -16.645000, lat: 12.500000, alt: 11400, time: 4250, phase: "RETURN" },
  { lon: -16.657000, lat: 13.000000, alt: 11400, time: 4300, phase: "RETURN" },
  { lon: -16.670000, lat: 13.500000, alt: 11400, time: 4350, phase: "RETURN" },
  { lon: -16.680000, lat: 13.750000, alt: 11400, time: 4375, phase: "RETURN" },
  { lon: -16.690000, lat: 14.000000, alt: 11200, time: 4400, phase: "RETURN" },
  { lon: -16.695000, lat: 14.150000, alt: 11000, time: 4425, phase: "RETURN" },

  // Approche finale de Dakar - descente progressive
  { lon: -16.700000, lat: 14.300000, alt: 10500, time: 4450, phase: "RETURN" },
  { lon: -16.710000, lat: 14.350000, alt: 10000, time: 4475, phase: "RETURN" },
  { lon: -16.720000, lat: 14.400000, alt: 9500, time: 4500, phase: "RETURN" },
  { lon: -16.735000, lat: 14.450000, alt: 9000, time: 4525, phase: "RETURN" },
  { lon: -16.750000, lat: 14.500000, alt: 8500, time: 4550, phase: "RETURN" },
  { lon: -16.780000, lat: 14.530000, alt: 8000, time: 4575, phase: "RETURN" },
  { lon: -16.810000, lat: 14.560000, alt: 7500, time: 4600, phase: "RETURN" },
  { lon: -16.850000, lat: 14.590000, alt: 7000, time: 4625, phase: "RETURN" },
  { lon: -16.890000, lat: 14.615000, alt: 6000, time: 4650, phase: "RETURN" },
  { lon: -16.930000, lat: 14.635000, alt: 5000, time: 4675, phase: "RETURN" },
  { lon: -16.970000, lat: 14.655000, alt: 4000, time: 4700, phase: "RETURN" },
  { lon: -17.010000, lat: 14.670000, alt: 3000, time: 4725, phase: "RETURN" },
  { lon: -17.040000, lat: 14.680000, alt: 2000, time: 4750, phase: "RETURN" },
  { lon: -17.060000, lat: 14.685000, alt: 1000, time: 4775, phase: "RETURN" },

  // Atterrissage à Dakar (retour à la piste)
  { lon: -17.072747, lat: 14.686448, alt: 0, time: 4800, phase: "RETURN" },
];

// Configuration temporelle
const startTime = Cesium.JulianDate.now();
const totalMissionTime = flightData[flightData.length - 1].time;

const stopTime = Cesium.JulianDate.addSeconds(
  startTime,
  totalMissionTime,
  new Cesium.JulianDate()
);

viewer.clock.startTime = startTime.clone();
viewer.clock.stopTime = stopTime.clone();
viewer.clock.currentTime = startTime.clone();
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
viewer.clock.multiplier = 10; // Vitesse simulation

viewer.timeline.zoomTo(startTime, stopTime);

// ============================================
// PHASE 1: AVION PORTEUR
// ============================================

function createCarrierPhase() {
  const carrierPositions = new Cesium.SampledPositionProperty();

  // Créer les positions à partir des données de vol manuelles
  flightData.forEach(point => {
    const time = Cesium.JulianDate.addSeconds(startTime, point.time, new Cesium.JulianDate());
    const position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat, point.alt);
    carrierPositions.addSample(time, position);
  });

  // Interpolation Hermite pour un vol fluide
  carrierPositions.setInterpolationOptions({
    interpolationDegree: 5,
    interpolationAlgorithm: Cesium.HermitePolynomialApproximation
  });

  const totalCarrierDuration = flightData[flightData.length - 1].time;

  const carrier = viewer.entities.add({
    id: "carrier-aircraft",
    name: "Avion Porteur A380",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: startTime,
        stop: Cesium.JulianDate.addSeconds(
          startTime,
          totalCarrierDuration,
          new Cesium.JulianDate()
        ),
      }),
    ]),
    position: carrierPositions,
    orientation: new Cesium.CallbackProperty(function (time, result) {
      const velocity = new Cesium.VelocityOrientationProperty(carrierPositions).getValue(time);
      if (velocity) {
        // Rotation de 180 degrés autour de l'axe Z (heading)
        const rotationZ = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Z,
          Cesium.Math.toRadians(180)
        );
        return Cesium.Quaternion.multiply(velocity, rotationZ, result);
      }
      return result;
    }, false),
    model: {
      uri: "./airbus_a380.glb",
      minimumPixelSize: 8,
      maximumScale: 200,
      scale: 0.6,
    },
    label: {
      text: new Cesium.CallbackProperty(function (time) {
        const currentSeconds = Cesium.JulianDate.secondsDifference(time, startTime);

        // Trouver la phase actuelle dans flightData
        let currentPhase = "CRUISE";
        for (let i = flightData.length - 1; i >= 0; i--) {
          if (currentSeconds >= flightData[i].time) {
            currentPhase = flightData[i].phase;
            break;
          }
        }

        const phaseLabels = {
          "PAUSE": "⏸️ PAUSE - Préparation au décollage",
          "TAXIING": "🛬 TAXIING - Roulage sur piste",
          "TAKEOFF": "🛫 TAKEOFF - Décollage",
          "CLIMB": "⬆️ CLIMB - Montée vers 12km",
          "CRUISE": "✈️ CRUISE - Vers point de largage",
          "APPROACH": "🎯 APPROACH - Approche finale",
          "LAUNCH": "🚀 LAUNCH - Largage fusée",
          "EVASIVE": "↩️ EVASIVE - Manœuvre évasive",
          "RETURN": "🏠 RETURN - Retour Dakar"
        };

        return phaseLabels[currentPhase] || "✈️ EN VOL";
      }, false),
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, 50),
      fillColor: Cesium.Color.YELLOW,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.YELLOW,
      }),
      width: 5,
    },
  });
  
  return carrierPositions;
}

// ============================================
// PHASE 2: FALCON 9 - LANCEMENT DEPUIS L'AVION
// ============================================

function createFalcon9Launch() {
  const falcon9Stage1Positions = new Cesium.SampledPositionProperty();
  const stage2Positions = new Cesium.SampledPositionProperty();

  // Point de largage : (-16.493000, 3.336000) à 12000m au temps 3164s
  const launchTime = 3164;
  const launchLon = -16.493000;
  const launchLat = 3.336000;
  const launchAlt = 12000;

  // Point de déploiement satellite (coordonnées exactes GMAT)
  const deployLon = 161.236329;
  const deployLat = 0.150964;
  const deployAlt = 679860; // 679.86 km d'altitude (altitude GMAT exacte)

  // Durées réalistes
  const stage1Duration = 180; // 3 minutes pour le premier étage (plus long pour plus d'altitude)
  const stage2Duration = 540; // 9 minutes pour le second étage jusqu'au déploiement

  // Point de séparation Stage 1/Stage 2 - ALTITUDE AUGMENTÉE
  const sepLon = launchLon + 18;
  const sepLat = launchLat + 0.8;
  const sepAlt = 120000; // 120 km

  // ========================================
  // TRAJECTOIRE FALCON 9 COMPLET (STAGE 1)
  // ========================================

  // PHASE 1: Largage et chute libre initiale (0-3s)
  for (let t = 0; t <= 3; t += 0.5) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + t, new Cesium.JulianDate());
    const alt = launchAlt - (t * t * 5); // Chute libre initiale
    const position = Cesium.Cartesian3.fromDegrees(launchLon, launchLat, alt);
    falcon9Stage1Positions.addSample(time, position);
  }

  // PHASE 2: Allumage et montée verticale (3-40s)
  for (let t = 3; t <= 40; t += 1) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + t, new Cesium.JulianDate());
    const progress = (t - 3) / 37;

    const alt = launchAlt + (progress * progress * 35000); // Jusqu'à ~35km
    const lon = launchLon + (progress * 0.8);
    const lat = launchLat + (progress * 0.15);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    falcon9Stage1Positions.addSample(time, position);
  }

  // PHASE 3: Gravity turn et accélération Stage 1 (40-180s)
  for (let t = 40; t <= 180; t += 2) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + t, new Cesium.JulianDate());
    const progress = (t - 40) / 140;

    const alt = 35000 + (progress * progress * 85000); // Jusqu'à ~120km
    const lon = launchLon + 0.8 + (progress * 17.2);
    const lat = launchLat + 0.15 + (progress * progress * 0.65);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    falcon9Stage1Positions.addSample(time, position);
  }

  falcon9Stage1Positions.setInterpolationOptions({
    interpolationDegree: 3,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
  });

  // ========================================
  // TRAJECTOIRE STAGE 2 JUSQU'AU DÉPLOIEMENT
  // ========================================

  // PHASE 4: Coast phase après séparation (0-10s)
  for (let t = 0; t <= 10; t += 1) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + t, new Cesium.JulianDate());
    const progress = t / 10;

    const alt = sepAlt + (progress * 10000); // ~130km
    const lon = sepLon + (progress * 3);
    const lat = sepLat + (progress * 0.15);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    stage2Positions.addSample(time, position);
  }

  // PHASE 5: Allumage Stage 2 et montée orbitale (10-280s)
  for (let t = 10; t <= 280; t += 5) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + t, new Cesium.JulianDate());
    const progress = (t - 10) / 270;

    // Montée exponentielle vers l'orbite
    const alt = 130000 + (Math.pow(progress, 0.65) * 320000); // Jusqu'à ~450km

    // Grande courbe vers l'est pour rejoindre le point de déploiement
    const lonDelta = deployLon - (sepLon + 3);
    const latDelta = deployLat - (sepLat + 0.15);

    const lon = sepLon + 3 + (progress * 0.35 * lonDelta);
    const lat = sepLat + 0.15 + (Math.sin(progress * Math.PI) * 2.5);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    stage2Positions.addSample(time, position);
  }

  // PHASE 6: Circularisation et approche finale (280-540s)
  for (let t = 280; t <= 540; t += 5) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + t, new Cesium.JulianDate());
    const progress = (t - 280) / 260;

    // Montée finale vers altitude orbitale exacte
    const alt = 450000 + (progress * (deployAlt - 450000)); // Jusqu'à 679.86km

    // Approche directe du point de déploiement
    const lonStart = sepLon + 3 + (0.35 * (deployLon - (sepLon + 3)));
    const latStart = sepLat + 0.15;

    const lon = lonStart + (progress * (deployLon - lonStart));
    const lat = latStart + (progress * (deployLat - latStart));

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    stage2Positions.addSample(time, position);
  }

  // Point final exact de déploiement (T+3164+180+540 = T+3884s)
  const deployTime = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + 540, new Cesium.JulianDate());
  stage2Positions.addSample(deployTime, Cesium.Cartesian3.fromDegrees(deployLon, deployLat, deployAlt));

  // ========================================
  // PHASE 7: DÉSORBITAGE DU STAGE 2 (540-1200s)
  // ========================================
  // Manœuvre de désorbitage: freinage rétrograde pour descendre l'orbite
  const deorbitDuration = 660; // 11 minutes pour rentrer dans l'atmosphère

  for (let t = 540; t <= 1200; t += 10) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + t, new Cesium.JulianDate());
    const progress = (t - 540) / deorbitDuration;

    // Le second étage continue sur l'orbite puis commence à descendre
    if (t <= 600) {
      // Phase de maintien orbital (60s) - dérive orbitale lente
      const orbitalProgress = (t - 540) / 60;
      const lon = deployLon + (orbitalProgress * 5); // Dérive vers l'est
      const lat = deployLat + (Math.sin(orbitalProgress * Math.PI) * 0.3);
      const alt = deployAlt - (orbitalProgress * 5000); // Légère baisse

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
      stage2Positions.addSample(time, position);
    } else {
      // Phase de désorbitage actif (600-1200s)
      const deorbitProgress = (t - 600) / 600;

      // Descente exponentielle vers l'atmosphère
      const alt = (deployAlt - 5000) * (1 - Math.pow(deorbitProgress, 0.4));

      // Trajectoire vers le sud-ouest (zone de rentrée océan Pacifique)
      const lon = deployLon + 5 + (deorbitProgress * 25);
      const lat = deployLat - (deorbitProgress * 35); // Descend vers le sud

      const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
      stage2Positions.addSample(time, position);
    }
  }

  stage2Positions.setInterpolationOptions({
    interpolationDegree: 3,
    interpolationAlgorithm: Cesium.LagrangePolynomialApproximation
  });

  // ========================================
  // ENTITÉ FALCON 9 COMPLET (0-180s)
  // ========================================
  viewer.entities.add({
    id: "falcon9-complete",
    name: "Falcon 9 Complete",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(startTime, launchTime, new Cesium.JulianDate()),
        stop: Cesium.JulianDate.addSeconds(startTime, launchTime + 180, new Cesium.JulianDate()),
      }),
    ]),
    position: falcon9Stage1Positions,
    orientation: new Cesium.CallbackProperty(function (time, result) {
      const velocity = new Cesium.VelocityOrientationProperty(falcon9Stage1Positions).getValue(time, result);
      if (velocity) {
        // Rotation de 90° autour de l'axe Y pour aligner la fusée avec la trajectoire
        const correction = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Y,
          Cesium.Math.toRadians(90)
        );
        return Cesium.Quaternion.multiply(velocity, correction, result);
      }
      return result;
    }, false),
    model: {
      uri: "./falcon_9_block_4.5.glb",
      minimumPixelSize: 32,
      maximumScale: 50000,
      scale: 3000,
    },
    label: {
      text: new Cesium.CallbackProperty(function (time) {
        const currentSeconds = Cesium.JulianDate.secondsDifference(time, startTime) - launchTime;
        if (currentSeconds <= 3) return "🚀 LARGAGE";
        if (currentSeconds <= 40) return "🚀 MONTÉE VERTICALE";
        return "🚀 GRAVITY TURN - STAGE 1";
      }, false),
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -60),
      fillColor: Cesium.Color.ORANGE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.ORANGE,
      }),
      width: 5,
      trailTime: 360,
    },
  });

  // ========================================
  // ENTITÉ STAGE 1 EN CHUTE (180-360s)
  // ========================================
  const stage1FallPositions = new Cesium.SampledPositionProperty();

  for (let t = 0; t <= 180; t += 5) {
    const time = Cesium.JulianDate.addSeconds(startTime, launchTime + 180 + t, new Cesium.JulianDate());
    const progress = t / 180;

    // Chute parabolique vers l'océan
    const alt = sepAlt * (1 - Math.pow(progress, 0.55));
    const lon = sepLon + (progress * 6);
    const lat = sepLat + (progress * progress * 0.4);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    stage1FallPositions.addSample(time, position);
  }

  viewer.entities.add({
    id: "falcon9-stage1-fall",
    name: "Falcon 9 Stage 1 (Falling)",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(startTime, launchTime + 180, new Cesium.JulianDate()),
        stop: Cesium.JulianDate.addSeconds(startTime, launchTime + 360, new Cesium.JulianDate()),
      }),
    ]),
    position: stage1FallPositions,
    orientation: new Cesium.CallbackProperty(function (time, result) {
      const velocity = new Cesium.VelocityOrientationProperty(stage1FallPositions).getValue(time, result);
      if (velocity) {
        // Rotation de 90° autour de l'axe Y pour aligner avec la trajectoire
        const correction = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Y,
          Cesium.Math.toRadians(90)
        );
        return Cesium.Quaternion.multiply(velocity, correction, result);
      }
      return result;
    }, false),
    model: {
      uri: "./f9_stage_1_model.glb",
      minimumPixelSize: 16,
      maximumScale: 30000,
      scale: 2500,
    },
    label: {
      text: "💥 STAGE 1 - CHUTE",
      font: "12pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      fillColor: Cesium.Color.RED,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.RED,
      }),
      width: 3,
      trailTime: 180,
    },
  });

  // ========================================
  // ENTITÉ STAGE 2 (180-1380s) - Inclut désorbitage
  // ========================================
  viewer.entities.add({
    id: "falcon9-stage2",
    name: "Falcon 9 Stage 2",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(startTime, launchTime + 180, new Cesium.JulianDate()),
        stop: Cesium.JulianDate.addSeconds(startTime, launchTime + 1380, new Cesium.JulianDate()),
      }),
    ]),
    position: stage2Positions,
    orientation: new Cesium.CallbackProperty(function (time, result) {
      const velocity = new Cesium.VelocityOrientationProperty(stage2Positions).getValue(time, result);
      if (velocity) {
        // Rotation de 90° autour de l'axe Y pour aligner avec la trajectoire
        const correction = Cesium.Quaternion.fromAxisAngle(
          Cesium.Cartesian3.UNIT_Y,
          Cesium.Math.toRadians(90)
        );
        return Cesium.Quaternion.multiply(velocity, correction, result);
      }
      return result;
    }, false),
    model: {
      uri: "./falcon_9_second_stage.glb",
      minimumPixelSize: 24,
      maximumScale: 40000,
      scale: 2500,
    },
    label: {
      text: new Cesium.CallbackProperty(function (time) {
        const currentSeconds = Cesium.JulianDate.secondsDifference(time, startTime) - (launchTime + 180);
        if (currentSeconds <= 10) return "💥 SÉPARATION - COAST";
        if (currentSeconds <= 280) return "🚀 STAGE 2 - MONTÉE";
        if (currentSeconds <= 540) return "🛰️ CIRCULARISATION";
        if (currentSeconds <= 600) return "🎯 DÉPLOIEMENT SATELLITE";
        if (currentSeconds <= 1200) return "🔥 DÉSORBITAGE";
        return "🌊 RENTRÉE ATMOSPHÉRIQUE";
      }, false),
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -50),
      fillColor: new Cesium.CallbackProperty(function (time) {
        const currentSeconds = Cesium.JulianDate.secondsDifference(time, startTime) - (launchTime + 180);
        if (currentSeconds <= 600) return Cesium.Color.CYAN;
        return Cesium.Color.ORANGERED; // Couleur rouge-orange pour le désorbitage
      }, false),
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.4,
        color: Cesium.Color.CYAN,
      }),
      width: 5,
      trailTime: 600,
    },
  });

  return stage2Positions;
}

// ============================================
// CHARGEMENT DES DONNÉES GMAT
// ============================================

async function loadGMATTrajectories() {
  try {
    // Charger les données du satellite
    const satelliteResponse = await fetch('./mission_38baa6d1_satellite.txt');
    const satelliteData = await satelliteResponse.text();

    // Charger les données de l'upperstage
    const upperstageResponse = await fetch('./mission_38baa6d1_upperstage.txt');
    const upperstageData = await upperstageResponse.text();

    // Parser les données du satellite
    const satelliteLines = satelliteData.split('\n').slice(1); // Skip header
    const satellitePositions = new Cesium.SampledPositionProperty();

    // Synchroniser avec le déploiement du satellite par le Stage 2
    // Largage Falcon 9: T+3164s, Stage 1: 180s, Stage 2: 540s → Déploiement: T+3884s
    const satelliteDeploymentTime = 3884; // T+3164+180+540 = T+3884s
    const gmatStartTime = Cesium.JulianDate.addSeconds(startTime, satelliteDeploymentTime, new Cesium.JulianDate());

    let count = 0;
    let minElapsed = Infinity;
    let maxElapsed = -Infinity;

    // Collecter toutes les données d'abord
    const dataPoints = [];

    let lineCount = 0;
    satelliteLines.forEach(line => {
      if (line.trim()) {
        const parts = line.trim().split(/\s+/);
        // Format: Date Month Year Time (4 parts) + ElapsedSecs Altitude Latitude Longitude VX VY VZ
        // Index:  0    1     2    3       4         5           6        7         8          9  10
        if (parts.length >= 11) {
          const elapsedSecs = parseFloat(parts[4]); // Colonne 4 après la date
          const altitudeKm = parseFloat(parts[5]); // Altitude au-dessus de la surface en km
          const altitude = altitudeKm * 1000; // km vers m
          const latitude = parseFloat(parts[6]);
          const longitude = parseFloat(parts[7]);

          // Log première ligne pour debug
          if (lineCount === 0) {
            console.log('🔍 Debug première ligne:');
            console.log('  Date:', parts[0], parts[1], parts[2], parts[3]);
            console.log('  ElapsedSecs (parts[4]):', parts[4], '→', elapsedSecs, 's');
            console.log('  Altitude (parts[5]):', parts[5], 'km →', altitude, 'm au-dessus de la surface');
            console.log('  Latitude (parts[6]):', parts[6], '→', latitude, '°');
            console.log('  Longitude (parts[7]):', parts[7], '→', longitude, '°');
          }

          if (!isNaN(elapsedSecs) && !isNaN(altitude) && !isNaN(latitude) && !isNaN(longitude)) {
            dataPoints.push({
              elapsedSecs,
              altitude,
              latitude,
              longitude
            });

            minElapsed = Math.min(minElapsed, elapsedSecs);
            maxElapsed = Math.max(maxElapsed, elapsedSecs);
          }
          lineCount++;
        }
      }
    });

    // Trier par temps croissant
    dataPoints.sort((a, b) => a.elapsedSecs - b.elapsedSecs);

    // Ajouter les positions triées
    dataPoints.forEach(data => {
      const time = Cesium.JulianDate.addSeconds(gmatStartTime, data.elapsedSecs, new Cesium.JulianDate());
      const position = Cesium.Cartesian3.fromDegrees(data.longitude, data.latitude, data.altitude);
      satellitePositions.addSample(time, position);
      count++;
    });

    const firstTime = Cesium.JulianDate.addSeconds(gmatStartTime, minElapsed, new Cesium.JulianDate());
    const lastTime = Cesium.JulianDate.addSeconds(gmatStartTime, maxElapsed, new Cesium.JulianDate());

    console.log(`📊 ${count} points de trajectoire satellite chargés depuis GMAT`);

    // Parser les données de l'upperstage
    const upperstageLines = upperstageData.split('\n').slice(1);
    const upperstagePositions = new Cesium.SampledPositionProperty();

    let upperstageCount = 0;
    let upperstageDataPoints = [];

    upperstageLines.forEach(line => {
      if (line.trim()) {
        const parts = line.trim().split(/\s+/);
        // Format: Date(4 parts) ElapsedSecs Altitude FuelMass TotalMass
        if (parts.length >= 7) {
          const elapsedSecs = parseFloat(parts[4]);
          const altitudeKm = parseFloat(parts[5]);

          if (!isNaN(elapsedSecs) && !isNaN(altitudeKm)) {
            upperstageDataPoints.push({
              elapsedSecs,
              altitude: altitudeKm * 1000
            });
          }
        }
      }
    });

    // Trier par temps
    upperstageDataPoints.sort((a, b) => a.elapsedSecs - b.elapsedSecs);

    // Combiner avec les positions du satellite (même lat/lon, altitude de l'upperstage)
    upperstageDataPoints.forEach(upperData => {
      // Trouver la position satellite correspondante
      const satData = dataPoints.find(d => Math.abs(d.elapsedSecs - upperData.elapsedSecs) < 10);

      if (satData) {
        const time = Cesium.JulianDate.addSeconds(gmatStartTime, upperData.elapsedSecs, new Cesium.JulianDate());
        const position = Cesium.Cartesian3.fromDegrees(satData.longitude, satData.latitude, upperData.altitude);
        upperstagePositions.addSample(time, position);
        upperstageCount++;
      }
    });

    console.log(`📊 ${upperstageCount} points de trajectoire upperstage chargés depuis GMAT`);

    if (count > 0) {
      console.log(`📊 Période de disponibilité: ${Cesium.JulianDate.toIso8601(firstTime)} à ${Cesium.JulianDate.toIso8601(lastTime)}`);

      // Afficher le satellite GMAT avec availability
      const satEntity = viewer.entities.add({
        id: 'gmat-satellite',
        name: 'AFREELEO Satellite (GMAT)',
        availability: new Cesium.TimeIntervalCollection([
          new Cesium.TimeInterval({
            start: firstTime,
            stop: lastTime,
          }),
        ]),
        position: satellitePositions,
        orientation: new Cesium.VelocityOrientationProperty(satellitePositions),
        model: {
          uri: './satellite_modul.glb',
          minimumPixelSize: 128,
          maximumScale: 50000,
          scale: 5000,
        },
        label: {
          text: '🛰️ SATELLITE GMAT',
          font: '16pt monospace',
          fillColor: Cesium.Color.LIME,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
          pixelOffset: new Cesium.Cartesian2(0, -60),
        },
        path: {
          resolution: 1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.4,
            color: Cesium.Color.LIME,
          }),
          width: 6,
          show: true,
        },
      });

      console.log('✅ Trajectoire GMAT satellite chargée avec succès!');

      // L'upperstage GMAT n'est plus affiché - on utilise notre Stage 2 simulé
      if (upperstageCount > 0) {
        console.log(`📊 ${upperstageCount} points upperstage GMAT chargés (non affichés - utilisation du Stage 2 simulé)`);
      }

      // Le zoom automatique est désactivé - le suivi automatique de caméra gère les vues
    } else {
      console.error('❌ Aucun point de trajectoire chargé!');
    }

  } catch (error) {
    console.error('❌ Erreur lors du chargement des données GMAT:', error);
    console.error('Détails:', error.message);
  }
}

// ============================================
// PHASE 2: LARGAGE ET ASCENSION (DÉSACTIVÉ)
// ============================================

function createLaunchPhase(carrierFinalPosition) {
  const launchPositions = new Cesium.SampledPositionProperty();
  const phaseStart =
    MISSION_CONFIG.phaseDurations.pause +
    MISSION_CONFIG.phaseDurations.taxiing +
    MISSION_CONFIG.phaseDurations.takeoff +
    MISSION_CONFIG.phaseDurations.climb +
    MISSION_CONFIG.phaseDurations.cruise;
  const duration = MISSION_CONFIG.phaseDurations.launch;

  // Position finale exacte de l'avion porteur
  const carrierEndTime = Cesium.JulianDate.addSeconds(startTime, phaseStart, new Cesium.JulianDate());
  const carrierEnd = carrierFinalPosition.getValue(carrierEndTime);
  const carrierCart = Cesium.Cartographic.fromCartesian(carrierEnd);

  // Coordonnées de départ pour le lanceur
  const startLon = Cesium.Math.toDegrees(carrierCart.longitude);
  const startLat = Cesium.Math.toDegrees(carrierCart.latitude);
  const startAlt = carrierCart.height;

  for (let t = 0; t <= duration; t += 5) {
    const time = Cesium.JulianDate.addSeconds(
      startTime,
      phaseStart + t,
      new Cesium.JulianDate()
    );

    const progress = t / duration;

    // Ascension parabolique vers LEO
    const altitude = startAlt + (MISSION_CONFIG.targetAltitude - startAlt) * Math.pow(progress, 0.6);

    // Trajectoire courbe réaliste vers l'orbite (continuation depuis position avion)
    const angle = progress * Math.PI * 0.25;
    const distance = progress * 20; // Extension de la trajectoire
    const lon = startLon + distance * Math.cos(angle) * 0.5;
    const lat = startLat + distance * Math.sin(angle) * 0.3;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    launchPositions.addSample(time, position);
  }
  
  const launchVehicle = viewer.entities.add({
    id: "launch-vehicle",
    name: "Lanceur AFREELEO",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart,
          new Cesium.JulianDate()
        ),
        stop: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart + duration,
          new Cesium.JulianDate()
        ),
      }),
    ]),
    position: launchPositions,
    orientation: new Cesium.VelocityOrientationProperty(launchPositions),
    model: {
      uri: "./lanceur_satellite.glb",
      minimumPixelSize: 128,
      maximumScale: 50000,
      scale: 2000,
      show: true,
    },
    label: {
      text: "🚀 PHASE 2: ASCENSION VERS LEO",
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -50),
      fillColor: Cesium.Color.RED,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: Cesium.Color.RED,
      }),
      width: 6,
      trailTime: 300,
    },
  });
  
  return launchPositions;
}

// ============================================
// PHASE 3: ORBITE LEO
// ============================================

function createOrbitPhase(launchFinalPosition) {
  const orbitPositions = new Cesium.SampledPositionProperty();
  const phaseStart =
    MISSION_CONFIG.phaseDurations.pause +
    MISSION_CONFIG.phaseDurations.taxiing +
    MISSION_CONFIG.phaseDurations.takeoff +
    MISSION_CONFIG.phaseDurations.climb +
    MISSION_CONFIG.phaseDurations.cruise +
    MISSION_CONFIG.phaseDurations.launch;
  const duration = MISSION_CONFIG.phaseDurations.orbit;

  // Position finale exacte du lanceur
  const launchEndTime = Cesium.JulianDate.addSeconds(startTime, phaseStart, new Cesium.JulianDate());
  const launchEnd = launchFinalPosition.getValue(launchEndTime);
  const launchCart = Cesium.Cartographic.fromCartesian(launchEnd);

  // Coordonnées exactes du point d'injection (position finale du lanceur)
  const injectionLon = Cesium.Math.toDegrees(launchCart.longitude);
  const injectionLat = Cesium.Math.toDegrees(launchCart.latitude);

  const orbitalPeriod = 5400; // 90 minutes
  const inclination = Cesium.Math.toRadians(MISSION_CONFIG.orbitalInclination);

  // Rayons de l'orbite
  const radiusLon = 30;
  const radiusLat = 20 * Math.cos(inclination);

  // Le centre de l'orbite est décalé pour que le point d'injection soit sur l'orbite
  // À t=0, on veut être au point d'injection, donc angle=0 doit donner injectionLon
  // injectionLon = centerLon + radiusLon => centerLon = injectionLon - radiusLon
  const centerLon = injectionLon - radiusLon;
  const centerLat = injectionLat;

  for (let t = 0; t <= duration; t += 30) {
    const time = Cesium.JulianDate.addSeconds(
      startTime,
      phaseStart + t,
      new Cesium.JulianDate()
    );

    const angle = (t / orbitalPeriod) * Math.PI * 2;

    // Orbite circulaire inclinée commençant exactement au point d'injection
    const lon = centerLon + Math.cos(angle) * radiusLon;
    const lat = centerLat + Math.sin(angle) * radiusLat;
    const alt = MISSION_CONFIG.targetAltitude;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    orbitPositions.addSample(time, position);
  }
  
  viewer.entities.add({
    id: "satellite-leo",
    name: "AFREELEO Satellite",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart,
          new Cesium.JulianDate()
        ),
        stop: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart + duration,
          new Cesium.JulianDate()
        ),
      }),
    ]),
    position: orbitPositions,
    orientation: new Cesium.VelocityOrientationProperty(orbitPositions),
    model: {
      uri: "./satellite_modul.glb",
      minimumPixelSize: 64,
      maximumScale: 20000,
      scale: 5000,
    },
    label: {
      text: "🛰️ PHASE 3: ORBITE LEO (400km)",
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -50),
      fillColor: Cesium.Color.CYAN,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 1,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.CYAN,
      }),
      width: 4,
      leadTime: 0,
      trailTime: 5400,
    },
  });
  
  return orbitPositions;
}

// ============================================
// PHASE 4: DÉSORBITATION ECO-BRAKE
// ============================================

function createDeorbitPhase(orbitFinalPosition) {
  const deorbitPositions = new Cesium.SampledPositionProperty();
  const phaseStart =
    MISSION_CONFIG.phaseDurations.pause +
    MISSION_CONFIG.phaseDurations.taxiing +
    MISSION_CONFIG.phaseDurations.takeoff +
    MISSION_CONFIG.phaseDurations.climb +
    MISSION_CONFIG.phaseDurations.cruise +
    MISSION_CONFIG.phaseDurations.launch +
    MISSION_CONFIG.phaseDurations.orbit;
  const duration = MISSION_CONFIG.phaseDurations.deorbit;

  // Position finale exacte de l'orbite
  const orbitEndTime = Cesium.JulianDate.addSeconds(startTime, phaseStart, new Cesium.JulianDate());
  const orbitEnd = orbitFinalPosition.getValue(orbitEndTime);
  const orbitCart = Cesium.Cartographic.fromCartesian(orbitEnd);

  // Coordonnées de départ pour la désorbitation
  const startLon = Cesium.Math.toDegrees(orbitCart.longitude);
  const startLat = Cesium.Math.toDegrees(orbitCart.latitude);

  // Simulation spirale de désorbitation sur 48h
  const samplingInterval = 3600; // 1 sample par heure

  for (let t = 0; t <= duration; t += samplingInterval) {
    const time = Cesium.JulianDate.addSeconds(
      startTime,
      phaseStart + t,
      new Cesium.JulianDate()
    );

    const progress = t / duration;

    // Descente progressive en spirale depuis l'altitude orbitale
    const altitude = MISSION_CONFIG.targetAltitude * (1 - Math.pow(progress, 0.8));

    // Spirale accélérée partant de la position finale de l'orbite
    const spiralAngle = progress * Math.PI * 40; // Plusieurs tours
    const radius = 30 * (1 - progress * 0.5);

    const lon = startLon + Math.cos(spiralAngle) * radius;
    const lat = startLat + Math.sin(spiralAngle) * radius;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    deorbitPositions.addSample(time, position);
  }
  
  viewer.entities.add({
    id: "deorbiting-satellite",
    name: "Satellite en Désorbitation",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart,
          new Cesium.JulianDate()
        ),
        stop: Cesium.JulianDate.addSeconds(
          startTime,
          phaseStart + duration,
          new Cesium.JulianDate()
        ),
      }),
    ]),
    position: deorbitPositions,
    model: {
      uri: "./satellite_modul.glb",
      minimumPixelSize: 48,
      maximumScale: 15000,
      scale: 4000,
    },
    label: {
      text: "♻️ PHASE 4: DÉSORBITATION ECO-BRAKE (24-48h)",
      font: "14pt monospace",
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -50),
      fillColor: Cesium.Color.ORANGE,
      showBackground: true,
      backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
    },
    path: {
      resolution: 60,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Cesium.Color.ORANGE,
      }),
      width: 5,
      trailTime: 43200, // 12h de traînée visible
    },
    // Voile de traînée Eco-Brake (ellipsoïde pour simuler)
    ellipsoid: {
      radii: new Cesium.Cartesian3(5000, 5000, 5000),
      material: Cesium.Color.ORANGE.withAlpha(0.3),
    },
  });
}

// ============================================
// EXÉCUTION DE LA SIMULATION COMPLÈTE
// ============================================

// Créer la phase Boeing 747
const carrierPath = createCarrierPhase();

// Créer la trajectoire Falcon 9
const falcon9Path = createFalcon9Launch();

// Ajouter les satellites réels
addRealSatellites();

// Charger les trajectoires GMAT
loadGMATTrajectories();

// ============================================
// SYSTÈME DE SUIVI AUTOMATIQUE DE LA CAMÉRA
// ============================================

let currentTrackedEntity = null;
let cameraMode = 'auto'; // 'auto' ou 'free'

function updateCameraTracking() {
  if (cameraMode !== 'auto') return;

  const currentTime = viewer.clock.currentTime;
  const currentSeconds = Cesium.JulianDate.secondsDifference(currentTime, startTime);

  let targetEntity = null;

  // PHASE 1: Avion porteur (0s - 3164s)
  if (currentSeconds < 3164) {
    targetEntity = viewer.entities.getById("carrier-aircraft");
  }
  // PHASE 2: Falcon 9 complet (3164s - 3344s)
  else if (currentSeconds >= 3164 && currentSeconds < 3344) {
    targetEntity = viewer.entities.getById("falcon9-complete");
  }
  // PHASE 3: Stage 2 en montée (3344s - 3884s)
  else if (currentSeconds >= 3344 && currentSeconds < 3884) {
    targetEntity = viewer.entities.getById("falcon9-stage2");
  }
  // PHASE 4: Déploiement satellite (3884s - 3944s)
  else if (currentSeconds >= 3884 && currentSeconds < 3944) {
    targetEntity = viewer.entities.getById("falcon9-stage2");
  }
  // PHASE 5: Satellite en orbite (3944s+)
  else if (currentSeconds >= 3944) {
    targetEntity = viewer.entities.getById("gmat-satellite");
  }

  // Appliquer le suivi si l'entité cible a changé
  if (targetEntity && targetEntity !== currentTrackedEntity) {
    currentTrackedEntity = targetEntity;

    // Utiliser trackedEntity sans forcer lookAt - laisse l'utilisateur contrôler le zoom
    viewer.trackedEntity = targetEntity;

    console.log(`🎥 Caméra suit: ${targetEntity.name}`);
  }
}

// Mettre à jour le suivi de la caméra à chaque tick de l'horloge
viewer.clock.onTick.addEventListener(updateCameraTracking);

// Permettre à l'utilisateur de basculer entre auto et free
viewer.screenSpaceEventHandler.setInputAction(function() {
  if (cameraMode === 'auto') {
    cameraMode = 'free';
    viewer.trackedEntity = undefined;
    currentTrackedEntity = null;
    console.log("🎥 Mode caméra: LIBRE (appuyez sur C pour réactiver le suivi automatique)");
  } else {
    cameraMode = 'auto';
    updateCameraTracking();
    console.log("🎥 Mode caméra: AUTOMATIQUE");
  }
}, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);

// Position initiale de la caméra sur l'avion
const aircraft = viewer.entities.getById("carrier-aircraft");
if (aircraft) {
  setTimeout(function() {
    // Suivre l'avion sans forcer le zoom
    viewer.trackedEntity = aircraft;
    currentTrackedEntity = aircraft;

    // Dézoomer un peu pour avoir une meilleure vue
    viewer.zoomOut(5000);

    console.log("🎥 Caméra suit: Avion Porteur A380");
    console.log("💡 Utilisez la molette pour zoomer/dézoomer");
  }, 100);
} else {
  console.error("❌ Impossible de trouver l'avion carrier-aircraft");
}

// Afficher les informations de mission
console.log("=".repeat(60));
console.log("🚀 MISSION AFREELEO - AIR-LAUNCH SIMULATION");
console.log("=".repeat(60));
console.log("PHASE 1: AVION PORTEUR A380");
console.log(`  📍 Départ: Dakar Airport (${MISSION_CONFIG.runway.start.lat}°N, ${MISSION_CONFIG.runway.start.lon}°E)`);
console.log(`  🎯 Point de largage: Golfe de Guinée (-16.493°E, 3.336°N) à 12km`);
console.log(`  ⏱️  Temps jusqu'au largage: 3164s (52min 44s)`);
console.log("");
console.log("PHASE 2: LANCEMENT FALCON 9");
console.log(`  🚀 Largage fusée: T+3164s`);
console.log(`  💥 Séparation Stage 1: T+3344s (180s après largage) à ~120km`);
console.log(`  🛰️ Déploiement satellite: T+3884s (720s après largage) à 679.86km`);
console.log(`  📍 Coordonnées déploiement: 161.236°E, 0.151°N`);
console.log(`  🔥 Désorbitage Stage 2: T+3944-4544s (rentrée atmosphérique)`);
console.log(`  ⏱️  Durée totale mission Falcon 9: 1380s (23min)`);
console.log("");
console.log("DONNÉES GMAT:");
console.log(`  🌍 ${TLE_DATA.length} satellites réels en orbite ajoutés`);
console.log(`  📊 Trajectoires GMAT satellite + upperstage chargées`);
console.log("=".repeat(60));
console.log("▶️  Appuyez sur PLAY pour démarrer la simulation");
console.log("⏸️  Ajustez la vitesse avec le multiplicateur (recommandé: 10x)");
console.log("");
console.log("🎥 CONTRÔLES CAMÉRA:");
console.log("  • Suivi automatique des phases activé");
console.log("  • Clic molette: Basculer entre auto/libre");
console.log("  • Phase 1 (0-3164s): Suit l'avion A380");
console.log("  • Phase 2 (3164-3344s): Suit Falcon 9 Stage 1");
console.log("  • Phase 3 (3344-3884s): Suit Falcon 9 Stage 2");
console.log("  • Phase 4 (3884-3944s): Déploiement satellite");
console.log("  • Phase 5 (3944s+): Suit le satellite en orbite");
console.log("=".repeat(60));