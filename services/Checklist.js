const express = require("express");
const dbUtility = require("../dal/dbUtility.js");
const { OperationEnums } = require("../utilityEnum.js");
const { handleRecord,handleRecordWithOutRes, } = require("../dal/dbspconn.js");

const ChecklistRoutes = express.Router();



ChecklistRoutes.get("/getChecklistWithQuestions", async (req, res) => {
  const data = {};
  const results = [];
  // handleRecord(req, res, data, OperationEnums().getChecklistWithQuestions);
  try {
        console.log("data :", data);
        // Assuming handleRecordWithOutRes returns a result object
        const result = await handleRecordWithOutRes(data,OperationEnums().getChecklistWithQuestions);

      
          return res.json({result
          });

        } catch (error) {
          console.error(error);
          return res.status(500).json({
            Status: false,
            error: error.message
          });
        }
      });


ChecklistRoutes.get("/getstages", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getstages);
});

//region Filter types
ChecklistRoutes.get("/getChecklist", (req, res) => {
  const data = {};
  handleRecord(req, res, data, OperationEnums().getChecklist);
});

ChecklistRoutes.post("/addChecklist", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().addChecklist);
});

ChecklistRoutes.post("/updateChecklist", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateChecklist);
});

ChecklistRoutes.post("/deleteChecklist", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteChecklist);
});

ChecklistRoutes.get("/getallChecklistItems", (req, res) => {
  let { ChecklistId } = req.query;
  // Convert BlockId to integer
  if (ChecklistId == 0 || ChecklistId === undefined) {
    ChecklistId = "ChecklistId";
  } else {
    ChecklistId = `${ChecklistId}`;
  }
  const data = { ChecklistId: ChecklistId };
  console.log('data',data)
  handleRecord(req, res, data, OperationEnums().getallChecklistItems);

});

ChecklistRoutes.post("/addChecklistItems", async (req, res) => {
  const data = { ...req.body };
  handleRecord(req, res, data, OperationEnums().addChecklistItems);
});

ChecklistRoutes.post("/updateChecklistItems", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().updateChecklistItems);
});
ChecklistRoutes.post("/deleteChecklistItems", async (req, res) => {
  const data = req.body;
  handleRecord(req, res, data, OperationEnums().deleteChecklistItems);
});


ChecklistRoutes.post("/AddFilterInspection", async (req, res) => {
  const dataArray = req.body;

  if (!Array.isArray(dataArray)) {
    return res.status(400).json({
      ResultMessage: "Request body must be an array",
      Status: false,
      ResultData: [],
    });
  }

      const results = []; // ✅ declare results array


  for (const data of dataArray) {
    try {
      console.log("data :", data);
      // Assuming handleRecordWithOutRes returns a result object
      const result = await handleRecordWithOutRes(data,OperationEnums().AddFilterInspection);

    results.push({
        Status: true,
        ResultData: result,
      });
    } catch (error) {
      results.push({
        Status: false,
        error: error.message,
      });
    }
  }

  return res.json({
    ResultMessage: "Filter inspection processed",
    Status: true,
    ResultData: results,
  });
});



// module.exports = router;
module.exports = {
  ChecklistRoutes
};
