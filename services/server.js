const express = require("express");
const { OperationEnums } = require("../utilityEnum.js");
const exeQuery = require("../dal/exeQuery.js");
const utilCode = require("../utilities/utilityCode.js");
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");

// const app = express();
const router = express.Router();
// const cors = require("cors");
// const port = process.env.PORT || 3080;

// app.use(cors());
// app.use(express.json());
// app.use("/api", router);


//region Filter types
router.get("/getFilterTypes", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().GETFILTERTYPES);
});

router.post("/addFilterType", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().ADDFILTERTYPE);
});

router.post("/updateFilterType", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().UPDATEFILTERTYPE);
});
router.post("/deleteFilter", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().DELETEFILTER);
});

router.post("/updateFilterTypeStatus", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().UPDATEFILTERTYPESTATUS);
});

//region AHU
router.get("/getAhuListold", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().GETAHULIST);
});

router.post("/addAhuold", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().ADDAHU);
});

router.post("/updateAhuold", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().UPDATEAHU);
});

router.post("/updateAhuIsActive", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().UPDATEAHUISACTIVE);
});

//region Users
router.get("/getUsers", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().GETUSERS);
});

// app.listen(port, () => {
//   console.log(`services running on port ${port}`);
// });

router.get("/getmenu", (req, res) => {
  const { RoleId } = req.query;
  const JsonData = { RoleId: RoleId };
  exeQuery.GetMenu(JsonData, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    console.log("results :", results);
    //console.log(results);
    exeQuery.GetMenuNodes(results, (err, MenuList) => {
      if (err) {
        return res.status(500).json({ error: err.message, Status: false });
      }
      res.json({
        ResultData: MenuList,
        Status: true,
      });
    });
  });
});

router.get("/GetBarcodeType", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().GETBCTYPE);
});

// router.post('/AddAHUFilter', (req, res) => {
//     const data = req.body;
//     // Generate base from current datetime (YYYYMMDDHHmmss)
//     const now = new Date();
//     const pad = (n) => n.toString().padStart(2, '0');

//     const year = now.getFullYear();
//     const month = pad(now.getMonth() + 1);
//     const day = pad(now.getDate());
//     const hours = pad(now.getHours());
//     const minutes = pad(now.getMinutes());
//     const seconds = pad(now.getSeconds());

//     // Use timestamp to ensure uniqueness
//     const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`; // e.g. 20250704123045

//     // Generate values
//     const barcode = timestamp.slice(-8); // Last 8 digits only
//     data.FilterId = `FLT${barcode.slice(-4)}`;
//     data.Barcode = barcode;
//     // data.Lable = `LBL${barcode}`;
//     console.log(data);

//     handleRecord(req, res, data, OperationEnums().AddAHUFilter);
// });

async function getsysconfig(screenName) {
  try {
    const data = { ScreenName: screenName };

    const result = await handleRecordWithOutRes(
      data,
      OperationEnums().getSystemConfig
    );

    if (result?.ResultData?.length > 0) {
      return result.ResultData[0].IsApproval; // return only IsApproval
    }

    return null; // or false, depending on your use case
  } catch (err) {
    console.error("Error in getsysconfig:", err);
    throw err;
  }
}

router.post("/updateFilter", async (req, res) => {
  // Get approval flag
  try {
    const isApproval = await getsysconfig("updateFilter");
    console.log("IsApproval:", isApproval);

    //check ahuid
    // Check AHUId
    let AHUId_check = req.body.NewValues.AHUId;
    // console.log('AHUId_check',AHUId_check)

    if (
      AHUId_check === undefined ||
      AHUId_check === null ||
      AHUId_check === ""
    ) {
      // AHUId is missing → create a new one
      let data11 = {
        Code: req.body.NewValues.AHUName,
        Description: "",
        Location: "",
        Department: "",
        Manufacturer: "",
        ModelNo: "",
        Capacity: 0,
        Sparescount: 0,
        Remarks: "",
        CreatedBy: req.body.NewValues.CreatedBy,
      };

      const result = await handleRecordWithOutRes(
        data11,
        OperationEnums().AddAHUEnum
      );
      //   console.log('result', result);

      if (result?.Status && result?.ResultData?.length > 0) {
        const NEWAHUID = result.ResultData[0].ID;

        // 🔑 Save the new AHUId into the request body
        req.body.NewValues.AHUId = NEWAHUID;
        AHUId_check = NEWAHUID;

        // console.log("New AHUId generated:", NEWAHUID);
      } else {
        return res
          .status(500)
          .json({ error: "Failed to generate new AHUId", Status: false });
      }
    }

    if (isApproval === false) {
      // No approval needed → directly insert
      const newValues = req.body.NewValues;
      return handleRecord(
        req,
        res,
        newValues,
        OperationEnums().updateFiltersList
      );
    } else {
      const data = {
        ...req.body,
        ScreenOperationId: OperationEnums().updateFiltersList,
        Approvaltype: 2,
      };
      return handleRecord(req, res, data, OperationEnums().addApprovalSetting);
    }
  } catch (err) {
    console.error("Error in /updateFilter:", err);
    res.status(500).json({ error: err.message, Status: false });
  }
});

