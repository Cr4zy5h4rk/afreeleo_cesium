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
  carrierAltitude: 12000, // 12 km
  targetAltitude: 400000, // 400 km LEO
  orbitalInclination: 14.7, // degrés
  carrierSpeed: 250, // m/s
  phaseDurations: {
    carrier: 180, // 3 minutes
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

// Site de lancement Dakar - Aéroport
viewer.entities.add({
  name: "Dakar Launch Site - AFREELEO",
  position: Cesium.Cartesian3.fromDegrees(
    MISSION_CONFIG.launchSite.lon,
    MISSION_CONFIG.launchSite.lat,
    0 // Au niveau du sol
  ),
  label: {
    text: "🛫 DAKAR LAUNCH SITE - AIRPORT",
    font: "16pt monospace",
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 3,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -100),
    fillColor: Cesium.Color.YELLOW,
    showBackground: true,
    backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
  },
  model: {
    uri: "./airport.glb",
    minimumPixelSize: 64,
    maximumScale: 5000,
    scale: 10,
  },
  point: {
    pixelSize: 20,
    color: Cesium.Color.YELLOW,
    outlineColor: Cesium.Color.ORANGE,
    outlineWidth: 3,
  },
});

// Configuration temporelle
const startTime = Cesium.JulianDate.now();
const totalMissionTime =
  MISSION_CONFIG.phaseDurations.carrier +
  MISSION_CONFIG.phaseDurations.launch +
  MISSION_CONFIG.phaseDurations.orbit +
  MISSION_CONFIG.phaseDurations.deorbit;

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
  const duration = MISSION_CONFIG.phaseDurations.carrier;

  for (let t = 0; t <= duration; t += 5) {
    const time = Cesium.JulianDate.addSeconds(startTime, t, new Cesium.JulianDate());

    // Trajectoire: décollage vers l'ouest (mer/océan Atlantique) et montée vers 12km
    const progress = t / duration;

    // Phase de décollage et montée progressive
    let altitude, lon, lat;

    if (progress < 0.1) {
      // Phase de décollage (0-10%): montée rapide initiale
      const takeoffProgress = progress / 0.1;
      altitude = takeoffProgress * 1500; // Montée à 1.5km
      lon = MISSION_CONFIG.launchSite.lon - takeoffProgress * 0.5; // Vers l'ouest
      lat = MISSION_CONFIG.launchSite.lat + takeoffProgress * 0.1; // Légère déviation nord
    } else {
      // Phase de croisière (10-100%): montée progressive vers 12km
      const cruiseProgress = (progress - 0.1) / 0.9;
      altitude = 1500 + cruiseProgress * (MISSION_CONFIG.carrierAltitude - 1500);

      // Trajectoire réaliste vers l'ouest au-dessus de l'océan
      const distance = cruiseProgress * 150; // 150 km vers l'ouest
      lon = MISSION_CONFIG.launchSite.lon - distance * 0.06; // Vers l'ouest (négatif)
      lat = MISSION_CONFIG.launchSite.lat + distance * 0.02; // Légère inclinaison nord-ouest
    }

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  
  const carrier = viewer.entities.add({
    id: "carrier-aircraft",
    name: "Avion Porteur A380",
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: startTime,
        stop: Cesium.JulianDate.addSeconds(
          startTime,
          duration,
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
      minimumPixelSize: 32,
      maximumScale: 2000,
      scale: 50,
    },
    label: {
      text: "✈️ PHASE 1: AVION PORTEUR (12km)",
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
// PHASE 2: LARGAGE ET ASCENSION
// ============================================

function createLaunchPhase(carrierFinalPosition) {
  const launchPositions = new Cesium.SampledPositionProperty();
  const phaseStart = MISSION_CONFIG.phaseDurations.carrier;
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
    MISSION_CONFIG.phaseDurations.carrier + MISSION_CONFIG.phaseDurations.launch;
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
    MISSION_CONFIG.phaseDurations.carrier +
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

// Créer toutes les phases
const carrierPath = createCarrierPhase();
const launchPath = createLaunchPhase(carrierPath);
const orbitPath = createOrbitPhase(launchPath);
createDeorbitPhase(orbitPath);

// Ajouter les satellites réels
addRealSatellites();

// Caméra initiale sur Dakar
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    MISSION_CONFIG.launchSite.lon,
    MISSION_CONFIG.launchSite.lat,
    5000000
  ),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-60),
    roll: 0.0,
  },
  duration: 3,
});

// Afficher les informations de mission
console.log("=".repeat(60));
console.log("🚀 AFREELEO MISSION SIMULATOR - INITIALISÉ");
console.log("=".repeat(60));
console.log(`📍 Site de lancement: Dakar (${MISSION_CONFIG.launchSite.lat}°N, ${MISSION_CONFIG.launchSite.lon}°E)`);
console.log(`✈️  Phase 1: Avion Porteur - ${MISSION_CONFIG.phaseDurations.carrier}s`);
console.log(`🚀 Phase 2: Ascension - ${MISSION_CONFIG.phaseDurations.launch}s`);
console.log(`🛰️  Phase 3: Orbite LEO - ${MISSION_CONFIG.phaseDurations.orbit}s`);
console.log(`♻️  Phase 4: Désorbitation - ${MISSION_CONFIG.phaseDurations.deorbit}s (${MISSION_CONFIG.phaseDurations.deorbit / 3600}h)`);
console.log(`🌍 ${TLE_DATA.length} satellites réels en orbite ajoutés`);
console.log("=".repeat(60));
console.log("▶️  Appuyez sur PLAY pour démarrer la simulation");
console.log("⏸️  Ajustez la vitesse avec le multiplicateur");
console.log("=".repeat(60));