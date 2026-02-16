const express = require("express");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const cors = require("cors"); // ✅ Import CORSs
const { router:screenRoutes} = require("./services/server");
const { ChecklistRoutes} = require("./services/Checklist.js");
const { handleRecordWithOutRes:handleRecordWithOutRes } = require('./services/server');
const { OperationEnums } = require("./utilityEnum.js");
const sampleExcelRoute = require('./services/Excel');
const dbUtility = require("./dal/dbUtility.js");
const uploadRoutes = require('./services/uploadReportCopy.js'); // adjust path if needed
const backupRoutes = require('./services/dbbackup.js');
const {AreasRoutes} = require('./services/Areas.js');
const {passwordpolicyRoutes} = require('./services/passwordpolicy.js');
const {ahuphase2Routes} = require('./services/ahu.js');
const {filterphase2Routes} = require('./services/filter.js');
const {BlockRoutes} = require('./services/Blocks.js');
const {ScheduleRoutes} = require('./services/Schedulejob.js');
const {Dashboardphase2Routes} = require('./services/Dashboard.js');


const http = require("http");
const { setupWebSocket, notifyLogout } = require("./websocketconn/wsServer.js");

const { getIstDate, getIstTime, getIstDateTime } = require('./utilities/dateUtil.js');

require('dotenv').config(); // load environment variables from .env.
const net = require('net');

const app = express();
app.use(express.json());
app.use(cors()); // ✅ Enable CORS for all routes

const swaggerDocument = YAML.load('./swagger.yaml');

// For Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount all routes under /api
app.use('/Dashboard', Dashboardphase2Routes);
app.use("/Scheduleph2", ScheduleRoutes);
app.use("/Blocks", BlockRoutes);
app.use("/filterph2", filterphase2Routes);
app.use("/ahuph2", ahuphase2Routes);
app.use("/", passwordpolicyRoutes);

app.use("/api", screenRoutes);
app.use("/api", sampleExcelRoute);
app.use('/api', uploadRoutes);
app.use('/backup', backupRoutes);
app.use('/Checklist', ChecklistRoutes);
app.use('/Areas', AreasRoutes);





const server = http.createServer(app);

const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

console.log('sockets')

// Attach WebSocket setup
setupWebSocket(server);
