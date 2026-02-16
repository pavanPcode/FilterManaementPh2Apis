const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const ScheduleRoutes = express.Router();
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");




ScheduleRoutes.get("/addAHUSchedule", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().addAHUSchedule);
});

ScheduleRoutes.get("/GetAHUSchedules", (req, res) => {
  let { BlockId ,Areaid,AHUId,ProcessType} = req.query;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "b.BlockId";
  }
  if (Areaid == 0 || Areaid === undefined) {
    Areaid = "ahu.Areaid";
  }
  if (AHUId == 0 || AHUId === undefined) {
    AHUId = "ahu.id";
  }
  if (ProcessType == 0 || ProcessType === undefined) {
    ProcessType = "ahu.ProcessType";
  }
  const data = { BlockId,Areaid,AHUId,ProcessType };
  handleRecord(req, res, data, OperationEnums().GetAhuSchedules);
});

ScheduleRoutes.get("/GetAhuTasks", (req, res) => {
  let { BlockId, startdate, enddate,Areaid ,AHUId,ProcessType} = req.query;

  // Default fallback if value is 0 or undefined
  BlockId = BlockId == 0 || BlockId === undefined ? "b.BlockId" : BlockId;
  if (Areaid == 0 || Areaid === undefined) {
    Areaid = "ahu.Areaid";
  }
  if (AHUId == 0 || AHUId === undefined) {
    AHUId = "ahu.id";
  }
  if (ProcessType == 0 || ProcessType === undefined) {
    ProcessType = "ahu.ProcessType";
  }

  const data = { BlockId, startdate, enddate,Areaid,AHUId,ProcessType };
  console.log("Query Data:", data);

  handleRecord(req, res, data, OperationEnums().GetAhuTasks);
});


// module.exports = router;
module.exports = {
  ScheduleRoutes
};