router.post("/AddAHUFilter", async (req, res) => {
  try {
    // console.log('req.body',req.body)
    const pad = (n) => n.toString().padStart(2, "0");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const barcode = timestamp.slice(-8);

    // Update NewValues with generated keys
    req.body.NewValues.FilterId = `FLT${barcode.slice(-4)}`;
    req.body.NewValues.Barcode = barcode;

    //check ahuid
    // Check AHUId
    let AHUId_check = req.body.NewValues.AHUId;
    // console.log('AHUId_check',AHUId_check)

    if (
      AHUId_check === undefined ||
      AHUId_check === null ||
      AHUId_check === ""
    ) {
      // AHUId is missing → create a new one
      let data11 = {
        Code: req.body.NewValues.AHUName,
        Description: "",
        Location: "",
        Department: "",
        Manufacturer: "",
        ModelNo: "",
        Capacity: 0,
        Sparescount: 0,
        Remarks: "",
        CreatedBy: req.body.NewValues.CreatedBy,
      };

      const result = await handleRecordWithOutRes(
        data11,
        OperationEnums().AddAHUEnum
      );
      //   console.log('result', result);

      if (result?.Status && result?.ResultData?.length > 0) {
        const NEWAHUID = result.ResultData[0].ID;

        // 🔑 Save the new AHUId into the request body
        req.body.NewValues.AHUId = NEWAHUID;
        AHUId_check = NEWAHUID;

        // console.log("New AHUId generated:", NEWAHUID);
      } else {
        return res
          .status(500)
          .json({ error: "Failed to generate new AHUId", Status: false });
      }
    }

    // Get approval flag
    const isApproval = await getsysconfig("AddAHUFilter");
    console.log("IsApproval:", isApproval);

    if (isApproval === false) {
      // No approval needed → directly insert
      const newValues = req.body.NewValues;
      return handleRecord(req, res, newValues, OperationEnums().AddAHUFilter);
    } else {
      // Approval needed → prepare payload for approval flow
      const totaldata = {
        ...req.body,
        ScreenOperationId: OperationEnums().AddAHUFilter,
        Approvaltype: 1,
        OldValues: {},
      };

      //   console.log(totaldata.NewValues);

      return handleRecord(
        req,
        res,
        totaldata,
        OperationEnums().addApprovalSetting
      );
    }
  } catch (err) {
    console.error("Error in /AddAHUFilter:", err);
    res.status(500).json({ error: err.message, Status: false });
  }
});

// router.post('/AddFilterLite', async (req, res) => {
//   try {
//     // console.log('req.body',req.body)
//     const pad = (n) => n.toString().padStart(2, '0');
//     const now = new Date();
//     const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
//     const barcode = timestamp.slice(-8);

//     // Update NewValues with generated keys
//     req.body.FilterId = `FLT${barcode.slice(-4)}`;
//     req.body.Barcode = barcode;

//     //check ahuid
//         // Check AHUId
//     let AHUId_check = req.body.AHUId;
//     // console.log('AHUId_check',AHUId_check)

//     if (AHUId_check === undefined || AHUId_check === null || AHUId_check === "") {
//       // AHUId is missing → create a new one
//       let data11 = {
//         Code: req.body.AHUName ,
//         Description: "",
//         Location: "",
//         Department: "",
//         Manufacturer: "",
//         ModelNo: "",
//         Capacity: 0,
//         Sparescount: 0,
//         Remarks: "",
//         CreatedBy: req.body.CreatedBy
//       };

//       const result = await handleRecordWithOutRes(data11, OperationEnums().AddAHUEnum);
//     //   console.log('result', result);

//       if (result?.Status && result?.ResultData?.length > 0) {
//         const NEWAHUID = result.ResultData[0].ID;

//         // 🔑 Save the new AHUId into the request body
//         req.body.AHUId = NEWAHUID;
//         AHUId_check = NEWAHUID;

//         // console.log("New AHUId generated:", NEWAHUID);
//       } else {
//         return res.status(500).json({ ResultMessage: "Failed to generate new AHUId", Status: false });
//       }
//     }

//       const newValues = req.body;
//       return handleRecord(req, res, newValues, OperationEnums().AddFilterLite);

//   } catch (err) {
//     console.error("Error in /AddFilterLite:", err);
//     res.status(500).json({ ResultMessage: err.message,Status:false });
//   }
// });

router.get("/getAHUIds", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getAHUId);
});

router.get("/getFilterType", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getFilterType);
});

router.get("/getLocationType", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getLocationType);
});

// router.get('/getFiltersList', (req, res) => {
//     // const data = {};
//     const {BlockId,Status,Barcode } = req.query;
//     if BlockId == 0:
//       BlockId = ' b.BlockId'
//     if Status == 0:
//       Status = 'pa.Status'
//     if Barcode == 0:
//       Barcode = 'pa.Barcode'
//     else :
//       Barcode = f'{Barcode}'

//     data = {BlockId:BlockId,Status:Status,Barcode:Barcode}
//     handleRecord(req, res, data, OperationEnums().getFiltersList);
// });

router.get("/getFiltersList", (req, res) => {
  let { BlockId, Status, Barcode } = req.query;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "b.BlockId";
  }

  if (Status == 0 || Status === undefined) {
    Status = "pa.Status";
  }

  if (Barcode == 0 || Barcode === undefined) {
    Barcode = "pa.Barcode";
  } else {
    Barcode = `${Barcode}`;
  }
  const data = { BlockId, Status, Barcode };

  handleRecord(req, res, data, OperationEnums().getFiltersList);
});

router.get("/getFiltersListPg", (req, res) => {
  let { BlockId, Status, Barcode } = req.query;
  const pageNumber = parseInt(req.query.pageNumber) || '1';
  const recordslimit = parseInt(req.query.recordslimit) || '50';
  const offset = (pageNumber - 1) * recordslimit;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "b.BlockId";
  }
  if (Status == 0 || Status === undefined) {
    Status = "pa.Status";
  }
  if (Barcode == 0 || Barcode === undefined) {
    Barcode = "pa.Barcode";
  } else {
    Barcode = `${Barcode}`;
  }
  const data = { BlockId, Status, Barcode ,offset:offset ,limit:recordslimit};
  handleRecord(req, res, data, OperationEnums().getFiltersListPg);
});

router.get("/getFiltersListDropdown", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getfilterlistdropdown);
});

router.post("/CheckOrderedStage", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().CheckOrderedStage);
});

router.post("/CheckOrderedStageRfId", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().OrderedStageRfId);
});

