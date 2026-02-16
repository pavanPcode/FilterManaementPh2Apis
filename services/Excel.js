const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const axios = require('axios');
const router = express.Router();
const fs = require('fs');
const { handleRecordWithOutRes } = require('./server'); // Adjust path as needed
const { OperationEnums } = require("../utilityEnum.js");

// Multer setup to handle file upload
const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const uploadph2 = multer({ storage: multer.memoryStorage() });


router.post('/upload-ahu-excel', upload.single('file'), async (req, res) => {
  try {
    // ✅ Get CreatedBy from multiple sources
    const CreatedBy =
      req.user?.UserID ||
      req.body.userId ||
      req.body.UserID ||
      req.headers['userid'];

    if (!CreatedBy) {
      return res.status(401).json({ error: 'UserID missing in request', status: false });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded', status: false });
    }

    // ✅ Get location data from DB
    const locRes = await handleRecordWithOutRes({}, OperationEnums().getlocations);
    const locationData = Array.isArray(locRes?.ResultData) ? locRes.ResultData : [];

    // ✅ Build normalized location map (case-insensitive)
    const locationMap = {};
    locationData.forEach(loc => {
      if (loc.BlockName && loc.BlockId) {
        locationMap[loc.BlockName.trim().toLowerCase()] = loc.BlockId;
      }
    });

    // ✅ Read Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    const sheet = workbook.getWorksheet('AHU Sample');

    if (!sheet) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Sheet "AHU Sample" not found', status: false });
    }

    const insertedRows = [];
    let totalInserted = 0;

    // ✅ Loop rows starting from row 2
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const values = row.values.slice(1); // Skip index 0

      if (values.length < 9) continue;

      const [
        Code,
        Description,
        LocationName,
        Department,
        Manufacturer,
        ModelNo,
        Capacity,
        Sparescount,
        Remarks
      ] = values;

      const normalizedLocation = LocationName?.trim().toLowerCase();
      const Location = locationMap[normalizedLocation];

      if (!Location) {
        console.warn(`Skipping row ${rowNumber}: Unknown Location "${LocationName}"`);
        continue;
      }

      const NewValues = {
        Code,
        Description,
        Location,
        Department,
        Manufacturer,
        ModelNo,
        Capacity,
        Sparescount,
        Remarks,
        CreatedBy
      };

      const payload = {
        ScreenName: "AddAHU",
        ApiName: "AddAHU",
        NewValues,
        UpdateValues: "",
        ScreenValues: "",
        CreatedBy
      };

      const data = {
        ...payload,
        ScreenOperationId: OperationEnums().AddAHUEnum,
        Approvaltype: 1,
        OldValues: {}
      };

      const result = await handleRecordWithOutRes(data, OperationEnums().addApprovalSetting);

      if (result?.Status === true) {
        totalInserted++;
        insertedRows.push(NewValues);
      } else {
        console.warn(`❌ Failed to insert row ${rowNumber}:`, result?.error || 'Unknown error');
      }
    }

    // ✅ Delete uploaded temp file
    fs.unlinkSync(file.path);

    return res.status(200).json({
      message: `File processed. ${totalInserted} row(s) inserted.`,
      total: totalInserted,
      insertedRows,
      status: true
    });

  } catch (err) {
    console.error('❌ Excel upload error:', err);
    return res.status(500).json({ error: 'Failed to process Excel file', status: false });
  }
});


