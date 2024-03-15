const query = require("../queries/eventQueries.js");
const userQuery = require("../queries/user.js");
const programQuery = require("../queries/programQueries.js");
const excelController = require("../controller/excel.js");
const validationController = require("../controller/validation.js");
const {redisDb} = require("../config/database.js");


module.exports = {
  programs: async (req, res) => {
    try {
      let username = await redisDb.get('user');

        let getmodules = await userQuery.getModules(username);
        let modules = await query.getChildModules(username, "Programs");
        return res.render("program", {
          module: getmodules,
          childModules: modules.rows,
        });
    } catch (error) {
      console.log(error.message);
      return res.redirect(`${res.locals.BASE_URL}elective/error`);
    }
  },

  addPrograms: async (req, res) => {
    try {
        let username = await redisDb.get('user');
        let getmodules = await userQuery.getModules(username);
        let campus = await query.getCampus();

        return res.render("addProgram", {
          module: getmodules,
          campus: campus.rows,
        });
    } catch (error) {
      console.log(error.message);
      return res.redirect(`${res.locals.BASE_URL}elective/error`);
    }
  },

  insertProgramsViaExcel: async (req, res) => {
    try {
      console.log("Function called for excel");
      let username = await redisDb.get('user');
      let role = await redisDb.get('role');

      let file = req.file;

        console.log("File " + JSON.stringify(file));

        if (file != undefined) {
          let programColumn = 'Program';
          let campusColumn = 'Campus';
          let idColumn = 'ProgramId';
          let programJson = {programColumn,campusColumn,idColumn};

          let excelData = excelController.readExcelFile(file);
          let programArray = excelData.length;

          if (programArray > 0) {

            let firstRow = excelData[0];
            let excelHeader = Object.keys(firstRow);
            

            if (Object.keys(programJson).length == excelHeader) {
              for (let data of excelHeader) {
                if (!Object.values(programJson).includes(data)) {
                  return res.json({
                    status: "fileError",
                    message: "Invalid Excel Format !!",
                  });
                }
              }
            } else {
              return res.json({
                status: "fileError",
                message: "Invalid Excel Format !!",
              });
            }

            let programArray = [];
            let nonInsertedPrograms = [];

            excelData.forEach(async (prg) => {
          
              let programName = new String(prg.Program);
              let campusName = new String(prg.Campus);
              let program_id = new String(prg.ProgramId);

              let program = programName ? programName.trim() : undefined;
              let campus = campusName ? campusName.trim() : undefined;
              let programId = program_id ? program_id.trim() : undefined;

              let programValidation = program!=undefined ? validationController.programValidator(program): false;
              let campusValidation = campus!=undefined ? validationController.campusValidation(campus) : false;
              let idValidation = programId!=undefined ? validationController.NumberValidation(programId) : false;

              if (
                programValidation &&
                campusValidation &&
                idValidation
              ) {
                programArray.push({ program, campus, programId, username });
              } else {
                nonInsertedPrograms.push({ program, campus, programId });
              }

              console.log(
                "non inserted programs:::::::: ",
                nonInsertedPrograms
              );

              if (role === "Role_Admin") {
                let insertProgram = await programQuery.insertPrograms({
                  prgArray: programArray,
                });

                if (insertProgram.rowCount > 0) {
                  console.log("Non Inserted Array--->> ", nonInsertedPrograms);
                  return res.json({
                    status: "success",
                    message: "Programs Uploaded Succesfully !!",
                    nonInsertedPrograms: nonInsertedPrograms,
                  });
                } else {
                  return res.json({ message: "Failed To Upload Data !!" });
                }
              } else {
                res.clearCookie("jwtauth");
                res.json({
                  status: "error",
                  redirectTo: `${res.locals.BASE_URL}elective/loginPage`,
                });
              }
            });
          } else {
            return res.json({ message: "File Cannot Be Empty !!" });
          }
        } else {
          return res.json({ message: "File Not Found !!" });
        }
    } catch (error) {
      console.log("Error in file", error.message);
      return res.json({ status: "error", redirectTo: `${res.locals.BASE_URL}elective/error` });
    }
  },

  insertProgramManaully: async (req, res) => {
    try {
      console.log("function called");

      let username = await redisDb.get('user');
      let userRole = await redisDb.get('role');
        let { program, campus, programId } = req.body;

        console.log("request body:: ", program, campus, programId);

        let campusValidation = validationController.campusValidation(
          campus
        );
        let programIdValidation = validationController.programIdValidation(
          programId
        );

        console.log("program validation:: ", programIdValidation);

        if (campusValidation && programIdValidation) {
          if (userRole === "Role_Admin") {
            let prgArray = [{ program, campus, programId, username }];
            let insertProgramQuery = await programQuery.insertPrograms({
              prgArray,
            });

            if (insertProgramQuery.rowCount > 0) {
              console.log("Program uploaded successfully");
              return res.json({
                status: "success",
                message: "Program Uploaded Successfully !!",
                redirectTo :`${res.locals.BASE_URL}elective/viewPrograms`
              });
            } else {
              return res.json({ message: "Failed To Upload Program !!" });
            }
          } else {
            res.clearCookie("jwtauth");
            return res.json({
              status: "error",
              redirectTo: `${res.locals.BASE_URL}elective/loginPage`,
            });
          }
        } else {
          return res.json({ message: "Invalid Inputs !!" });
        }
    } catch (error) {
      console.log(error);
      return res.json({ status: "error", redirectTo: `${res.locals.BASE_URL}elective/error` });
    }
  },

  viewPrograms: async (req, res) => {
    try {
      let username = await redisDb.get('user');

        let getmodules = await userQuery.getModules(username);
        let programData = await programQuery.viewPrograms(username);
        let campus = await query.getCampus();
        let dataRows = programData.rowCount;

        return res.render("viewPrograms", {
          module: getmodules,
          programData: programData.rows,
          dataRows: dataRows,
          campus: campus.rows,
        });
   
    } catch (error) {
      console.log(error);
      return res.redirect(`${res.locals.BASE_URL}elective/error`);
    }
  },

  getAllProgramsList: async (req, res) => {
    try {
        let username = await redisDb.get('user');
        let getmodules = await userQuery.getModules(username);
        let programList = await programQuery.getAllProgramsList(username);
        return res.render("programList", {
          programs: programList.rows,
          module: getmodules,
        });
  
    } catch (error) {
      return res.redirect(`${res.locals.BASE_URL}elective/error`);
    }
  },

  deleteProgram: async (req, res) => {
    try {
      let role = await redisDb.get('role');

        let { programId } = req.body;
        console.log("delete program ", programId);

        if (role === "Role_Admin") {
          let deleteProgram = await programQuery.deleteProgram(programId);
          if (deleteProgram.rowCount > 0) {
            return res.json({
              status: "success",
              message: "Program deleted successfully !!",
            });
          } else {
            return res.json({ message: "Failed To Delete Program !!" });
          }
        } else {
          res.clearCookie("jwtauth");
          return res.json({
            status: "error",
            redirectTo: `${res.locals.BASE_URL}elective/loginPage`,
          });
        }
    } catch (error) {
      console.log(error);
      return res.json({ status: "error", redirectTo: `${res.locals.BASE_URL}elective/error` });
    }
  },

  checkProgramId : async (req,res) => {
    try{
    let {programId} = req.body;
    
    let checkProgramid = await programQuery.checkProgramId(programId);

    if(checkProgramid.rowCount > 0){
      return res.json({status:'success',message:'*Program Id Must Be Unique'});
    }else{
      return res.json({message:undefined});
    }
    }catch(error){
      console.log(error);
      return res.json({ status: "error", redirectTo: `${res.locals.BASE_URL}elective/error` }); 
    }
  }
};
