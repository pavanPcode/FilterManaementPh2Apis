const express = require("express");
// const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const filterphase2Routes = express.Router();
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");
const { getsysconfig,getNewLabel } = require("./server.js");

filterphase2Routes.post("/updatedryintempBulk", async (req, res) => {
  try {
  const data = req.body; // JSON body from client

  // ✅ Validate array
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        Status: false,
        message: "Request body must be a non-empty array"
      });
    }

  // ✅ Process one by one
    for (const record of data) {
      await handleRecordWithOutRes(
        record,
        OperationEnums().updatedryintemp
      );
    }

    // ✅ Send response after loop
    return res.json({
      Status: true,
      message: "Drying temperature updated successfully for all records."
    });

  } catch (error) {
    console.error("Error in updatedryintempBulk:", error);
    return res.status(500).json({
      Status: false,
      message: "Internal Server Error",
      error: error.message || error
    });
  }
});

filterphase2Routes.post("/addfilter", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addfilterph2);
});

filterphase2Routes.post("/updatefilter", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updatefilter);
});

filterphase2Routes.post("/deletefilter", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deletefilter);
});


filterphase2Routes.post("/filterreplace", async (req, res) => {
  try {
    const data = req.body;
    const datacomma = { ...req.body };

    // ✅ Convert id to comma-separated string
    if (Array.isArray(datacomma.id)) {
      datacomma.id = datacomma.id.map(Number).join(",");
    } else if (typeof datacomma.id === "string") {
      datacomma.id = datacomma.id.trim();
    } else {
      return res.status(400).json({
        Status: false,
        ResultMessage: "Invalid id format",
        ResultData: []
      });
    }

    // Step 1: Get existing filter data
    const filterdata = await handleRecordWithOutRes(
      datacomma,
      OperationEnums().getfilterdatatoreplace
    );

    if (
      !filterdata ||
      filterdata.Status !== true ||
      !Array.isArray(filterdata.ResultData) ||
      filterdata.ResultData.length === 0
    ) {
      return res.status(400).json({
        Status: false,
        message: "Filter details not found."
      });
    }

    const successIds = [];
    const failedIds = [];

    // Step 2: Loop through existing filters
    for (const existing of filterdata.ResultData) {

      const newValues = {
        ...existing,
        FilterId: "",
        Barcode: "",
        Lable: getNewLabel(existing.Lable, data.Lable),
        CreatedBy: data.updatedby,
        OldId: existing.id
      };

      try {
        const result = await handleRecordWithOutRes(
          newValues,
          OperationEnums().Addfilterreplace
        );

        // ❌ Failure cases
        if (
          result.Status === false ||
          (result.ResultData?.[0]?.Message === "Existing label")
        ) {
          failedIds.push(existing.id);
          continue;
        }

        // ✅ Success
        successIds.push(existing.id);

      } catch (err) {
        console.error("Insert failed for ID:", existing.id, err);
        failedIds.push(existing.id);
      }
    }
    

    // Step 3: Retire only successfully replaced filters
    if (successIds.length > 0) {

      const successIdString = successIds.join(",");


      const upfijson = {
        id: successIdString,
        Status: 104,
        remarks: data.remarks,
        updatedby: data.updatedby
      };

      await handleRecordWithOutRes(
        upfijson,
        OperationEnums().filterReplaceph2
      );
    }

    // ✅ Final response
    return res.json({
      Status: true,
      message: "Filter replace process completed",
      SuccessIds: successIds,
      FailedIds: failedIds
    });

  } catch (error) {
    console.error("Error in /filterreplacedelete:", error);
    return res.status(500).json({
      Status: false,
      message: "Internal Server Error",
      error: error.message || error
    });
  }
});


filterphase2Routes.post("/filterretirement", (req, res) => {
  const data = req.body;

  // Convert array to comma-separated string
  if (Array.isArray(data.id)) {
    data.id = data.id.map(Number).join(",");
  } 
  // If already string, keep as-is
  else if (typeof data.id === "string") {
    data.id = data.id.trim();
  } 
  else {
    return res.status(400).json({
      ResultMessage: "Invalid id format ",
      Status: false,
      ResultData: []
    });
  }
  console.log('data',data)
  handleRecord(req, res, data, OperationEnums().addretirement);
});


filterphase2Routes.get("/getfiltercounts", async (req, res) => {
  const data = {};
  if (req.query.ProcessType) {
    data.ProcessType = parseInt(req.query.ProcessType, 10); 
  }
  handleRecord(req, res, data, OperationEnums().getfiltercounts);
});

