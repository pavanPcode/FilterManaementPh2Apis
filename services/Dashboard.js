const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const Dashboardphase2Routes = express.Router();
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");


Dashboardphase2Routes.get("/getDashboardCount", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getDashboardCount);
});


Dashboardphase2Routes.get("/getnotificationsToUserpg", (req, res) => {
  let { UserID } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;
  const data = { UserID ,offset:offset ,limit:recordslimit};
  handleRecord(req, res, data, OperationEnums().Notificationspg);
});

// module.exports = router;
module.exports = {
  Dashboardphase2Routes
};
