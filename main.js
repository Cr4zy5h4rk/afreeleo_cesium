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

// Configuration temporelle
const startTime = Cesium.JulianDate.now();
const totalMissionTime =
  MISSION_CONFIG.phaseDurations.pause +
  MISSION_CONFIG.phaseDurations.taxiing +
  MISSION_CONFIG.phaseDurations.takeoff +
  MISSION_CONFIG.phaseDurations.climb +
  MISSION_CONFIG.phaseDurations.cruise +
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

  // Calcul de la direction de la piste
  const runwayHeading = Math.atan2(
    MISSION_CONFIG.runway.end.lat - MISSION_CONFIG.runway.start.lat,
    MISSION_CONFIG.runway.end.lon - MISSION_CONFIG.runway.start.lon
  );

  let currentTime = 0;

  // PHASE 0: PAUSE (Avion à vitesse très faible au début de la piste)
  const pauseDuration = MISSION_CONFIG.phaseDurations.pause;
  for (let t = 0; t <= pauseDuration; t += 1) {
    const time = Cesium.JulianDate.addSeconds(startTime, currentTime + t, new Cesium.JulianDate());
    const progress = t / pauseDuration;

    // Avance très lentement (5% de la piste pendant la pause)
    const lon = MISSION_CONFIG.runway.start.lon +
                (MISSION_CONFIG.runway.end.lon - MISSION_CONFIG.runway.start.lon) * progress * 0.05;
    const lat = MISSION_CONFIG.runway.start.lat +
                (MISSION_CONFIG.runway.end.lat - MISSION_CONFIG.runway.start.lat) * progress * 0.05;
    const altitude = 0;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  currentTime += pauseDuration;

  // PHASE 1: TAXIING (Roulage au sol sur la piste)
  const taxiingDuration = MISSION_CONFIG.phaseDurations.taxiing;
  for (let t = 0; t <= taxiingDuration; t += 1) {
    const time = Cesium.JulianDate.addSeconds(startTime, currentTime + t, new Cesium.JulianDate());
    const progress = t / taxiingDuration;

    // Interpolation linéaire entre début et fin de piste
    const lon = MISSION_CONFIG.runway.start.lon +
                (MISSION_CONFIG.runway.end.lon - MISSION_CONFIG.runway.start.lon) * progress;
    const lat = MISSION_CONFIG.runway.start.lat +
                (MISSION_CONFIG.runway.end.lat - MISSION_CONFIG.runway.start.lat) * progress;
    const altitude = 0; // Au sol

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  currentTime += taxiingDuration;

  // PHASE 2: TAKEOFF (Décollage)
  const takeoffDuration = MISSION_CONFIG.phaseDurations.takeoff;
  const rotationSpeed = 80; // m/s vitesse de rotation
  const takeoffAngle = 15; // Angle de décollage en degrés

  for (let t = 0; t <= takeoffDuration; t += 1) {
    const time = Cesium.JulianDate.addSeconds(startTime, currentTime + t, new Cesium.JulianDate());
    const progress = t / takeoffDuration;

    // Distance parcourue pendant le décollage (accélération)
    const distance = progress * 5; // 5 km de distance horizontale
    const lon = MISSION_CONFIG.runway.end.lon + Math.cos(runwayHeading) * distance * 0.01;
    const lat = MISSION_CONFIG.runway.end.lat + Math.sin(runwayHeading) * distance * 0.01;

    // Altitude avec courbe de décollage réaliste
    const altitude = Math.pow(progress, 1.5) * 3000; // Montée progressive jusqu'à 3km

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  currentTime += takeoffDuration;

  // PHASE 3: CLIMB (Montée vers 12km avec début de virage)
  const climbDuration = MISSION_CONFIG.phaseDurations.climb;
  const climbStartLon = MISSION_CONFIG.runway.end.lon + Math.cos(runwayHeading) * 0.05;
  const climbStartLat = MISSION_CONFIG.runway.end.lat + Math.sin(runwayHeading) * 0.05;

  // Destination finale
  const targetLon = 1.194030;
  const targetLat = -13.346754;

  for (let t = 0; t <= climbDuration; t += 2) {
    const time = Cesium.JulianDate.addSeconds(startTime, currentTime + t, new Cesium.JulianDate());
    const progress = t / climbDuration;

    // Début du virage progressif vers la destination
    const turnProgress = Math.pow(progress, 2); // Virage progressif
    const distance = progress * 30; // 30 km

    // Calcul de la direction vers la cible
    const deltaLon = targetLon - climbStartLon;
    const deltaLat = targetLat - climbStartLat;
    const targetHeading = Math.atan2(deltaLat, deltaLon);

    // Interpolation progressive entre le cap de piste et le cap vers la cible
    const currentHeading = runwayHeading + (targetHeading - runwayHeading) * turnProgress;

    const lon = climbStartLon + Math.cos(currentHeading) * distance * 0.01;
    const lat = climbStartLat + Math.sin(currentHeading) * distance * 0.01;

    // Montée progressive de 3km à 12km
    const altitude = 3000 + progress * (MISSION_CONFIG.carrierAltitude - 3000);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  currentTime += climbDuration;

  // PHASE 4: CRUISE (Croisière vers la destination avec courbe de Bézier)
  const cruiseDuration = MISSION_CONFIG.phaseDurations.cruise;
  const cruiseStartLon = climbStartLon + Math.cos(runwayHeading + (Math.atan2(targetLat - climbStartLat, targetLon - climbStartLon) - runwayHeading)) * 0.3;
  const cruiseStartLat = climbStartLat + Math.sin(runwayHeading + (Math.atan2(targetLat - climbStartLat, targetLon - climbStartLon) - runwayHeading)) * 0.3;

  // Points de contrôle pour une courbe de Bézier cubique réaliste
  const deltaLon = targetLon - cruiseStartLon;
  const deltaLat = targetLat - cruiseStartLat;

  // Point de contrôle 1: 1/3 du chemin avec légère déviation
  const cp1Lon = cruiseStartLon + deltaLon * 0.33 - 2;
  const cp1Lat = cruiseStartLat + deltaLat * 0.33 + 1;

  // Point de contrôle 2: 2/3 du chemin avec légère déviation opposée
  const cp2Lon = cruiseStartLon + deltaLon * 0.67 - 1;
  const cp2Lat = cruiseStartLat + deltaLat * 0.67 - 0.5;

  for (let t = 0; t <= cruiseDuration; t += 5) {
    const time = Cesium.JulianDate.addSeconds(startTime, currentTime + t, new Cesium.JulianDate());
    const progress = t / cruiseDuration;

    // Courbe de Bézier cubique pour un virage fluide et réaliste
    const t1 = 1 - progress;
    const lon = Math.pow(t1, 3) * cruiseStartLon +
                3 * Math.pow(t1, 2) * progress * cp1Lon +
                3 * t1 * Math.pow(progress, 2) * cp2Lon +
                Math.pow(progress, 3) * targetLon;

    const lat = Math.pow(t1, 3) * cruiseStartLat +
                3 * Math.pow(t1, 2) * progress * cp1Lat +
                3 * t1 * Math.pow(progress, 2) * cp2Lat +
                Math.pow(progress, 3) * targetLat;

    const altitude = MISSION_CONFIG.carrierAltitude; // Altitude constante

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
    carrierPositions.addSample(time, position);
  }
  
  const totalCarrierDuration =
    pauseDuration + taxiingDuration + takeoffDuration + climbDuration + cruiseDuration;

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
        if (currentSeconds <= pauseDuration) {
          return "⏸️ PAUSE - Préparation au décollage";
        } else if (currentSeconds <= pauseDuration + taxiingDuration) {
          return "🛬 TAXIING - Roulage sur piste";
        } else if (currentSeconds <= pauseDuration + taxiingDuration + takeoffDuration) {
          return "🛫 TAKEOFF - Décollage";
        } else if (currentSeconds <= pauseDuration + taxiingDuration + takeoffDuration + climbDuration) {
          return "⬆️ CLIMB - Montée vers 12km";
        } else {
          return "✈️ CRUISE - Croisière à 12km";
        }
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

    // Utiliser le même temps de départ que la simulation Boeing
    const gmatStartTime = startTime.clone();

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
          leadTime: 3600,
          trailTime: 3600,
        },
      });

      console.log('✅ Trajectoire GMAT satellite chargée avec succès!');

      // Afficher l'upperstage si disponible
      if (upperstageCount > 0) {
        viewer.entities.add({
          id: 'gmat-upperstage',
          name: 'Falcon 9 Second Stage (GMAT)',
          availability: new Cesium.TimeIntervalCollection([
            new Cesium.TimeInterval({
              start: firstTime,
              stop: lastTime,
            }),
          ]),
          position: upperstagePositions,
          orientation: new Cesium.CallbackProperty(function (time, result) {
            const velocity = new Cesium.VelocityOrientationProperty(upperstagePositions).getValue(time);
            if (velocity) {
              // Rotation de 90 degrés autour de l'axe Z pour aligner avec la trajectoire
              const rotationY = Cesium.Quaternion.fromAxisAngle(
                Cesium.Cartesian3.UNIT_Y,
                Cesium.Math.toRadians(90)
              );
              return Cesium.Quaternion.multiply(velocity, rotationY, result);
            }
            return result;
          }, false),
          model: {
            uri: './falcon_9_second_stage.glb',
            minimumPixelSize: 64,
            maximumScale: 20000,
            scale: 2000,
          },
          label: {
            text: '🚀 FALCON 9 STAGE 2',
            font: '14pt monospace',
            fillColor: Cesium.Color.ORANGE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.8),
            pixelOffset: new Cesium.Cartesian2(0, -60),
          },
          path: {
            resolution: 1,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.4,
              color: Cesium.Color.ORANGE,
            }),
            width: 5,
            leadTime: 3600,
            trailTime: 3600,
          },
        });

        console.log('✅ Trajectoire GMAT Falcon 9 second stage chargée avec succès!');
      }

      // Zoomer sur le satellite après 2 secondes
      setTimeout(() => {
        // Tester avec le premier temps disponible
        const testPos = satellitePositions.getValue(firstTime);
        console.log('📍 Position au premier temps:', testPos);

        if (testPos) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(161.2363, 0.1509, 700000),
            duration: 3,
            complete: () => {
              console.log('📍 Caméra positionnée sur le satellite GMAT');
              console.log('💡 Le satellite apparaîtra quand tu démarres la simulation');
            }
          });
        }
      }, 2000);
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

