const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");

const BlockRoutes = express.Router();


BlockRoutes.post("/addBlocks", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().addBlock);
});

BlockRoutes.post("/addPressureGroup", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().addPressureGroup);
});


BlockRoutes.get("/getPressureGroups", (req, res) => {
  let { BlockId } = req.query;
  // Convert BlockId to integer
  
  const data = { BlockId: BlockId };
  console.log('data',data)
  handleRecord(req, res, data, OperationEnums().getPressureGroups);

});


BlockRoutes.get("/getPressuredataByGroup", (req, res) => {
  let { PressureGroupId,BlockId } = req.query;
  // Convert BlockId to integer
  if (PressureGroupId == 0 || PressureGroupId === undefined) {
    PressureGroupId = "p.PressureGroupId";
  } else {
    PressureGroupId = `${PressureGroupId}`;
  }
  const data = { PressureGroupId: PressureGroupId ,BlockId:BlockId};
  console.log('data',data)
  handleRecord(req, res, data, OperationEnums().getPressuredata);

});



// module.exports = router;
module.exports = {
  BlockRoutes
};
