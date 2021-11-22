import {CC} from "./src/modules/CesiumModules.js"
import * as Lean from "./src/leanspace/LeanSpace.js"
const Cesium = require('cesium');
const {ipcRenderer} = require('electron');

const apidir = "../cesium.api";
fetch(apidir).then(response => response.text()).then(text => CC.setCesiumApiKey(text)).finally( init )

const CS1_TLE = "ClearSpace-1\n1 00669U 63038A   21294.51345557  .00000039  00000-0  50062-4 0  9993\n2 00669  90.0372 333.2402 0024923 317.9384 163.5843 13.45990580851048"
const VSP_TLE = "Vespa\n1 00670U 63039A   21294.51345557  .00000000  00000-0 -12841-4 0  9998\n2 00670  90.0377 333.2400 0024915 317.8778 163.6400 13.45997090851043"

const delay = ms => new Promise(res => setTimeout(res, ms));
const retryOperation = (operation, ms, retries) => new Promise((resolve, reject) => {
    return operation()
      .then(resolve)
      .catch((reason) => {
        if (retries > 0) {
          return delay(ms)
            .then(retryOperation.bind(null, operation, ms, retries - 1))
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
});
const alert = message =>  ipcRenderer.send("send-alert", message);

class Pass{
    constructor(id, start, end, schedule = []) {
        this.id = i;
        this.start = start;
        this.end = end;
        this.duration = Date.parse(end) - Date.parse(start);
        this.schedule = schedule;
    }
}

async function init(){
    window.cc = new CC.CesiumController();
    window.cc.setGroundStationFromLatLon(Lean.iridiumGS.location);
    window.cc.trackEntity("ClearSpace-1");
    window.cc.addSatellite(CS1_TLE,"ClearSpace-1", {color: Cesium.Color.BLUE.withAlpha(0.25), scale: 14000});
    window.cc.addSatellite(VSP_TLE, "Vespa",       {color: Cesium.Color.GOLD.withAlpha(0.25), scale: 1000});

    setUI();

    await Lean.LS.getToken();
}

function setUI(){
    setButtonHandlers();
    setInputs();
    setPasses();
}

let selectedSchedule = null;

function setButtonHandlers(){

    document.getElementById("resetBtn").addEventListener("click",async ()=>{
        Lean.TC.factoryReset();
        await delay(1000);
        Lean.LS.transmitQueue();
    })

    window.cc.viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
        function(e) {
            e.cancel = true;
            window.cc.viewer.trackedEntity = window.cc.sats.satellites[1].entities.Model;
            window.cc.sats.satellites[1].entities.Model.viewFrom = new Cesium.Cartesian3(40000, -60000.0, 50000);   
        }
    );

    $("#keepDistBtn").on("click",()=>{
        let target = parseFloat($("#dist").val()) * parseInt($("#unitBox").val());
        if(target < 500 || target > 100000)  alert("You entered " + target + " meters, are you sure?")
        if(!selectedSchedule) return alert("Select a pass first!");
        addScheduledEvent(selectedSchedule, "Keep Distance", {target: target});
    })

    $("#modeBtns button").each(function(){
        $(this).on("click",()=>{
            $("#modeBtns button").each(function(){
                $(this).addClass('disabled');
            })
            $(this).removeClass('disabled');
        })
    })

    $("#modeBtn").on("click",()=>{
        addScheduledEvent(selectedSchedule, "Change Mode", {mode: $("#modeBtns button:not(.disabled)").text()})
    })

    $("#seqCrtBtn").on("click",()=>{
        if(!selectedSchedule) return alert("Please select a pass first");
        if(Date.parse(selectedSchedule.start) < Date.now()) return alert("This pass is happening right now, select a future one");

        $("#seqDiv").empty().append("<table><tr><td>Name: </td><td><input type='text' id='seqName' placeholder='Sequence " +  selectedSchedule.id + "'/></td></tr>\
        <tr><td>Description:</td><td><input type='text' id='seqDesc'/></td><td><button disabled id='seqOk'>Next</button></tr></table>");

        $("#seqName").off().on("input",function(){
            $("#seqOk").prop({disabled: !$(this).val().length});
        })

        $("#seqOk").off().on("click",async ()=>{

            Lean.LS.createActivityDef($("#seqName").val(), $("#seqDesc").val(), selectedSchedule.duration/1000).then((res)=>{
                let id = addScheduledEvent(selectedSchedule, "Sequence", {name: $("#seqName").val()});
                $("#seqDiv").empty().append("<table><tr><td>Command: </td><td><select id='cmdSel'>\
                <option selected value='0'>Thruster Plus ON</option><option value='1'>Thruster Plus OFF</option>\
                <option value='2'>Thruster Minus ON</option><option value='3'>Thruster Minus OFF</option></select></td>\
                <td><button id='cmdAnother'>Another</button></td></tr>\
                <tr><td>Delay:</td><td><input type='number' min='0' id='cmdDelay'/></td><td><button id='cmdOk'>Next</button></td></tr></table>");
    
                let commands = [];
                $("#cmdAnother").off().on("click",()=>{
                    commands.push({name: $( "#cmdSel option:selected" ).text(), delay:  $("#cmdDelay").val()});
                    $("#event" + id).append("<br><span class='smaller-text'>Command: " + commands[commands.length-1].name + "</span><br><span class='smaller-text'>Delay: " +  commands[commands.length-1].delay + "</span>");
                })
    
                $("#cmdOk").off().on("click",async ()=>{
                    $("#cmdAnother").trigger("click");
                    $("#seqDiv").empty();
                    await Lean.addActivityDefCommands(commands, res.id)
                    Lean.createActivity(res.id, new Date(Date.parse(selectedSchedule.start) + 100).toISOString() , selectedSchedule.end);   //add 100 bcs it doesnt accept the same time for some reason
                })
    
            }).catch((err)=>{
                alert("This name already exists");
            });
           
            /*
            let cmds = await Lean.LS.getCmdList();

            cmds.content.forEach((cmd)=>{
                $("#cmdSel").append("<option value='" + cmd.id + "'>" + cmd.name + "</option>");
            })*/
        })

    })

    $("#seqLoadBtn").on("click",async ()=>{
        $("#seqDiv").empty().append("<select id='seqSel' style='margin-top:6px; width:310px;'></select>");
        let actlist = await Lean.LS.getActList();
        if(actlist){
            actlist.content.forEach((act)=>{
                $("#seqSel").append("<option>" + act.name + "</option>")
            })
        }
    })

    $("#confirmSchedule").on("click",()=>{

        let activities = [];

        selectedSchedule.schedule.forEach((plan)=>{
            if(!plan) return;

            let text = "Event <strong>\"" + plan.event + "\"</strong> has been scheduled for " +  new Date(Date.parse(selectedSchedule.start )).toLocaleString() + " with params ";
            Object.keys(plan.params).forEach((key, i)=>{
                text += "<strong>" + key + "</strong>: " + plan.params[key] + (i === Object.keys(plan.params).length - 1 ? "" : ",");
            })

            Lean.Log(text)

            switch(plan.event){
                case 'Keep Distance':
                    if(selectedSchedule.start === selectedSchedule.end){
                        Lean.keepDistance(plan.params.target);
                    } else {
                        let dt = Date.parse(selectedSchedule.start) - Date.now();
                        if(dt < 0) return;

                        setTimeout( ()=> Lean.keepDistance(plan.params.target), dt);
                    }
                    break;
                case 'Sequence':
                    activities.push(plan.params.name)
                    
                    break;
                default:
                    break;
            }
        })

        Lean.createPassPlan(activities, selectedSchedule.id + Math.floor(Math.random() * (100) + 1), selectedSchedule.start,selectedSchedule.end, new Date((Date.parse(selectedSchedule.start) - 60000)).toISOString())
    })
/* 
    document.getElementById("testBtn").addEventListener("click",()=>{
        Object.values(window.cc.sats.satellites[0].entities).forEach((entity)=> {
            let vals = entity.position._property._values;
            for(let i = 0 ; i < vals.length; i += 3)
                entity.position._property._values[i] -= 10000;  //todo: convert from earth centered to satellite frame
        })
    }) */


}

function setInputs(){
    $("#dist").on("input",function(){
        $("#keepDistBtn").prop({disabled: $(this).val().length === 0})
    })
}

let passObjs = [];

async function setPasses(){

    addPass(new Date(Date.now()).toISOString(), new Date(Date.now()).toISOString(), 0);

    delay(1000).then(()=>{
        let passes = window.cc.sats.satellites[0].props.passes;
        if(!passes.length){
            return setPasses();
        } 
        passes.forEach((pass, i)=>{
            if(new Date(pass.end) < Date.now() ) return;  //skip previous passes

            let start = new Date(pass.start).toISOString();
            let end   = new Date(pass.end).toISOString();
            let maxEl = pass.maxElevation;

            addPass(start, end, maxEl);
        })

    })
}

function addPass(start, end, maxEl){

    let i =  passObjs.length;

    passObjs.push({
        id: i,
        start: start,
        end: end,
        duration: Date.parse(end) - Date.parse(start),
        schedule: []
    })

    let freePass = start === end;

    start = new Date(Date.parse(start)).toLocaleString();
    end = new Date(Date.parse(end)).toLocaleString();

    $("#passes").append("<div class='pass' id='pass" + i + "'><span><strong>Start:</strong> " + start + "</span>" + (freePass ? "" : "<br><span><strong>End:</strong> " + end + "</span>") + "<br><span><strong>Max Elevation:</strong>" + maxEl.toPrecision(4) + "</div>");
    if(freePass) $("#pass" + i).addClass("freePass");
    else if(Date.parse(start) - Date.now() < 0) $("#pass" + i).addClass("nowPass");
    else if(maxEl < 10) $("#pass" + i).addClass("badPass");
   
    $("#pass" + i).on("click",function(){
        openSchedule(passObjs[i]);
    })
}

function openSchedule(pass){
    selectedSchedule = pass;

    $("#scheduleBody").empty().append("<div class='passInfo'>\
    <span><strong>Start:</strong> " + pass.start + "</span><br><span><strong>End:</strong> " + pass.end + "</span><br>\
    </div>")

    pass.schedule.forEach((sch, i)=>{
        displayEvent(sch.event, sch.params, i);
    })
}

function addScheduledEvent(pass, event, params){
    if(!pass) return;
    pass.schedule.push({event: event, params: params});
    if(pass == selectedSchedule){
        displayEvent(event, params, pass.schedule.length - 1);
    }
    return pass.schedule.length - 1;
}

function displayEvent(event, params = {}, id){

    let bar = "<div class='eventBar' id='event" + id +"'>" + event;

    Object.values(params).forEach((param)=>{
        bar += "<br><span class='smaller-text'>" + param + (event==="Keep Distance" ? " m" : "") + "</span>";
    })

    bar += "<span class='cancelBtn' id='cancel" + id +"'>X</span></div>"

    $("#scheduleBody").append(bar)
    $("#cancel" + id).off().on("click",()=>{
        $("#event" + id).remove();
        selectedSchedule.schedule[id] = null;
        console.log(selectedSchedule)
    })

}
