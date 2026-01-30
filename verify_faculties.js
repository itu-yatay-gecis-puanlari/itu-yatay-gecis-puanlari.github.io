const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'cap/cap-data.json');
try {
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    const faculties = new Set();

    for (const prog in data.programlar) {
        if (data.programlar[prog].fakulte) {
            faculties.add(data.programlar[prog].fakulte);
        }
    }

    const facultyList = Array.from(faculties);
    console.log('Faculties found:', facultyList);

    const hasOld1 = faculties.has("İTÜ Kuzey Kıbrıs");
    const hasOld2 = faculties.has("İTÜ-KKTC Eğitim-Araştırma Yerleşkeleri");
    const hasNew = faculties.has("İTÜ-KKTC");

    if (!hasOld1 && !hasOld2 && hasNew) {
        console.log("SUCCESS: Faculty names merged successfully.");
    } else {
        console.error("FAILURE: Merge incomplete.");
        if (hasOld1) console.error("- Found 'İTÜ Kuzey Kıbrıs'");
        if (hasOld2) console.error("- Found 'İTÜ-KKTC Eğitim-Araştırma Yerleşkeleri'");
        if (!hasNew) console.error("- Did NOT find 'İTÜ-KKTC'");
        process.exit(1);
    }

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
