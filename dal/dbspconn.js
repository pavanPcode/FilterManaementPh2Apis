const dbUtility = require("../dal/dbUtility.js");



const executeStoredProcedure = (req, res, data, operationId) => {
  const jsonData = JSON.stringify(data);
  const sqlQuery = `
          DECLARE @ResultMessage NVARCHAR(MAX);
          DECLARE @STATUS NVARCHAR(MAX); 
          EXEC [dbo].[SP_ScreenOperations]
              @OperationId = '${operationId}',
              @JsonData = '${jsonData}',
              @ResultMessage = @ResultMessage OUTPUT,
              @STATUS = @STATUS OUTPUT; 
          SELECT @ResultMessage AS ResultMessage, @STATUS AS Status; 
      `;

  console.log(sqlQuery);
  dbUtility
    .executeQuery(sqlQuery)
    .then((results) => {
      // console.log("executeQuery success:", results);
      handleResponse(res, null, results)
    })
    .catch((error) => {
      console.error("executeQuery error:", error);
      handleResponse(res, error, null);
    });
};

const handleResponse = (res, error, results) => {
  if (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } else if (results && results.length > 0) {
    res.json({ ResultData: results, Status: true });
  } else {
    res.status(200).json({ error: "No records found", Status: false });
  }
};
const handlerecordwithrawresponse = (req, res, data, operationId) => {
  const jsonData = JSON.stringify(data);
  const sqlQuery = `
    DECLARE @ResultMessage NVARCHAR(MAX);
    DECLARE @STATUS NVARCHAR(MAX); 
    EXEC [dbo].[SP_ScreenOperations]
        @OperationId = '${operationId}',
        @JsonData = '${jsonData}',
        @ResultMessage = @ResultMessage OUTPUT,
        @STATUS = @STATUS OUTPUT; 
    SELECT @ResultMessage AS ResultMessage, @STATUS AS Status; 
  `;

  console.log("Executing Raw SP Query:\n", sqlQuery);

  dbUtility
    .executeQuery(sqlQuery)
    .then((results) => {
      console.log("executeStoredProcedureRaw success:", results);

      if (results && results.length > 0) {
        const raw = results[0];

        const key = Object.keys(raw)[0];
        let parsedResult;

        let resultData;

        try {
        // Attempt to parse JSON string if it’s valid JSON
        resultData = JSON.parse(raw[key]);
        } catch {
        // If not JSON, just return raw value
        resultData = raw[key];
        }

        return res.json(resultData);
      } else {
        return res.status(200).json({
          Status: false,
          message: "No records found",
        });
      }
    })
    .catch((error) => {
      console.error("executeStoredProcedureRaw error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

const handleRecord = (req, res, data, operationId) => {
  executeStoredProcedure(req, res, data, operationId);
  // console.log(res);
};

const handleResponseWithOutRes = (error, results) => {
  // console.log('handleResponseWithOutRes',results)
  if (error) {
    console.error("Error:", error);
    return { error: "Internal Server Error", Status: false };
  } else if (results && results.length > 0) {
    return { ResultData: results, Status: true };
  } else {
    return { error: "No records found", Status: false };
  }
};

const executeStoredProcedureWithOutRes = async (data, operationId) => {
  try {
    const jsonData = JSON.stringify(data);
    const sqlQuery = `
          DECLARE @ResultMessage NVARCHAR(MAX);
          DECLARE @STATUS NVARCHAR(MAX); 
          EXEC [dbo].[SP_ScreenOperations]
              @OperationId = '${operationId}',
              @JsonData = '${jsonData}',
              @ResultMessage = @ResultMessage OUTPUT,
              @STATUS = @STATUS OUTPUT; 
          SELECT @ResultMessage AS ResultMessage, @STATUS AS Status; 
      `;

    console.log(sqlQuery);
    const results = await dbUtility.executeQuery(sqlQuery);
    return handleResponseWithOutRes(null, results);
  } catch (error) {
    return handleResponseWithOutRes(error, null);
  }
};

//   dbUtility
//     .executeQuery(sqlQuery)
//     .then((results) => handleResponseWithOutRes(null, results))
//     .catch((error) => handleResponseWithOutRes(error, null));
// };

const handleRecordWithOutRes = (data, operationId) => {
  return executeStoredProcedureWithOutRes(data, operationId);
};


module.exports = {
  handleRecord,
  handleRecordWithOutRes,
};