// Créer uniquement la phase Boeing 747
const carrierPath = createCarrierPhase();

// Ajouter les satellites réels
addRealSatellites();

// Charger les trajectoires GMAT
loadGMATTrajectories();

// Caméra libre - tu peux la bouger comme tu veux
const aircraft = viewer.entities.getById("carrier-aircraft");

if (aircraft) {
  // Positionner la caméra initiale derrière l'avion
  setTimeout(function() {
    const position = aircraft.position.getValue(viewer.clock.currentTime);
    if (position) {
      viewer.camera.lookAt(
        position,
        new Cesium.HeadingPitchRange(
          0,
          Cesium.Math.toRadians(-20),
          500
        )
      );
      // Libérer la caméra après le positionnement initial
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    }
  }, 100);
} else {
  console.error("❌ Impossible de trouver l'avion carrier-aircraft");
}

// Afficher les informations de mission
console.log("=".repeat(60));
console.log("✈️ BOEING 747 FLIGHT SIMULATOR");
console.log("=".repeat(60));
console.log(`📍 Départ: Dakar Airport (${MISSION_CONFIG.runway.start.lat}°N, ${MISSION_CONFIG.runway.start.lon}°E)`);
console.log(`🎯 Destination: 1.194030°E, 13.346754°S (Afrique centrale)`);
console.log(`🌍 ${TLE_DATA.length} satellites réels en orbite ajoutés`);
console.log("=".repeat(60));
console.log("▶️  Appuyez sur PLAY pour démarrer la simulation");
console.log("⏸️  Ajustez la vitesse avec le multiplicateur");
console.log("=".repeat(60));