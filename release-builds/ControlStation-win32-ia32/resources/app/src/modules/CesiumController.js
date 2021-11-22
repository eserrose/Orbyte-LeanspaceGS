window.CESIUM_BASE_URL =  require('path').join(__dirname, "src/static/Cesium/");
const Cesium = require('cesium');
const dayjs  = require('dayjs');
import { SatelliteManager } from "./SatelliteManager.js";

export function setCesiumApiKey(key){
    Cesium.Ion.defaultAccessToken = key;
}

export class CesiumController {
    constructor(options){

        this.viewer = new Cesium.Viewer('cesiumContainer', {
            terrainProvider: Cesium.createWorldTerrain(),
            imageryProvider: this.createImageryProvider().provider,
            baseLayerPicker: false,
            navigationHelpButton: false,
            navigationInstructionsInitiallyVisible: false,
            scene3DOnly: true,
            sceneModePicker: false,
            contextOptions: {
                webgl: {
                  alpha: true,
                },
              },
            ...options
            //imageryProvider: false //this is from ion. you should remove them and find something else (i.e. mapbox for completely free use)
          }); 

        this.viewer._cesiumWidget._creditContainer.style.display = "none"; //remove logo
        this.viewer.clock.shouldAnimate = true;
        this.viewer.scene.globe.enableLighting = true;
        this.viewer.scene.highDynamicRange = true;
        this.viewer.scene.maximumRenderTimeChange = 1 / 30;
        this.viewer.scene.requestRenderMode = true;

        // CesiumController config
        this.imageryProviders = ["OfflineHighres", "Ion"];
        this.terrainProviders = ["None", "Maptiler", "Cesium"];
        this.sceneModes = ["3D", "2D", "Columbus"];
        this.cameraModes = ["Fixed", "Inertial"];

         // Create Satellite Manager
        this.sats = new SatelliteManager(this.viewer);

        return this;
    }

    set sceneMode(sceneMode) {
        switch (sceneMode) {
          case "3D":
            this.viewer.scene.morphTo3D();
            break;
          case "2D":
            this.viewer.scene.morphTo2D();
            break;
          case "Columbus":
            this.viewer.scene.morphToColumbusView();
            break;
          default:
            console.error("Unknown scene mode");
        }
    }

    set imageryProvider(imageryProviderName) {
        if (!this.imageryProviders.includes(imageryProviderName)) {
          return;
        }
        const layers = this.viewer.scene.imageryLayers;
        layers.removeAll();
        layers.addImageryProvider(this.createImageryProvider(imageryProviderName).provider);
    }

    get imageryProvider(){
        return this.viewer._imageryProvider;
    }

    clearImageryLayers() {
        this.viewer.scene.imageryLayers.removeAll();
    }
    
    addImageryLayer(imageryProviderName, alpha) {
        if (!this.imageryProviders.includes(imageryProviderName)) {
            return;
        }

        const layers = this.viewer.scene.imageryLayers;
        const imagery = this.createImageryProvider(imageryProviderName);
        const layer = layers.addImageryProvider(imagery.provider);
        if (typeof alpha === "undefined") {
            layer.alpha = imagery.alpha;
        } else {
            layer.alpha = alpha;
        }
    }
    
    createImageryProvider(imageryProviderName = "Ion") {
        let provider;
        let alpha = 1;
        switch (imageryProviderName) {
         
          case "OfflineHighres":
            provider = new Cesium.TileMapServiceImageryProvider({
              url:  require('path').join(__dirname.substring(0, __dirname.indexOf("src")), "rsc/assets/imagery/NaturalEarthII"),
              maximumLevel: 5,
              credit: "Imagery courtesy Natural Earth",
            });
            break;
          
          case "Ion":
            provider = new Cesium.IonImageryProvider({ assetId : 2 });
            break;
          default:
            console.error("Unknown imagery provider");
        }
        return { provider, alpha };
    }