router.post(  '/upload-ahu-excel-Phase2',uploadph2.single('file'),async (req, res) => {
    try {
      const { CreatedBy, BlockId, AreaId } = req.body;

      // Basic validation
      if (!req.file) {
        return res.status(400).json({ message: 'Excel file is required' });
      }
      if (!CreatedBy || !BlockId || !AreaId) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.file.buffer);

      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        return res.status(400).json({ message: 'Invalid Excel file' });
      }

      const successRows = [];
      const failedRows = [];

      // Loop through rows
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);

        const code = row.getCell(1).value;
        const processTypeText = row.getCell(2).value;
        const scheduleDate = row.getCell(3).value;
        const freqAllowanceDays = row.getCell(4).value;
        const cleaningDays = row.getCell(5).value;

        // Skip empty rows
        if (!code) continue;

        // Convert ProcessType
        let processType;
        if (processTypeText === 'Process') processType = 1;
        else if (processTypeText === 'Non-Process') processType = 2;
        else {
          failedRows.push({
            rowNumber,
            Code: code,
            error: 'Invalid ProcessType'
          });
          continue;
        }

        const payload = {
          Code: String(code),
          ProcessType: processType,
          ScheduleDate: scheduleDate
            ? new Date(scheduleDate).toISOString().split('T')[0]
            : null,
          FreqAllowanceDays: Number(freqAllowanceDays) || 0,
          cleaningDays: Number(cleaningDays) || 0,
          CreatedBy: Number(CreatedBy),
          BlockId: Number(BlockId),
          AreaId: Number(AreaId)
        };

        try {
          // 🔥 Call DB / Business Logic for every record
          await handleRecordWithOutRes(payload,OperationEnums().addahu);

          successRows.push({
            rowNumber,
            Code: payload.Code
          });

        } catch (err) {
          failedRows.push({
            rowNumber,
            Code: payload.Code,
            error: err.message
          });
        }
      }

      return res.status(200).json({
        message: 'Excel processed successfully',
        total: successRows.length + failedRows.length,
        successCount: successRows.length,
        failedCount: failedRows.length,
        failedRows,
        status: true
      });

    } catch (err) {
      console.error('Upload AHU Excel error:', err);
      res.status(500).json({ message: 'Internal Server Error',status: false });
    }
  }
);