router.get("/GetFilterStatus", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().getFilterHistory);
});
router.get("/GetFilterInfoByCycle", (req, res) => {
  let { Status} = req.query;
  const data = { Status };
  handleRecord(req, res, data, OperationEnums().FltrInfoByCycle);
});
// router.post('/AddFilterHistory', (req, res) => {
//     const data = req.body;
//     handleRecordWithOutRes(req, res, data, OperationEnums().AddFilterHistory);

// });
router.post('/CheckFilterStatus', (req,res) => {
  let {Barcode} = req.body;
  const data = {Barcode};
  handlerecordwithrawresponse(req,res,data,OperationEnums().CheckFilterStatus);
});
router.post("/UpdateFilterStatus", async (req, res) => {
  const dataArray = req.body;

  if (!Array.isArray(dataArray)) {
    return res.status(400).json({
      ResultMessage: "Request body must be an array",
      Status: false,
      ResultData: [],
    });
  }

  let results = [];

  for (const data of dataArray) {
    try {
      console.log("data :", data);
      // Assuming handleRecordWithOutRes returns a result object
      const result = await handleRecordWithOutRes(data,OperationEnums().AddFilterHistory
      );
      results.push({ Barcode: data.Barcode, result });
    } catch (error) {
      results.push({
        Barcode: data.Barcode,
        result: {
          ResultMessage: "Failed to insert",
          Status: false,
          ResultData: [],
        },
      });
    }
  }

  res.json({
    ResultMessage: "Processed all records",
    Status: true,
    ResultData: results,
  });
});

router.get("/GetMastersEquipment", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().GetMastersEquipment);
});

router.get("/GetMastersReasons", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().GetMastersReasons);
});

router.get("/GetMastersPressure", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().GetMastersPressure);
});

router.get("/getAllUsers", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getAllUsers);
});

router.post("/updateTermination", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateTermination);
});

router.post("/updateUserInfo", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateuser);
});

router.post("/updateUserInfoPh2", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateuserph2);
});


router.get("/getStageCount", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getStageCount);
});

// router.post('/updateFilter', (req, res) => {
//     const data = req.body;
//     handleRecord(req, res, data, OperationEnums().updateFiltersList);
// });

// router.post('/AddAHU', (req, res) => {
//     const data = req.body;
//     handleRecord(req, res, data, OperationEnums().AddAHUEnum);
// });

// router.post('/updateAHU', (req, res) => {
//     const data = req.body;
//     handleRecord(req, res, data, OperationEnums().updateAHUEnum);
// });

router.post("/updateAHUstatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteAHU);
});

router.get("/getAHUList", (req, res) => {
  let { location } = req.query;

  if (location == 0 || location === undefined) {
    location = "phs.location";
  }

  const data = { location };

  handleRecord(req, res, data, OperationEnums().getAHUListEnum);
});

router.get("/getAssetType", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getAssetType);
});

router.post("/updateAssetTypestatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteAssetType);
});

router.post("/updateAssetType", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateAssetType);
});

router.post("/AddAssetType", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().AddAssetType);
});

router.get("/getMaintenanceStages", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getMaintenanceStages);
});

router.post("/addMaintenanceStages", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addMaintenanceStages);
});

router.post("/updateMaintenanceStages", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateMaintenanceStages);
});

router.post("/updateMaintenanceStagesstatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteMaintenanceStages);
});

router.get("/getlocations", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getlocations);
});

router.post("/addlocations", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addlocations);
});

router.post("/editlocations", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().editlocations);
});

router.post("/updatelocationsstatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deletelocations);
});

router.post("/AddWashInReasons", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().AddWashInReasons);
});

router.post("/updateWashInReasons", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateWashInReasons);
});
router.post("/updateWashInReasonsstatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteWashInReasons);
});

router.get("/getWashInReasons", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getWashInReasons);
});

router.post("/addPressure", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addPressure);
});

// router.post('/updatePressure', (req, res) => {
//     const data = req.body;
//     handleRecord(req, res, data, OperationEnums().updatePressure);
// });

router.post("/updatePressurestatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updatePressure);
});

router.get("/getPressure", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().getPressure);
});

router.get("/getEquipments", (req, res) => {
  // const data = req.query;

  let { Isdryer, blockid } = req.query;

  if (blockid == 0 || blockid === undefined) {
    blockid = "pe.blockid";
  }

  const data = { Isdryer, blockid };
  handleRecord(req, res, data, OperationEnums().getEquipments);
});

router.post("/addEquipments", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addEquipments);
});
router.post("/updateEquipments", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateEquipments);
});
router.post("/updateEquipmentsstatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteEquipments);
});

router.get("/getUserDashboardCount", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getUserDashboardCount);
});

router.get("/getAdminDashboardCount", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getAdminDashboardCount);
});

router.get("/getbarGraph", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getbarGraph);
});

// router.get('/getmenu', (req, res) => {
//     const {RoleId } = req.query;
//     const JsonData = { "RoleId":RoleId };
//     exeQuery.GetMenu(JsonData, (error, results) => {
//         if (error) {
//             return res.status(500).json({ error: error.message });
//         }
//         //console.log(results);
//         exeQuery.GetMenuNodes(results, (err, MenuList) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, Status: false });
//             }
//             res.json({
//                 ResultData: MenuList,
//                 Status: true
//             });
//         });
//     });
// });

router.post("/updatePressure", (req, res) => {
  const data = {
    ...req.body,
    ScreenOperationId: OperationEnums().updatePressure,
    Approvaltype: 2,
  };
  console.log(data);
  handleRecord(req, res, data, OperationEnums().addApprovalSetting);
});

router.get("/getApprovalSetting", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getApprovalSetting);
});

router.post("/updateApprovalSetting", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateApprovalSetting);
});

