# EWR 4.2 — wrestler.dat → Excel (Web Converter)

A client-side (browser-only) converter for **EWR 4.2** `wrestler.dat` files.  
It parses worker records and exports a structured `.xlsx` file with both **raw EWR values** and **human-readable** convenience columns.

## Privacy
- Your `wrestler.dat` file is processed **locally in your browser**
- The file is **never uploaded** to a server

## How to use
1. Locate your EWR 4.2 database folder and find `wrestler.dat`
2. Open the web converter and select `wrestler.dat` (exact filename required)
3. Click **Download .xlsx**

## Output
The Excel file includes:
- A **Workers** sheet with locked column order
- A **Schema** sheet that includes a schema/version string and notes

## Known limitations
- This release supports **only** `wrestler.dat`
- The file must be named **exactly** `wrestler.dat` (rename if needed)

## Versioning
The version displayed in the UI matches `SCHEMA_VERSION` in:
- `lib/exportWrestlerXlsx.ts`

## Contributing / Bug reports
If something looks wrong:
- Include the **Version** shown on the page
- Include your **worker count**
- Describe what field(s) are incorrect
