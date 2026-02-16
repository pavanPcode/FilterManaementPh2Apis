const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");

const ahuphase2Routes = express.Router();



ahuphase2Routes.post("/addahu", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addahu);
});


ahuphase2Routes.post("/updateahu", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateahu);
});


ahuphase2Routes.post("/deleteahu", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteahu);
});


// ahuphase2Routes.get("/getahu", async (req, res) => {
//   const data = {};

//   data.BlockId = req.query.BlockId ? parseInt(req.query.BlockId, 10) : 0;

//   data.AreaId = req.query.AreaId ? parseInt(req.query.AreaId, 10) : 0;

//   handleRecord(req, res, data, OperationEnums().getahu);
// });

ahuphase2Routes.get("/getahu", async (req, res) => {
  const data = {};

  data.BlockId = req.query.BlockId ? parseInt(req.query.BlockId, 10) : 0;
  data.AreaId = req.query.AreaId ? parseInt(req.query.AreaId, 10) : 0;
  data.ProcessType = req.query.ProcessType ? parseInt(req.query.ProcessType, 10) : 0; // 0=all,1=process,2=non-process

  handleRecord(req, res, data, OperationEnums().getahu);
});



// module.exports = router;
module.exports = {
  ahuphase2Routes
};