filterphase2Routes.get("/getFiltersList", (req, res) => {
  let { BlockId, Status, AHUId, AreaId, Rfid, ProcessType } = req.query;

  const pageNumber = parseInt(req.query.pageNumber, 10) || 1;
  const recordslimit = parseInt(req.query.recordslimit, 10) || 50;
  const offset = (pageNumber - 1) * recordslimit;

  // Default handling for filters
  if (!BlockId || BlockId == 0) {
    BlockId = "b.BlockId"; // ignore filter
  }

  if (!Status || Status == 0) {
    Status = "pa.Status"; // ignore filter
  }

  // if (!Rfid || Rfid == 0) {
  //   Rfid = "pa.Rfid"; // ignore filter
  // }

  if (!AHUId || AHUId == 0) {
    AHUId = "pa.AHUId"; // ignore filter
  }

  if (!AreaId || AreaId == 0) {
    AreaId = "pha.AreaId"; // ignore filter
  }

  if (!ProcessType || ProcessType == 0) {
    ProcessType = "pha.ProcessType"; // ignore filter
  }

  // Prepare data object for the query/stored procedure
  const data = {
    BlockId,
    Status,
    Rfid,
    AHUId,
    AreaId,
    ProcessType,
    offset,
    limit: recordslimit
  };

  handleRecord(req, res, data, OperationEnums().getFiltersListPh2);
});

filterphase2Routes.get("/getfiltersAdvSearch", (req, res) => {
  let { BlockId, Status, AHUId, AreaId, Rfid, ProcessType } = req.query;
  const Search = req.query.Search ? req.query.Search.trim() : '';
  const pageNumber = parseInt(req.query.pageNumber, 10) || 1;
  const recordslimit = parseInt(req.query.recordslimit, 10) || 50;
  const offset = (pageNumber - 1) * recordslimit;

  // Default handling for filters
  if (!BlockId || BlockId == 0) {
    BlockId = "b.BlockId"; // ignore filter
  }

  if (!Status || Status == 0) {
    Status = "pa.Status"; // ignore filter
  }

  // if (!Rfid || Rfid == 0) {
  //   Rfid = "pa.Rfid"; // ignore filter
  // }

  if (!AHUId || AHUId == 0) {
    AHUId = "pa.AHUId"; // ignore filter
  }

  if (!AreaId || AreaId == 0) {
    AreaId = "pha.AreaId"; // ignore filter
  }

  if (!ProcessType || ProcessType == 0) {
    ProcessType = "pha.ProcessType"; // ignore filter
  }

  // Prepare data object for the query/stored procedure
  const data = {
    BlockId,
    Status,
    Rfid,
    AHUId,
    AreaId,
    ProcessType,
    offset,
    limit: recordslimit,Search
  };

  handleRecord(req, res, data, OperationEnums().getfiltersAdvSearch);
});

filterphase2Routes.get("/GetFilterInfo", (req, res) => {
  let { Status,ProcessType } = req.query;
  const data = { Status,ProcessType  };
  handleRecord(req, res, data, OperationEnums().GetFilterInfo);
});

filterphase2Routes.get("/getRetirement", async (req, res) => {
  // const data = {};  // no input needed as we fetch all active users
  let { blockid } = req.query;

  if (blockid == 0 || blockid === undefined) {
    blockid = "fh3.blockid";
  }
  const data = { blockid };
  handleRecord(req, res, data, OperationEnums().getRetirement);
});

filterphase2Routes.get("/getFilterHistoryReportpg", (req, res) => {
  let { Filterid, startdate, enddate } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;

  Filterid = Filterid == 0 || Filterid === undefined ? "0" : Filterid;

  const data = { Filterid, startdate, enddate ,offset:offset ,limit:recordslimit};
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getFilterHistoryReportpg);
});

filterphase2Routes.get("/FiltertimingReportpg", (req, res) => {
  let { Filterid, startdate, enddate } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;

  FilterId = Filterid == 0 || Filterid === undefined ? "0" : Filterid;

  const data = { FilterId, startdate, enddate,offset:offset ,limit:recordslimit };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums(). FiltertimingReportpg);
});

filterphase2Routes.get("/getAuditReportpg", (req, res) => {
  let { PerformedBy, startdate, enddate } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;
  PerformedBy;
  PerformedBy =
    PerformedBy == 0 || PerformedBy === undefined
      ? "p.PerformedBy"
      : PerformedBy;

  const data = { PerformedBy, startdate, enddate,offset:offset ,limit:recordslimit };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getAuditReportpg);
});

filterphase2Routes.get("/getbarcodereportpg", (req, res) => {
  let { FilterId, startdate, enddate } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;

  FilterId = FilterId == 0 || FilterId === undefined ? "0" : FilterId;

  const data = { FilterId, startdate, enddate,offset:offset ,limit:recordslimit };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getbarcodereportpg);
});


// module.exports = router;
module.exports = {
  filterphase2Routes
};