// router.post('/updateFilter', (req, res) => {
//     // const data = req.body;
//     // handleRecord(req, res, data, OperationEnums().updateFiltersList);
//     const data = {...req.body,ScreenOperationId:OperationEnums().updateFiltersList,Approvaltype:2};
//     console.log(data)
//     handleRecord(req, res, data, OperationEnums().addApprovalSetting);
// });

router.post("/updateAHU", (req, res) => {
  // const data = req.body;
  // handleRecord(req, res, data, OperationEnums().updateAHUEnum);
  const data = {
    ...req.body,
    ScreenOperationId: OperationEnums().updateAHUEnum,
    Approvaltype: 2,
  };
  console.log(data);
  handleRecord(req, res, data, OperationEnums().addApprovalSetting);
});

router.post("/AddAHU", (req, res) => {
  // const data = req.body;
  // handleRecord(req, res, data, OperationEnums().AddAHUEnum);

  const data = {
    ...req.body,
    ScreenOperationId: OperationEnums().AddAHUEnum,
    Approvaltype: 1,
    OldValues: {},
  };
  console.log(data);
  handleRecord(req, res, data, OperationEnums().addApprovalSetting);
});

// router.post('/AddAHU', (req, res) => {
//     // const data = req.body;
//     // handleRecord(req, res, data, OperationEnums().AddAHUEnum);

//     // const data = {...req.body,ScreenOperationId:OperationEnums().AddAHUEnum,Approvaltype:1,OldValues: {}};
//     // console.log(data)
//     const data = req.body.NewValues;
//     handleRecord(req, res, data, OperationEnums().AddAHUEnum);
// });

router.get("/api/save-cleaning-schedule", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let insertedSchedules = [];
    const result = await handleRecordWithOutRes(
      data,
      OperationEnums().AddFilterHistory
    );

    const ahuResult = await pool.request().query(`
            SELECT AHUId, InstalledOn, IntervalDays, ValidOperationLife
            FROM AHUDetails
            WHERE CurrentStatus = 'Active'
        `);

    for (const row of ahuResult.recordset) {
      const ahuId = row.AHUId;
      const installedOn = new Date(row.InstalledOn);
      const interval = row.IntervalDays;
      const validDays = row.ValidOperationLife;
      const expiryDate = new Date(
        installedOn.getTime() + validDays * 24 * 60 * 60 * 1000
      );

      // Get last scheduled date
      const lastScheduleResult = await pool
        .request()
        .input("AHUId", sql.Int, ahuId).query(`
                    SELECT TOP 1 ScheduledDate 
                    FROM AHUCleaningSchedule 
                    WHERE AHUId = @AHUId 
                    ORDER BY ScheduledDate DESC
                `);

      let lastScheduleDate =
        lastScheduleResult.recordset.length > 0
          ? new Date(lastScheduleResult.recordset[0].ScheduledDate)
          : installedOn;

      const nextDueDate = new Date(
        lastScheduleDate.getTime() + interval * 24 * 60 * 60 * 1000
      );

      // Compare only date part
      if (
        nextDueDate.toDateString() === today.toDateString() &&
        nextDueDate <= expiryDate
      ) {
        // Check if already inserted
        const existsResult = await pool
          .request()
          .input("AHUId", sql.Int, ahuId)
          .input("ScheduledDate", sql.Date, nextDueDate).query(`
                        SELECT COUNT(*) AS count 
                        FROM AHUCleaningSchedule 
                        WHERE AHUId = @AHUId AND ScheduledDate = @ScheduledDate
                    `);

        if (existsResult.recordset[0].count === 0) {
          await pool
            .request()
            .input("AHUId", sql.Int, ahuId)
            .input("ScheduledDate", sql.Date, nextDueDate).query(`
                            INSERT INTO AHUCleaningSchedule (AHUId, ScheduledDate)
                            VALUES (@AHUId, @ScheduledDate)
                        `);

          insertedSchedules.push({
            AHUId: ahuId,
            ScheduledDate: nextDueDate.toISOString().slice(0, 10),
          });
        }
      }
    }

    res.json({
      message: `${insertedSchedules.length} schedule(s) added`,
      schedules: insertedSchedules,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getRoleMenu", (req, res) => {
  const data = req.query;
  handleRecord(req, res, data, OperationEnums().getRoleMenu);
});

router.post("/updateRoleMenu", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateRoleMenu);
});

router.get("/getRoles", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getRoles);
});

router.get("/GetSchedules", (req, res) => {
  let { BlockId } = req.query;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "b.BlockId";
  }
  const data = { BlockId };
  handleRecord(req, res, data, OperationEnums().GetSchedules);
});

router.get("/GetTasks", (req, res) => {
  let { BlockId, startdate, enddate } = req.query;

  // Default fallback if value is 0 or undefined
  BlockId = BlockId == 0 || BlockId === undefined ? "b.BlockId" : BlockId;

  // // Wrap dates in single quotes only if valid, else use column reference
  // startdate = (startdate == 0 || startdate === undefined) ? 'acs.ScheduledDate' : startdate;
  // enddate = (enddate == 0 || enddate === undefined) ? 'acs.ScheduledDate' : enddate;

  const data = { BlockId, startdate, enddate };
  console.log("Query Data:", data);

  handleRecord(req, res, data, OperationEnums().GetTasks);
});

router.post("/canceltasks", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().canceltasks);
});

router.post("/addFilterRetirement", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addFilterReplaceOrRetirement);
});

router.get("/getReplacementList", (req, res) => {
  let { BlockId, Status, Barcode } = req.query;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "0";
  }
  // else {
  //   BlockId = `${BlockId}`;
  // }
  if (Barcode == 0 || Barcode === undefined) {
    Barcode = "0";
  } else {
    Barcode = `${Barcode}`;
  }
  const data = { BlockId, Status, Barcode };

  handleRecord(req, res, data, OperationEnums().getReplacementList);
});

