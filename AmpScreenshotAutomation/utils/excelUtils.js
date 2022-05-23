const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();

const fetchUrlDataFromExcel = (excelPath, sheetName) => {
  return new Promise((resolve, reject) => {
    var comps = [];
    workbook.xlsx
      .readFile(excelPath)
      .then(function () {
        var worksheet = workbook.getWorksheet(sheetName);
        worksheet.eachRow(function (row, rowNumber) {
          var item = {
            companyID: row.getCell("G").value,
            companyName: row.getCell("O").value,
            ampUrl: row.getCell("W").value,
          };

          comps.push(item);
          rowNumber === 41 ? resolve(comps) : null;
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const addScoreDataToExcel = (excelPath, sheetName, siteList) => {
  workbook.xlsx
    .readFile(excelPath)
    .then(async function () {
      var worksheet = workbook.getWorksheet(sheetName);
      worksheet.eachRow(function (row, rowNumber) {
        if (rowNumber === 1) return;
        let compID = row.getCell("G").value;
        siteList.forEach((item) => {
          if (item.id != compID) return;
          console.log("item", item.id);
          let score = item.sticky ? 69.3 : 65.3;
          row.getCell("Y").value = score;
          console.log("item", row.getCell("Y").value);
        });
      });

      await workbook.xlsx.writeFile("testFile.xlsx");
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = { fetchUrlDataFromExcel, addScoreDataToExcel };