// API to download sample Excel file
router.get('/sample-ahu-excel-Phase2', async (req, res) => {
  try {

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('AHU Sample');

    sheet.columns = [
      { header: 'Code', key: 'Code', width: 20  },
      { header: 'ProcessType', key: 'ProcessType', width: 20  },
      { header: 'ScheduleDate', key: 'ScheduleDate', width: 20  },
      { header: 'FreqAllowanceDays', key: 'FreqAllowanceDays', width: 20  },
      { header: 'cleaningDays', key: 'cleaningDays', width: 20  }
    ];

    // Add dropdown validation for ProcessType (B column)
    sheet.dataValidations.add('B2:B1000', {
      type: 'list',
      allowBlank: true,
      formulae: ['"Process,Non-Process"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please select either Process or Non-Process'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ahu_sample.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel:', err.message);
    res.status(500).json({ error: 'Failed to generate sample Excel file' });
  }
});

router.get('/sample-ahu-excel', async (req, res) => {
  try {
    // const apiUrl = 'http://localhost:8080/api/getlocations'; // Use .env in production

    // const { data } = await axios.get(apiUrl);
    // const locationNames = data.ResultData.map(loc => loc.BlockName);

    // 🔄 Fetch location data using SP-based method only
    const locRes = await handleRecordWithOutRes({}, OperationEnums().getlocations);

    if (!locRes || !locRes.Status) {
      console.error('Failed to fetch locations:', locRes?.error || 'Unknown error');
      return res.status(500).json({ error: 'Failed to fetch locations' });
    }
    const locationNames = locRes.ResultData.map(loc => loc.BlockName);


    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('AHU Sample');

    sheet.columns = [
      { header: 'Code', key: 'Code' },
      { header: 'Description', key: 'Description' },
      { header: 'Location', key: 'Location' },
      { header: 'Department', key: 'Department' },
      { header: 'Manufacturer', key: 'Manufacturer' },
      { header: 'ModelNo', key: 'ModelNo' },
      { header: 'Capacity', key: 'Capacity' },
      { header: 'Sparescount', key: 'Sparescount' },
      { header: 'Remarks', key: 'Remarks' },
    ];

    for (let i = 2; i <= 100; i++) {
      sheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${locationNames.join(',')}"`],
        showErrorMessage: true,
        error: 'Please select a valid location from dropdown.'
      };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ahu_sample.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel:', err.message);
    res.status(500).json({ error: 'Failed to generate sample Excel file' });
  }
});

router.get("/sampleFilterExcelLite", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Filter Sample");

    // ✅ Define only the requested columns
    sheet.columns = [
      { header: "Block", key: "Location" },
      { header: "AHU ID", key: "AHUId" },
      { header: "AHU Type", key: "Locationtype" },
      { header: "Filter ID", key: "Lable" },
      { header: "Filter Size (In Micron)", key: "MicronRating" },
      { header: "Filter Type/Category", key: "AssetType" },
      { header: "Filter Dimension (In mm)", key: "Dimensions" },
      { header: "Cleaning Frequency (In Days)", key: "cleaningdays" },
      { header: "Tolerance (In Days)", key: "cleaningFreqAllowance" },
      { header: "Last Cleaning Date", key: "LastCleaningDate" }
    ];

    // ✅ Bold headers
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // 🔄 Fetch dropdown sources
    const locationRes = await handleRecordWithOutRes({}, OperationEnums().getlocations);
    const locationNames = locationRes?.Status
      ? locationRes.ResultData.map(loc => loc.BlockName?.trim()).filter(Boolean)
      : [];

    const ahuRes = await handleRecordWithOutRes({}, OperationEnums().getAHUId);
    const ahuCodes = ahuRes?.Status
      ? ahuRes.ResultData.map(item => item.code?.trim()).filter(Boolean)
      : [];

    const filterTypeRes = await handleRecordWithOutRes({}, OperationEnums().GETFILTERTYPES);
    const filterTypes = filterTypeRes?.Status
      ? filterTypeRes.ResultData.map(ft => ft.AssetType?.trim()).filter(Boolean)
      : [];

    const locTypeRes = await handleRecordWithOutRes({ locType: 1 }, OperationEnums().getprocessnonprocess);
    const locTypes = locTypeRes?.Status
      ? locTypeRes.ResultData.map(item => item.BlockName?.trim()).filter(Boolean)
      : [];

    // 🔒 Hidden sheet for dropdown sources
    const hiddenSheet = workbook.addWorksheet("DropdownSources");
    hiddenSheet.state = "veryHidden";

    hiddenSheet.getColumn(1).values = ["Blocks", ...locationNames];
    hiddenSheet.getColumn(2).values = ["AHU Codes", ...ahuCodes];
    hiddenSheet.getColumn(3).values = ["Filter Types", ...filterTypes];
    hiddenSheet.getColumn(4).values = ["Location Types", ...locTypes];

    // 🔽 Apply validations
    for (let i = 2; i <= 100; i++) {
      // ✅ Block (Column A)
sheet.getCell(`A${i}`).dataValidation = {
  type: "list",
  allowBlank: true,
  formulae: [`DropdownSources!$A$2:$A$${locationNames.length + 1}`],
  showErrorMessage: true,
  error: "Please select a valid Block."
};

// ✅ AHU ID (Column B)
sheet.getCell(`B${i}`).dataValidation = {
  type: "list",
  allowBlank: true,
  showDropDown: true,
  formulae: [`DropdownSources!$B$2:$B$${ahuCodes.length + 1}`],
  showErrorMessage: false
};

// ✅ AHU Type (Column C)
sheet.getCell(`C${i}`).dataValidation = {
  type: "list",
  allowBlank: true,
  formulae: [`DropdownSources!$D$2:$D$${locTypes.length + 1}`],
  showErrorMessage: true,
  error: "Please select a valid AHU Type."
};

// ✅ Filter Type/Category (Column F)
sheet.getCell(`F${i}`).dataValidation = {
  type: "list",
  allowBlank: true,
  formulae: [`DropdownSources!$C$2:$C$${filterTypes.length + 1}`],
  showErrorMessage: true,
  error: "Please select a valid Filter Type."
};

      // ✅ LastCleaningDate (Column J) - Allow Date or "NA"
sheet.getCell(`J${i}`).dataValidation = {
  type: 'custom',
  formulae: [
    `OR(ISNUMBER(J${i}),UPPER(J${i})="NA")`
  ],
  allowBlank: true,
  showErrorMessage: true,
  errorTitle: 'Invalid Value',
  error: 'Please enter a valid date (YYYY-MM-DD) or NA.'
};
    }

    // 📤 Send Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ahu_filter_sample.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error generating sample filter Excel:", err);
    res.status(500).json({ error: "Failed to generate sample file", status: false });
  }
});


router.get('/sample-filter-excel', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('AHU Filter Sample');

    // Define columns
    sheet.columns = [
      { header: 'AHUId (Select AHU Code)', key: 'AHUId' }, 
      { header: 'Filter ID', key: 'Lable' },                   
      { header: 'Filter Type', key: 'AssetType' }, 
      { header: 'Manufacturer', key: 'Manufacturer' },         
      { header: 'InstalledOn (YYYY-MM-DD)', key: 'InstalledOn' }, 
      { header: 'Block', key: 'Location' },                    
      { header: 'Dimensions', key: 'Dimensions' },             
      { header: 'MicronRating', key: 'MicronRating' },         
      { header: 'Max Allowed Cleaning', key: 'CleaningLimit' },       
      { header: 'LastCleaningDate (YYYY-MM-DD)', key: 'LastCleaningDate' }, 
      { header: 'ValidOperationLife (in days)', key: 'ValidOperationLife' }, 
      { header: 'CurrentStatus', key: 'CurrentStatus' },       
      { header: 'AvailabilityStatus', key: 'AvailabilityStatus' }, 
      { header: 'cleaningFreqAllowance', key: 'cleaningFreqAllowance' }, 
      { header: 'ROmax', key: 'ROmax' },                       
      { header: 'ROmin', key: 'ROmin' },                       
      { header: 'AirMax', key: 'AirMax' },                     
      { header: 'AirMin', key: 'AirMin' },                     
      { header: 'Cleaning Frequency', key: 'cleaningdays' },         
      { header: 'LocationType', key: 'Locationtype' }          
    ];

    // 🔄 Fetch data
    const locationRes = await handleRecordWithOutRes({}, OperationEnums().getlocations);
    const locationNames = locationRes?.Status
      ? locationRes.ResultData.map(loc => loc.BlockName?.trim()).filter(Boolean)
      : [];

    const ahuRes = await handleRecordWithOutRes({}, OperationEnums().getAHUId);
    const ahuCodes = ahuRes?.Status
      ? ahuRes.ResultData.map(item => item.code?.trim()).filter(Boolean)
      : [];

    const filterTypeRes = await handleRecordWithOutRes({}, OperationEnums().GETFILTERTYPES);
    const filterTypes = filterTypeRes?.Status
      ? filterTypeRes.ResultData.map(ft => ft.AssetType?.trim()).filter(Boolean)
      : [];

    // ✅ Fetch Location Types (Process / Non-Process)
    const locTypeRes = await handleRecordWithOutRes({ locType: 1 }, OperationEnums().getprocessnonprocess);
    const locTypes = locTypeRes?.Status
      ? locTypeRes.ResultData.map(item => item.BlockName?.trim()).filter(Boolean)
      : [];

    const availabilityStatusOptions = ['In Use', 'Spare'];
    const currentStatusOptions = ['Active', 'Cleaning', 'Storage'];

    // 🔒 Hidden sheet for dropdown sources
    const hiddenSheet = workbook.addWorksheet('DropdownSources');
    hiddenSheet.state = 'veryHidden';

    hiddenSheet.getColumn(1).values = ['AHU Codes', ...ahuCodes];
    hiddenSheet.getColumn(2).values = ['Filter Types', ...filterTypes];
    hiddenSheet.getColumn(3).values = ['Locations', ...locationNames];
    hiddenSheet.getColumn(4).values = ['Current Status', ...currentStatusOptions];
    hiddenSheet.getColumn(5).values = ['Availability Status', ...availabilityStatusOptions];
    hiddenSheet.getColumn(6).values = ['Location Types', ...locTypes]; // ✅ NEW

    // 🔽 Apply validations
    for (let i = 2; i <= 100; i++) {
      // sheet.getCell(`A${i}`).dataValidation = {
      //   type: 'list',
      //   allowBlank: true,
      //   formulae: [`DropdownSources!$A$2:$A$${ahuCodes.length + 1}`],
      //   showErrorMessage: true,
      //   error: 'Please select a valid AHU Code.'
      // };

      sheet.getCell(`A${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        showDropDown: true, // ✅ allows manual typing
        formulae: [`DropdownSources!$A$2:$A$${ahuCodes.length + 1}`],
        showErrorMessage: false // don’t block manual entries
      };

      sheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DropdownSources!$B$2:$B$${filterTypes.length + 1}`],
        showErrorMessage: true,
        error: 'Please select a valid Filter Type.'
      };

      sheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DropdownSources!$C$2:$C$${locationNames.length + 1}`],
        showErrorMessage: true,
        error: 'Please select a valid Location.'
      };

      sheet.getCell(`L${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DropdownSources!$D$2:$D$${currentStatusOptions.length + 1}`],
        showErrorMessage: true,
        error: 'Please select a valid Current Status.'
      };

      sheet.getCell(`M${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DropdownSources!$E$2:$E$${availabilityStatusOptions.length + 1}`],
        showErrorMessage: true,
        error: 'Please select a valid Availability Status.'
      };

      // ✅ LocationType Dropdown is in column T (20th column)
      sheet.getCell(`T${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`DropdownSources!$F$2:$F$${locTypes.length + 1}`],
        showErrorMessage: true,
        error: 'Please select a valid Location Type.'
      };

        // ✅ InstalledOn (Column E)
        sheet.getCell(`E${i}`).dataValidation = {
          type: 'date',
          operator: 'greaterThan', // optional (can also be 'between')
          formulae: [new Date(2000, 0, 1)], // minimum allowed date (01-Jan-2000 here, adjust if needed)
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Invalid Date',
          error: 'Please enter a valid date (YYYY-MM-DD).'
        };

        // ✅ LastCleaningDate (Column J)
        sheet.getCell(`J${i}`).dataValidation = {
          type: 'date',
          operator: 'greaterThan',
          formulae: [new Date(2000, 0, 1)],
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Invalid Date',
          error: 'Please enter a valid date (YYYY-MM-DD).'
        };

    }

    // 📤 Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ahu_filter_sample.xlsx');
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('❌ Error generating sample filter Excel:', err);
    res.status(500).json({ error: 'Failed to generate sample file', status: false });
  }
});


