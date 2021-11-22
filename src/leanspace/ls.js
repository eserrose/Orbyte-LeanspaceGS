/**
 * ls.js - Leanspace API wrappers
 * 
 * @brief Contains wrappers for Leanspace APIs and an easy interface for using them
 * @version 1.0
 * @author Eser Gul (eser@orbytespace.com)
 * @author Ecem Konu (ecem@orbytespace.com)
 */

const axios = require('axios');
const accountId = "orbyte";
const clientId = "qma2rbf7qu3trm6g4g210r3sd";
const clientSecret = "rjq0gcuadmhpouso31jqn3ssqg54turdaah6h6joda8lentvt1g";
const API_COMMON_DIR = 'https://api.leanspace.io/';
const ANALYTICS_ENDPOINT_URL = API_COMMON_DIR + 'analytics/v1/load';
const STREAM_ENDPOINT_URL    = API_COMMON_DIR + 'streams-repository/streams';
const TRANSMISSIONS_ENDPOINT_URL = API_COMMON_DIR + 'commands-repository/transmissions'
const COMMANDS_ENDPOINT_URL = API_COMMON_DIR + 'commands-repository/commands'
const ASSETS_ENDPOINT_URL    = API_COMMON_DIR + 'asset-repository';
const ORCHESTRATION_ENDPOINT_URL = API_COMMON_DIR + 'orchestration-repository';

//#region Get API Key
let cachedAccessToken = null;

