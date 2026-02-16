const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const AreasRoutes = express.Router();
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");



AreasRoutes.get("/getareas", async (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getareas);
});


AreasRoutes.post("/addareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addareas);
});


AreasRoutes.post("/deleteareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteareas);
});


AreasRoutes.post("/updateareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateareas);
});


AreasRoutes.get("/getblockareas", async (req, res) => {
  const data = {};
  if (req.query.BlockId) {
    data.BlockId = parseInt(req.query.BlockId, 10); 
  }
  handleRecord(req, res, data, OperationEnums().getblockareas);
});


AreasRoutes.post("/addblockareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addblockareas);
});



AreasRoutes.post("/updateblockareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateblockareas);
});



AreasRoutes.post("/deleteblockareas", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteblockareas);
});



// module.exports = router;
module.exports = {
  AreasRoutes
};