// 🔄 Helper to pad barcode
const pad = (n) => n.toString().padStart(2, '0');

// 🔄 Map display names to IDs (AHU, Location, FilterType, LocationType)
async function fetchReferenceData() {
  const [ahuRes, locationRes, filterTypeRes, locTypeRes] = await Promise.all([
    handleRecordWithOutRes({}, OperationEnums().getAHUId),
    handleRecordWithOutRes({}, OperationEnums().getlocations),
    handleRecordWithOutRes({}, OperationEnums().GETFILTERTYPES),
    handleRecordWithOutRes({ locType: 1 }, OperationEnums().getprocessnonprocess) // ✅ Location Types
  ]);

  // 🔹 AHU Map (code → id)
  const ahuMap = {};
  if (ahuRes?.Status) {
    ahuRes.ResultData.forEach(item => {
      if (item.code) ahuMap[item.code.trim()] = item.id;
    });
  }

  // 🔹 Location Map (BlockName → BlockId)
  const locationMap = {};
  if (locationRes?.Status) {
    locationRes.ResultData.forEach(item => {
      if (item.BlockName) locationMap[item.BlockName.trim()] = item.BlockId;
    });
  }

  // 🔹 FilterType Map (AssetType → Id)
  const filterTypeMap = {};
  if (filterTypeRes?.Status) {
    filterTypeRes.ResultData.forEach(item => {
      if (item.AssetType) filterTypeMap[item.AssetType.trim()] = item.Id;
    });
  }

  // 🔹 LocationType Map (Process / Non-Process → BlockId)
  const locationTypeMap = {};
  if (locTypeRes?.Status) {
    locTypeRes.ResultData.forEach(item => {
      if (item.BlockName) locationTypeMap[item.BlockName.trim()] = item.BlockId;
    });
  }

  return { ahuMap, locationMap, filterTypeMap, locationTypeMap };
}