async function getAccessToken(clientId,clientSecret){
  if(cachedAccessToken && isTokenStillValid(cachedAccessToken)){
    console.log("returning token from cache")
    return cachedAccessToken;
  }
  console.log("there is no token in cache or it has expired, getting a new one.")
  const response = await axios.post(
    `https://${accountId}-prod.auth.eu-central-1.amazoncognito.com/oauth2/token?scope=https://api.leanspace.io/READ&grant_type=client_credentials`,
    {},
    {
      headers:{
        "Authorization":'Basic ' + Buffer.from(clientId + ":" + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'         
      }
    });

  cachedAccessToken = response.data.access_token;
  return cachedAccessToken
}
//#endregion

//#region Telemetry
const streamID = "a25f80dc-c602-4730-b024-e35851055980";
let metrics = null;

//Format Translations
const normalizedMetricId =(metricId) => metricId.replace(/-/gi, '_');
const metricField = (metricId) =>  `telemetry_${accountId}.d_${normalizedMetricId(metricId)}`;
const timestampField = `telemetry_${accountId}.timestamp`;

//Query for last value of a metric
const queryLastValue = (metricId) => {return {
  dimensions: [metricField(metricId), timestampField],
  ungrouped: true,
  order: { [timestampField]: 'desc' },
  limit: 1
}};

//API call to fetch the value of a metric
const fetchStream = async (streamId, token) => {
    const response = await axios.get(STREAM_ENDPOINT_URL + "/" + streamId, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch((err)=>console.log(err.response));

    if(!response) return;

    metrics = response.data.mappings;
}

const fetchMetric = async (metricId,token) => {
  let result = [null, null];

  await axios.post(ANALYTICS_ENDPOINT_URL, {query: queryLastValue(metricId)}, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then((response)=>{
    const dataPoints = response.data.data;
    const lastPoint = dataPoints[0];
    console.log(`last value ${lastPoint[metricField(metricId)]} at ${lastPoint[timestampField]}`) ;
    result = [lastPoint[metricField(metricId)], lastPoint[timestampField]];
  
  }).catch((err)=>{});
 
  return result;
}
//#endregion

//#region Assets

async function getCommandDefs(token){
  const response = await axios.get(ASSETS_ENDPOINT_URL + "/command-definitions" , {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(response.data)
  return response.data;
}

async function getProperties(token){
  const response = await axios.get(ASSETS_ENDPOINT_URL + "/properties" , {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(response.data)
}

const fetchCommandDef= async (commandDefId, token) => {
  const response = await axios.get(ASSETS_ENDPOINT_URL+"/command-definitions/" + commandDefId, { 
      headers: { 'Authorization': `Bearer ${token}`,
                 'Content-Type': 'application/json',
                 'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
  console.log(response.data)
  return response.data;
}

async function getActivityDefs(token){
  const response = await axios.get(ORCHESTRATION_ENDPOINT_URL + "/activity-definitions" , {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(response.data)
  return response.data;
}

//#endregion

//#region commands
const queueID = "f7b2f0e3-836b-4667-8800-2d49a508dfa7";
const groundID = "66d706e7-9c57-487e-a2d4-a436b4ec6d99";

//#region transmission
const retrieveCQT = async (transmissionId, token) => {
  const response = await axios.get(TRANSMISSIONS_ENDPOINT_URL + "/" + transmissionId, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const updateCQTStatus = async (transmissionId, token) => {
  const response = await axios.put(TRANSMISSIONS_ENDPOINT_URL + "/" + transmissionId, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const resendFailedCQT = async (transmissionId, token) => {
  const response = await axios.put(TRANSMISSIONS_ENDPOINT_URL + "/" + transmissionId + "/resend", {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch((err)=>console.log(err.response));
   //console.log(response.data);
}

const fetchCQTransmissions = async (token) => {
  const response = await axios.get(TRANSMISSIONS_ENDPOINT_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const stageQueuedCommands = async (token) => {
  const response = await axios.post(TRANSMISSIONS_ENDPOINT_URL, {
    "commandQueueId": queueID,
    "groundStationId": groundID
  }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const testStagedtoTransmission = async (token) => {
  const response = await axios.post(TRANSMISSIONS_ENDPOINT_URL +"/test", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const getCustomIdsForCQT = async (cqtId, token) => {
  const response = await axios.get(TRANSMISSIONS_ENDPOINT_URL +"/" + cqtId + "/custom-transmission-command-ids", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

const fetchCommandsInCQT = async (cqtId, token) => {
  const response = await axios.get(TRANSMISSIONS_ENDPOINT_URL +"/"+cqtId+"/commands", {
      headers: { 'Authorization': `Bearer ${token}` }
    });
   console.log(response.data);
}

//#endregion

//#region commands-controller

const retrieveCommand = async (commandId, token) => {
  const response = await axios.get(COMMANDS_ENDPOINT_URL + "/" + commandId, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch((err)=>console.log(err.response.data));
   console.log(response.data);
}

const retrieveSentCommands = async (token) => {
  const response = await axios.get(COMMANDS_ENDPOINT_URL, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch((err)=>console.log(err.response.data));
   console.log(response.data);
}

const sendCommand = async (params, token) => {
  const response = await axios.post(COMMANDS_ENDPOINT_URL, params, { 
      headers: { 'Authorization': `Bearer ${token}`,
                 'Content-Type': 'application/json',
                 'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
}
//#endregion

//#endregion

//#region orchestration
const satelliteID = "212d5360-6076-4477-8ea6-04f4b2474bc9";
const vespaID = "e888e265-395a-4b7b-9466-2737f210a1ec";

const getPassPlan = async (passPlanId, token) => {
  const response = await axios.get(ORCHESTRATION_ENDPOINT_URL+"/pass-plans/" + passPlanId, { 
    headers: { 'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
console.log(response.data)
}

const createPassPlan = async(activityNames, planName, contactStart, contactEnd, releaseTime, token) =>{
  let activityList = await fetchActivities(token);
  let passPlanData = {
    "groundStationId" : groundID,
    "name" : planName,
    "contactStartTime" : contactStart,
    "contactEndTime" : contactEnd,
    "releaseTime" : releaseTime,
    "assetId" : satelliteID,
    "activityIds": []
  }
  activityNames.forEach((name)=>{
    let activityId = activityList.content.find((obj)=>{return obj.name == name})?.id;
    passPlanData.activityIds.push(activityId)
  })
  const response = await axios.post(ORCHESTRATION_ENDPOINT_URL+"/pass-plans", passPlanData,{ 
    headers: { 'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
  console.log(response.data)}

/*
const updatePassPlan = async (passPlanId, params, token) => {
  const response = await axios.put(ORCHESTRATION_ENDPOINT_URL+"/pass-plans/" + passPlanId, params, { 
    headers: { 'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
console.log(response.data)
}
*/
const getActivityDefinition = async (activityDefId, token) => {
  const response = await axios.get(ORCHESTRATION_ENDPOINT_URL+"/activity-definitions/" + activityDefId, { 
    headers: { 'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
  return response.data
}

const updateActivityDefinition = async (activityDefId, params,  token) => {
  const response = await axios.put(ORCHESTRATION_ENDPOINT_URL+"/activity-definitions/" + activityDefId, params,{ 
    headers: { 'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
console.log(response.data)
}

const createActivityDefinitionTemplate = (nodeId, name, description, duration) =>{
  let new_activity = {
    "nodeId" : nodeId,
    "name" : name,
    "description" : description,
    "estimatedDuration" : duration,
    "metadata" : [],
    "argumentDefinitions" : [],
    "commandMappings" : []
  }
  return new_activity;
}

const addCommandDefToActivityDef = async(token, activityDef, commandName, delay =0, position =0, args = []) =>{
  let commandList = await getCommandDefs(token);
  let commandDefId = commandList.content.find((obj)=>{return obj.name == commandName})?.id;
  const tempCommandMap = {"commandDefinitionId":commandDefId,
  "position" :position,
  "delayInMilliseconds" : delay,
  "argumentMappings" : args,
  "metadataMappings" : []
}
activityDef["commandMappings"].push(tempCommandMap);
return activityDef;
}

const addArgumentDefsToActivityDef = async(activityDef) =>{

  let tempArgMap =  [{
  "name": "on",
  "attributes":{
      "required": false,
      "type": "BOOLEAN",
      "defaultValue": true
    }
  },
  {
  "name": "off",
  "attributes":{
      "required": false,
      "type": "BOOLEAN",
      "defaultValue": false
    }
   }
  ]

  activityDef["argumentDefinitions"].push(...tempArgMap);
  return activityDef;
}

//nodeId where nodeid can be ground station, clear-sat1 or vespa
const sendActivityDefinition = async(activityDef, token) => {
  const response = await axios.post(ORCHESTRATION_ENDPOINT_URL+"/activity-definitions", activityDef,{ 
    headers: { 'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
  return response.data}

const createActivityTemplate = (actDefId, startTime, releaseTime, endTime) =>{
    let newActivity = {
      "definitionId" : actDefId,
      "startTime" : startTime,
      "releaseTime" : releaseTime,
      "endTime" : endTime,
      "arguments" : []
    }
    return newActivity;
  }
const createActivity = async(activity, token) =>{
  const response = await axios.post(ORCHESTRATION_ENDPOINT_URL+"/activities", activity,{ 
    headers: { 'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'  }}).catch((err)=> console.log(err.response.data));
  console.log(response.data)}

const fetchActivities = async (token) => { //gives list of all activities
    const response = await axios.get(ORCHESTRATION_ENDPOINT_URL + "/activities", {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch((err)=> console.log(err.response.data));
   return response.data;
}

const deleteActivity = async(activityId, token) =>{
  const response = await axios.delete(ORCHESTRATION_ENDPOINT_URL + "/activities/"+activityId, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch((err)=> console.log(err.response.data));
console.log(response);
}

const deleteActivityDefinition = async(activityDefId, token) =>{
  const response = await axios.delete(ORCHESTRATION_ENDPOINT_URL + "/activity-definitions/"+activityDefId, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch((err)=> console.log(err.response.data));
console.log(response);
}

const deletePassPlan = async(passPlanId, token) =>{
  const response = await axios.delete(ORCHESTRATION_ENDPOINT_URL + "/pass-plan/"+passPlanId, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).catch((err)=> console.log(err.response.data));
console.log(response);
}

const fetchActivityDefinitions = async (token) => { //gives list of all activity definitions
  const response = await axios.get(ORCHESTRATION_ENDPOINT_URL + "/activity-definitions", {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch((err)=> console.log(err.response.data));
  console.log(response);
}

const fetchPassPlans = async (token) => { //gives list of all activity definitions
  const response = await axios.get(ORCHESTRATION_ENDPOINT_URL + "/pass-plans", {
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch((err)=> console.log(err.response.data));
  console.log(response);
}

//#endregion


//#region Export functions
const sendTelecommand = async(commandName, time, params, token = cachedAccessToken) => {

  let commandList = await getCommandDefs(token);
  let commandDefId = commandList.content.find((obj)=>{return obj.name == commandName})?.id;
  let commandDef = commandDefId ? await fetchCommandDef(commandDefId, token) : null;
  console.log(commandDef)
  if(!commandDef) return;

  let data = {
    "commandQueueId": queueID,
    "commandDefinitionId": commandDefId,
    "executionTime": time,
    "commandArguments": Array.from(commandDef.arguments, arg => {
      return {
        "appliedArgumentId": arg.id,
        "name": arg.name,
        "identifier": arg.identifier,
        "type": arg.type,
        "value": params[arg.name]
      }
    })
  }
  return sendCommand(data, token);
}

async function getTelemetry(tmId){
  if(!metrics)
    await fetchStream(streamID, cachedAccessToken);

  if(!metrics)
    return console.error("Could not fetch metrics");

  const telemetry = metrics.find( ({ component }) => component ===  tmId );
  let result = await fetchMetric(telemetry.metricId, cachedAccessToken)

  return result;
}

async function transmitQueue() {
  stageQueuedCommands(cachedAccessToken)
};

async function createActivityDef(name, desc, dur){
  return await sendActivityDefinition(createActivityDefinitionTemplate(satelliteID,name,desc,dur), cachedAccessToken);
}

async function addCmdDefToActivityDef(id, cmdName, cmdDelay, cmdPos){
  let def = await getActivityDefinition(id, cachedAccessToken);
  def = await addCommandDefToActivityDef(cachedAccessToken, def, cmdName, cmdDelay, cmdPos);
  return await updateActivityDefinition(id,def,cachedAccessToken);
}

async function addCmdDefsToActivityDef(id, cmdList, args){
  let def = await getActivityDefinition(id, cachedAccessToken);

  if(args){
    def = await addArgumentDefsToActivityDef(def);
  }

  for(let i = 0; i < cmdList.length; i++){
    def = await  addCommandDefToActivityDef(cachedAccessToken, def, cmdList[i].name, cmdList[i].delay, i, args[i]);
  }
  return await updateActivityDefinition(id,def,cachedAccessToken);
}

async function generateActivity(id, startTime, releaseTime, endTime){
  return await createActivity(createActivityTemplate(id, startTime, releaseTime, endTime), cachedAccessToken);
}

async function generatePassPlan(activities, name, start, end, release){
  return await createPassPlan(activities, name, start, end, release, cachedAccessToken );
}

async function getCmdList(){
  return await getCommandDefs(cachedAccessToken);
}

async function getActList(){
  return await getActivityDefs(cachedAccessToken);
}

const getToken = async () => {
  await getAccessToken(clientId, clientSecret);
}

export {sendTelecommand, getTelemetry, transmitQueue, createActivityDef, addCmdDefsToActivityDef, generateActivity,generatePassPlan, getActList, getCmdList, getToken}
//#endregion