router.get("/getRetirementList", (req, res) => {
  let { BlockId, Status, Barcode } = req.query;

  if (BlockId == 0 || BlockId === undefined) {
    BlockId = "b.BlockId";
  }

  if (Barcode == 0 || Barcode === undefined) {
    Barcode = "pa.Barcode";
  } else {
    Barcode = `${Barcode}`;
  }
  const data = { BlockId, Status, Barcode };

  handleRecord(req, res, data, OperationEnums().getRetirementList);
});

router.post("/AddprinterIpAdress", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().AddprinterIpAdress);
});

router.post("/EditprinterIpAdress", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().EditprinterIpAdress);
});

router.post("/deleteprinterIpAdress", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteprinterIpAdress);
});

router.get("/getprinterIpAdress", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getprinterIpAdress);
});

router.get("/getbarcodereport", (req, res) => {
  let { FilterId, startdate, enddate } = req.query;

  FilterId = FilterId == 0 || FilterId === undefined ? "0" : FilterId;

  const data = { FilterId, startdate, enddate };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getbarcodereport);
});
router.get("/getAuditReport", (req, res) => {
  let { PerformedBy, startdate, enddate } = req.query;
  PerformedBy;
  PerformedBy =
    PerformedBy == 0 || PerformedBy === undefined
      ? "p.PerformedBy"
      : PerformedBy;

  const data = { PerformedBy, startdate, enddate };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getAuditReport);
});

router.get("/getFilterCleaningReport", (req, res) => {
  let { Filterid, startdate, enddate } = req.query;

  Filterid = Filterid == 0 || Filterid === undefined ? "0" : Filterid;

  const data = { Filterid, startdate, enddate };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getFilterCleaningReport);
});

router.get("/getFilterHistoryReport", (req, res) => {
  let { Filterid, startdate, enddate } = req.query;

  Filterid = Filterid == 0 || Filterid === undefined ? "0" : Filterid;

  const data = { Filterid, startdate, enddate };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getFilterHistoryReport);
});

router.post("/addDeviations", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().addDeviations);
});

router.get("/getDeviationsReport", (req, res) => {
  let { Filterid, startdate, enddate, userid } = req.query;

  filterId = Filterid == 0 || Filterid === undefined ? "d.filterId" : Filterid;
  userid = userid == 0 || userid === undefined ? "pu.userid" : userid;

  const data = { filterId, startdate, enddate, userid };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getDeviationsReport);
});

router.get("/getFilterDryingReport", (req, res) => {
  let { Filterid, startdate, enddate, userid } = req.query;

  FilterId =
    Filterid == 0 || Filterid === undefined ? "fh3.FilterId" : Filterid;

  const data = { FilterId, startdate, enddate, userid };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().getFilterDryingReport);
});

router.get("/FiltertimingReport", (req, res) => {
  let { Filterid, startdate, enddate } = req.query;

  FilterId = Filterid == 0 || Filterid === undefined ? "0" : Filterid;

  const data = { FilterId, startdate, enddate };
  console.log("Query Data:", data);
  handleRecord(req, res, data, OperationEnums().FiltertimingReport);
});

// router.get('/getnotifications', (req, res) => {

//     let data = req.query;
//     handleRecord(req, res, data, OperationEnums().getnotifications);
// });

router.post("/updateFilterAvailabilityStatus", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateFilterAvailabilityStatus);
});

// router.post('/filterReplace', async (req, res) => {
//     try {
//         const data = req.body;

//         // ✅ Get location data from DB
//         const filterdata = await handleRecordWithOutRes(data, OperationEnums().getfilterdetails);

//         console.log('filterdata', filterdata);

//         // ✅ Proceed only if first response Status is true
//         if (filterdata && filterdata.Status === true) {
//             const upfijson = {
//                 id: data.id,
//                 Status: 104,
//                 remarks: "Retired due to replacement",
//                 updatedby: data.updatedby
//             };

//             const updatefilter = await handleRecordWithOutRes(upfijson, OperationEnums().addFilterReplaceOrRetirement);
//             res.json({ Status: true, message: "Filter updated successfully", updatefilter });
//         } else {
//             res.status(400).json({ Status: false, message: "Failed to fetch filter details" });
//         }
//     } catch (error) {
//         console.error("Error in /filterReplace:", error);
//         res.status(500).json({ Status: false, message: "Internal Server Error" });
//     }
// });

// router.post('/filterReplace', async (req, res) => {
//     try {
//         const data = req.body;

//         // Step 1: Get existing filter data
//         const filterdata = await handleRecordWithOutRes(data, OperationEnums().getfilterdetails);

//         console.log('filterdata', filterdata);

//         // Step 2: Proceed only if first response is successful
//         if (filterdata && filterdata.Status === true && filterdata.ResultData.length > 0) {
//             const existing = filterdata.ResultData[0];

//             // Step 3: Mark the existing filter as retired
//             const upfijson = {
//                 id: data.id,
//                 Status: 104,
//                 remarks: data.remarks,
//                 updatedby: data.updatedby
//             };
//             await handleRecordWithOutRes(upfijson, OperationEnums().addFilterReplaceOrRetirement);

//             // Step 4: Prepare new filter data
//             const pad = (n) => n.toString().padStart(2, '0');
//             const now = new Date();
//             const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
//             const barcode = timestamp.slice(-8);

//             const newValues = {
//                 ...existing,
//                 FilterId: `FLT${barcode.slice(-4)}`,
//                 Barcode: barcode,
//                 Lable: `${data.Lable || existing.Lable}-01`,
//                 InstalledOn: data.InstalledOn || new Date(), // Set new installed date
//                 CreatedBy: data.updatedby,
//             };