router.post('/uploadFilterExcelLite', upload.single('file'), async (req, res) => {
  try {

    // ✅ Get CreatedBy from multiple sources
    const CreatedBy =
      req.user?.UserID ||
      req.body.userId ||
      req.body.UserID ||
      req.headers['userid'];

    if (!CreatedBy) {
      return res.status(401).json({ error: 'UserID missing in request', status: false });
    }
    const workbook = new ExcelJS.Workbook();
    const filePath = path.resolve(req.file.path);
    await workbook.xlsx.readFile(filePath);
    fs.unlinkSync(filePath); // remove after read

    const sheet = workbook.worksheets[0];
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push(row);
    });

    const { ahuMap, locationMap, filterTypeMap,locationTypeMap } = await fetchReferenceData();
    console.log( 'fetchReferenceData',ahuMap, locationMap, filterTypeMap,locationTypeMap );

    const failed = [];
    const success = [];

    for (const row of rows) {
      
      const values = row.values;

      const AHUCode = values[2]?.toString().trim();
      const FilterType = values[6]?.toString().trim();
      const LocationName = values[1]?.toString().trim();
      const Loctypeid = values[3]?.toString().trim();


      const result = await handleRecordWithOutRes({ ahuid: AHUCode }, OperationEnums().checkahudexistornot);
      // Debug
      console.log("result:", result);
      let isExists = 0; // default false
      if (result?.Status && result?.ResultData?.length > 0) {
        isExists = result.ResultData[0].IsExists;  // ✅ Capture flag
      }
      let NEWAHUID = null;

      // ✅ Step 2: If not exists, insert new AHU
      if (isExists === 0) {
        const data11 = {
          Code: AHUCode,
          Description: "",
          Location: "",
          Department: "",
          Manufacturer: "",
          ModelNo: "",
          Capacity: 0,
          Sparescount: 0,
          Remarks: "",
          CreatedBy: CreatedBy
        };

        const result = await handleRecordWithOutRes(data11, OperationEnums().AddAHUEnum);

        if (result?.Status && result?.ResultData?.length > 0) {
          NEWAHUID = result.ResultData[0].ID; // newly inserted AHU
        }}else {
          NEWAHUID = ahuMap[AHUCode] || null;  // get from fetched map
        }
        const today = new Date().toISOString().split("T")[0];


        console.log('NEWAHUID',NEWAHUID)
        const NewValues = {
          AHUId: NEWAHUID,
          AssetType: filterTypeMap[FilterType] || null,
          Lable: values[4]?.toString().trim(),
          AssetType: filterTypeMap[FilterType] || null,
          InstalledOn: today,
          Location: locationMap[LocationName] || null,
          Dimensions: values[7] && values[7].richText ? values[7].richText.map(rt => rt.text).join(''): values[7],
          MicronRating: values[5],
          LastCleaningDate: values[10],
          CurrentStatus: 'Active',
          CreatedBy: CreatedBy,
          cleaningFreqAllowance: parseInt(values[9]),
          cleaningdays: parseInt(values[8]),
          Loc: locationTypeMap[Loctypeid],
          OldId : 0, // For RefId
          FilterId: '',
          Barcode: '',
        };

      // Skip if required mappings are missing
      if (!NewValues.AHUId || !NewValues.AssetType || !NewValues.Location) {
        failed.push({ row: row.number, reason: 'Mapping failed', AHUCode, FilterType, LocationName });
        continue;
      }

      // const response = await handleRecordWithOutRes(totaldata, OperationEnums().addApprovalSetting);
      // const response = await handleRecordWithOutRes(NewValues, OperationEnums().AddFilterLite);

      let lastDate = NewValues.LastCleaningDate;
      let formattedDate;

      // Normalize last cleaning date
      if (
        !lastDate ||
        (typeof lastDate === "string" &&
          ["NA", "N/A", "NONE", ""].includes(lastDate.trim().toUpperCase()))
      ) {
        // Empty or NA → fallback
        formattedDate = "1900-01-01";
      } else if (lastDate instanceof Date && !isNaN(lastDate)) {
        // Proper Excel date object
        formattedDate = lastDate.toISOString().split("T")[0];
      } else if (typeof lastDate === "string") {
        // Try parsing string
        const parsed = new Date(lastDate);
        if (!isNaN(parsed)) {
          formattedDate = parsed.toISOString().split("T")[0];
        } else {
          formattedDate = "1900-01-01"; // Non-date string
        }
      } else {
        // Anything else fallback
        formattedDate = "1900-01-01";
      }

        NewValues.LastCleaningDate = formattedDate;
        response = await handleRecordWithOutRes(NewValues, OperationEnums().AddFilterLiteD);
   

      if (response?.Status && response?.ResultData?.length > 0) {
        const message = response.ResultData[0]?.Message; // safely read Message

        if (message?.toUpperCase() === "EXISTING LABEL") {
          // Existing label → treat as failure
          failed.push({
            row: row.number,
            reason: message, // store the message
            status: false,
            FilterId: NewValues.FilterId
          });
        } else {
          // Successful insert
          success.push({
            row: row.number,
            FilterId: NewValues.FilterId,
            status: true
          });
        }
      } else {
        // Any other failure
        failed.push({
          row: row.number,
          reason: response?.error || "Unknown error",
          status: false
        });
      }
      
    }

    return res.status(200).json({
      message: failed.length > 0 ? failed[0].reason  : 'Excel processed' ,
      total: rows.length,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed,status:failed.length > 0 ? false : true 
    });
  } catch (err) {
    console.error('❌ Upload Error:', err);
    return res.status(500).json({ error: 'Failed to process Excel file', details: err.message,status:false  });
  }
});


