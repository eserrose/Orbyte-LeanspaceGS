const KeplerOptions = {
    //semimajor axis OR apogee radius OR apogee altitude OR period OR mean motion
    //ecc OR perigee radius OR perigee alt
    //inc
    //arg of perigee
    //Right ascension OR lon of asc node
    //True anomaly or mean anomaly or ecc anomaly or arg of lat or time past perigee or time pas AN
}

const CartesianOptions = {
    //x,y,z,vx,vy,vz
}

const EquinoctialOptions = {
    //semimajor axis OR mean motion,
    //h
    //k
    //p
    //q
    //mean lon
    //formulation (posigrade/retrograde)
}

const DelanuayOptions = {
    //l-mean anomaly
    //g-arg of perigee
    //h-raan
    //L
    //G
    //H
}

const SphericalOptions = {
    //ra
    //dec
    //radius
    //hor fpa OR ver fpa
    //azimuth
    //velocity
}

const MixedSphericalOptions = {
    //lon
    //lat
    //alt
    //hor fpa OR ver fpa
    //azimuth
    //velocity
}

class CoordinateType{
    constructor(name, options) {
        this.name    = name;
        this.options = options;
    }
};

class CoordinateSystem{
    constructor(name) {
        this.name = name;
    }
};

const ICRF              = new CoordinateSystem("ICRF");
const MeanOfDate        = new CoordinateSystem("MeanOfDate");
const MeanOfEpoch       = new CoordinateSystem("MeanOfEpoch");
const TrueOfDate        = new CoordinateSystem("TrueOfDate");
const TrueOfEpoch       = new CoordinateSystem("TrueOfEpoch");
const B1950             = new CoordinateSystem("B1950");
const TEMEOfEpoch       = new CoordinateSystem("TEMEOfEpoch");
const TEMEOfDate        = new CoordinateSystem("TEMEOfDate");
const AlignmentAtEpoch  = new CoordinateSystem("AlignmentAtEpoch");
const J2000             = new CoordinateSystem("J2000");

const Classical         = new CoordinateType("Classical", KeplerOptions);
const Cartesian         = new CoordinateType("Cartesian", CartesianOptions);
const Equinoctial       = new CoordinateType("Equinoctial", EquinoctialOptions);
const Delanuay          = new CoordinateType("Delanuay", DelanuayOptions);
const Spherical         = new CoordinateType("Spherical",SphericalOptions);
const MixedSpherical    = new CoordinateType("Mixed Spherical", MixedSphericalOptions);

const CoordinateSystems = {ICRF, MeanOfDate, MeanOfEpoch, TrueOfDate, TrueOfEpoch, B1950, TEMEOfEpoch, TEMEOfDate, AlignmentAtEpoch, J2000};
const CoordinateTypes   = {Classical, Cartesian, Equinoctial, Delanuay, Spherical, MixedSpherical};

export {CoordinateSystems, CoordinateTypes};