//             const totaldata = {
//                 ScreenName: "AddAHUFilter",
//                 ApiName: "filterReplace",
//                 NewValues: newValues,
//                 UpdateValues: "Lable",
//                 ScreenValues: "Lable",
//                 CreatedBy: data.updatedby,
//                 ScreenOperationId: OperationEnums().AddAHUFilter,
//                 Approvaltype: 1,
//                 OldValues: {}
//             };

//             console.log("New Filter Data:", totaldata.NewValues);

//             // Step 5: Call approval API to insert the new filter
//             await handleRecord(req, res, totaldata, OperationEnums().addApprovalSetting);
//         } else {
//             res.status(400).json({ Status: false, message: "Filter details not found." });
//         }
//     } catch (error) {
//         console.error("Error in /filterReplace:", error);
//         res.status(500).json({ Status: false, message: "Internal Server Error" });
//     }
// });

function getNewLabel(existingLabel, newLabel) {
  // Pick new label if given, else use existing one
  let baseLabel = newLabel || existingLabel;

  // Match last number, possibly with "_", "-", or "/" before it
  const match = baseLabel.match(/(.*?)([_\-\/]?)(\d+)$/);

  if (match) {
    const prefix = match[1];
    const separator = match[2]; // "_", "-", or ""
    const numStr = match[3];
    const num = parseInt(numStr, 10) + 1;

    // Keep padding only if the original number had leading zeros
    const nextNum =
      numStr.startsWith("0") && numStr.length > 1
        ? num.toString().padStart(numStr.length, "0")
        : num.toString();

    return prefix + separator + nextNum;
  } else {
    // If no number → add "-01"
    return baseLabel + "-01";
  }
}

router.post("/filterReplace", async (req, res) => {
  try {
    const data = req.body;

    // Step 1: Get existing filter data
    const filterdata = await handleRecordWithOutRes(
      data,
      OperationEnums().getfilterdetails
    );

    console.log("filterdata", filterdata);

    // Step 2: Proceed only if first response is successful
    if (
      filterdata &&
      filterdata.Status === true &&
      filterdata.ResultData.length > 0
    ) {
      const existing = filterdata.ResultData[0];

      

      // Step 4: Prepare new filter data
      const pad = (n) => n.toString().padStart(2, "0");
      const now = new Date();
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
        now.getDate()
      )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const barcode = timestamp.slice(-8);

      const newValues = {
        ...existing,
        FilterId:'',
        Barcode: '',
        Lable: getNewLabel(existing.Lable, data.Lable),
        InstalledOn: data.InstalledOn || new Date(), // Set new installed date
        CreatedBy: data.updatedby,
        OldId: data.id
      };
      // Get approval flag
      const isApproval = await getsysconfig("filterReplace");
      console.log("IsApproval:", isApproval);
      console.log("newValues:", newValues);
try {
      if (isApproval === false) {
        // No approval needed → directly insert
        var result = await handleRecordWithOutRes(
          newValues,
          OperationEnums().AddFilterLiteD
          
        );
        console.log(
          "AddFilterLiteD result (stringified):",
          JSON.stringify(result, null, 2)
        );
        // 🚨 Guard conditions
        if (
          result.Status === false ||
          (result.ResultData &&
            result.ResultData[0] &&
            result.ResultData[0].Message === "Existing label")
        ) {
          return res.json({
            Status: false,
            message: "Label is not Replaced, New Label Already Exists",
          });
        }
      } else {
        const totaldata = {
          ScreenName: "AddAHUFilter",
          ApiName: "filterReplace",
          NewValues: newValues,
          UpdateValues: "Lable",
          ScreenValues: "Lable",
          CreatedBy: data.updatedby,
          ScreenOperationId: OperationEnums().AddAHUFilter,
          Approvaltype: 1,
          OldValues: {},
        };
        // Step 5: Call approval API to insert the new filter
        return handleRecord(
          req,
          res,
          totaldata,
          OperationEnums().addApprovalSetting
        );
        
      }
      // Step 3: Mark the existing filter as retired
        const upfijson = {
          id: data.id,
          Status: 104,
          remarks: data.remarks,
          updatedby: data.updatedby,
        };
        await handleRecordWithOutRes(
          upfijson,
          OperationEnums().addFilterReplaceOrRetirement
        );
        // ✅ Final response (important: return!)
        return res.json({
          Status: true,
          message: "Filter replaced successfully.",
        });
      } catch (err) {
        console.error("Error while adding new filter:", err);
        return res.status(500).json({
          Status: false,
          message: "Error while adding new filter. Retirement skipped.",
          error: err.message || err,
        });
      }
    } else {
      res
        .status(400)
        .json({ Status: false, message: "Filter details not found." });
    }
  } catch (error) {
    console.error("Error in /filterReplace:", error);
    res.status(500).json({ Status: false, message: "Internal Server Error" });
  }
});

// router.post('/UpdateFilterStatusApproval', (req, res) => {
//     // Construct the full payload with ScreenOperationId and Approvaltype
//     const totaldata = {
//         ...req.body,
//         ScreenOperationId: OperationEnums().AddFilterHistory,
//         Approvaltype: 1,
//         OldValues: {}
//     };
//     handleRecord(req, res, totaldata, OperationEnums().addApprovalSetting);
// });

router.post("/UpdateFilterStatusApproval", (req, res) => {
  // Construct the full payload with ScreenOperationId and Approvaltype
  const totaldata = {
    ...req.body,
    ScreenOperationId: OperationEnums().updateFilterLocation,
    Approvaltype: 1,
    OldValues: {},
  };
  handleRecord(req, res, totaldata, OperationEnums().addApprovalSetting);
});

router.get("/getFilterStatusApproval", (req, res) => {
  let { userid } = req.query;
  userid = userid == 0 || userid === undefined ? "aps.CreatedBy" : userid;
  const data = { userid };
  handleRecord(req, res, data, OperationEnums().getFilterStatusApproval);
});

router.post("/addnotificationsToRole", (req, res) => {
  let data = req.body;
  data.Type = "role"; // force role type
  handleRecord(req, res, data, OperationEnums().addnotificationsToRole);
});