router.post('/upload-filter-excel', upload.single('file'), async (req, res) => {
  try {

    // ✅ Get CreatedBy from multiple sources
    const CreatedBy =
      req.user?.UserID ||
      req.body.userId ||
      req.body.UserID ||
      req.headers['userid'];

    if (!CreatedBy) {
      return res.status(401).json({ error: 'UserID missing in request', status: false });
    }
    const workbook = new ExcelJS.Workbook();
    const filePath = path.resolve(req.file.path);
    await workbook.xlsx.readFile(filePath);
    fs.unlinkSync(filePath); // remove after read

    const sheet = workbook.worksheets[0];
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push(row);
    });

    const { ahuMap, locationMap, filterTypeMap,locationTypeMap } = await fetchReferenceData();
    console.log( 'fetchReferenceData',ahuMap, locationMap, filterTypeMap,locationTypeMap );

    const failed = [];
    const success = [];

    for (const row of rows) {
      const values = row.values;

      const AHUCode = values[1]?.toString().trim();
      const FilterType = values[3]?.toString().trim();
      const LocationName = values[6]?.toString().trim();
      const Loctypeid = values[20]?.toString().trim();


      const result = await handleRecordWithOutRes({ ahuid: AHUCode }, OperationEnums().checkahudexistornot);
      // Debug
      console.log("result:", result);
      let isExists = 0; // default false
      if (result?.Status && result?.ResultData?.length > 0) {
        isExists = result.ResultData[0].IsExists;  // ✅ Capture flag
      }
      let NEWAHUID = null;

      // ✅ Step 2: If not exists, insert new AHU
      if (isExists === 0) {
        const data11 = {
          Code: AHUCode,
          Description: "",
          Location: "",
          Department: "",
          Manufacturer: "",
          ModelNo: "",
          Capacity: 0,
          Sparescount: 0,
          Remarks: "",
          CreatedBy: CreatedBy
        };

        const result = await handleRecordWithOutRes(data11, OperationEnums().AddAHUEnum);

        if (result?.Status && result?.ResultData?.length > 0) {
          NEWAHUID = result.ResultData[0].ID; // newly inserted AHU
        }}else {
          NEWAHUID = ahuMap[AHUCode] || null;  // get from fetched map
        }

        console.log('NEWAHUID',NEWAHUID)
      const NewValues = {
        AHUId: NEWAHUID,
        Lable: values[2]?.toString().trim(),
        AssetType: filterTypeMap[FilterType] || null,
        Manufacturer: values[4],
        InstalledOn: values[5],
        Location: locationMap[LocationName] || null,
        Dimensions: values[7],
        MicronRating: values[8],
        CleaningLimit: values[9],
        LastCleaningDate: values[10],
        ValidOperationLife: parseInt(values[11]),
        CurrentStatus: values[12],
        AvailabilityStatus: values[13],
        Specifications: '',
        CreatedBy: CreatedBy,
        cleaningFreqAllowance: parseInt(values[14]),
        ROmax: parseFloat(values[15]),
        ROmin: parseFloat(values[16]),
        AirMax: parseFloat(values[17]),
        AirMin: parseFloat(values[18]),
        cleaningdays: parseInt(values[19]),
        Loc: locationTypeMap[Loctypeid],
      };

      // Skip if required mappings are missing
      if (!NewValues.AHUId || !NewValues.AssetType || !NewValues.Location) {
        failed.push({ row: row.number, reason: 'Mapping failed', AHUCode, FilterType, LocationName });
        continue;
      }

      // Barcode generation
      const now = new Date();
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const barcode = timestamp.slice(-8);

      NewValues.FilterId = `FLT${barcode.slice(-4)}`;
      NewValues.Barcode = barcode;

      const jsondata = {
        ScreenName: "AddAHUFilter",
        ApiName: "AddAHUFilter",
        NewValues,
        UpdateValues: "",
        ScreenValues: "",
        CreatedBy: 1
      };

      const totaldata = {
        ...jsondata,
        ScreenOperationId: OperationEnums().AddAHUFilter,
        Approvaltype: 1,
        OldValues: {}
        ,CreatedBy
      };

      // const response = await handleRecordWithOutRes(totaldata, OperationEnums().addApprovalSetting);
      const response = await handleRecordWithOutRes(NewValues, OperationEnums().AddAHUFilter);

      if (response?.Status) {
        success.push({ row: row.number, FilterId: NewValues.FilterId,status:true });
      } else {
        failed.push({ row: row.number, reason: response?.error || 'Unknown error',status:false });
      }
    }

    return res.status(200).json({
      message: 'Excel processed',
      total: rows.length,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed,status:true 
    });
  } catch (err) {
    console.error('❌ Upload Error:', err);
    return res.status(500).json({ error: 'Failed to process Excel file', details: err.message,status:false  });
  }
});

module.exports = router;
