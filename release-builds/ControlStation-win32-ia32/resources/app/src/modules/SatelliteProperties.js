const Cesium = require('cesium');
import OrbitSGP4 from './Orbit/SGP4.js';

export class SatelliteProperties {
  constructor(props, tags = []) {

    this.propogator = props.propogator;
    switch(this.propogator){
      case "SGP4":
        this.name = props.tle.split("\n")[0].trim();
        if (props.tle.startsWith("0 ")) {
          this.name = this.name.substring(2);
        }
        this.orbit = new OrbitSGP4(this.name, props.tle);
        this.satnum = this.orbit.satnum;
      break;
    }
    
    this.tags = tags;
    this.color = props.color;
    this.scale = props.scale;

    this.groundStationPosition = undefined;
    this.passes = [];
    this.passInterval = undefined;
    this.passIntervals = new Cesium.TimeIntervalCollection();
  }

  hasTag(tag) {
    return this.tags.includes(tag);
  }

  addTags(tags) {
    this.tags = [...new Set(this.tags.concat(tags))];
  }

  position(time) {
    return this.sampledPosition.getValue(time);
  }

  positionCartographic(time) {
    return Cesium.Cartographic.fromCartesian(this.position(time));
  }

  positionCartographicDegrees(time) {
    const cartographic = this.positionCartographic(time);
    const cartographicDegrees = {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height,
    };
    return cartographicDegrees;
  }

  get height() {
    return this.cartographic.height;
  }

  computePositionCartesian3(julianDate) {
    // Check if Position for current timestap is already computed
    if (typeof this.lastPosition !== "undefined" && Cesium.JulianDate.compare(this.lastDate, julianDate) === 0) {
      return this.lastPosition;
    }

    this.lastDate = julianDate;
    const { longitude, latitude, height } = this.orbit.positionGeodetic(Cesium.JulianDate.toDate(julianDate));
    this.lastPosition = Cesium.Cartesian3.fromRadians(longitude, latitude, height);
    // console.log(`TS ${julianDate} POS ${this.lastPosition}`);

    return this.lastPosition;
  }

  computePositionCartographicDegrees(julianDate) {
    const { longitude, latitude, height, velocity } = this.orbit.positionGeodeticWithVelocity(Cesium.JulianDate.toDate(julianDate));
    const cartographicDegrees = {
      longitude: Cesium.Math.toDegrees(longitude),
      latitude: Cesium.Math.toDegrees(latitude),
      height,
      velocity,
    };
    return cartographicDegrees;
  }

  positionInertial(time, constprop = false) {
    const eci = this.orbit.positionECI(Cesium.JulianDate.toDate(time));
    const position = new Cesium.Cartesian3(eci.x * 1000, eci.y * 1000, eci.z * 1000);
    if (constprop) {
      return new Cesium.ConstantPositionProperty(position, Cesium.ReferenceFrame.INERTIAL);
    }
    return position;
  }

  createSampledPosition(clock, callback) {
    let lastUpdated;
    lastUpdated = this.updateSampledPosition(clock.currentTime);
    callback(this.sampledPosition);
    clock.onTick.addEventListener((onTickClock) => {
      const dt = Math.abs(Cesium.JulianDate.secondsDifference(onTickClock.currentTime, lastUpdated)); 
      if (dt >= 60 * 15) {  //todo: Set when should new positions be calculated here
        lastUpdated = this.updateSampledPosition(onTickClock.currentTime); 
        callback(this.sampledPosition);
      }
    });
  }

  updateSampledPosition(julianDate, samplesFwd = 240, samplesBwd = 120, interval = 30) {//todo: set params
    const sampledPosition = new Cesium.SampledPositionProperty();
    sampledPosition.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    sampledPosition.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    sampledPosition.setInterpolationOptions({
      interpolationDegree: 5,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    });

    const sampledPositionInertial = new Cesium.SampledPositionProperty(Cesium.ReferenceFrame.INERTIAL);
    sampledPositionInertial.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    sampledPositionInertial.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
    sampledPositionInertial.setInterpolationOptions({
      interpolationDegree: 5,
      interpolationAlgorithm: Cesium.LagrangePolynomialApproximation,
    });

    // Spread sampledPosition updates
    const randomOffset = Math.random() * 60 * 15; //todo: ??
    const reference = Cesium.JulianDate.addSeconds(julianDate, randomOffset, new Cesium.JulianDate());

    const startTime = -samplesBwd * interval;
    const stopTime = samplesFwd * interval;
    for (let time = startTime; time <= stopTime; time += interval) {
      const timestamp = Cesium.JulianDate.addSeconds(reference, time, new Cesium.JulianDate());
      const position = this.computePositionCartesian3(timestamp);
      sampledPosition.addSample(timestamp, position);

      const positionInertial = this.positionInertial(timestamp);
      sampledPositionInertial.addSample(timestamp, positionInertial);

      // Show computed sampled position
      // viewer.entities.add({
      //  position : position,
      //  point : {
      //    pixelSize : 8,
      //    color : Cesium.Color.TRANSPARENT,
      //    outlineColor : Cesium.Color.YELLOW,
      //    outlineWidth : 3
      //  }
      // });
    }

    this.sampledPosition = sampledPosition;
    this.sampledPositionInertial = sampledPositionInertial;
    return reference;
  }

  groundTrack(julianDate, samplesFwd = 0, samplesBwd = 120, interval = 30) {
    const groundTrack = [];

    const startTime = -samplesBwd * interval;
    const stopTime = samplesFwd * interval;
    for (let time = startTime; time <= stopTime; time += interval) {
      const timestamp = Cesium.JulianDate.addSeconds(julianDate, time, new Cesium.JulianDate());
      const cartographic = this.positionCartographic(timestamp);
      const groudPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 1000);
      groundTrack.push(groudPosition);
    }
    return groundTrack;
  }

  get groundStationAvailable() {
    return (typeof this.groundStationPosition !== "undefined");
  }

  updatePasses(time) {
    if (!this.groundStationAvailable) {
      return false;
    }
    // Check if still inside of current pass interval
    if (typeof this.passInterval !== "undefined" &&
        Cesium.TimeInterval.contains(new Cesium.TimeInterval({ start: this.passInterval.start, stop: this.passInterval.stop }), time)) {
      return false;
    }
    this.passInterval = {
      start: Cesium.JulianDate.addDays(time, -1, Cesium.JulianDate.clone(time)),
      stop: Cesium.JulianDate.addDays(time, 1, Cesium.JulianDate.clone(time)),
      stopPrediction: Cesium.JulianDate.addDays(time, 4, Cesium.JulianDate.clone(time)),
    };

    const passes = this.orbit.computePassesElevation(
      this.groundStationPosition,
      Cesium.JulianDate.toDate(this.passInterval.start),
      Cesium.JulianDate.toDate(this.passInterval.stopPrediction),
    );
    if (!passes) {
      return false;
    }

    this.passes = passes;
    this.computePassIntervals();
    return true;
  }

  clearPasses() {
    this.passInterval = undefined;
    this.passes = [];
    this.passIntervals = new Cesium.TimeIntervalCollection();
  }

  computePassIntervals() {
    const passIntervalArray = this.passes.map((pass) => {
      const startJulian = Cesium.JulianDate.fromDate(new Date(pass.start));
      const endJulian = Cesium.JulianDate.fromDate(new Date(pass.end));
      return new Cesium.TimeInterval({
        start: startJulian,
        stop: endJulian,
      });
    });
    this.passIntervals = new Cesium.TimeIntervalCollection(passIntervalArray);
  }
}