    set terrainProvider(terrainProviderName) {
        if (!this.terrainProviders.includes(terrainProviderName)) {
          return;
        }
    
        switch (terrainProviderName) {
          case "None":
            this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            break;
          case "Maptiler":
            this.viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
              url: "https://api.maptiler.com/tiles/terrain-quantized-mesh/?key=8urAyLJIrn6TeDtH0Ubh",
              credit: "<a href=\"https://www.maptiler.com/copyright/\" target=\"_blank\">© MapTiler</a> <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\">© OpenStreetMap contributors</a>",
              requestVertexNormals: true,
            });
            break;
          case "ArcGIS":
            this.viewer.terrainProvider = new Cesium.ArcGISTiledElevationTerrainProvider({
              url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
            });
            break;
          case "Cesium":
            this.viewer.terrainProvider = new Cesium.createWorldTerrain();
            break;
          default:
            console.error("Unknown terrain provider");
        }
    }

    set cameraMode(cameraMode) {
        switch (cameraMode) {
            case "Inertial":
            this.viewer.scene.postUpdate.addEventListener(this.cameraTrackEci);
            break;
            case "Fixed":
            this.viewer.scene.postUpdate.removeEventListener(this.cameraTrackEci);
            break;
            default:
            console.error("Unknown camera mode");
        }
    }

    disableControls(){
      let controller = this.viewer;
      controller.scene.screenSpaceCameraController.enableTranslate = false;  
      controller.scene.screenSpaceCameraController.enableTilt      = false; 
      controller.scene.screenSpaceCameraController.enableZoom      = false; 
    }

    setCamera(pos, zoom){ 
      let camera = this.viewer.camera;

      if(zoom > 0) camera.zoomIn(zoom)
      else camera.zoomOut(-zoom);

      camera.moveLeft(pos.x);
      camera.moveDown(pos.y);
    }

    cameraTrackEci(scene, time) {
        if (scene.mode !== Cesium.SceneMode.SCENE3D) {
          return;
        }
    
        const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
        if (Cesium.defined(icrfToFixed)) {
          const { camera } = scene;
          const offset = Cesium.Cartesian3.clone(camera.position);
          const transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
          camera.lookAtTransform(transform, offset);
        }
    }

    setTime(current, start = dayjs.utc(current).subtract(12, "hour").toISOString(), stop = dayjs.utc(current).add(7, "day").toISOString()) {
        this.viewer.clock.startTime = Cesium.JulianDate.fromIso8601(dayjs.utc(start).toISOString());
        this.viewer.clock.stopTime = Cesium.JulianDate.fromIso8601(dayjs.utc(stop).toISOString());
        this.viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(dayjs.utc(current).toISOString());
        if (typeof this.viewer.timeline !== "undefined") {
          this.viewer.timeline.updateFromClock();
          this.viewer.timeline.zoomTo(this.viewer.clock.startTime, this.viewer.clock.stopTime);
        }
    }

    setGroundStationFromLatLon(latlon) {
        const [latitude, longitude, height] = latlon.split(",");
        if (!latitude || !longitude) {
          return;
        }
        const coordinates = {};
        coordinates.longitude = parseFloat(longitude);
        coordinates.latitude  = parseFloat(latitude);
        coordinates.height = 0;
        if (height) {
          coordinates.height = parseFloat(height);
        }
        coordinates.cartesian = Cesium.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height);
        this.sats.setGroundStation(coordinates);
    }

    addSatellite(tle, name, properties){
      this.sats.enableTag(name)
      this.sats.addFromTle(tle, [name], properties)
    }

    trackEntity(name){
     this.sats.trackedSatellite = name;
    }

    drawGrid( divsP = 3, divsM = 6, numberOfDivisions = 2, color = Cesium.Color.WHITE){

      const {viewer} = this;

      if(viewer.sceneMode == Cesium.SceneMode.SCENE3D){
        let options = {arcType: Cesium.ArcType.RHUMB, granularity: 0};

        var parallels = makeParallelsRecursive(-90, 90, numberOfDivisions, color, options );
        var meridians = makeMeridiansRecursive(-180, 180, numberOfDivisions, color, options );
        meridians.push(meridian(180, options));
      
        var allLines = parallels.concat(meridians);
        allLines.forEach(function (line) { line.show = true; });
      }
      else {
        let lat = 90/divsP, lon = 180/divsM;
        for(let i = -divsP + 1; i < divsP; i++){
          parallel(lat*i, color, { arcType: Cesium.ArcType.NONE }).show = true;
          labelCoordinates(lat*i, -150, true)
        }
        for(let j = -divsM; j < divsM + 1 ; j++){
          meridian(lon*j, color,  { arcType: Cesium.ArcType.RHUMB}).show = true; //clampToGround: true, zIndex: 10, just one line (180deg) would render VERY weakly so I used 89.99 below instead of this...
          labelCoordinates(-90, lon*j, false);
        }
      }

      function parallel(latitude, color, options) {
        var name = "Parallel " + latitude;
        return viewer.entities.add({
          name: name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([ -180, latitude, -90, latitude, 0, latitude, 90, latitude, 180, latitude]),
            width: 1,
            material: new Cesium.PolylineDashMaterialProperty({color: color}),
            depthFailMaterial: color,
            ...options
          }
        });
      }

      function meridian(longitude, color, options) {
        var name = "Meridian " + longitude;
        return viewer.entities.add({
          name: name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([longitude, 89.99, longitude, 0, longitude, -89.99]),
            width: 1,
            material: new Cesium.PolylineDashMaterialProperty({color: color}),
            depthFailMaterial: color,
            ...options
          },
        });
      }

      function makeParallelsRecursive(minLatitude, maxLatitude, depth, color, options) {
        var result = [];
        var midpoint = (minLatitude + maxLatitude) / 2;
        result.push(parallel(midpoint, color, options));
      
        if (depth > 0) {
          var southernLines = makeParallelsRecursive(
            minLatitude,
            midpoint,
            depth - 1,
            color
          );
          var northernLines = makeParallelsRecursive(
            midpoint,
            maxLatitude,
            depth - 1,
            color
          );
          result = southernLines.concat(result, northernLines);
        }
    
        return result;
      }
      
      function makeMeridiansRecursive(minLongitude, maxLongitude, depth, color, options) {
        var result = [];
        var midpoint = (minLongitude + maxLongitude) / 2;
        result.push(meridian(midpoint, color, options));
      
        if (depth > 0) {
          var westernLines = makeMeridiansRecursive(
            minLongitude,
            midpoint,
            depth - 1,
            color
          );
          var easternLines = makeMeridiansRecursive(
            midpoint,
            maxLongitude,
            depth - 1,
            color
          );
          result = westernLines.concat(result, easternLines);
        }
      
        return result;
      }

      function labelCoordinates(lat, lon, horizontal) {
        return viewer.entities.add({ 
          name:  (horizontal? "lat": "lon") +  (horizontal? lat: lon) + "label",
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          label: {
            text:  (horizontal? lat: lon) + "°",
            showBackground: true,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            font: "10px monospace",
          }
        });
      }
    }
}