router.post("/addnotificationsToUser", (req, res) => {
  let data = req.body;
  data.Type = "user"; // force role type
  handleRecord(req, res, data, OperationEnums().addnotificationsToUser);
});

router.get("/getnotificationsToUser", (req, res) => {
  let { UserID } = req.query;
  const data = { UserID };
  handleRecord(req, res, data, OperationEnums().getnotificationsToUser);
});

router.get("/getnotificationcount", (req, res) => {
  let { UserID } = req.query;
  const data = { UserID };
  handleRecord(req, res, data, OperationEnums().getnotificationcount);
});

// router.get('/getnotificationsToRole', (req, res) => {
//     let { RoleID } = req.query;
//     const data = { RoleID };
//     handleRecord(req, res, data, OperationEnums().getnotificationsToRole);
// });

router.post("/updatenotificationsIsRead", (req, res) => {
  let data = req.body;
  handleRecord(req, res, data, OperationEnums().updatenotificationsIsRead);
});
router.get("/markAllReadNoti", (req, res) => {
  let { UserID } = req.query;
  let data = { UserID };
  handleRecord(req, res, data, OperationEnums().upnotiIsReadall);
});

///////////////////////

router.get("/getprocessnonprocess", (req, res) => {
  let { locType } = req.query;
  locType = locType === undefined || locType === null ? 0 : locType;
  let data = { locType };
  console.log("getprocessnonprocess Data:", data);
  handleRecord(req, res, data, OperationEnums().getprocessnonprocess);
});

router.post("/updateprocessnonprocess", (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateprocessnonprocess);
});

router.get("/getPressureBlockId", (req, res) => {
  let { BlockId, Type } = req.query;

  // fallback defaults if not passed
  BlockId = BlockId ? parseInt(BlockId) : 0;
  Type = Type || "";

  let data = { BlockId, Type };

  console.log("getPressure Data:", data);

  handleRecord(req, res, data, OperationEnums().getPressure);
});

// GET /getPressure?BlockId=32
router.get("/getPressureEquipments", (req, res) => {
  const { BlockId } = req.query;

  // Validate BlockId
  if (!BlockId || isNaN(BlockId)) {
    return res.status(400).json({
      ResultData: [
        { ResultMessage: "A valid BlockId is required", Status: "Failure" },
      ],
      Status: false,
    });
  }

  // Convert BlockId to integer
  const data = { BlockId: parseInt(BlockId, 10) };

  try {
    // Call existing handleRecord function
    handleRecord(req, res, data, OperationEnums().getPressureEquipments);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ResultData: [{ ResultMessage: err.message, Status: "Failure" }],
      Status: false,
    });
  }
});

router.post("/updatePressureEquipments", (req, res) => {
  // const data = {
  //     ...req.body,
  //     ScreenOperationId: OperationEnums().updatePressure, // your stored SQL
  //     Approvaltype: 2
  // };
  const data = req.body;

  console.log("Update Pressure:", data);
  handleRecord(req, res, data, OperationEnums().updatePressureEquipments);
});

router.post("/updatePressureEquipmentsLite", (req, res) => {
  const data = req.body;
console.log(data);
  console.log("Update Pressure:", data);
  handleRecord(req, res, data, OperationEnums().updatePressureEquipmentsLite);
});

router.post("/addRequestUser", (req, res) => {
  const data = req.body;

  // Add OperationEnum for clarity
  const operation = OperationEnums().addRequestUser;

  console.log("Add Request_User:", data);

  // Call handleRecord to perform the insert
  handleRecord(req, res, data, operation);
});

