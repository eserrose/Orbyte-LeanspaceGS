import * as LS from './ls.js'
import * as TC from './Telecommands.js'

const delay = ms => new Promise(res => setTimeout(res, ms));

const iridiumGS = {
    location: "69.6492,18.9553,6"
}

const VESPA_VELOCITY = 7500;

function PID_values(error, error_prev){

    const Kp = 0.17
    const Kd = 12
    const del_t = 4;

    let p = Kp*error
    let d = Kd*((error-error_prev)/del_t)

    return (p + d)
}

export async function keepDistance(target){

    let result, position = null, velocity = null;

    do{
        result = await LS.getTelemetry("vespa_dist");
        if(result) position = result[0];
    }while(!position);

    let error_prev = position - target;
    let error = error_prev;

    while(Math.abs(error) > 50 || (velocity && Math.abs(velocity - VESPA_VELOCITY) > 1)){ 
        let pd = PID_values(error, error_prev);

        if(pd < 0){
            Log("Thrusting backwards");
            TC.thrust(1, -1)
            TC.thrust(0, 1)
            TC.thrust(0,-1,3)
        } else {
            Log("Thrusting forwards");
            TC.thrust(1, 1)
            TC.thrust(0, -1)
            TC.thrust(0,1,3)
        }
    
        await delay(1000);
        LS.transmitQueue();
        await delay(3000);

        result = await LS.getTelemetry("vespa_dist");
        position = result[0];
        result = await LS.getTelemetry("sc_velocity");
        velocity = result[0];
    
        if(!position) continue;

        error_prev = error;
        error = position - target;
        Log("Distance: " + error);
    }
    Log("Current distance: " + position + ", Current speed: " + velocity + ". Turning off engines")
    TC.stopthrust();
}

function Log(text){
    $("#container-text").append("<p><span class='timeStr'>" + new Date(Date.now()).toLocaleString() + ": </span>" + text + "</p>")
}

async function addActivityDefCommands(cmdList, defID){
    let cmdName; 
    let copyList = cmdList.slice();
    let argList = [];

    cmdList.forEach(async (cmd,i)=>{
        if(cmd.name == "Thruster Plus ON" || cmd.name == "Thruster Plus OFF") cmdName = "change_plus_x_thruster_pos";
        if(cmd.name == "Thruster Minus ON" || cmd.name == "Thruster Minus OFF") cmdName = "change_minus_x_thruster_pos";
        if(cmd.name == "Thruster Plus ON" || cmd.name == "Thruster Minus ON") argList.push([{"activityDefinitionArgumentName": "on","commandDefinitionArgumentName": "boolean_value"}])
        if(cmd.name == "Thruster Plus OFF" || cmd.name == "Thruster Minus OFF") argList.push([{"activityDefinitionArgumentName": "off","commandDefinitionArgumentName": "boolean_value"}])
        copyList[i].name = cmdName;
        if(!copyList[i].delay) copyList[i].delay = 0;
    })

    await LS.addCmdDefsToActivityDef(defID, copyList, argList);
}

async function createActivity(id, start, end, release){
    LS.generateActivity(id, start, release, end);
}

async function createPassPlan(activities,name, start, end, release){
    LS.generatePassPlan(activities,name,start,end,release)
}

export{LS, TC, iridiumGS, Log, addActivityDefCommands, createActivity, createPassPlan}