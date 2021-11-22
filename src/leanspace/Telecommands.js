import * as LS from './ls.js'

const delay = ms => new Promise(res => setTimeout(res, ms));
const getNow = (time = 5) => {
    let date = new Date();
    date.setSeconds(date.getSeconds() + time);
    return date.toISOString();
}

const factoryReset = time => {
    return LS.sendTelecommand("factory reset", time, {"boolean_value":true, "name": "reset"} )
}

const thrusterPlusOn = time => {
    return LS.sendTelecommand("change_plus_x_thruster_pos", time, {"boolean_value":true, "name": "plus_x_thruster_pos"} )
}

const thrusterPlusOff = time => {
    return LS.sendTelecommand("change_plus_x_thruster_pos", time, {"boolean_value":false, "name": "plus_x_thruster_pos"} )
}

const thrusterMinusOn = time => {
    return LS.sendTelecommand("change_minus_x_thruster_pos", time, {"boolean_value":true, "name": "minus_x_thruster_pos"} )
}

const thrusterMinusOff = time => {
    return LS.sendTelecommand("change_minus_x_thruster_pos", time, {"boolean_value":false, "name": "minus_x_thruster_pos"} )
}

/**
 * 
 * @param {*} en - Enabled (true), Disabled (false)
 * @param {*} direction - 1 for positive, -1 for negative
 * @returns 
 */
function thrust (en, direction, time) {
    if(arguments.length > 2) time = getNow(time);

    if(direction === 1)
        return en ? thrusterPlusOn(time) : thrusterPlusOff(time);
    else
        return en ? thrusterMinusOn(time) : thrusterMinusOff(time);
}

const stopthrust = async () => {
    thrust(0, -1);
    thrust(0, 1);
    await delay(1000);
    LS.transmitQueue();
}

export {thrust, stopthrust, factoryReset}