// Get full Pressure table data by BlockId
router.get("/getPressureByBlock", (req, res) => {
  let { blockId } = req.query;

  if (!blockId) {
    return res.status(400).json({
      Status: false,
      Message: "BlockId is required",
    });
  }

  let data = { BlockId: blockId };

  console.log("Fetching Pressure Data for BlockId:", data);

  handleRecord(req, res, data, OperationEnums().getPressure);
});
router.get("/getPressureWithStepInc", (req, res) => {
  let { blockId } = req.query;

  if (!blockId) {
    return res.status(400).json({
      Status: false,
      Message: "BlockId is required",
    });
  }

  let data = { BlockId: blockId };

  console.log("Fetching Pressure Data for BlockId:", data);

  exeQuery.execStepIncrement(data, OperationEnums().getPressure)
    .then((rawResults) => {
      // do your step expansion BEFORE sending
      const processed = rawResults.map(r => ({
        ...r,
        Steps: utilCode.expandSteps(r.Min, r.max, r.LeastCount)
      }));

      res.json({ ResultData: processed, Status: true });
    })
    .catch((err) => {
      console.error("Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });

});

router.get("/getPressureWithStepIncPhase2", (req, res) => {
  let { blockId,PressureGroupId } = req.query;

  if (!blockId) {
    return res.status(400).json({
      Status: false,
      Message: "BlockId is required",
    });
  }
  if (!PressureGroupId) {
    return res.status(400).json({
      Status: false,
      Message: "PressureGroupId is required",
    });
  }

  let data = { BlockId: blockId,PressureGroupId:PressureGroupId };

  console.log("Fetching Pressure Data for BlockId:", data);

  exeQuery.execStepIncrement(data, OperationEnums().getPressureph2)
    .then((rawResults) => {
      // do your step expansion BEFORE sending
      const processed = rawResults.map(r => ({
        ...r,
        Steps: utilCode.expandSteps(r.Min, r.max, r.LeastCount)
      }));

      res.json({ ResultData: processed, Status: true });
    })
    .catch((err) => {
      console.error("Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    });

});
router.get("/getRequestUser", async (req, res) => {
  const data = {}; // no input needed as we fetch all active users
  handleRecord(req, res, data, OperationEnums().getRequestUser);
});

router.get("/getallRequestUser", async (req, res) => {
  const data = {}; // no input needed as we fetch all active users
  handleRecord(req, res, data, OperationEnums().getallRequestUser);
});

// router.post("/updateRequestUser", async (req, res) => {
//     const data = { ...req.body };  // JSON body from client
//     handleRecord(req, res, data, OperationEnums().updateRequestUser);
// });

router.get("/getfilterdryintemppendinglist", async (req, res) => {
  // const data = {};  // no input needed as we fetch all active users
  let { blockid } = req.query;

  if (blockid == 0 || blockid === undefined) {
    blockid = "fh3.blockid";
  }
  const data = { blockid };
  handleRecord(req, res, data, OperationEnums().getfilterdryintemppending);
});

router.post("/updatedryintemp", async (req, res) => {
  const data = req.body; // JSON body from client
  handleRecord(req, res, data, OperationEnums().updatedryintemp);
});

router.post("/updateFilterCurrentStatus", async (req, res) => {
  const data = req.body; // JSON body from client

  // Convert id array [28,29] → "28,29"
  if (Array.isArray(data.id)) {
    data.id = data.id.join(",");
  }

  console.log("data", data);

  handleRecord(req, res, data, OperationEnums().updateFilterCurrentStatus);
});

router.get("/getlocationsforPresures", async (req, res) => {
  const data = {}; // no input needed as we fetch all active users
  handleRecord(req, res, data, OperationEnums().getlocationsforPresures);
});

router.post("/AddFilterLite", async (req, res) => {
  try {
    console.log("📦 Final newValues before DB insert:", req.body);
    const pad = (n) => n.toString().padStart(2, "0");
    const now = new Date();
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const barcode = timestamp.slice(-8);

    // 🔑 Generate FilterId & Barcode
    req.body.FilterId = `FLT${barcode.slice(-4)}`;
    req.body.Barcode = barcode;

    // 🔍 AHUId check
    let AHUId_check = req.body.AHUId;

    if (!AHUId_check) {
      let data11 = {
        Code: req.body.AHUName,
        Description: "",
        Location: "",
        Department: "",
        Manufacturer: "",
        ModelNo: "",
        Capacity: 0,
        Sparescount: 0,
        Remarks: "",
        CreatedBy: req.body.CreatedBy,
      };

      const result = await handleRecordWithOutRes(
        data11,
        OperationEnums().AddAHUEnum
      );

      if (result?.Status && result?.ResultData?.length > 0) {
        const NEWAHUID = result.ResultData[0].ID;
        req.body.AHUId = NEWAHUID;
        AHUId_check = NEWAHUID;
      } else {
        return res.status(500).json({
          ResultMessage: "Failed to generate new AHUId",
          Status: false,
        });
      }
    }

    const newValues = req.body;
    console.log("📦 Final newValues before DB insert:", newValues);

    if (!newValues.LastCleaningDate || newValues.LastCleaningDate.toUpperCase() === "NULL") {
      newValues.LastCleaningDate = null; // set to null for SQL
    } else if (newValues.LastCleaningDate === "") {
      newValues.LastCleaningDate = null; // also handle empty string
    }
    newValues.OldId = 0;  // For RefId
    return await handleRecord(
        req,
        res,
        newValues,
        OperationEnums().AddFilterLiteD
      );
  } catch (err) {
    console.error("Error in /AddFilterLite:", err);
    res.status(500).json({ ResultMessage: err.message, Status: false });
  }
});

router.post("/updateFilterLite", async (req, res) => {
  try {
    // Check AHUId
    let AHUId_check = req.body.AHUId;
    // console.log('AHUId_check',AHUId_check)
    console.log("AHUId_check", AHUId_check);
    // if (AHUId_check === undefined || AHUId_check === null || AHUId_check === "") {
    if (!AHUId_check) {
      // AHUId is missing → create a new one
      let data11 = {
        Code: req.body.AHUName,
        Description: "",
        Location: "",
        Department: "",
        Manufacturer: "",
        ModelNo: "",
        Capacity: 0,
        Sparescount: 0,
        Remarks: "",
        CreatedBy: req.body.updatedby,
      };
      console.log("data11", data11);

      const result = await handleRecordWithOutRes(
        data11,
        OperationEnums().AddAHUEnum
      );
      //   console.log('result', result);

      if (result?.Status && result?.ResultData?.length > 0) {
        const NEWAHUID = result.ResultData[0].ID;

        // 🔑 Save the new AHUId into the request body
        req.body.AHUId = NEWAHUID;
        AHUId_check = NEWAHUID;

        // console.log("New AHUId generated:", NEWAHUID);
      } else {
        return res
          .status(500)
          .json({ error: "Failed to generate new AHUId", Status: false });
      }
    }
    const newValues = req.body;
    if (
      !newValues.LastCleaningDate ||
      newValues.LastCleaningDate.toUpperCase() === "NULL"
    ) {
      newValues.LastCleaningDate = null;
      return handleRecord(
        req,
        res,
        newValues,
        OperationEnums().updateFilterLite
      );
    } else {
      return handleRecord(
        req,
        res,
        newValues,
        OperationEnums().updateFilterLiteD
      );
    }
  } catch (err) {
    console.error("Error in /updateFilterLite:", err);
    res.status(500).json({ error: err.message, Status: false });
  }
});


router.post("/updateRfid", async (req, res) => {
  const data = req.body; // JSON body from client
  handleRecord(req, res, data, OperationEnums().addRfid);
});

router.get("/getRfid", (req, res) => {
  const { FilterId } = req.query;
  // Convert BlockId to integer
  const data = { FilterId: FilterId };
  handleRecord(req, res, data, OperationEnums().getRfid);
  
});


// module.exports = router;
module.exports = {
  router,
  handleRecordWithOutRes,
  getsysconfig,getNewLabel
};
