const xlsx = require('xlsx');
const workbook = xlsx.readFile('Screenshots/Billz_Catalog_2026_04_21_12_51_20_68d9e87d_eacb_496f_b119_012b9a2b024c.xlsx');
const sheet_name_list = workbook.SheetNames;
const row = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]])[0];
console.log(Object.keys(row));
