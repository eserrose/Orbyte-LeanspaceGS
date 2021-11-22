class TimeUnit {
    constructor(name, abbv) {
        this.name = name;
        this.abbv = abbv;
    }
}

const TimeUnits = [
    new TimeUnit("Modified Julian Date", "ModJDate"),
    new TimeUnit("Jul Date Offset", "JDateOff"),
    new TimeUnit("Julian UTC", "UTCJ"),
    new TimeUnit("Julian LCL", "LCLJ"),
    new TimeUnit("Julian4 UTC", "UTCJFOUR"),
    new TimeUnit("Julian TAI", "TAIJ"),
    new TimeUnit("Gregorian UTC", "UTCG"),
    new TimeUnit("Gregorian LCL", "LCLG"),
    new TimeUnit("Gregorian TDT", "TDTG"),
    new TimeUnit("Gregorian TBD", "TBDG"),
    new TimeUnit("Gregorian TAI", "TAIG"),
    new TimeUnit("Gregorian GPS Time", "GPSG"),
    new TimeUnit("GPS Time", "GPS"),
    new TimeUnit("GPS Z Count", "GPSZ"),
    new TimeUnit("Epoch Minutes", "EpMin"),
    new TimeUnit("Epoch Hours", "EpHr"),
    new TimeUnit("Epoch Days", "EpDay"),
    new TimeUnit("Epoch Years", "EpYr"),
    new TimeUnit("YYDDD.ddd", "YYDDD"),
    new TimeUnit("YYYYMMDD.ddd", "YYYYMMDD"),
    new TimeUnit("YYYY/MM/DD Time", "YYYY/MM/DD"),
    new TimeUnit("YYYYDDD.hhmmss", "YYYYDDD"),
    new TimeUnit("YYYY:MM:DD:HH:MM:SS.sss", "YYYY:MM:DD"),
    new TimeUnit("DD/MM/YYYY Time", "DD/MM/YYYY"),
    new TimeUnit("Mission Elapsed", "MisElap"),
    new TimeUnit("GMT System", "GMT"),
    new TimeUnit("Earth Canonical Time", "EarthEp TU"),
    new TimeUnit("Sun Canonical Time", "SunEp TU"),
    new TimeUnit("ISO8601 YMD UTC", "ISO-YMD"),
    new TimeUnit("ISO8601 YD UTC", "ISO-YD")
]

export {TimeUnits}